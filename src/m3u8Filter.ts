export interface StripM3u8AdsResult {
  content: string;
  removedCount: number;
  removedDuration: number;
}

interface ParsedSegment {
  rawUri: string;
  resolvedUrl: string;
  dirPrefix: string;
  filename: string;
  stem: string;
  format: string;
  duration: number;
  activeKey: string | null;
  activeMap: string | null;
  inCueOut: boolean;
  preTags: string[];
  matchPath: string;
  dropped: boolean;
}

interface MediaBlock {
  hasLeadingDiscontinuity: boolean;
  segments: ParsedSegment[];
  duration: number;
  singleDir: string | null;
}

// High-precision unmistakable ad path substrings only (no loose -ad- / _ad_ regexes).
const AD_PATH_PATTERNS: RegExp[] = [
  /adjump/i,
  /guanggao/i,
  /adplayer/i,
  /\/cms\/ad\//i,
  /redtraffic/i,
];

const FALLBACK_BASE_URL = "https://m3u8.local/_base_/index.m3u8";
const MAX_REMOVAL_RATIO = 0.2;
const MIN_DOMINANT_SEGMENTS = 20;
const MIN_DOMINANT_DIR_RATIO = 0.65;
const MAX_MIDROLL_DURATION = 45;
const MAX_PREROLL_DURATION = 30;
const MAX_ISLAND_SEGMENTS = 15;
const SOFT_MAX_REMOVED_SECONDS = 180;
const SOFT_MAX_REMOVED_DURATION_RATIO = 0.05;
const HARD_MAX_REMOVED_SECONDS = 360;

function incrementDecimalString(digits: string): string {
  let carry = 1;
  let out = "";
  for (let i = digits.length - 1; i >= 0; i--) {
    const sum = Number(digits.charAt(i)) + carry;
    if (sum >= 10) {
      out = String(sum - 10) + out;
      carry = 1;
    } else {
      out = String(sum) + out;
      carry = 0;
    }
  }
  return carry > 0 ? "1" + out : out;
}

function isContiguousSequence(stemA: string, stemB: string): boolean {
  const matchA = stemA.match(/^(.*?)(\d+)$/);
  const matchB = stemB.match(/^(.*?)(\d+)$/);
  if (!matchA || !matchB) return false;

  const prefixA = matchA[1];
  const digitsA = matchA[2];
  const prefixB = matchB[1];
  const digitsB = matchB[2];

  if (prefixA !== prefixB) return false;

  const normA = digitsA.replace(/^0+/, "") || "0";
  const normB = digitsB.replace(/^0+/, "") || "0";
  if (incrementDecimalString(normA) !== normB) return false;

  if (digitsA.length === digitsB.length) return true;
  // Digit rollover (e.g. 999 -> 1000, seg_099 -> seg_100)
  return digitsB.length === digitsA.length + 1 && /^9+$/.test(normA);
}

function classifyStemFormat(stem: string): string {
  if (/^\d+$/.test(stem)) return "digits";
  if (/^[0-9a-f]{32}$/i.test(stem)) return "hex32";
  if (/^[0-9a-f]{16,}$/i.test(stem)) return "hex16_plus";

  const sepPrefix = stem.match(/^([a-zA-Z][a-zA-Z0-9_-]*?[_-])(\d+)$/);
  if (sepPrefix) return "prefix_digits:" + sepPrefix[1];

  const wordPrefix = stem.match(/^([a-z]{2,12}|[A-Z]{2,12})(\d+)$/);
  if (wordPrefix) return "prefix_digits:" + wordPrefix[1];

  if (/^[a-zA-Z0-9]{6,14}$/.test(stem)) return "random_alnum";
  return "other";
}

function normalizeKey(keyLine: string | null): string | null {
  if (!keyLine) return null;
  if (/METHOD\s*=\s*NONE\b/i.test(keyLine)) return null;
  return keyLine;
}

function parseSegmentLocation(
  rawUri: string,
  baseUrl?: string
): {
  resolvedUrl: string;
  dirPrefix: string;
  filename: string;
  stem: string;
  matchPath: string;
} {
  const effectiveBase = baseUrl || FALLBACK_BASE_URL;
  try {
    const parsed = new URL(rawUri, effectiveBase);
    const pathname = parsed.pathname || "/";
    const lastSlash = pathname.lastIndexOf("/");
    const dirPath = lastSlash >= 0 ? pathname.slice(0, lastSlash + 1) : "/";
    const filename = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
    const dotIdx = filename.lastIndexOf(".");
    const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const isSyntheticHost = parsed.hostname === "m3u8.local";
    const cleanedPath = isSyntheticHost
      ? pathname.replace(/^\/_base_(?=\/)/, "")
      : pathname;
    const matchPath =
      (isSyntheticHost ? "" : parsed.hostname) + cleanedPath + parsed.search;

    return {
      resolvedUrl: isSyntheticHost ? rawUri : parsed.toString(),
      dirPrefix: parsed.origin + dirPath,
      filename,
      stem,
      matchPath,
    };
  } catch {
    const clean = rawUri.split("?")[0].split("#")[0];
    const lastSlash = clean.lastIndexOf("/");
    const dirPrefix = lastSlash >= 0 ? clean.slice(0, lastSlash + 1) : "";
    const filename = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
    const dotIdx = filename.lastIndexOf(".");
    const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    return {
      resolvedUrl: rawUri,
      dirPrefix,
      filename,
      stem,
      matchPath: rawUri,
    };
  }
}

function matchesAdPath(seg: ParsedSegment): boolean {
  for (let i = 0; i < AD_PATH_PATTERNS.length; i++) {
    if (AD_PATH_PATTERNS[i].test(seg.matchPath)) {
      return true;
    }
  }
  return false;
}

function isHeaderOnlyTag(trimmed: string): boolean {
  return (
    trimmed === "#EXTM3U" ||
    trimmed.indexOf("#EXT-X-VERSION:") === 0 ||
    trimmed.indexOf("#EXT-X-TARGETDURATION:") === 0 ||
    trimmed.indexOf("#EXT-X-MEDIA-SEQUENCE:") === 0 ||
    trimmed.indexOf("#EXT-X-PLAYLIST-TYPE:") === 0 ||
    trimmed.indexOf("#EXT-X-DISCONTINUITY-SEQUENCE:") === 0 ||
    trimmed.indexOf("#EXT-X-ALLOW-CACHE:") === 0 ||
    trimmed.indexOf("#EXT-X-INDEPENDENT-SEGMENTS") === 0 ||
    trimmed.indexOf("#EXT-X-START:") === 0
  );
}

function computeBlockStats(block: MediaBlock): void {
  let duration = 0;
  let singleDir: string | null = null;
  let mixedDir = false;

  for (let i = 0; i < block.segments.length; i++) {
    const seg = block.segments[i];
    duration += seg.duration;
    if (i === 0) {
      singleDir = seg.dirPrefix;
    } else if (seg.dirPrefix !== singleDir) {
      mixedDir = true;
    }
  }

  block.duration = duration;
  block.singleDir = mixedDir ? null : singleDir;
}

function isBlockFullyDropped(block: MediaBlock): boolean {
  for (let i = 0; i < block.segments.length; i++) {
    if (!block.segments[i].dropped) return false;
  }
  return true;
}

function dropWholeBlock(block: MediaBlock): void {
  for (let i = 0; i < block.segments.length; i++) {
    block.segments[i].dropped = true;
  }
}

function getRemainingBlockDir(block: MediaBlock): string | null {
  let dir: string | null = null;
  for (let i = 0; i < block.segments.length; i++) {
    const seg = block.segments[i];
    if (seg.dropped) continue;
    if (dir === null) {
      dir = seg.dirPrefix;
    } else if (seg.dirPrefix !== dir) {
      return null;
    }
  }
  return dir;
}

/**
 * Strips confirmed ad-injected HLS segments using strict structural signals
 * (explicit cue markers, unmistakable ad URL paths, and discontinuity-bounded
 * cross-directory or sequence-preserving same-directory islands).
 * Prioritizes zero false positives over catching ambiguous ads.
 */
export function stripM3u8Ads(
  m3u8Text: string,
  baseUrl?: string
): StripM3u8AdsResult {
  const noop: StripM3u8AdsResult = {
    content: m3u8Text,
    removedCount: 0,
    removedDuration: 0,
  };

  if (!m3u8Text || m3u8Text.indexOf("#EXTM3U") === -1) {
    return noop;
  }
  if (/#EXT-X-STREAM-INF\b/i.test(m3u8Text)) {
    return noop;
  }

  const eol = m3u8Text.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
  const hasTrailingNewline = /\r?\n$/.test(m3u8Text);
  const rawLines = m3u8Text.split(/\r?\n/);

  const headerLines: string[] = [];
  const blocks: MediaBlock[] = [];
  let currentBlock: MediaBlock = {
    hasLeadingDiscontinuity: false,
    segments: [],
    duration: 0,
    singleDir: null,
  };

  let inBody = false;
  let currentKey: string | null = null;
  let currentMap: string | null = null;
  let inCueOut = false;
  let pendingDuration = 0;
  let pendingSegTags: string[] = [];
  let hasEndList = false;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) continue;

    if (trimmed === "#EXT-X-ENDLIST") {
      hasEndList = true;
      break;
    }

    if (trimmed.indexOf("#EXT-X-KEY:") === 0) {
      currentKey = trimmed;
      continue;
    }

    if (trimmed.indexOf("#EXT-X-MAP:") === 0) {
      currentMap = trimmed;
      continue;
    }

    if (/^#EXT-X-CUE-OUT(?::|-CONT\b|$)/i.test(trimmed)) {
      inBody = true;
      inCueOut = true;
      continue;
    }

    if (/^#EXT-X-CUE-IN(?::|$)/i.test(trimmed)) {
      inBody = true;
      inCueOut = false;
      continue;
    }

    if (trimmed === "#EXT-X-DISCONTINUITY") {
      inBody = true;
      if (currentBlock.segments.length > 0) {
        computeBlockStats(currentBlock);
        blocks.push(currentBlock);
        currentBlock = {
          hasLeadingDiscontinuity: true,
          segments: [],
          duration: 0,
          singleDir: null,
        };
      } else {
        currentBlock.hasLeadingDiscontinuity = true;
      }
      pendingSegTags = [];
      pendingDuration = 0;
      continue;
    }

    if (trimmed.charAt(0) === "#") {
      if (trimmed.indexOf("#EXTINF:") === 0) {
        inBody = true;
        const durMatch = trimmed.match(/^#EXTINF:([\d.]+)/);
        pendingDuration = durMatch ? Number(durMatch[1]) || 0 : 0;
        pendingSegTags.push(trimmed);
      } else if (!inBody && isHeaderOnlyTag(trimmed)) {
        headerLines.push(trimmed);
      } else if (!inBody && blocks.length === 0 && currentBlock.segments.length === 0) {
        // Defer non-standard pre-splice comments inside header only before first segment
        if (pendingSegTags.length === 0) {
          headerLines.push(trimmed);
        } else {
          pendingSegTags.push(trimmed);
        }
      } else {
        pendingSegTags.push(trimmed);
      }
      continue;
    }

    inBody = true;
    const loc = parseSegmentLocation(trimmed, baseUrl);
    currentBlock.segments.push({
      rawUri: trimmed,
      resolvedUrl: loc.resolvedUrl,
      dirPrefix: loc.dirPrefix,
      filename: loc.filename,
      stem: loc.stem,
      format: classifyStemFormat(loc.stem),
      duration: pendingDuration,
      activeKey: currentKey,
      activeMap: currentMap,
      inCueOut,
      preTags: pendingSegTags,
      matchPath: loc.matchPath,
      dropped: false,
    });
    pendingSegTags = [];
    pendingDuration = 0;
  }

  if (currentBlock.segments.length > 0) {
    computeBlockStats(currentBlock);
    blocks.push(currentBlock);
  }

  let totalSegments = 0;
  let totalDuration = 0;
  const dirDurationMap: Record<string, number> = {};
  const formatCountMap: Record<string, number> = {};

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    for (let s = 0; s < block.segments.length; s++) {
      const seg = block.segments[s];
      totalSegments++;
      totalDuration += seg.duration;
      dirDurationMap[seg.dirPrefix] =
        (dirDurationMap[seg.dirPrefix] || 0) + seg.duration;
      formatCountMap[seg.format] = (formatCountMap[seg.format] || 0) + 1;
    }
  }

  if (totalSegments === 0) {
    return noop;
  }

  let dominantDir = "";
  let dominantDirDuration = -1;
  const dirKeys = Object.keys(dirDurationMap);
  for (let i = 0; i < dirKeys.length; i++) {
    const dir = dirKeys[i];
    if (dirDurationMap[dir] > dominantDirDuration) {
      dominantDirDuration = dirDurationMap[dir];
      dominantDir = dir;
    }
  }
  const dominantDirRatio =
    totalDuration > 0 ? dominantDirDuration / totalDuration : 0;

  let dominantFormat: string | null = null;
  const fmtKeys = Object.keys(formatCountMap);
  for (let i = 0; i < fmtKeys.length; i++) {
    const fmt = fmtKeys[i];
    if (formatCountMap[fmt] / totalSegments >= 0.8) {
      dominantFormat = fmt;
      break;
    }
  }

  // Rule 1: Explicit CUE-OUT..CUE-IN markers or unmistakable ad paths
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    for (let s = 0; s < block.segments.length; s++) {
      const seg = block.segments[s];
      if (seg.inCueOut || matchesAdPath(seg)) {
        seg.dropped = true;
      }
    }
  }

  // Rules 2 & 3 only apply when playlist has a clear dominant stream (>= 20 segs, >= 65% duration)
  if (totalSegments >= MIN_DOMINANT_SEGMENTS && dominantDirRatio >= MIN_DOMINANT_DIR_RATIO) {
    const midRollAdDirs: Record<string, boolean> = {};

    const hasRemainingDomBefore = (idx: number): boolean => {
      for (let j = idx - 1; j >= 0; j--) {
        if (!isBlockFullyDropped(blocks[j]) && getRemainingBlockDir(blocks[j]) === dominantDir) {
          return true;
        }
      }
      return false;
    };

    const hasRemainingDomAfter = (idx: number): boolean => {
      for (let j = idx + 1; j < blocks.length; j++) {
        if (!isBlockFullyDropped(blocks[j]) && getRemainingBlockDir(blocks[j]) === dominantDir) {
          return true;
        }
      }
      return false;
    };

    // Track any non-dominant mid-roll dirs already caught by Rule 1 so matching post-rolls can be cleaned too
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      if (
        block.singleDir &&
        block.singleDir !== dominantDir &&
        block.hasLeadingDiscontinuity &&
        isBlockFullyDropped(block) &&
        block.duration <= MAX_MIDROLL_DURATION &&
        block.segments.length <= MAX_ISLAND_SEGMENTS &&
        hasRemainingDomBefore(b) &&
        hasRemainingDomAfter(b)
      ) {
        midRollAdDirs[block.singleDir] = true;
      }
    }

    // Rule 2a: Discontinuity-bounded cross-directory mid-roll and short pre-roll islands
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      if (isBlockFullyDropped(block)) continue;
      if (!block.singleDir || block.singleDir === dominantDir) continue;
      if (block.segments.length > MAX_ISLAND_SEGMENTS) continue;

      const nextBlock = b + 1 < blocks.length ? blocks[b + 1] : null;
      const domBefore = hasRemainingDomBefore(b);
      const domAfter = hasRemainingDomAfter(b);

      if (
        block.hasLeadingDiscontinuity &&
        domBefore &&
        domAfter &&
        block.duration <= MAX_MIDROLL_DURATION &&
        nextBlock !== null &&
        nextBlock.hasLeadingDiscontinuity
      ) {
        dropWholeBlock(block);
        midRollAdDirs[block.singleDir] = true;
      } else if (
        !domBefore &&
        domAfter &&
        block.duration <= MAX_PREROLL_DURATION &&
        nextBlock !== null &&
        nextBlock.hasLeadingDiscontinuity &&
        getRemainingBlockDir(nextBlock) === dominantDir
      ) {
        dropWholeBlock(block);
        midRollAdDirs[block.singleDir] = true;
      }
    }

    // Rule 2b: Trailing post-roll matching an already-confirmed mid-roll ad directory
    for (let b = 1; b < blocks.length; b++) {
      const block = blocks[b];
      if (isBlockFullyDropped(block)) continue;
      if (!block.hasLeadingDiscontinuity) continue;
      if (!block.singleDir || block.singleDir === dominantDir) continue;
      if (!midRollAdDirs[block.singleDir]) continue;
      if (block.duration > MAX_PREROLL_DURATION || block.segments.length > MAX_ISLAND_SEGMENTS) {
        continue;
      }
      if (!hasRemainingDomBefore(b) || hasRemainingDomAfter(b)) continue;

      dropWholeBlock(block);
    }

    // Rule 3: Discontinuity-bounded same-directory island
    for (let b = 1; b < blocks.length - 1; b++) {
      const block = blocks[b];
      if (isBlockFullyDropped(block)) continue;
      if (!block.hasLeadingDiscontinuity) continue;
      const prevBlock = blocks[b - 1];
      const nextBlock = blocks[b + 1];
      if (!nextBlock.hasLeadingDiscontinuity) continue;
      if (block.singleDir !== dominantDir) continue;
      if (block.duration > MAX_MIDROLL_DURATION || block.segments.length > MAX_ISLAND_SEGMENTS) {
        continue;
      }
      if (isBlockFullyDropped(prevBlock) || isBlockFullyDropped(nextBlock)) continue;
      if (
        getRemainingBlockDir(prevBlock) !== dominantDir ||
        getRemainingBlockDir(nextBlock) !== dominantDir
      ) {
        continue;
      }

      let prevSeg: ParsedSegment | null = null;
      for (let s = prevBlock.segments.length - 1; s >= 0; s--) {
        if (!prevBlock.segments[s].dropped) {
          prevSeg = prevBlock.segments[s];
          break;
        }
      }
      let nextSeg: ParsedSegment | null = null;
      for (let s = 0; s < nextBlock.segments.length; s++) {
        if (!nextBlock.segments[s].dropped) {
          nextSeg = nextBlock.segments[s];
          break;
        }
      }
      if (!prevSeg || !nextSeg) continue;

      const firstCur = block.segments[0];
      const contiguousAround =
        isContiguousSequence(prevSeg.stem, nextSeg.stem) &&
        !isContiguousSequence(prevSeg.stem, firstCur.stem);

      let formatMismatch = false;
      if (
        !contiguousAround &&
        dominantFormat !== null &&
        dominantFormat !== "other" &&
        prevSeg.format === dominantFormat &&
        nextSeg.format === dominantFormat &&
        (dominantFormat !== "random_alnum" || block.segments.length >= 2)
      ) {
        formatMismatch = true;
        for (let s = 0; s < block.segments.length; s++) {
          if (block.segments[s].format === dominantFormat) {
            formatMismatch = false;
            break;
          }
        }
      }

      if (contiguousAround || formatMismatch) {
        dropWholeBlock(block);
      }
    }
  }

  let removedCount = 0;
  let removedDuration = 0;
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    for (let s = 0; s < block.segments.length; s++) {
      if (block.segments[s].dropped) {
        removedCount++;
        removedDuration += block.segments[s].duration;
      }
    }
  }

  if (removedCount === 0) {
    return noop;
  }

  const remainingCount = totalSegments - removedCount;
  const durationRatio = totalDuration > 0 ? removedDuration / totalDuration : 1;
  if (
    remainingCount === 0 ||
    removedCount / totalSegments > MAX_REMOVAL_RATIO ||
    removedDuration > HARD_MAX_REMOVED_SECONDS ||
    (removedDuration > SOFT_MAX_REMOVED_SECONDS &&
      durationRatio > SOFT_MAX_REMOVED_DURATION_RATIO)
  ) {
    return noop;
  }

  // Safe rebuild preserving discontinuity boundaries around non-contiguous splices and active KEY/MAP
  const outLines: string[] = headerLines.slice();
  let lastEmittedKey: string | null = null;
  let lastEmittedMap: string | null = null;
  let lastKeptSeg: ParsedSegment | null = null;
  let hadDropSinceLastKept = false;

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    let isFirstKeptInBlock = true;

    for (let s = 0; s < block.segments.length; s++) {
      const seg = block.segments[s];
      if (seg.dropped) {
        hadDropSinceLastKept = true;
        continue;
      }

      if (lastKeptSeg === null) {
        if (
          isFirstKeptInBlock &&
          block.hasLeadingDiscontinuity &&
          !hadDropSinceLastKept
        ) {
          outLines.push("#EXT-X-DISCONTINUITY");
        }
      } else if (!hadDropSinceLastKept) {
        if (isFirstKeptInBlock && block.hasLeadingDiscontinuity) {
          outLines.push("#EXT-X-DISCONTINUITY");
        }
      } else {
        const contiguousSplice =
          lastKeptSeg.dirPrefix === seg.dirPrefix &&
          isContiguousSequence(lastKeptSeg.stem, seg.stem);
        if (!contiguousSplice) {
          outLines.push("#EXT-X-DISCONTINUITY");
        }
      }

      const normK = normalizeKey(seg.activeKey);
      if (normK !== lastEmittedKey) {
        outLines.push(normK !== null ? normK : "#EXT-X-KEY:METHOD=NONE");
        lastEmittedKey = normK;
      }

      if (seg.activeMap !== null && seg.activeMap !== lastEmittedMap) {
        outLines.push(seg.activeMap);
        lastEmittedMap = seg.activeMap;
      }

      for (let t = 0; t < seg.preTags.length; t++) {
        outLines.push(seg.preTags[t]);
      }
      outLines.push(seg.rawUri);

      lastKeptSeg = seg;
      hadDropSinceLastKept = false;
      isFirstKeptInBlock = false;
    }
  }

  if (hasEndList) {
    outLines.push("#EXT-X-ENDLIST");
  }

  const content = outLines.join(eol) + (hasTrailingNewline ? eol : "");
  return {
    content,
    removedCount,
    removedDuration,
  };
}
