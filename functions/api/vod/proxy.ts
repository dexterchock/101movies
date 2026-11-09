export const onRequestGet: PagesFunction = async (context) => {
  const reqUrl = new URL(context.request.url);
  const targetUrl = reqUrl.searchParams.get("url");

  if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
    return new Response("Invalid proxy URL", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    const clientRange = context.request.headers.get("Range");
    if (clientRange) {
      upstreamHeaders["Range"] = clientRange;
    }

    const upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      return new Response(`Upstream HTTP ${upstream.status}`, {
        status: upstream.status,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const isM3u8 =
      targetUrl.toLowerCase().includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl");

    if (isM3u8) {
      const text = await upstream.text();
      const baseUrl = new URL(targetUrl);
      const rewritten = text
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
              try {
                const abs = new URL(uri, baseUrl).toString();
                return `URI="/api/vod/proxy?url=${encodeURIComponent(abs)}"`;
              } catch {
                return `URI="${uri}"`;
              }
            });
          }
          try {
            const absUrl = new URL(trimmed, baseUrl).toString();
            return `/api/vod/proxy?url=${encodeURIComponent(absUrl)}`;
          } catch {
            return line;
          }
        })
        .join("\n");

      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=10",
        },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const val = upstream.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(err?.message || "Proxy fetch failed", {
      status: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};
