import {
  TvboxConfigItem,
  VodSite,
  VodEpisode,
  VodPlayGroup,
  VodSeasonGroup,
  ResolvedStreamSource,
  VodResolveResponse,
} from "../types";
import { toSimplifiedChinese } from "../zhSimp";

export const AWESOME_ZHUIJU_TVBOX_CONFIGS: TvboxConfigItem[] = [
  {
    id: "xiao-ma",
    name: "小马 TVBox",
    url: "https://szyyds.cn/tv/x.json",
    type: "single",
    description: "Curated single-repo from awesome-zhuiju-free with 62 sites and 16 high-speed direct CMS sources",
    author: "小马",
    cmsSiteCount: 16,
    totalSiteCount: 62,
  },
  {
    id: "lao-liu-bei",
    name: "老刘备 TVBox",
    url: "https://raw.liucn.cc/box/m.json",
    type: "single",
    description: "Classic stable single-repo from awesome-zhuiju-free aggregating 234 sites and 15 direct CMS sources",
    author: "老刘备",
    cmsSiteCount: 15,
    totalSiteCount: 234,
  },
  {
    id: "chuang-xiang-ying-shi-tvbox",
    name: "创享影视 TVBox",
    url: "https://ys.cxkjg.cn/api/provide/tvbox",
    type: "single",
    description: "Official Chuangxiang TVBox feed providing 12 direct M3U8 CMS streaming providers",
    author: "创享影视",
    cmsSiteCount: 12,
    totalSiteCount: 12,
  },
  {
    id: "fan-tai-ying",
    name: "饭太硬",
    url: "http://www.饭太硬.net/tv",
    type: "single",
    description: "Top featured repository from awesome-zhuiju-free",
    author: "饭太硬",
  },
  {
    id: "fei-mao",
    name: "肥猫",
    url: "http://肥猫.net/",
    type: "single",
    description: "Popular high-definition repository from awesome-zhuiju-free",
    author: "肥猫",
  },
  {
    id: "xiao-he-zi-4k",
    name: "小盒子4K",
    url: "http://xhztv.top/4k.json",
    type: "single",
    description: "4K single-repo focused on high-definition series and theatrical releases",
    author: "小盒子",
    totalSiteCount: 48,
  },
  {
    id: "wu-ming",
    name: "无名 TVBox",
    url: "https://6800.kstore.vip/fish.json",
    type: "single",
    description: "Single-repo from awesome-zhuiju-free with 103 media sites",
    author: "无名",
    totalSiteCount: 103,
  },
  {
    id: "mo-yu-er",
    name: "摸鱼儿",
    url: "http://www.y456y.com",
    type: "single",
    description: "Moyu TVBox feed covering movies, anime, and variety shows",
    author: "摸鱼儿",
  },
  {
    id: "wang-er-xiao",
    name: "王二小放牛娃",
    url: "http://new.王二小放牛娃.top",
    type: "single",
    description: "WangErXiao single-repo TVBox configuration URL",
    author: "王二小",
  },
  {
    id: "ying-cang-tvbox",
    name: "影仓专线",
    url: "http://124.71.19.220/c/1",
    type: "single",
    description: "Dedicated lightweight TVBox configuration feed",
    author: "影仓",
  },
  {
    id: "xiao-he-zi-single",
    name: "小盒子单仓",
    url: "http://xhztv.top/xhz",
    type: "single",
    description: "Stable single-repo configuration from XiaoHeZi",
    author: "小盒子",
  },
  {
    id: "ao-wu",
    name: "嗷呜 TVBox",
    url: "http://itv666.cc/aowu/config.webp",
    type: "single",
    description: "AoWu image-masked TVBox configuration feed",
    author: "嗷呜",
  },
  {
    id: "ting-hao-share-multi",
    name: "挺好分享多仓",
    url: "http://ztha.top/TVBox/GYCK.json",
    type: "multi",
    description: "Multi-repo index from awesome-zhuiju-free containing multiple sub-repositories",
    author: "挺好分享",
  },
  {
    id: "xiao-he-zi-multi",
    name: "小盒子多仓",
    url: "http://xhztv.top/dc",
    type: "multi",
    description: "XiaoHeZi multi-repo index aggregating multiple popular TVBox feeds",
    author: "小盒子",
  },
  {
    id: "shi-guang-multi",
    name: "拾光多仓",
    url: "http://xmbjm.fh4u.org/dc.txt",
    type: "multi",
    description: "ShiGuang multi-repo text configuration feed",
    author: "拾光",
  },
];

// Curated CMS VOD providers verified for live direct HLS playback (CORS *),
// broad catalog coverage, and balanced 1080p quality + low latency.
// NOTE: Keep 8–10 verified sites so MAX_VOD_SUBREQUESTS (26) leaves budget for fallback keywords.
// Before changing or adding sources, follow the 5-step benchmark & repo list in AGENTS.md.
export const BUILTIN_VOD_SITES: VodSite[] = [
  {
    id: "modu",
    name: "魔都资源",
    api: "https://caiji.moduapi.cc/api.php/provide/vod",
    fromConfig: "LunaTV Direct",
    enabled: true,
  },
  {
    id: "bfzy",
    name: "暴风资源",
    api: "https://bfzyapi.com/api.php/provide/vod",
    fromConfig: "小马 / 老刘备 TVBox",
    enabled: true,
  },
  {
    id: "ffzy",
    name: "非凡资源",
    api: "https://cj.ffzyapi.com/api.php/provide/vod",
    fromConfig: "小马 / 老刘备 TVBox",
    enabled: true,
  },
  {
    id: "dytt",
    name: "电影天堂",
    api: "https://caiji.dyttzyapi.com/api.php/provide/vod",
    fromConfig: "小马 TVBox",
    enabled: true,
  },
  {
    id: "ikun",
    name: "iKun资源",
    api: "https://ikunzyapi.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju Direct",
    enabled: true,
  },
  {
    id: "lzzy",
    name: "量子资源",
    api: "https://cj.lziapi.com/api.php/provide/vod",
    fromConfig: "小马 / 老刘备 TVBox",
    enabled: true,
  },
  {
    id: "wujin",
    name: "无尽资源",
    api: "https://api.wujinapi.com/api.php/provide/vod",
    fromConfig: "LunaTV Direct",
    enabled: true,
  },
  {
    id: "ruyi",
    name: "如意资源",
    api: "https://cj.rycjapi.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju Direct",
    enabled: true,
  },
  {
    id: "hongniu",
    name: "红牛资源",
    api: "https://www.hongniuzy2.com/api.php/provide/vod",
    fromConfig: "小马 / 创享 TVBox",
    enabled: true,
  },
  {
    id: "360zy",
    name: "360资源",
    api: "https://360zy.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju Direct",
    enabled: true,
  },
];

// Quality & stream-speed tier (higher is preferred when title match and full-episode status tie).
// NOTE: Tier intentionally runs before API latencyMs because a fast JSON search endpoint does not imply a fast or 1080p video CDN.
const SOURCE_QUALITY_TIER: Record<string, number> = {
  modu: 3,
  bfzy: 3,
  ffzy: 3,
  dytt: 3,
  ikun: 3,
  lzzy: 2,
  ruyi: 2,
  hongniu: 2,
  wujin: 1,
  "360zy": 1,
};

function getSourceQualityTier(sourceId: string): number {
  const baseId = sourceId.replace(/_(yue|guo)$/, "");
  return SOURCE_QUALITY_TIER[baseId] ?? 1;
}

const dynamicVodSitesMap = new Map<string, VodSite>();

export function getAllVodSites(): VodSite[] {
  const combined = [...BUILTIN_VOD_SITES];
  const seenApis = new Set(combined.map((s) => normalizeApiUrl(s.api)));
  for (const site of dynamicVodSitesMap.values()) {
    const norm = normalizeApiUrl(site.api);
    if (!seenApis.has(norm)) {
      seenApis.add(norm);
      combined.push(site);
    }
  }
  return combined;
}

function normalizeApiUrl(apiUrl: string): string {
  return apiUrl
    .trim()
    .replace(/\/+\?ac=list$/i, "")
    .replace(/\?ac=list$/i, "")
    .replace(/\/+$/, "");
}

function cleanTvboxJsonText(rawText: string): string {
  let text = rawText.trim();
  // Check for ** base64 obfuscation used by some TVBox configs
  if (text.includes("**")) {
    const parts = text.split("**");
    const b64Candidate = parts[parts.length - 1].trim();
    try {
      const decoded = Buffer.from(b64Candidate, "base64").toString("utf-8");
      if (decoded.includes("{") && (decoded.includes("sites") || decoded.includes("urls"))) {
        text = decoded;
      }
    } catch {}
  }

  // Strip full-line // comments and /* */ block comments
  text = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // Remove unescaped control characters inside strings
  text = text.replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]+/g, " ");
  return text;
}

export async function parseTvboxConfig(
  url: string,
  configName = "Custom TVBox"
): Promise<{
  ok: boolean;
  type: "single" | "multi" | "unknown";
  totalSites: number;
  extractedSites: VodSite[];
  subRepos?: { name: string; url: string }[];
  message?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return {
        ok: false,
        type: "unknown",
        totalSites: 0,
        extractedSites: [],
        message: `HTTP ${response.status} from ${url}`,
      };
    }

    const rawText = await response.text();
    const cleaned = cleanTvboxJsonText(rawText);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        ok: false,
        type: "unknown",
        totalSites: 0,
        extractedSites: [],
        message: "This feed uses custom JAR encryption; built-in high-speed CMS providers are active as fallback.",
      };
    }

    // Handle multi-repo (多仓)
    const multiUrls = parsed.urls || parsed.storeHouse;
    if (Array.isArray(multiUrls) && multiUrls.length > 0) {
      const subRepos = multiUrls
        .filter((u: any) => u && typeof u.url === "string")
        .map((u: any) => ({
          name: String(u.name || u.sourceName || "Sub-Repo").trim(),
          url: String(u.url).trim(),
        }));
      return {
        ok: true,
        type: "multi",
        totalSites: subRepos.length,
        extractedSites: [],
        subRepos,
        message: `Parsed multi-repo config with ${subRepos.length} sub-repositories.`,
      };
    }

    // Handle single-repo (单仓)
    const sites = Array.isArray(parsed.sites) ? parsed.sites : [];
    const extractedSites: VodSite[] = [];

    for (const s of sites) {
      if (!s || typeof s.api !== "string") continue;
      const apiRaw = s.api.trim();
      if (!apiRaw.startsWith("http://") && !apiRaw.startsWith("https://")) continue;

      // Skip XML-only or non-JSON spider scripts (.js, .py, .jar)
      if (
        apiRaw.endsWith(".js") ||
        apiRaw.endsWith(".py") ||
        apiRaw.endsWith(".jar") ||
        apiRaw.includes("/at/xml")
      ) {
        continue;
      }

      const isCmsVod =
        s.type === 1 ||
        apiRaw.includes("/provide/vod") ||
        apiRaw.includes("api.php/provide");

      if (isCmsVod) {
        const cleanApi = normalizeApiUrl(apiRaw);
        const siteId = `dyn_${Buffer.from(cleanApi).toString("base64url").slice(0, 14)}`;
        const cleanName = String(s.name || s.key || "TVBox Source")
          .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s|()-]/g, "")
          .trim();

        const vodSite: VodSite = {
          id: siteId,
          name: cleanName || "TVBox Source",
          api: cleanApi,
          fromConfig: configName,
          enabled: true,
        };
        extractedSites.push(vodSite);
        dynamicVodSitesMap.set(siteId, vodSite);
      }
    }

    return {
      ok: true,
      type: "single",
      totalSites: sites.length,
      extractedSites,
      message:
        extractedSites.length > 0
          ? `Parsed ${sites.length} sites and activated ${extractedSites.length} direct M3U8 providers.`
          : `Parsed ${sites.length} sites (Android JAR spiders; built-in direct CMS providers remain active).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      type: "unknown",
      totalSites: 0,
      extractedSites: [],
      message: err?.message || "Connection timed out while fetching config URL.",
    };
  }
}

export function parseVodPlayGroups(
  vodPlayFrom = "",
  vodPlayUrl = ""
): { playGroups: VodPlayGroup[]; bestEpisodes: VodEpisode[] } {
  const fromList = vodPlayFrom ? vodPlayFrom.split("$$$") : ["Default"];
  const urlGroupList = vodPlayUrl ? vodPlayUrl.split("$$$") : [];

  const playGroups: VodPlayGroup[] = [];

  urlGroupList.forEach((rawGroup, idx) => {
    const groupName = (fromList[idx] || `Route ${idx + 1}`).trim();
    const rawItems = rawGroup
      .split("#")
      .map((item) => item.trim())
      .filter(Boolean);

    const episodes: VodEpisode[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const part = rawItems[i];
      let epName = `Ep ${i + 1}`;
      let epUrl = part;

      const dollarIdx = part.indexOf("$");
      if (dollarIdx >= 0) {
        epName = part.slice(0, dollarIdx).trim() || epName;
        epUrl = part.slice(dollarIdx + 1).trim();
      }

      if (
        (epUrl.startsWith("http://") || epUrl.startsWith("https://")) &&
        (epUrl.toLowerCase().includes(".m3u8") || epUrl.toLowerCase().includes(".mp4"))
      ) {
        episodes.push({ name: epName, url: epUrl });
      }
    }

    if (episodes.length > 0) {
      playGroups.push({ groupName, episodes });
    }
  });

  // Pick the group with the most direct .m3u8 episodes (preferring groups named *m3u8*)
  const sortedGroups = [...playGroups].sort((a, b) => {
    const aIsM3u8 = a.groupName.toLowerCase().includes("m3u8") ? 1 : 0;
    const bIsM3u8 = b.groupName.toLowerCase().includes("m3u8") ? 1 : 0;
    if (aIsM3u8 !== bIsM3u8) return bIsM3u8 - aIsM3u8;
    return b.episodes.length - a.episodes.length;
  });

  return {
    playGroups: sortedGroups,
    bestEpisodes: sortedGroups[0]?.episodes || [],
  };
}

export { toSimplifiedChinese };

const CHINESE_NUMERAL_MAP: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

function parseChineseNumeral(str: string): number | null {
  const trimmed = str.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (trimmed === "十") return 10;
  if (trimmed.startsWith("十") && trimmed.length === 2) {
    const ones = CHINESE_NUMERAL_MAP[trimmed[1]];
    return ones !== undefined ? 10 + ones : null;
  }
  if (trimmed.endsWith("十") && trimmed.length === 2) {
    const tens = CHINESE_NUMERAL_MAP[trimmed[0]];
    return tens !== undefined ? tens * 10 : null;
  }
  if (trimmed.length === 3 && trimmed[1] === "十") {
    const tens = CHINESE_NUMERAL_MAP[trimmed[0]];
    const ones = CHINESE_NUMERAL_MAP[trimmed[2]];
    if (tens !== undefined && ones !== undefined) return tens * 10 + ones;
  }
  if (trimmed.length === 1 && CHINESE_NUMERAL_MAP[trimmed] !== undefined) {
    return CHINESE_NUMERAL_MAP[trimmed];
  }
  return null;
}

export function stripYearSuffix(title: string): string {
  return title.replace(/\s*[(（【\[{](?:19|20)\d{2}[)）】\]}]\s*$/, "").trim();
}

export function extractAudioLangFromText(
  vodName: string,
  vodLang = "",
  vodRemarks = ""
): "粤语" | "国语" | undefined {
  const simpName = toSimplifiedChinese(vodName);
  const simpRemarks = toSimplifiedChinese(vodRemarks);
  const simpLang = toSimplifiedChinese(vodLang);

  // Check vod_name first (most authoritative for split Cantonese/Mandarin entries)
  if (/(粤语|粤配|粤音)/.test(simpName)) return "粤语";
  if (/(国语|普通话|国配)/.test(simpName)) return "国语";

  // Check vod_remarks next
  if (/(粤语|粤配)/.test(simpRemarks) && !/(国语|普通话)/.test(simpRemarks)) {
    return "粤语";
  }
  if (/(国语|普通话)/.test(simpRemarks) && !/(粤语|粤配)/.test(simpRemarks)) {
    return "国语";
  }

  // Check vod_lang if it unambiguously specifies single Cantonese or Mandarin
  if (simpLang) {
    const hasYue = /(粤语|粤)/.test(simpLang);
    const hasGuo = /(国语|普通话)/.test(simpLang);
    if (hasYue && !hasGuo) return "粤语";
    if (hasGuo && !hasYue) return "国语";
  }

  return undefined;
}

export function detectSourceQuality(
  vodRemarks = "",
  vodName = "",
  firstEpName = "",
  groupName = ""
): "4K" | "2K" | "1080P" | "HD" | "CAM" {
  const combined = `${vodRemarks} ${vodName} ${firstEpName} ${groupName}`.toLowerCase();
  if (/(?:4k|2160p|uhd|4k超清|4k原画|4k高码)/i.test(combined)) return "4K";
  if (/(?:2k|1440p|qhd)/i.test(combined)) return "2K";
  if (/(?:1080p|fhd|蓝光|bd|1080高清)/i.test(combined)) return "1080P";
  if (/(?:tc|ts|cam|抢先)/i.test(combined)) return "CAM";
  if (/(?:720p|hd|超清|高清)/i.test(combined)) return "1080P";
  return "1080P";
}

export function stripLanguageAndStatusTags(input: string): string {
  let clean = input.trim();
  // Strip bracketed tags like [美剧], (粤语), (国语版), 【更新至16集】
  clean = clean
    .replace(
      /[(（【\[][^)\]）】]*(更新|全集|完结|国语|粤语|普通话|国配|粤配|台配|双语|中字|双字|BD|HD|4K|1080P)[^)\]）】]*[)\]）】]/gi,
      ""
    )
    .trim();

  // Strip unbracketed trailing language edition suffixes like "璀璨之城粤语", "璀璨之城国语版", "新闻女王 普通话", "巾帼枭雄-粤语版"
  clean = clean
    .replace(
      /[\s\-—_·:：]*(?:国粤双语版?|粤语配音版?|国语配音版?|普通话配音版?|粤语版|国语版|普通话版|粤配版|国配版|台配版|粤语|国语|普通话)\s*$/gi,
      ""
    )
    .trim();

  return clean;
}

export function parseSeasonInfo(rawTitle: string): {
  baseTitle: string;
  seasonNumber: number | null;
  audioLang?: "粤语" | "国语";
} {
  const simpRaw = toSimplifiedChinese(stripYearSuffix(rawTitle)).trim();
  const audioLang = extractAudioLangFromText(simpRaw);

  let clean = stripLanguageAndStatusTags(simpRaw);

  // Match Chinese "第X季" or "第X部" at or near the end
  const zhSeasonMatch = clean.match(
    /^(.*?)\s*第\s*([一二两三四五六七八九十\d]+)\s*[季部]\s*$/
  );
  if (zhSeasonMatch) {
    const base = stripLanguageAndStatusTags(zhSeasonMatch[1]);
    const num = parseChineseNumeral(zhSeasonMatch[2]);
    if (base.length >= 1 && num !== null && num > 0 && num <= 50) {
      return { baseTitle: base, seasonNumber: num, audioLang };
    }
  }

  // Match English "Season X" or "S01" at the end
  const enSeasonMatch = clean.match(
    /^(.*?)\s*(?:Season\s*0*(\d+)|S0*(\d+))\s*$/i
  );
  if (enSeasonMatch) {
    const base = stripLanguageAndStatusTags(enSeasonMatch[1]);
    const num = parseInt(enSeasonMatch[2] || enSeasonMatch[3], 10);
    if (base.length >= 1 && !Number.isNaN(num) && num > 0 && num <= 50) {
      return { baseTitle: base, seasonNumber: num, audioLang };
    }
  }

  // Match trailing sequel/season digit like "新闻女王2" or "庆余年2" (single digit 2..9 after Chinese/non-digit characters)
  const trailingDigitSeasonMatch = clean.match(
    /^([\u4e00-\u9fffA-Za-z][^0-9]*?)\s*([2-9])$/
  );
  if (trailingDigitSeasonMatch) {
    const base = stripLanguageAndStatusTags(trailingDigitSeasonMatch[1]);
    const num = parseInt(trailingDigitSeasonMatch[2], 10);
    if (base.length >= 2 && !Number.isNaN(num)) {
      return { baseTitle: base, seasonNumber: num, audioLang };
    }
  }

  return { baseTitle: clean, seasonNumber: null, audioLang };
}

export function normalizeTitleForComparison(title: string): string {
  return toSimplifiedChinese(title)
    .toLowerCase()
    .replace(/[\s:：·\-—_!！?？,，.。'’"“”()（）[\]【】*＊]/g, "")
    .trim();
}

export function extractNumbers(str: string): string[] {
  return str.match(/\d+/g) || [];
}

export function generateZhTitleVariants(
  rawZh?: string,
  mediaType?: "movie" | "tv"
): {
  variants: string[];
  probeKeyword: string;
} {
  if (!rawZh || typeof rawZh !== "string") {
    return { variants: [], probeKeyword: "" };
  }
  const simp = toSimplifiedChinese(stripYearSuffix(rawZh)).trim();
  if (!simp) return { variants: [], probeKeyword: "" };

  const variants = new Set<string>();
  variants.add(simp);

  let probeKeyword = simp;

  // Only treat explicit colons (: / ：) as title:subtitle separators so space-separated
  // sequels like "沙丘 2" or "唐探 1900" are never rewritten with a bogus colon.
  const colonMatch = simp.match(/^([^:：]+?)[:：]\s*(.+)$/);
  if (colonMatch) {
    const left = colonMatch[1].trim();
    const sub = colonMatch[2].trim();
    // Require at least one non-numeral char before a trailing sequel number so prefixes
    // like "007：无暇赴死" stay intact instead of splitting into "0" + "07".
    const leftNumMatch = left.match(
      /^(.+?[^\d一二两三四五六七八九十\s])\s*([0-9]+|[一二两三四五六七八九十]+)$/
    );

    if (leftNumMatch) {
      const base = leftNumMatch[1].trim();
      const num = leftNumMatch[2].trim();
      probeKeyword = `${base}：${sub}`;

      variants.add(`${base}：${sub}`);
      variants.add(`${base} ${sub}`);
      variants.add(`${base}${sub}`);
      variants.add(`${base}${num}：${sub}`);
      variants.add(`${base}${num} ${sub}`);
      variants.add(`${base}${num}${sub}`);
      variants.add(`${base}${num}`);
    } else {
      probeKeyword = `${left}：${sub}`;
      variants.add(`${left}：${sub}`);
      variants.add(`${left} ${sub}`);
      variants.add(`${left}${sub}`);
    }
  } else {
    // Trailing sequel/year number (e.g. "沙丘 2", "流浪地球 2", "唐探 1900", "庆余年 2");
    // never splits purely numeric titles like "1917", "2012", or "二十二".
    const trailMatch = simp.match(
      /^(.+?[^\d一二两三四五六七八九十\s])\s*([0-9]+|[一二两三四五六七八九十]+)$/
    );
    if (trailMatch) {
      const base = trailMatch[1].trim();
      const num = trailMatch[2].trim();
      const compact = `${base}${num}`;
      variants.add(compact);
      variants.add(`${base} ${num}`);
      probeKeyword = mediaType === "tv" ? base : compact;
    } else {
      const cjkSpaceMatch = simp.match(/^([\u4e00-\u9fff]+)\s+([\u4e00-\u9fff]+)$/);
      if (cjkSpaceMatch) {
        variants.add(`${cjkSpaceMatch[1]}：${cjkSpaceMatch[2]}`);
        variants.add(`${cjkSpaceMatch[1]}${cjkSpaceMatch[2]}`);
      }
    }
  }

  return { variants: Array.from(variants), probeKeyword };
}

export function buildSearchKeywords(
  primaryTitles: string[],
  fallbackTitles: string[] = [],
  mediaType?: "movie" | "tv"
): string[] {
  const candidates: string[] = [];
  const seenNorm = new Set<string>();

  const pushKeyword = (raw?: string): string => {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const norm = normalizeTitleForComparison(trimmed);
    if (!norm || seenNorm.has(norm)) return "";
    seenNorm.add(norm);
    candidates.push(trimmed);
    return trimmed;
  };

  const toPreferredQuery = (raw: string): string => {
    const simp = toSimplifiedChinese(stripYearSuffix(raw)).trim();
    if (!simp) return "";
    if (mediaType === "tv" && /[\u4e00-\u9fff]/.test(simp)) {
      const { baseTitle } = parseSeasonInfo(simp);
      const target = baseTitle || simp;
      return generateZhTitleVariants(target, "tv").probeKeyword || target;
    }
    if (/[\u4e00-\u9fff]/.test(simp)) {
      return generateZhTitleVariants(simp, mediaType).probeKeyword || simp;
    }
    return simp;
  };

  const partitionByScript = (list: string[]) => {
    const zh: string[] = [];
    const other: string[] = [];
    for (const raw of list) {
      if (!raw || typeof raw !== "string") continue;
      const simp = toSimplifiedChinese(stripYearSuffix(raw)).trim();
      if (!simp) continue;
      if (/[\u4e00-\u9fff]/.test(simp)) {
        zh.push(simp);
      } else {
        other.push(simp);
      }
    }
    return { zh, other };
  };

  const { zh: zhPrimary, other: otherPrimary } = partitionByScript(primaryTitles);

  // Pass 1: First 2 distinct regional Chinese base titles (e.g. CN + TW/HK) before variants
  let firstZhQuery = "";
  for (const title of zhPrimary) {
    if (candidates.length >= 2) break;
    const preferred = toPreferredQuery(title);
    const added = pushKeyword(preferred);
    if (!firstZhQuery && (added || preferred)) {
      firstZhQuery = added || preferred;
    }
  }

  // Pass 2: Franchise/colon-stripped reduced query from the primary Chinese title
  if (firstZhQuery) {
    const beforeColon = firstZhQuery.split(/[:：]/)[0].trim();
    if (beforeColon.length >= 2 && !/^\d+$/.test(beforeColon)) {
      pushKeyword(beforeColon);
    }
    const baseFranchise = beforeColon.replace(/\d+$/, "").trim();
    if (baseFranchise.length >= 2 && !/^\d+$/.test(baseFranchise)) {
      pushKeyword(baseFranchise);
    }
  }

  // Pass 3: Remaining distinct primary Chinese titles, then EN / original titles
  for (let i = 0; i < zhPrimary.length; i++) {
    pushKeyword(toPreferredQuery(zhPrimary[i]));
  }
  for (const title of otherPrimary) {
    pushKeyword(toPreferredQuery(title));
  }

  // Pass 4: Fallback titles (normalized-deduplicated so punctuation variants never starve)
  const { zh: zhFallback, other: otherFallback } = partitionByScript(fallbackTitles);
  for (const title of [...zhFallback, ...otherFallback]) {
    if (mediaType === "tv") {
      const { baseTitle } = parseSeasonInfo(title);
      pushKeyword(baseTitle);
    }
    pushKeyword(title);
  }

  return candidates;
}

export interface PreparedTargetTitle {
  target: string;
  normFullTarget: string;
  numbersKey: string;
  hasNumbers: boolean;
}

export function prepareTargetTitles(
  targetTitles: string[],
  mediaType?: "movie" | "tv"
): PreparedTargetTitle[] {
  const prepared: PreparedTargetTitle[] = [];
  const seen = new Set<string>();
  for (const rawTarget of targetTitles) {
    const cleanTarget = stripLanguageAndStatusTags(
      toSimplifiedChinese(stripYearSuffix(rawTarget))
    );
    const { baseTitle: targetBaseTitle } =
      mediaType === "tv"
        ? parseSeasonInfo(rawTarget)
        : { baseTitle: cleanTarget };

    const target = normalizeTitleForComparison(targetBaseTitle);
    const normFullTarget = normalizeTitleForComparison(cleanTarget);
    if (!target) continue;

    const dedupKey = `${target}|${normFullTarget}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const nums = extractNumbers(target);
    prepared.push({
      target,
      normFullTarget,
      numbersKey: nums.join(","),
      hasNumbers: nums.length > 0,
    });
  }
  return prepared;
}

export function computeTitleMatchScore(
  vodName: string,
  vodSub: string,
  targetTitles: string[] | PreparedTargetTitle[],
  mediaType?: "movie" | "tv"
): number {
  if (!targetTitles || targetTitles.length === 0) return 0;

  const cleanVod = stripLanguageAndStatusTags(
    toSimplifiedChinese(stripYearSuffix(vodName))
  );
  const { baseTitle: vodBaseTitle } =
    mediaType === "tv"
      ? parseSeasonInfo(vodName)
      : { baseTitle: cleanVod };

  const normVodName = normalizeTitleForComparison(vodBaseTitle);
  const normCleanVod = normalizeTitleForComparison(cleanVod);
  if (!normVodName) return 0;

  const bareYearStrippedVod = cleanVod.replace(/\s*(?:19|20)\d{2}\s*$/, "").trim();
  const normVodNoBareYear =
    bareYearStrippedVod.length >= 2 && bareYearStrippedVod !== cleanVod
      ? normalizeTitleForComparison(
          mediaType === "tv"
            ? parseSeasonInfo(bareYearStrippedVod).baseTitle
            : bareYearStrippedVod
        )
      : "";

  const normAliases = vodSub
    .split(/[\/|,，;；、]+/)
    .map((s) => {
      const cleaned = stripLanguageAndStatusTags(
        toSimplifiedChinese(stripYearSuffix(s))
      );
      const base =
        mediaType === "tv" ? parseSeasonInfo(s).baseTitle : cleaned;
      return normalizeTitleForComparison(base);
    })
    .filter(Boolean);

  const vodNumbers = extractNumbers(normVodName);
  const vodNumbersKey = vodNumbers.join(",");
  const preparedTargets: PreparedTargetTitle[] =
    typeof targetTitles[0] === "string"
      ? prepareTargetTitles(targetTitles as string[], mediaType)
      : (targetTitles as PreparedTargetTitle[]);

  let bestScore = 0;

  for (const pt of preparedTargets) {
    const { target, normFullTarget, numbersKey, hasNumbers } = pt;

    if (normVodName === target || normCleanVod === normFullTarget) {
      bestScore = Math.max(bestScore, 260);
      continue;
    }

    if (normVodNoBareYear && !hasNumbers && normVodNoBareYear === target) {
      bestScore = Math.max(bestScore, 250);
      continue;
    }

    if (normAliases.includes(target) || normAliases.includes(normFullTarget)) {
      bestScore = Math.max(bestScore, 210);
      continue;
    }

    for (const alias of normAliases) {
      if (alias.includes(target) || alias.includes(normFullTarget)) {
        const extraLen = alias.length - target.length;
        if (target.length >= 8 || extraLen <= 25) {
          bestScore = Math.max(bestScore, 185);
        }
      }
    }

    const numbersConflict =
      (hasNumbers || vodNumbers.length > 0) && numbersKey !== vodNumbersKey;

    if (numbersConflict) {
      continue;
    }

    // Allow close containment if the shorter title is at least 75% of the longer title
    if (normVodName.includes(target) || target.includes(normVodName)) {
      const minLen = Math.min(normVodName.length, target.length);
      const maxLen = Math.max(normVodName.length, target.length);
      const ratio = maxLen > 0 ? minLen / maxLen : 0;
      if (ratio >= 0.75 && minLen >= 2) {
        bestScore = Math.max(bestScore, Math.round(145 + ratio * 50));
      }
    }
  }

  return bestScore;
}

export function evaluateYearMatch(
  mediaType: "movie" | "tv" | undefined,
  targetYear: string | undefined,
  vodYear: string | undefined,
  titleScore: number,
  seasonNumber = 1
): { matched: boolean; bonus: number } {
  if (!targetYear || !vodYear) {
    return { matched: true, bonus: 0 };
  }
  const targetY = Number(targetYear);
  const vodY = Number(vodYear);
  if (!Number.isFinite(targetY) || !Number.isFinite(vodY) || targetY <= 0 || vodY <= 0) {
    return { matched: true, bonus: 0 };
  }

  const yearDiff = Math.abs(vodY - targetY);

  if (mediaType === "tv") {
    // Multi-season TV shows have Season 1 in targetYear and Season 2..N in subsequent years
    if (vodY === targetY) {
      return { matched: true, bonus: 120 };
    }
    if (
      seasonNumber > 1 &&
      vodY >= targetY &&
      vodY <= targetY + Math.max(seasonNumber * 3, seasonNumber + 6) &&
      titleScore >= 185
    ) {
      return { matched: true, bonus: 95 };
    }
    if (yearDiff === 1 && titleScore >= 185) {
      return { matched: true, bonus: 40 };
    }
    if (vodY > targetY && titleScore >= 210) {
      return { matched: true, bonus: 30 };
    }
    return { matched: false, bonus: 0 };
  }

  // Movie release year verification (allows +-1yr for festival vs theatrical, +-2yr for exact title)
  if (vodY === targetY) {
    return { matched: true, bonus: 120 };
  }
  if (yearDiff === 1 && titleScore >= 185) {
    return { matched: true, bonus: titleScore >= 240 ? 35 : 25 };
  }
  if (yearDiff === 2 && titleScore >= 260) {
    return { matched: true, bonus: 0 };
  }
  return { matched: false, bonus: 0 };
}

const SITE_CIRCUIT_THRESHOLD = 3;
const SITE_CIRCUIT_COOLDOWN_MS = 120_000;
const siteCircuitMap = new Map<string, { failures: number; openUntil: number }>();

function isSiteInCooldown(siteId: string): boolean {
  const entry = siteCircuitMap.get(siteId);
  if (!entry) return false;
  if (entry.openUntil > Date.now()) return true;
  if (entry.openUntil > 0) {
    siteCircuitMap.delete(siteId);
  }
  return false;
}

function recordSiteSuccess(siteId: string): void {
  siteCircuitMap.delete(siteId);
}

function recordSiteFailure(siteId: string): void {
  const prev = siteCircuitMap.get(siteId);
  const failures = (prev?.failures ?? 0) + 1;
  const openUntil =
    failures >= SITE_CIRCUIT_THRESHOLD
      ? Date.now() + SITE_CIRCUIT_COOLDOWN_MS
      : 0;
  setBoundedCache(siteCircuitMap, siteId, { failures, openUntil }, 64);
}

async function searchSingleVodSite(
  site: VodSite,
  keyword: string,
  targetTitles: string[] | PreparedTargetTitle[],
  targetYear?: string,
  mediaType?: "movie" | "tv",
  timeoutMs = 2400,
  externalSignal?: AbortSignal
): Promise<ResolvedStreamSource[]> {
  if (externalSignal?.aborted) return [];
  const start = Date.now();
  const sep = site.api.includes("?") ? "&" : "?";
  const searchUrl = `${site.api}${sep}ac=videolist&wd=${encodeURIComponent(keyword)}`;

  const reqAc = new AbortController();
  const onExternalAbort = () => reqAc.abort();
  const timer = setTimeout(() => reqAc.abort(), timeoutMs);
  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json, text/plain, */*",
      },
      signal: reqAc.signal,
    });

    if (!res.ok) {
      recordSiteFailure(site.id);
      return [];
    }
    const data: any = await res.json();
    recordSiteSuccess(site.id);
    const list = Array.isArray(data?.list) ? data.list : [];
    if (list.length === 0) return [];

    const latencyMs = Date.now() - start;

    type ScoredCandidate = {
      item: any;
      score: number;
      seasonNumber: number;
      audioLang?: "粤语" | "国语";
      explicitTitleLang?: "粤语" | "国语";
      playGroups: VodPlayGroup[];
      episodes: VodEpisode[];
    };

    const validCandidates: ScoredCandidate[] = [];

    for (const item of list) {
      if (!item.vod_play_url) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodLang = String(item.vod_lang || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYear = vodYearMatch ? vodYearMatch[0] : "";

      // Reject recaps ("解说") and trailer-only placeholders ("预告"/"花絮"/"先导") or short-drama parodies ("短剧版")
      if (
        vodName.includes("解说") ||
        vodName.includes("预告") ||
        vodName.includes("短剧") ||
        vodRemarks.includes("预告") ||
        vodRemarks.includes("花絮") ||
        vodRemarks.includes("先导") ||
        vodRemarks.includes("电影解说")
      ) {
        continue;
      }

      const titleScore = computeTitleMatchScore(
        vodName,
        vodSub,
        targetTitles,
        mediaType
      );
      if (titleScore < 140) {
        continue;
      }

      const { seasonNumber: parsedSeason, audioLang: titleAudioLang } =
        parseSeasonInfo(vodName);
      const seasonNumber = parsedSeason || 1;
      const detectedLang =
        titleAudioLang || extractAudioLangFromText(vodName, vodLang, vodRemarks);

      let score = titleScore;

      // Shared release year verification (kept in sync with fast availability probe)
      const yearCheck = evaluateYearMatch(
        mediaType,
        targetYear,
        vodYear,
        titleScore,
        seasonNumber
      );
      if (!yearCheck.matched) {
        continue;
      }
      score += yearCheck.bonus;

      const { playGroups, bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;

      const hasNonTrailerEpisode = bestEpisodes.some(
        (ep) => !ep.name.includes("预告") && !ep.name.includes("花絮")
      );
      if (!hasNonTrailerEpisode) {
        continue;
      }

      if (mediaType === "tv" && bestEpisodes.length > 1) {
        score += 20;
      } else if (mediaType === "movie" && bestEpisodes.length <= 4) {
        score += 15;
      }

      if (score >= 160) {
        validCandidates.push({
          item,
          score,
          seasonNumber,
          audioLang: detectedLang,
          explicitTitleLang: titleAudioLang,
          playGroups,
          episodes: bestEpisodes,
        });
      }
    }

    if (validCandidates.length === 0) return [];

    // Check if this provider has explicit 粤语 / 国语 variants (or any Cantonese stream)
    const hasExplicitLangVariants = validCandidates.some(
      (c) => c.explicitTitleLang !== undefined || c.audioLang === "粤语"
    );

    const buildSourceFromCandidates = (
      cands: ScoredCandidate[],
      langTag?: "粤语" | "国语"
    ): ResolvedStreamSource | null => {
      if (cands.length === 0) return null;
      const suffix =
        langTag === "粤语" ? "_yue" : langTag === "国语" ? "_guo" : "";
      const sourceId = `${site.id}${suffix}`;

      if (mediaType === "tv") {
        const seasonMap = new Map<number, ScoredCandidate>();
        for (const cand of cands) {
          const existing = seasonMap.get(cand.seasonNumber);
          if (
            !existing ||
            cand.score > existing.score ||
            (cand.score === existing.score &&
              cand.episodes.length > existing.episodes.length)
          ) {
            seasonMap.set(cand.seasonNumber, cand);
          }
        }

        const sortedSeasons = Array.from(seasonMap.values()).sort(
          (a, b) => a.seasonNumber - b.seasonNumber
        );
        const primaryCand = sortedSeasons[0];
        const seasons: VodSeasonGroup[] = sortedSeasons.map((sc) => ({
          seasonNumber: sc.seasonNumber,
          name: `Season ${sc.seasonNumber}`,
          vodId: sc.item.vod_id,
          vodName: toSimplifiedChinese(String(sc.item.vod_name || keyword).trim()),
          episodes: sc.episodes,
        }));

        const tvQuality = detectSourceQuality(
          primaryCand.item.vod_remarks,
          primaryCand.item.vod_name,
          primaryCand.episodes[0]?.name,
          primaryCand.playGroups[0]?.groupName
        );

        return {
          sourceId,
          sourceName: site.name,
          audioLang: langTag,
          fromConfig: site.fromConfig,
          vodId: primaryCand.item.vod_id,
          vodName: toSimplifiedChinese(
            String(primaryCand.item.vod_name || keyword).trim()
          ),
          vodYear: primaryCand.item.vod_year
            ? String(primaryCand.item.vod_year)
            : undefined,
          vodRemarks: primaryCand.item.vod_remarks
            ? String(primaryCand.item.vod_remarks)
            : undefined,
          vodPic: primaryCand.item.vod_pic
            ? String(primaryCand.item.vod_pic)
            : undefined,
          latencyMs,
          quality: tvQuality,
          playGroups: primaryCand.playGroups,
          episodes: primaryCand.episodes,
          seasons,
        };
      }

      const sorted = [...cands].sort((a, b) => b.score - a.score);
      const bestCandidate = sorted[0];

      const movieQuality = detectSourceQuality(
        bestCandidate.item.vod_remarks,
        bestCandidate.item.vod_name,
        bestCandidate.episodes[0]?.name,
        bestCandidate.playGroups[0]?.groupName
      );

      return {
        sourceId,
        sourceName: site.name,
        audioLang: langTag,
        fromConfig: site.fromConfig,
        vodId: bestCandidate.item.vod_id,
        vodName: toSimplifiedChinese(
          String(bestCandidate.item.vod_name || keyword).trim()
        ),
        vodYear: bestCandidate.item.vod_year
          ? String(bestCandidate.item.vod_year)
          : undefined,
        vodRemarks: bestCandidate.item.vod_remarks
          ? String(bestCandidate.item.vod_remarks)
          : undefined,
        vodPic: bestCandidate.item.vod_pic
          ? String(bestCandidate.item.vod_pic)
          : undefined,
        latencyMs,
        quality: movieQuality,
        playGroups: bestCandidate.playGroups,
        episodes: bestCandidate.episodes,
      };
    };

    if (hasExplicitLangVariants) {
      const yueCands = validCandidates.filter(
        (c) => (c.explicitTitleLang || c.audioLang) === "粤语"
      );
      const guoCands = validCandidates.filter(
        (c) => (c.explicitTitleLang || c.audioLang) === "国语"
      );
      const neutralCands = validCandidates.filter(
        (c) => !c.explicitTitleLang && !c.audioLang
      );

      const results: ResolvedStreamSource[] = [];
      if (yueCands.length > 0) {
        const yueSrc = buildSourceFromCandidates(
          [...yueCands, ...neutralCands],
          "粤语"
        );
        if (yueSrc) results.push(yueSrc);
      }
      if (guoCands.length > 0) {
        const guoSrc = buildSourceFromCandidates(
          [...guoCands, ...neutralCands],
          "国语"
        );
        if (guoSrc) results.push(guoSrc);
      }
      if (results.length > 0) {
        return results;
      }
    }

    const singleSource = buildSourceFromCandidates(validCandidates, undefined);
    return singleSource ? [singleSource] : [];
  } catch {
    if (!externalSignal?.aborted) {
      recordSiteFailure(site.id);
    }
    return [];
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

export async function pingVodSite(siteId: string): Promise<{
  id: string;
  ok: boolean;
  latencyMs: number;
}> {
  const site = getAllVodSites().find((s) => s.id === siteId);
  if (!site) return { id: siteId, ok: false, latencyMs: 0 };

  const start = Date.now();
  const sep = site.api.includes("?") ? "&" : "?";
  try {
    const res = await fetch(`${site.api}${sep}ac=list&pg=1`, {
      headers: { "User-Agent": "okhttp/4.12.0" },
      signal: AbortSignal.timeout(4000),
    });
    const text = await res.text();
    const ok = res.ok && (text.includes('"list"') || text.includes('"class"'));
    return { id: siteId, ok, latencyMs: Date.now() - start };
  } catch {
    return { id: siteId, ok: false, latencyMs: Date.now() - start };
  }
}

interface TmdbCandidateMetadata {
  candidateTitles: string[];
  primaryTitles?: string[];
  releaseYear?: string;
  isUnreleased: boolean;
  primaryZhTitle?: string;
  expiresAt: number;
}

export function setBoundedCache<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxSize = 500
): void {
  if (map.size >= maxSize && !map.has(key)) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

const tmdbMetadataCache = new Map<string, TmdbCandidateMetadata>();
const resolvedStreamsCache = new Map<
  string,
  { data: VodResolveResponse; expiresAt: number }
>();
const availabilityCache = new Map<
  string,
  { available: boolean; primaryZhTitle?: string; expiresAt: number }
>();

const MOVIE_UNRELEASED_STATUSES = new Set([
  "Rumored",
  "Planned",
  "In Production",
  "Post Production",
  "Canceled",
]);
const TV_UNRELEASED_STATUSES = new Set(["Rumored", "Planned"]);

export function isMediaUnreleased(
  type: "movie" | "tv",
  data: {
    status?: unknown;
    release_date?: unknown;
    first_air_date?: unknown;
    number_of_episodes?: unknown;
    vote_count?: unknown;
  },
  todayIso = new Date().toISOString().slice(0, 10)
): boolean {
  const rawDate =
    type === "tv"
      ? data.first_air_date || data.release_date
      : data.release_date || data.first_air_date;
  const dateStr = typeof rawDate === "string" ? rawDate.trim() : "";
  const status = data.status ? String(data.status).trim() : "";
  const voteCount = Number(data.vote_count || 0);

  if (type === "tv") {
    // TMDB TV "Canceled" = already-aired series not renewed; "In Production" can also have aired episodes.
    if (TV_UNRELEASED_STATUSES.has(status)) return true;
    if (!dateStr || dateStr > todayIso) return true;
    if (typeof data.number_of_episodes === "number" && data.number_of_episodes <= 0) {
      return true;
    }
    return voteCount === 0;
  }

  if (MOVIE_UNRELEASED_STATUSES.has(status)) return true;
  if (dateStr && dateStr > todayIso) return true;
  return voteCount === 0;
}

async function getTmdbCandidateMetadata(
  type: "movie" | "tv",
  tmdbId: string,
  tmdbApiKey?: string,
  hintItem?: any
): Promise<TmdbCandidateMetadata> {
  const cacheKey = `${type}:${tmdbId}`;
  const cached = tmdbMetadataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const edgeCache =
    typeof caches !== "undefined" ? (caches as any).default : null;
  const edgeCacheReq =
    tmdbId && edgeCache
      ? new Request(`https://tmdb-meta.101movies.internal/v2/${type}/${tmdbId}`, {
          method: "GET",
        })
      : null;

  if (edgeCache && edgeCacheReq) {
    try {
      const edgeHit: Response | undefined = await edgeCache.match(edgeCacheReq);
      if (edgeHit) {
        const parsed = (await edgeHit.json()) as TmdbCandidateMetadata;
        if (parsed && Array.isArray(parsed.candidateTitles)) {
          const freshMeta: TmdbCandidateMetadata = {
            ...parsed,
            expiresAt: Date.now() + 60 * 60 * 1000,
          };
          setBoundedCache(tmdbMetadataCache, cacheKey, freshMeta, 500);
          return freshMeta;
        }
      }
    } catch {}
  }

  const candidateTitles: string[] = [];
  const primaryTitles: string[] = [];
  const primaryNorms = new Set<string>();
  let releaseYear: string | undefined;
  let isUnreleased = false;
  let primaryZhTitle: string | undefined;

  const addCandidateTitle = (raw?: string) => {
    if (!raw || typeof raw !== "string") return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const simp = toSimplifiedChinese(trimmed);
    if (!candidateTitles.includes(simp)) {
      candidateTitles.push(simp);
    }
    if (trimmed !== simp && !candidateTitles.includes(trimmed)) {
      candidateTitles.push(trimmed);
    }
  };

  const addPrimaryTitle = (raw?: string) => {
    if (!raw || typeof raw !== "string") return;
    const clean = toSimplifiedChinese(stripYearSuffix(raw)).trim();
    const norm = normalizeTitleForComparison(clean);
    if (!norm || primaryNorms.has(norm)) return;
    primaryNorms.add(norm);
    primaryTitles.push(clean);
  };

  if (hintItem) {
    const hintDate = hintItem.release_date || hintItem.first_air_date;
    if (hintDate && typeof hintDate === "string") {
      releaseYear = hintDate.slice(0, 4);
      const todayIso = new Date().toISOString().slice(0, 10);
      if (hintDate > todayIso) {
        isUnreleased = true;
      }
    }
    if (Number(hintItem.vote_count || 0) === 0) {
      isUnreleased = true;
    }
  }

  if (tmdbId && tmdbApiKey) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${tmdbApiKey}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const d: any = await res.json();
        const zhTitle = d.title || d.name;
        const origTitle = d.original_title || d.original_name;
        const dateStr = d.release_date || d.first_air_date;
        if (dateStr && typeof dateStr === "string") {
          releaseYear = dateStr.slice(0, 4);
        }
        isUnreleased = isMediaUnreleased(type, d);

        const allFoundZh = new Set<string>();
        if (zhTitle && /[\u4e00-\u9fff]/.test(zhTitle)) {
          allFoundZh.add(zhTitle.trim());
        }

        const transList = Array.isArray(d?.translations?.translations)
          ? d.translations.translations
          : [];
        const zhCountryOrder = ["CN", "SG", "TW", "HK"];
        for (const region of zhCountryOrder) {
          for (const tr of transList) {
            if (tr?.iso_639_1 === "zh" && tr?.iso_3166_1 === region) {
              const trTitle = tr?.data?.title || tr?.data?.name;
              if (trTitle && /[\u4e00-\u9fff]/.test(trTitle)) {
                allFoundZh.add(trTitle.trim());
              }
            }
          }
        }

        const altList = Array.isArray(d?.alternative_titles?.results)
          ? d.alternative_titles.results
          : Array.isArray(d?.alternative_titles?.titles)
          ? d.alternative_titles.titles
          : [];
        for (const alt of altList) {
          const altTitle = alt?.title || alt?.name;
          if (altTitle && /[\u4e00-\u9fff]/.test(altTitle)) {
            allFoundZh.add(altTitle.trim());
          }
        }

        for (const t of allFoundZh) {
          if (!primaryZhTitle) {
            primaryZhTitle = toSimplifiedChinese(t);
          }
          addPrimaryTitle(t);
          addCandidateTitle(t);
          const { variants } = generateZhTitleVariants(t, type);
          for (const v of variants) {
            addCandidateTitle(v);
          }
        }

        // Extract English title from translations instead of issuing a second en-US request
        for (const region of ["US", "GB", ""]) {
          const enTr = transList.find(
            (tr: any) =>
              tr?.iso_639_1 === "en" &&
              (!region || tr?.iso_3166_1 === region) &&
              (tr?.data?.title || tr?.data?.name)
          );
          if (enTr) {
            const enStr = String(enTr.data.title || enTr.data.name);
            addPrimaryTitle(enStr);
            addCandidateTitle(enStr);
            break;
          }
        }

        if (zhTitle) {
          addPrimaryTitle(zhTitle);
          addCandidateTitle(zhTitle);
        }
        if (origTitle) {
          addPrimaryTitle(origTitle);
          addCandidateTitle(origTitle);
        }
      }
    } catch {}
  }

  if (hintItem) {
    const hintEn = hintItem.en_title || hintItem.title || hintItem.name;
    const hintOrig = hintItem.original_title || hintItem.original_name;
    if (hintEn) {
      addPrimaryTitle(String(hintEn));
      addCandidateTitle(String(hintEn));
    }
    if (hintOrig) {
      addPrimaryTitle(String(hintOrig));
      addCandidateTitle(String(hintOrig));
    }
  }

  const meta: TmdbCandidateMetadata = {
    candidateTitles,
    primaryTitles,
    releaseYear,
    isUnreleased,
    primaryZhTitle,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  setBoundedCache(tmdbMetadataCache, cacheKey, meta, 500);

  if (edgeCache && edgeCacheReq && candidateTitles.length > 0) {
    edgeCache
      .put(
        edgeCacheReq,
        new Response(JSON.stringify(meta), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=21600",
          },
        })
      )
      .catch(() => {});
  }

  return meta;
}

export async function resolveStreamsForMedia(params: {
  tmdbId: string;
  type: "movie" | "tv";
  customKeyword?: string;
  disabledSiteIds?: string[];
  tmdbApiKey?: string;
}): Promise<VodResolveResponse> {
  const { tmdbId, type, customKeyword, disabledSiteIds = [], tmdbApiKey } = params;
  const cacheKey = `${type}:${tmdbId}:${customKeyword || ""}:${disabledSiteIds.join(",")}`;
  const cachedResolved = resolvedStreamsCache.get(cacheKey);
  if (cachedResolved && cachedResolved.expiresAt > Date.now()) {
    return cachedResolved.data;
  }

  const meta = await getTmdbCandidateMetadata(type, tmdbId, tmdbApiKey);
  const candidateTitles = [...meta.candidateTitles];
  const primaryTitles =
    Array.isArray(meta.primaryTitles) && meta.primaryTitles.length > 0
      ? [...meta.primaryTitles]
      : [...meta.candidateTitles];
  const releaseYear = meta.releaseYear;
  const isUnreleased = meta.isUnreleased;

  const trimmedCustomKeyword = customKeyword?.trim() || "";
  if (trimmedCustomKeyword) {
    const simp = toSimplifiedChinese(trimmedCustomKeyword);
    if (!candidateTitles.includes(simp)) candidateTitles.unshift(simp);
    if (trimmedCustomKeyword !== simp && !candidateTitles.includes(trimmedCustomKeyword)) {
      candidateTitles.unshift(trimmedCustomKeyword);
    }
    primaryTitles.unshift(simp);
  }

  const baseKeywords = buildSearchKeywords(primaryTitles, candidateTitles, type);
  const searchKeywords = trimmedCustomKeyword
    ? (() => {
        const customQuery = toSimplifiedChinese(trimmedCustomKeyword);
        const customNorm = normalizeTitleForComparison(customQuery);
        return [
          customQuery,
          ...baseKeywords.filter((k) => normalizeTitleForComparison(k) !== customNorm),
        ];
      })()
    : baseKeywords;
  const primaryQuery = searchKeywords[0] || "";

  // Do not resolve streams for unreleased movies/shows
  if (isUnreleased && !customKeyword) {
    const emptyRes: VodResolveResponse = {
      tmdbId,
      mediaType: type,
      searchQuery: primaryQuery,
      candidateTitles,
      releaseYear,
      sources: [],
    };
    setBoundedCache(
      availabilityCache,
      `${type}:${tmdbId}`,
      {
        available: false,
        primaryZhTitle: meta.primaryZhTitle,
        expiresAt: Date.now() + 30 * 60 * 1000,
      },
      1000
    );
    return emptyRes;
  }

  const disabledSet = new Set(disabledSiteIds);
  const enabledSites = getAllVodSites().filter(
    (s) => s.enabled !== false && !disabledSet.has(s.id)
  );
  const healthySites = enabledSites.filter((s) => !isSiteInCooldown(s.id));
  const activeSites = healthySites.length >= 3 ? healthySites : enabledSites;

  if (!primaryQuery || activeSites.length === 0) {
    return {
      tmdbId,
      mediaType: type,
      searchQuery: primaryQuery,
      candidateTitles,
      releaseYear,
      sources: [],
    };
  }

  const preparedTargets = prepareTargetTitles(candidateTitles, type);
  let matchedSources: ResolvedStreamSource[] = [];
  const matchedBaseSiteIds = new Set<string>();
  const maxKeywordsToTry = Math.min(searchKeywords.length, 3);
  // NOTE: Stay under Cloudflare Pages Functions' 50-subrequest ceiling across TMDB + up to 3 keyword rounds.
  const MAX_VOD_SUBREQUESTS = 26;
  const OVERALL_DEADLINE_MS = 3400;
  const resolveStart = Date.now();
  let vodSubrequestsUsed = 0;

  for (let kIdx = 0; kIdx < maxKeywordsToTry; kIdx++) {
    if (vodSubrequestsUsed >= MAX_VOD_SUBREQUESTS) break;
    if (kIdx > 0 && matchedBaseSiteIds.size >= 4) break;
    if (kIdx > 1 && matchedBaseSiteIds.size > 0) break;

    const remainingWallMs = OVERALL_DEADLINE_MS - (Date.now() - resolveStart);
    if (kIdx > 0 && remainingWallMs < 600) break;
    const roundTimeoutMs = Math.max(600, Math.min(2400, remainingWallMs));

    const kw = searchKeywords[kIdx];
    const remainingBudget = MAX_VOD_SUBREQUESTS - vodSubrequestsUsed;
    const remainingSites = activeSites
      .filter((s) => !matchedBaseSiteIds.has(s.id))
      .slice(0, remainingBudget);
    if (remainingSites.length === 0) break;

    vodSubrequestsUsed += remainingSites.length;

    const roundAc = new AbortController();
    const roundStart = Date.now();
    let softDeadlineTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      await Promise.allSettled(
        remainingSites.map(async (site) => {
          const siteSources = await searchSingleVodSite(
            site,
            kw,
            preparedTargets,
            releaseYear,
            type,
            roundTimeoutMs,
            roundAc.signal
          );
          if (siteSources.length > 0 && !matchedBaseSiteIds.has(site.id)) {
            matchedBaseSiteIds.add(site.id);
            matchedSources.push(...siteSources);

            const tier3MatchedCount = Array.from(matchedBaseSiteIds).filter(
              (baseId) => getSourceQualityTier(baseId) >= 3
            ).length;

            if (matchedBaseSiteIds.size >= 6 && tier3MatchedCount >= 3) {
              if (softDeadlineTimer) {
                clearTimeout(softDeadlineTimer);
                softDeadlineTimer = null;
              }
              roundAc.abort();
            } else if (
              !softDeadlineTimer &&
              matchedBaseSiteIds.size >= 4 &&
              tier3MatchedCount >= 2
            ) {
              const elapsed = Date.now() - roundStart;
              const graceMs = Math.max(250, 750 - elapsed);
              softDeadlineTimer = setTimeout(() => roundAc.abort(), graceMs);
            }
          }
        })
      );
    } finally {
      if (softDeadlineTimer) {
        clearTimeout(softDeadlineTimer);
        softDeadlineTimer = null;
      }
    }
  }

  const normPrimary = normalizeTitleForComparison(
    parseSeasonInfo(primaryQuery).baseTitle
  );
  matchedSources.sort((a, b) => {
    const aBase = normalizeTitleForComparison(
      parseSeasonInfo(a.vodName).baseTitle
    );
    const bBase = normalizeTitleForComparison(
      parseSeasonInfo(b.vodName).baseTitle
    );
    const aExactTitle = aBase === normPrimary ? 1 : 0;
    const bExactTitle = bBase === normPrimary ? 1 : 0;
    if (aExactTitle !== bExactTitle) return bExactTitle - aExactTitle;

    const aHasFull = a.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    const bHasFull = b.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    if (aHasFull !== bHasFull) return bHasFull - aHasFull;

    const aTier = getSourceQualityTier(a.sourceId);
    const bTier = getSourceQualityTier(b.sourceId);
    if (aTier !== bTier) return bTier - aTier;

    return a.latencyMs - b.latencyMs;
  });

  const response: VodResolveResponse = {
    tmdbId,
    mediaType: type,
    searchQuery: primaryQuery,
    candidateTitles,
    releaseYear,
    sources: matchedSources,
  };

  const ttl = matchedSources.length > 0 ? 30 * 60 * 1000 : 60 * 1000;
  setBoundedCache(
    resolvedStreamsCache,
    cacheKey,
    {
      data: response,
      expiresAt: Date.now() + ttl,
    },
    300
  );
  if (matchedSources.length > 0) {
    setBoundedCache(
      availabilityCache,
      `${type}:${tmdbId}`,
      {
        available: true,
        primaryZhTitle: meta.primaryZhTitle,
        expiresAt: Date.now() + ttl,
      },
      1000
    );
  }

  return response;
}

// Fast probe sites ordered by coverage and reliability
const FAST_PROBE_SITE_IDS = new Set([
  "bfzy",
  "lzzy",
  "modu",
  "wujin",
  "ffzy",
  "dytt",
  "ikun",
  "hongniu",
  "ruyi",
  "360zy",
]);

export async function checkMediaHasPlayableStreams(
  item: any,
  defaultType: "movie" | "tv",
  tmdbApiKey?: string
): Promise<{ available: boolean; primaryZhTitle?: string }> {
  if (!item || !item.id) return { available: false };
  const type: "movie" | "tv" =
    item.media_type === "tv" || defaultType === "tv" ? "tv" : "movie";
  const tmdbId = String(item.id);
  const availKey = `${type}:${tmdbId}`;

  const cached = availabilityCache.get(availKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      available: cached.available,
      primaryZhTitle: cached.primaryZhTitle,
    };
  }

  const meta = await getTmdbCandidateMetadata(type, tmdbId, tmdbApiKey, item);
  if (meta.isUnreleased || meta.candidateTitles.length === 0) {
    availabilityCache.set(availKey, {
      available: false,
      primaryZhTitle: meta.primaryZhTitle,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
    return { available: false, primaryZhTitle: meta.primaryZhTitle };
  }

  const searchKeywords = buildSearchKeywords(
    meta.primaryTitles || meta.candidateTitles,
    meta.candidateTitles,
    type
  );
  if (searchKeywords.length === 0) {
    return { available: false, primaryZhTitle: meta.primaryZhTitle };
  }

  const probeSites = getAllVodSites().filter(
    (s) => s.enabled !== false && FAST_PROBE_SITE_IDS.has(s.id)
  );
  const sitesToUse =
    probeSites.length > 0 ? probeSites : getAllVodSites().slice(0, 8);

  const keywordsToProbe = searchKeywords.slice(0, 2);

  for (const kw of keywordsToProbe) {
    try {
      const found = await Promise.any(
        sitesToUse.map(async (site) => {
          const sources = await searchSingleVodSite(
            site,
            kw,
            meta.candidateTitles,
            meta.releaseYear,
            type,
            1800
          );
          if (sources.length === 0) {
            throw new Error("no_match");
          }
          return true;
        })
      );
      if (found) {
        availabilityCache.set(availKey, {
          available: true,
          primaryZhTitle: meta.primaryZhTitle,
          expiresAt: Date.now() + 30 * 60 * 1000,
        });
        return { available: true, primaryZhTitle: meta.primaryZhTitle };
      }
    } catch {
      // Try next keyword if available
    }
  }

  availabilityCache.set(availKey, {
    available: false,
    primaryZhTitle: meta.primaryZhTitle,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  return { available: false, primaryZhTitle: meta.primaryZhTitle };
}

export async function filterItemsByServerAvailability(
  items: any[],
  defaultType: "movie" | "tv",
  tmdbApiKey?: string,
  concurrency = 8
): Promise<any[]> {
  if (!Array.isArray(items) || items.length === 0) return [];

  const results: (any | null)[] = new Array(items.length).fill(null);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) break;
        const item = items[idx];
        const { available, primaryZhTitle } =
          await checkMediaHasPlayableStreams(item, defaultType, tmdbApiKey);
        if (available) {
          if (item.is_chinese_origin && primaryZhTitle) {
            results[idx] = {
              ...item,
              title: item.title !== undefined ? primaryZhTitle : undefined,
              name: item.name !== undefined ? primaryZhTitle : undefined,
              zh_title: primaryZhTitle,
            };
          } else {
            results[idx] = item;
          }
        }
      }
    }
  );

  await Promise.all(workers);
  return results.filter(Boolean);
}
