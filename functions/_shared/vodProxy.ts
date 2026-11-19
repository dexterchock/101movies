export interface ProxyUrlValidationOk {
  ok: true;
  url: URL;
}

export interface ProxyUrlValidationErr {
  ok: false;
  reason: string;
}

export type ProxyUrlValidationResult =
  | ProxyUrlValidationOk
  | ProxyUrlValidationErr;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "local",
  "internal",
  "localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

const DISALLOWED_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "application/json",
  "text/json",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
  "text/css",
  "application/xml",
  "text/xml",
  "image/svg+xml",
  "application/pdf",
  "multipart/form-data",
]);

const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/mp4",
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl",
  "text/vtt",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

function isBlockedIpv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);
  const d = Number(match[4]);
  if (a > 255 || b > 255 || c > 255 || d > 255) return true;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

function parseIpv6Words(host: string): number[] | null {
  if (!host.includes(":") || host.includes("%")) return null;

  const doubleColonParts = host.split("::");
  if (doubleColonParts.length > 2) return null;

  const parseSegment = (segment: string): number[] | null => {
    if (!segment) return [];
    const tokens = segment.split(":");
    const words: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok) return null;
      if (tok.includes(".")) {
        if (i !== tokens.length - 1) return null;
        const m = tok.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (!m) return null;
        const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
        if (octets.some((o) => o > 255)) return null;
        words.push((octets[0] << 8) | octets[1]);
        words.push((octets[2] << 8) | octets[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/i.test(tok)) return null;
        words.push(parseInt(tok, 16));
      }
    }
    return words;
  };

  if (doubleColonParts.length === 1) {
    const words = parseSegment(doubleColonParts[0]);
    return words && words.length === 8 ? words : null;
  }

  const head = parseSegment(doubleColonParts[0]);
  const tail = parseSegment(doubleColonParts[1]);
  if (!head || !tail) return null;
  const missing = 8 - (head.length + tail.length);
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

function isBlockedIpv6(host: string): boolean {
  if (!host.includes(":")) return false;
  const w = parseIpv6Words(host);
  if (!w) return true;

  const allZeroPrefix = w[0] === 0 && w[1] === 0 && w[2] === 0 && w[3] === 0 && w[4] === 0;
  // Unspecified (::) and Loopback (::1)
  if (allZeroPrefix && w[5] === 0 && w[6] === 0 && (w[7] === 0 || w[7] === 1)) {
    return true;
  }
  // IPv4-mapped (::ffff:0:0/96) or IPv4-compatible (::/96)
  if (allZeroPrefix && (w[5] === 0xffff || w[5] === 0)) {
    const ipv4 = `${(w[6] >> 8) & 0xff}.${w[6] & 0xff}.${(w[7] >> 8) & 0xff}.${w[7] & 0xff}`;
    return isBlockedIpv4(ipv4);
  }
  // NAT64 well-known prefix (64:ff9b::/96) embedding IPv4 in low 32 bits
  if (
    w[0] === 0x0064 &&
    w[1] === 0xff9b &&
    w[2] === 0 &&
    w[3] === 0 &&
    w[4] === 0 &&
    w[5] === 0
  ) {
    const ipv4 = `${(w[6] >> 8) & 0xff}.${w[6] & 0xff}.${(w[7] >> 8) & 0xff}.${w[7] & 0xff}`;
    return isBlockedIpv4(ipv4);
  }
  // NAT64 local-use prefix (64:ff9b:1::/48)
  if (w[0] === 0x0064 && w[1] === 0xff9b && w[2] === 0x0001) return true;
  // Unique local (fc00::/7)
  if ((w[0] & 0xfe00) === 0xfc00) return true;
  // Link-local (fe80::/10)
  if ((w[0] & 0xffc0) === 0xfe80) return true;
  // Site-local deprecated (fec0::/10)
  if ((w[0] & 0xffc0) === 0xfec0) return true;
  // Multicast (ff00::/8)
  if ((w[0] & 0xff00) === 0xff00) return true;

  return false;
}

export function validateProxyTargetUrl(rawUrl: string): ProxyUrlValidationResult {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { ok: false, reason: "Invalid proxy URL" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: "Invalid proxy URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Invalid proxy URL" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Credentials in proxy URL are not allowed" };
  }

  const rawHost = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  const host =
    rawHost.startsWith("[") && rawHost.endsWith("]")
      ? rawHost.slice(1, -1)
      : rawHost;

  if (!host) {
    return { ok: false, reason: "Invalid proxy hostname" };
  }

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain")
  ) {
    return { ok: false, reason: "Blocked proxy destination" };
  }

  if (isBlockedIpv4(host) || isBlockedIpv6(host)) {
    return { ok: false, reason: "Blocked proxy destination" };
  }

  return { ok: true, url: parsed };
}

export function buildProxyCorsHeaders(reqOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": reqOrigin,
    Vary: "Origin",
  };
}

function getNormalizedMime(contentType: string): string {
  return (contentType || "").split(";")[0].trim().toLowerCase();
}

export function isDisallowedProxyMime(contentType: string): boolean {
  const mime = getNormalizedMime(contentType);
  if (!mime) return false;
  if (DISALLOWED_MIME_TYPES.has(mime)) return true;
  if (mime.endsWith("+json") || mime.endsWith("+xml")) return true;
  return false;
}

function isAllowedMediaMime(contentType: string): boolean {
  const mime = getNormalizedMime(contentType);
  if (!mime) return true;
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return true;
  if (mime.includes("mpegurl")) return true;
  return ALLOWED_MEDIA_MIME_TYPES.has(mime);
}

export function rewriteM3u8Playlist(text: string, baseUrl: URL): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          try {
            const abs = new URL(uri, baseUrl);
            if (abs.protocol === "http:" || abs.protocol === "https:") {
              return `URI="/api/vod/proxy?url=${encodeURIComponent(abs.toString())}"`;
            }
          } catch {}
          return `URI="${uri}"`;
        });
      }
      try {
        const absUrl = new URL(trimmed, baseUrl);
        if (absUrl.protocol === "http:" || absUrl.protocol === "https:") {
          return `/api/vod/proxy?url=${encodeURIComponent(absUrl.toString())}`;
        }
      } catch {}
      return line;
    })
    .join("\n");
}

function startsWithExtM3u(text: string): boolean {
  return text.replace(/^\uFEFF/, "").trimStart().startsWith("#EXTM3U");
}

export class ProxyTargetError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchWithSafeRedirects(
  initialUrl: URL,
  headers: Record<string, string>,
  timeoutMs: number,
  maxRedirects = 5
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await fetch(currentUrl.toString(), {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const location = res.headers.get("location");
      if (!location) {
        return { response: res, finalUrl: currentUrl };
      }

      try {
        await res.body?.cancel();
      } catch {}

      if (hop >= maxRedirects) {
        throw new ProxyTargetError("Too many redirects", 502);
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        throw new ProxyTargetError("Invalid redirect URL", 400);
      }

      const check = validateProxyTargetUrl(nextUrl.toString());
      if ("reason" in check) {
        throw new ProxyTargetError(check.reason, 400);
      }

      currentUrl = check.url;
      continue;
    }

    return { response: res, finalUrl: currentUrl };
  }

  throw new ProxyTargetError("Too many redirects", 502);
}

export interface VodProxyRequestOptions {
  targetUrl: string;
  reqOrigin: string;
  rangeHeader?: string | null;
  timeoutMs?: number;
}

export async function handleVodProxyRequest(
  opts: VodProxyRequestOptions
): Promise<Response> {
  const corsHeaders = buildProxyCorsHeaders(opts.reqOrigin);
  const validation = validateProxyTargetUrl(opts.targetUrl);

  if ("reason" in validation) {
    return new Response(validation.reason, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
    };
    if (opts.rangeHeader) {
      upstreamHeaders["Range"] = opts.rangeHeader;
    }

    const { response: upstream, finalUrl } = await fetchWithSafeRedirects(
      validation.url,
      upstreamHeaders,
      opts.timeoutMs ?? 15000
    );

    if (!upstream.ok) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return new Response(`Upstream HTTP ${upstream.status}`, {
        status: upstream.status,
        headers: corsHeaders,
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const mime = getNormalizedMime(contentType);

    if (isDisallowedProxyMime(contentType)) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return new Response("Unsupported proxy media type", {
        status: 415,
        headers: corsHeaders,
      });
    }

    const initialPathLower = validation.url.pathname.toLowerCase();
    const finalPathLower = finalUrl.pathname.toLowerCase();
    const isM3u8 =
      initialPathLower.includes(".m3u8") ||
      finalPathLower.includes(".m3u8") ||
      mime.includes("mpegurl");

    if (isM3u8) {
      const text = await upstream.text();
      if (!startsWithExtM3u(text)) {
        return new Response("Invalid M3U8 playlist", {
          status: 415,
          headers: corsHeaders,
        });
      }

      const rewritten = rewriteM3u8Playlist(text, finalUrl);
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          "Cache-Control": "public, max-age=10",
        },
      });
    }

    if (mime === "text/plain") {
      const buf = new Uint8Array(await upstream.arrayBuffer());
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      if (startsWithExtM3u(decoded)) {
        const rewritten = rewriteM3u8Playlist(decoded, finalUrl);
        return new Response(rewritten, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
            "Cache-Control": "public, max-age=10",
          },
        });
      }

      const isKeyPath =
        initialPathLower.endsWith(".key") || finalPathLower.endsWith(".key");
      const isShortKey = buf.byteLength > 0 && buf.byteLength <= 64;
      if (!isKeyPath && !isShortKey) {
        return new Response("Unsupported text proxy payload", {
          status: 415,
          headers: corsHeaders,
        });
      }

      const responseHeaders = new Headers(corsHeaders);
      if (contentType) responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Content-Length", String(buf.byteLength));
      return new Response(buf, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    if (!isAllowedMediaMime(contentType)) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return new Response("Unsupported proxy media type", {
        status: 415,
        headers: corsHeaders,
      });
    }

    const responseHeaders = new Headers(corsHeaders);
    if (contentType) responseHeaders.set("Content-Type", contentType);

    const hasContentEncoding = Boolean(upstream.headers.get("content-encoding"));
    const passthroughHeaders = hasContentEncoding
      ? ["content-range", "accept-ranges"]
      : ["content-length", "content-range", "accept-ranges"];
    for (const h of passthroughHeaders) {
      const val = upstream.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    if (err instanceof ProxyTargetError) {
      return new Response(err.message, {
        status: err.status,
        headers: corsHeaders,
      });
    }
    return new Response(err?.message || "Proxy fetch failed", {
      status: 502,
      headers: corsHeaders,
    });
  }
}
