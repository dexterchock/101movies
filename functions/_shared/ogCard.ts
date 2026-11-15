export interface OgCardInput {
  type: "movie" | "tv";
  title: string;
  year?: string;
  rating?: number;
  runtime?: number;
  genres?: string[];
  backdropPath?: string | null;
  posterPath?: string | null;
}

const BRAND_GLYPHS: Record<string, { w: number; d: string }> = {
  "1": {
    w: 94,
    d: "M 44 0 L 94 0 L 94 160 L 44 160 L 44 52 L 2 52 L 2 20 C 22 17 35 10 44 0 Z",
  },
  "0": {
    w: 130,
    d: "M 65 -2 C 107 -2 130 22 130 64 L 130 96 C 130 138 107 162 65 162 C 23 162 0 138 0 96 L 0 64 C 0 22 23 -2 65 -2 Z M 65 38 C 50 38 45 46 45 62 L 45 98 C 45 114 50 122 65 122 C 80 122 85 114 85 98 L 85 62 C 85 46 80 38 65 38 Z",
  },
  M: {
    w: 164,
    d: "M 0 0 L 54 0 L 82 88 L 110 0 L 164 0 L 164 160 L 120 160 L 120 66 L 94 160 L 70 160 L 44 66 L 44 160 L 0 160 Z",
  },
  O: {
    w: 142,
    d: "M 71 -2 C 117 -2 142 25 142 78 L 142 82 C 142 135 117 162 71 162 C 25 162 0 135 0 82 L 0 78 C 0 25 25 -2 71 -2 Z M 71 39 C 53 39 46 49 46 76 L 46 84 C 46 111 53 121 71 121 C 89 121 96 111 96 84 L 96 76 C 96 49 89 39 71 39 Z",
  },
  V: {
    w: 136,
    d: "M 0 0 L 49 0 L 68 98 L 87 0 L 136 0 L 91 160 L 45 160 Z",
  },
  I: {
    w: 48,
    d: "M 0 0 L 48 0 L 48 160 L 0 160 Z",
  },
  E: {
    w: 110,
    d: "M 0 0 L 110 0 L 110 38 L 46 38 L 46 61 L 100 61 L 100 99 L 46 99 L 46 122 L 110 122 L 110 160 L 0 160 Z",
  },
  S: {
    w: 122,
    d: "M 116 48 L 72 48 C 71 39 67 34 58 34 C 49 34 44 38 44 45 C 44 53 51 56 72 60 C 103 66 122 79 122 110 C 122 144 98 162 60 162 C 21 162 0 144 0 109 L 45 109 C 46 120 51 126 62 126 C 72 126 78 121 78 113 C 78 104 71 101 51 97 C 20 91 2 78 2 48 C 2 14 25 -2 60 -2 C 95 -2 115 16 116 48 Z",
  },
};

const WORDMARK_GAPS = [1, 1, 2, 1, -7, -1, 2, 1, 0];

/** Renders the tight-locked brutalist 101MOVIES wordmark as pure SVG vector paths. */
export function buildBrandWordmarkSvg(options?: {
  x?: number;
  y?: number;
  height?: number;
  fill?: string;
}): { markup: string; width: number; height: number } {
  const targetHeight = options?.height ?? 160;
  const fill = options?.fill ?? "#EAEAE5";
  const text = "101MOVIES";
  const scale = targetHeight / 160;
  let cursorX = 0;
  const paths: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const glyph = BRAND_GLYPHS[text[i]];
    paths.push(
      `<path d="${glyph.d}" transform="translate(${cursorX}, 0)" fill="${fill}" fill-rule="evenodd"/>`
    );
    cursorX += glyph.w + (WORDMARK_GAPS[i] ?? 0);
  }

  const width = Math.round(cursorX * scale);
  const tx = options?.x ?? 0;
  const ty = options?.y ?? 0;
  return {
    markup: `<g transform="translate(${tx}, ${ty}) scale(${scale.toFixed(4)})">${paths.join("")}</g>`,
    width,
    height: targetHeight,
  };
}

const IMAGE_FETCH_TIMEOUT_MS = 2500;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return `data:${contentType.split(";")[0]};base64,${bytesToBase64(buf)}`;
  } catch {
    return null;
  }
}

function wrapTextLines(
  rawText: string,
  maxCharsPerLine: number,
  maxLines: number
): string[] {
  const clean = rawText.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length === maxLines) {
        const prev = lines[maxLines - 1];
        lines[maxLines - 1] =
          prev.length >= maxCharsPerLine - 1
            ? `${prev.slice(0, maxCharsPerLine - 3).trimEnd()}...`
            : `${prev}...`;
        return lines;
      }
      current = word;
    } else {
      lines.push(
        maxLines === 1
          ? `${word.slice(0, maxCharsPerLine - 3)}...`
          : word.slice(0, maxCharsPerLine)
      );
      if (lines.length === maxLines) return lines;
      current = "";
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

export function extractOgCardInput(details: any, type: "movie" | "tv"): OgCardInput | null {
  if (!details || details.success === false) return null;

  const enTitle = String(details.en_title || "").trim();
  const rawTitle = String(details.title || details.name || "").trim();
  const title = enTitle || rawTitle;
  if (!title) return null;

  const releaseDate = String(
    details.release_date || details.first_air_date || ""
  ).trim();
  const year = releaseDate.length >= 4 ? releaseDate.slice(0, 4) : "";
  const rating = Number(details.vote_average || 0);
  const runtime = Number(details.runtime || 0);
  const genres = Array.isArray(details.genres)
    ? details.genres
        .map((g: any) => String(g?.name || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  return {
    type,
    title,
    year,
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    runtime: Number.isFinite(runtime) && runtime > 0 ? runtime : undefined,
    genres,
    backdropPath: details.backdrop_path || null,
    posterPath: details.poster_path || null,
  };
}

export async function buildMovieOgSvg(input: OgCardInput): Promise<string> {
  const backdropPromise = input.backdropPath
    ? fetchImageAsDataUri(`https://image.tmdb.org/t/p/w1280${input.backdropPath}`)
    : input.posterPath
    ? fetchImageAsDataUri(`https://image.tmdb.org/t/p/w780${input.posterPath}`)
    : Promise.resolve(null);

  const posterPromise = input.posterPath
    ? fetchImageAsDataUri(`https://image.tmdb.org/t/p/w500${input.posterPath}`)
    : Promise.resolve(null);

  const [backdropUri, posterUri] = await Promise.all([backdropPromise, posterPromise]);

  const hasPoster = Boolean(posterUri);
  const titleLen = input.title.length;
  const titleFontSize = titleLen <= 18 ? 64 : titleLen <= 34 ? 52 : 42;
  const maxTitleChars = titleLen <= 18 ? 20 : titleLen <= 34 ? 25 : 31;
  const titleLineHeight = Math.round(titleFontSize * 1.15);
  const titleLines = wrapTextLines(input.title, maxTitleChars, 2);

  // Layout vertical stack anchored cleanly above bottom margin
  const metaParts: string[] = [];
  if (input.year) metaParts.push(input.year);
  if (input.runtime) metaParts.push(`${input.runtime} min`);
  if (input.genres && input.genres.length > 0) metaParts.push(input.genres.join(", "));
  const metaString = metaParts.join("  ·  ");

  const hasMetaRow = Boolean(input.rating || metaString);
  const bottomEdgeY = 560;
  const metaCenterY = hasMetaRow ? bottomEdgeY - 18 : bottomEdgeY;
  const lastTitleBaselineY = hasMetaRow ? metaCenterY - 40 : bottomEdgeY;
  const firstTitleBaselineY =
    lastTitleBaselineY - (Math.max(1, titleLines.length) - 1) * titleLineHeight;

  const badgeWidth = input.rating ? 84 : 0;
  const metaTextX = 64 + (input.rating ? badgeWidth + 16 : 0);

  const ratingBadgeSvg = input.rating
    ? `
      <rect x="64" y="${metaCenterY - 17}" width="84" height="34" rx="17" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
      <polygon points="81,${metaCenterY - 7} 83.2,${metaCenterY - 2.3} 88.4,${metaCenterY - 1.6} 84.6,${metaCenterY + 2} 85.5,${metaCenterY + 7.1} 81,${metaCenterY + 4.7} 76.5,${metaCenterY + 7.1} 77.4,${metaCenterY + 2} 73.6,${metaCenterY - 1.6} 78.8,${metaCenterY - 2.3}" fill="#FFFFFF"/>
      <text x="95" y="${metaCenterY + 6}" font-family="Poppins" font-weight="700" font-size="17" fill="#FFFFFF">${input.rating.toFixed(1)}</text>
    `
    : "";

  const metaTextSvg = metaString
    ? `<text x="${metaTextX}" y="${metaCenterY + 6}" font-family="Poppins" font-weight="400" font-size="19" fill="rgba(255,255,255,0.84)">${escapeXml(metaString)}</text>`
    : "";

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="64" y="${firstTitleBaselineY + idx * titleLineHeight}" font-family="Poppins" font-weight="700" font-size="${titleFontSize}" letter-spacing="-1.2" fill="#FFFFFF">${escapeXml(line)}</text>`
    )
    .join("");

  const posterCardSvg = hasPoster
    ? `
      <defs>
        <clipPath id="posterClip">
          <rect x="904" y="138" width="232" height="348" rx="16"/>
        </clipPath>
      </defs>
      <rect x="900" y="134" width="240" height="356" rx="18" fill="rgba(0,0,0,0.55)"/>
      <g clip-path="url(#posterClip)">
        <image href="${posterUri}" x="904" y="138" width="232" height="348" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <rect x="904" y="138" width="232" height="348" rx="16" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
    `
    : "";

  const typeLabel = input.type === "tv" ? "TV SERIES" : "MOVIE";
  const brandWordmark = buildBrandWordmarkSvg({
    x: 64,
    y: 52,
    height: 22,
    fill: "#EAEAE5",
  });

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="leftScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(6,6,8,0.95)"/>
      <stop offset="48%" stop-color="rgba(6,6,8,0.78)"/>
      <stop offset="76%" stop-color="rgba(6,6,8,0.42)"/>
      <stop offset="100%" stop-color="rgba(6,6,8,0.58)"/>
    </linearGradient>
    <linearGradient id="bottomScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(6,6,8,0.32)"/>
      <stop offset="42%" stop-color="rgba(6,6,8,0.12)"/>
      <stop offset="78%" stop-color="rgba(6,6,8,0.72)"/>
      <stop offset="100%" stop-color="rgba(6,6,8,0.96)"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#070709"/>
  ${
    backdropUri
      ? `<image href="${backdropUri}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>`
      : ""
  }
  <rect width="1200" height="630" fill="url(#leftScrim)"/>
  <rect width="1200" height="630" fill="url(#bottomScrim)"/>

  <!-- Top-left brutalist brand wordmark & media-type label -->
  ${brandWordmark.markup}
  <rect x="${64 + brandWordmark.width + 16}" y="54" width="1.5" height="18" fill="rgba(255,255,255,0.28)"/>
  <text x="${64 + brandWordmark.width + 30}" y="68" font-family="Poppins" font-weight="700" font-size="13" letter-spacing="2.8" fill="rgba(255,255,255,0.56)">${typeLabel}</text>

  ${posterCardSvg}
  ${titleSvg}
  ${ratingBadgeSvg}
  ${metaTextSvg}
</svg>
`;
}
