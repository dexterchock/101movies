export interface OgCardInput {
  type: "movie" | "tv";
  title: string;
  year?: string;
  rating?: number;
  runtime?: number;
  genres?: string[];
  overview?: string;
  backdropPath?: string | null;
  posterPath?: string | null;
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
  const overview = String(details.overview || "").trim();

  return {
    type,
    title,
    year,
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    runtime: Number.isFinite(runtime) && runtime > 0 ? runtime : undefined,
    genres,
    overview,
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
  const titleFontSize = titleLen <= 18 ? 60 : titleLen <= 34 ? 50 : 42;
  const maxTitleChars = titleLen <= 18 ? 22 : titleLen <= 34 ? 26 : 31;
  const titleLineHeight = Math.round(titleFontSize * 1.15);
  const titleLines = wrapTextLines(input.title, maxTitleChars, 2);

  const overviewLines = input.overview ? wrapTextLines(input.overview, 64, 2) : [];

  // Layout vertical stack anchored cleanly above bottom margin
  const metaParts: string[] = [];
  if (input.year) metaParts.push(input.year);
  if (input.runtime) metaParts.push(`${input.runtime} min`);
  if (input.genres && input.genres.length > 0) metaParts.push(input.genres.join(", "));
  const metaString = metaParts.join("  ·  ");

  const overviewBlockHeight = overviewLines.length > 0 ? overviewLines.length * 28 + 14 : 0;
  const metaRowHeight = input.rating || metaString ? 44 : 0;
  const bottomEdgeY = 564;
  const overviewStartY = bottomEdgeY - (overviewLines.length > 0 ? (overviewLines.length - 1) * 28 : 0);
  const metaCenterY = bottomEdgeY - overviewBlockHeight - (metaRowHeight > 0 ? 18 : 0);
  const lastTitleBaselineY =
    bottomEdgeY - overviewBlockHeight - metaRowHeight - 24;
  const firstTitleBaselineY =
    lastTitleBaselineY - (Math.max(1, titleLines.length) - 1) * titleLineHeight;

  const badgeWidth = input.rating ? 84 : 0;
  const metaTextX = 64 + (input.rating ? badgeWidth + 16 : 0);

  const ratingBadgeSvg = input.rating
    ? `
      <rect x="64" y="${metaCenterY - 16}" width="84" height="32" rx="16" fill="#F5C518"/>
      <polygon points="81,${metaCenterY - 7} 83.2,${metaCenterY - 2.3} 88.4,${metaCenterY - 1.6} 84.6,${metaCenterY + 2} 85.5,${metaCenterY + 7.1} 81,${metaCenterY + 4.7} 76.5,${metaCenterY + 7.1} 77.4,${metaCenterY + 2} 73.6,${metaCenterY - 1.6} 78.8,${metaCenterY - 2.3}" fill="#000000"/>
      <text x="95" y="${metaCenterY + 6}" font-family="Poppins" font-weight="700" font-size="17" fill="#000000">${input.rating.toFixed(1)}</text>
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

  const overviewSvg = overviewLines
    .map(
      (line, idx) =>
        `<text x="64" y="${overviewStartY + idx * 28}" font-family="Poppins" font-weight="400" font-size="18" fill="rgba(255,255,255,0.68)">${escapeXml(line)}</text>`
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

  <!-- Subtle top-left brand & media-type label (secondary to movie title) -->
  <circle cx="70" cy="66" r="4.5" fill="#F5C518"/>
  <text x="86" y="71" font-family="Poppins" font-weight="700" font-size="14" letter-spacing="3" fill="rgba(255,255,255,0.68)">101MOVIES</text>
  <text x="208" y="71" font-family="Poppins" font-weight="400" font-size="13" letter-spacing="2.2" fill="rgba(255,255,255,0.42)">·  ${typeLabel}</text>

  ${posterCardSvg}
  ${titleSvg}
  ${ratingBadgeSvg}
  ${metaTextSvg}
  ${overviewSvg}
</svg>
`;
}
