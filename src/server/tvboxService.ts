import type {
  TvboxConfigItem,
  VodSite,
  VodEpisode,
  VodPlayGroup,
  VodSeasonGroup,
  TmdbSeasonSummary,
  ResolvedStreamSource,
  VodResolveResponse,
} from "../types.js";
import { toSimplifiedChinese } from "../zhSimp.js";

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

export function isIncompatibleVodCategory(
  typeName?: string,
  mediaType?: "movie" | "tv"
): boolean {
  const t = toSimplifiedChinese(String(typeName || "")).trim();
  if (!t) return false;
  if (/(解说|预告|短剧|爽剧|爽文|漫剧|福利|伦理|论理)/.test(t)) return true;
  if (mediaType === "tv") {
    return /^(?:动作|剧情|喜剧|爱情|科幻|恐怖|战争|犯罪|悬疑|奇幻|冒险|灾难|惊悚|武侠|历史|古装|动画|动漫|纪录)片$|电影|纪录片/.test(
      t
    );
  }
  if (mediaType === "movie") {
    return /(?:剧$|综艺)/.test(t);
  }
  return false;
}

export function isIncompatibleTvSpinOffOrAdaptation(
  vodName?: string,
  typeName?: string,
  mediaType?: "movie" | "tv",
  isAnimation?: boolean,
  vodSub = ""
): boolean {
  if (mediaType !== "tv") return false;
  const name = toSimplifiedChinese(String(vodName || "")).trim();
  const sub = toSimplifiedChinese(String(vodSub || "")).trim();
  const cat = toSimplifiedChinese(String(typeName || "")).trim();

  if (
    /(剧场版|总集篇|特别编辑版|特别剪辑版|特别篇|番外篇|番外|外传|衍生剧|特典|精华版|剪辑版|精选集|新编集版|新编辑版|编年史|幕后|纪录片|制作特辑|OVA|OAD|学园物语|休息时间|迷你剧场|小剧场|Q版剧场)/i.test(
      name
    ) ||
    /(?:^|[\s:：·\-—_(（\[【])(?:SP|THE\s+MOVIE)(?:$|[\s:：·\-—_)）\]】\d])/i.test(
      name
    )
  ) {
    return true;
  }

  if (
    sub &&
    (/(剧场版|总集篇|特别编辑版|特别剪辑版|特别篇|番外篇|番外|外传|衍生剧|特典|精华版|剪辑版|精选集|新编集版|新编辑版|纪录片|制作特辑|OVA|OAD|The\s+Movie)/i.test(
      sub
    ) ||
      /(?:^|[\s/:：·\-—_(（\[【])SP\d*(?:$|[\s/:：·\-—_)）\]】])/i.test(sub))
  ) {
    return true;
  }

  if (isAnimation === true) {
    if (/(真人版|真人剧|真人电影|电视剧版)/.test(name) || /(真人版|真人剧|真人电影|电视剧版)/.test(sub)) {
      return true;
    }
    if (
      cat &&
      /(欧美剧|美国剧|美剧|日剧|日本剧|韩剧|韩国剧|国产剧|内地剧|大陆剧|港剧|香港剧|台剧|台湾剧|泰剧|泰国剧|海外剧|英剧|英国剧|综艺)/.test(
        cat
      ) &&
      !/(动漫|动画|番剧)/.test(cat)
    ) {
      return true;
    }
  } else if (isAnimation === false) {
    if (cat && /(动漫|动画|番剧)/.test(cat)) {
      return true;
    }
  }

  return false;
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

const ROMAN_SEASON_MAP: Record<string, number> = {
  Ⅱ: 2,
  Ⅲ: 3,
  Ⅳ: 4,
  Ⅴ: 5,
  Ⅵ: 6,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

export function extractTrailingPartMarker(input: string): {
  cleaned: string;
  partNumber: number | null;
} {
  let cleaned = input.trim();
  let partNumber: number | null = null;

  const enPartMatch = cleaned.match(
    /^(.*?)(?:[\s\-—·:：]*)(?:Part|Pt)\.?\s*0*([1-9])\s*$/i
  );
  if (enPartMatch && enPartMatch[1].trim().length >= 2) {
    const p = parseInt(enPartMatch[2], 10);
    if (!Number.isNaN(p) && p >= 1 && p <= 9) {
      cleaned = enPartMatch[1].trim();
      partNumber = p;
    }
  }

  if (partNumber === null) {
    const zhCourMatch = cleaned.match(
      /^(.*?)\s*第\s*([一二两三四五六七八九十\d]+)\s*(?:部分|クール)\s*$/
    );
    if (zhCourMatch && zhCourMatch[1].trim().length >= 2) {
      const p = parseChineseNumeral(zhCourMatch[2]);
      if (p !== null && p >= 1 && p <= 9) {
        cleaned = zhCourMatch[1].trim();
        partNumber = p;
      }
    }
  }

  if (partNumber === null) {
    const periodMatch = cleaned.match(
      /^(.*?)\s*第\s*([2-9一二两三四五六七八九])\s*期\s*$/
    );
    if (periodMatch && periodMatch[1].trim().length >= 2) {
      const baseCandidate = periodMatch[1].trim();
      // Subtitled arcs such as "刀剑神域 爱丽丝篇 异界战争 第2期" represent split cours
      if (/篇|\s/.test(baseCandidate)) {
        const p = parseChineseNumeral(periodMatch[2]);
        if (p !== null && p >= 2 && p <= 9) {
          cleaned = baseCandidate;
          partNumber = p;
        }
      }
    }
  }

  return { cleaned, partNumber };
}

export function parseSeasonInfo(rawTitle: string): {
  baseTitle: string;
  seasonNumber: number | null;
  audioLang?: "粤语" | "国语";
  partNumber?: number | null;
  isFinalSeason?: boolean;
  subtitle?: string;
} {
  const simpRaw = toSimplifiedChinese(stripYearSuffix(rawTitle)).trim();
  const audioLang = extractAudioLangFromText(simpRaw);

  const strippedLang = stripLanguageAndStatusTags(simpRaw);
  const { cleaned: clean, partNumber } = extractTrailingPartMarker(strippedLang);

  // Match "最终季" / "Final Season" with optional arc subtitle
  const finalSeasonMatch = clean.match(
    /^(.+?)\s*(?:最终季|Final\s*Season)(?:\s*[:：\-—·]?\s*(.*))?$/i
  );
  if (finalSeasonMatch) {
    const base = stripLanguageAndStatusTags(finalSeasonMatch[1]);
    const rest = (finalSeasonMatch[2] || "").trim();
    if (base.length >= 2) {
      return {
        baseTitle: base,
        seasonNumber: null,
        audioLang,
        partNumber,
        isFinalSeason: true,
        subtitle: rest || undefined,
      };
    }
  }

  // Match colon-subtitled seasons first, e.g. "溏心风暴2：家好月圆粤语" or "法证先锋6之幸存者的救赎"
  const zhSubtitledSeasonMatch = clean.match(
    /^(.+?)\s*第\s*([一二两三四五六七八九十\d]+)\s*[季部期](?![曲集话回])(?:\s*[:：\-—·之]?\s*(.+))?$/
  );
  if (zhSubtitledSeasonMatch) {
    const base = stripLanguageAndStatusTags(zhSubtitledSeasonMatch[1]);
    const num = parseChineseNumeral(zhSubtitledSeasonMatch[2]);
    const sub = (zhSubtitledSeasonMatch[3] || "").trim();
    const minBaseLen = sub ? 2 : 1;
    if (base.length >= minBaseLen && num !== null && num > 0 && num <= 50) {
      return {
        baseTitle: base,
        seasonNumber: num,
        audioLang,
        partNumber,
        subtitle: sub || undefined,
      };
    }
  }

  const enSubtitledSeasonMatch = clean.match(
    /^(.+?)\s*(?:Season\s*0*(\d+)|S0*(\d+))(?:\s*[:：\-—·]\s*(.+)|\s+(.+))?$/i
  );
  if (enSubtitledSeasonMatch) {
    const base = stripLanguageAndStatusTags(enSubtitledSeasonMatch[1]);
    const num = parseInt(enSubtitledSeasonMatch[2] || enSubtitledSeasonMatch[3], 10);
    const sub = (enSubtitledSeasonMatch[4] || enSubtitledSeasonMatch[5] || "").trim();
    if (base.length >= 1 && !Number.isNaN(num) && num > 0 && num <= 50) {
      return {
        baseTitle: base,
        seasonNumber: num,
        audioLang,
        partNumber,
        subtitle: sub || undefined,
      };
    }
  }

  const digitSubtitledSeasonMatch = clean.match(
    /^([\u4e00-\u9fffA-Za-z][^\d:：]*?[^\d\s:：])\s*([2-9])\s*(?:[:：]|之)\s*(.+)$/
  );
  if (digitSubtitledSeasonMatch) {
    const base = stripLanguageAndStatusTags(digitSubtitledSeasonMatch[1]);
    const num = parseInt(digitSubtitledSeasonMatch[2], 10);
    const sub = (digitSubtitledSeasonMatch[3] || "").trim();
    if (
      base.length >= 2 &&
      !Number.isNaN(num) &&
      !/(剧场版|特别篇|总集篇|特别编辑版|番外篇|OVA|OAD|SP)$/i.test(base)
    ) {
      return {
        baseTitle: base,
        seasonNumber: num,
        audioLang,
        partNumber,
        subtitle: sub || undefined,
      };
    }
  }

  // Match trailing sequel/season digit like "新闻女王2" or "庆余年2" (single digit 2..9 after Chinese/non-digit characters)
  const trailingDigitSeasonMatch = clean.match(
    /^([\u4e00-\u9fffA-Za-z][^0-9]*?)\s*([2-9])$/
  );
  if (trailingDigitSeasonMatch) {
    const base = stripLanguageAndStatusTags(trailingDigitSeasonMatch[1]);
    const num = parseInt(trailingDigitSeasonMatch[2], 10);
    if (
      base.length >= 2 &&
      !Number.isNaN(num) &&
      !/(剧场版|特别篇|总集篇|特别编辑版|番外篇|OVA|OAD|SP)$/i.test(base)
    ) {
      return { baseTitle: base, seasonNumber: num, audioLang, partNumber };
    }
  }

  // Match trailing Unicode Roman numeral ("法证先锋Ⅲ") or space-delimited ASCII Roman numeral ("Sword Art Online II")
  const romanMatch = clean.match(
    /^([\u4e00-\u9fffA-Za-z].*?)(?:([ⅡⅢⅣⅤⅥ])|\s+(II|III|IV|VI))$/
  );
  if (romanMatch) {
    const base = stripLanguageAndStatusTags(romanMatch[1]);
    const tok = romanMatch[2] || romanMatch[3] || "";
    const num = ROMAN_SEASON_MAP[tok];
    if (
      base.length >= 2 &&
      num !== undefined &&
      !/(剧场版|特别篇|总集篇|特别编辑版|番外篇|OVA|OAD|SP)$/i.test(base)
    ) {
      return { baseTitle: base, seasonNumber: num, audioLang, partNumber };
    }
  }

  return { baseTitle: clean, seasonNumber: null, audioLang, partNumber };
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
      if (/[\u4e00-\u9fff]|^(?:19|20)\d{2}$/.test(simp)) {
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
    if (
      beforeColon.length >= 2 &&
      (!/^\d+$/.test(beforeColon) || /^(19|20)\d{2}$/.test(beforeColon))
    ) {
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

export interface TmdbSeasonMeta {
  seasonNumber: number;
  name: string;
  airDate?: string;
  airYear?: number;
  episodeCount?: number;
}

export interface PreparedTargetTitle {
  target: string;
  normFullTarget: string;
  rawClean: string;
  numbersKey: string;
  hasNumbers: boolean;
}

export function prepareTargetTitles(
  targetTitles: string[],
  mediaType?: "movie" | "tv"
): PreparedTargetTitle[] {
  const prepared: PreparedTargetTitle[] = [];
  const seen = new Set<string>();
  const addEntry = (rawStr: string, applySeasonParse: boolean) => {
    const cleanTarget = stripLanguageAndStatusTags(
      toSimplifiedChinese(stripYearSuffix(rawStr))
    );
    const { baseTitle: targetBaseTitle } = applySeasonParse
      ? parseSeasonInfo(rawStr)
      : { baseTitle: cleanTarget };

    const target = normalizeTitleForComparison(targetBaseTitle);
    const normFullTarget = normalizeTitleForComparison(cleanTarget);
    if (!target) return;

    const dedupKey = `${target}|${normFullTarget}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    const nums = extractNumbers(target);
    prepared.push({
      target,
      normFullTarget,
      rawClean: targetBaseTitle.trim() || cleanTarget.trim(),
      numbersKey: nums.join(","),
      hasNumbers: nums.length > 0,
    });
  };

  for (const rawTarget of targetTitles) {
    addEntry(rawTarget, mediaType === "tv");
    if (mediaType === "tv") {
      const simpClean = stripLanguageAndStatusTags(
        toSimplifiedChinese(stripYearSuffix(rawTarget))
      ).trim();
      const colonMatch = simpClean.match(/^([^:：]+?)[:：]\s*(.+)$/);
      if (colonMatch) {
        const left = colonMatch[1].trim();
        const cjkCount = (left.match(/[\u4e00-\u9fff]/g) || []).length;
        if (cjkCount >= 4) {
          addEntry(left, true);
        }
      }
    }
  }
  return prepared;
}

export function computeTitleMatchScore(
  vodName: string,
  vodSub: string,
  targetTitles: string[] | PreparedTargetTitle[],
  mediaType?: "movie" | "tv",
  targetYear?: string
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

  const bareYearMatch = cleanVod.match(/\s*((?:19|20)\d{2})\s*$/);
  const bareYearStrippedVod = bareYearMatch
    ? cleanVod.slice(0, bareYearMatch.index).trim()
    : "";
  const bareYear = bareYearMatch ? Number(bareYearMatch[1]) : NaN;
  const targetYearNum = targetYear ? Number(targetYear) : NaN;
  const bareYearMatchesTarget =
    !targetYear ||
    !Number.isFinite(targetYearNum) ||
    (Number.isFinite(bareYear) && Math.abs(bareYear - targetYearNum) <= 2);
  const normVodNoBareYear =
    bareYearMatchesTarget && bareYearStrippedVod.length >= 2
      ? normalizeTitleForComparison(
          mediaType === "tv"
            ? parseSeasonInfo(bareYearStrippedVod).baseTitle
            : bareYearStrippedVod
        )
      : "";

  const normAliases = vodSub
    .split(/[\/|,，;；、]+|\s{2,}/)
    .map((s) => {
      const noRegionTag = s.replace(/\s*[(（][港台陆美英日中韩新马澳加]+[)）]\s*/g, "").trim();
      const cleaned = stripLanguageAndStatusTags(
        toSimplifiedChinese(stripYearSuffix(noRegionTag))
      );
      const base =
        mediaType === "tv" ? parseSeasonInfo(noRegionTag).baseTitle : cleaned;
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
      const aliasNumbers = extractNumbers(alias);
      const aliasNumbersKey = aliasNumbers.join(",");
      if (
        (hasNumbers || aliasNumbers.length > 0) &&
        aliasNumbersKey !== numbersKey
      ) {
        continue;
      }
      if (alias.includes(target) || alias.includes(normFullTarget)) {
        const minLen = Math.min(alias.length, target.length);
        const maxLen = Math.max(alias.length, target.length);
        const extraLen = alias.length - target.length;
        const ratio = maxLen > 0 ? minLen / maxLen : 0;
        if (ratio >= 0.75 || (target.length >= 8 && extraLen <= 20)) {
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
  seasonNumber = 1,
  tmdbSeasonAirYears?: number[]
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
  const maxReasonableTvYear = new Date().getFullYear() + 1;

  if (mediaType === "tv") {
    // Multi-season TV shows have Season 1 in targetYear and Season 2..N in subsequent years
    if (vodY === targetY) {
      return { matched: true, bonus: 120 };
    }
    if (
      tmdbSeasonAirYears &&
      tmdbSeasonAirYears.length > 0 &&
      vodY >= targetY &&
      tmdbSeasonAirYears.some((y) => Math.abs(vodY - y) <= 1) &&
      titleScore >= 185
    ) {
      return { matched: true, bonus: 105 };
    }
    if (
      seasonNumber > 1 &&
      vodY >= targetY &&
      vodY <= maxReasonableTvYear &&
      titleScore >= 185
    ) {
      return { matched: true, bonus: 95 };
    }
    if (yearDiff === 1 && titleScore >= 185) {
      return { matched: true, bonus: 40 };
    }
    if (vodY > targetY && vodY <= maxReasonableTvYear && titleScore >= 210) {
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

export function parseAllIsoDateDays(raw: unknown): number[] {
  const str = String(raw || "").trim();
  if (!str) return [];
  const days: number[] = [];
  const seen = new Set<number>();
  const re = /((?:19|20)\d{2})[-/.](1[0-2]|0?[1-9])[-/.](3[01]|[12]\d|0?[1-9])(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      continue;
    }
    const dayNum = Math.floor(dt.getTime() / 86_400_000);
    if (!seen.has(dayNum)) {
      seen.add(dayNum);
      days.push(dayNum);
    }
  }
  return days;
}

export function parseSingleIsoDateDay(raw?: string): number | null {
  const days = parseAllIsoDateDays(raw);
  return days.length > 0 ? days[0] : null;
}

export function extractDoubanId(raw: unknown): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 100000) return null;
  return String(Math.floor(n));
}

export function getMinDayDiff(days: number[], targetDay: number | null): number | null {
  if (targetDay === null || days.length === 0) return null;
  let best = Infinity;
  for (const d of days) {
    const diff = Math.abs(d - targetDay);
    if (diff < best) best = diff;
  }
  return Number.isFinite(best) ? best : null;
}

interface RawSiteBatch {
  site: VodSite;
  keyword: string;
  list: any[];
  latencyMs: number;
}

interface CrossSiteDoubanConsensus {
  doubanDates: Map<string, Set<number>>;
  doubanSeason: Map<string, number>;
  matchedMovieDoubanIds: Set<string>;
}

function buildDoubanDatesMap(batches: RawSiteBatch[]): Map<string, Set<number>> {
  const doubanDates = new Map<string, Set<number>>();
  for (const batch of batches) {
    for (const item of batch.list) {
      const dbId = extractDoubanId(item?.vod_douban_id);
      if (!dbId) continue;
      const days = parseAllIsoDateDays(item?.vod_pubdate);
      if (days.length === 0) continue;
      let set = doubanDates.get(dbId);
      if (!set) {
        set = new Set<number>();
        doubanDates.set(dbId, set);
      }
      for (const d of days) set.add(d);
    }
  }
  return doubanDates;
}

function getEffectivePubDays(
  item: any,
  doubanDates?: Map<string, Set<number>>
): number[] {
  const own = parseAllIsoDateDays(item?.vod_pubdate);
  const dbId = extractDoubanId(item?.vod_douban_id);
  const pooled = dbId ? doubanDates?.get(dbId) : undefined;
  if (!pooled || pooled.size === 0) return own;
  if (own.length === 0) return Array.from(pooled);
  const merged = new Set<number>(own);
  for (const d of pooled) merged.add(d);
  return Array.from(merged);
}

export function matchTvSeasonByDateOrInterval(params: {
  pubDays: number[];
  tmdbSeasons: TmdbSeasonMeta[];
  episodeCount: number;
  partNumber: number | null;
  isFinalSeason: boolean;
  parsedSeasonNumber: number | null;
  hasExplicitTitleSeason: boolean;
  isAnimation?: boolean;
  isOngoingNow: boolean;
  isExactBaseTitle: boolean;
}): { seasonNumber: number; matchKind: "exact_date" | "cour_interval" } | null {
  const {
    pubDays,
    tmdbSeasons,
    episodeCount,
    partNumber,
    isFinalSeason,
    parsedSeasonNumber,
    hasExplicitTitleSeason,
    isAnimation,
    isOngoingNow,
    isExactBaseTitle,
  } = params;

  if (pubDays.length === 0 || tmdbSeasons.length === 0) return null;

  const seasonsWithDays = tmdbSeasons
    .filter((s) => s.seasonNumber > 0)
    .map((s) => ({
      ...s,
      airDay: parseSingleIsoDateDay(s.airDate),
    }))
    .filter((s): s is TmdbSeasonMeta & { airDay: number } => s.airDay !== null)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  if (seasonsWithDays.length === 0) return null;

  // Tier 1: Exact premiere date match (within +-4 days for JST/UTC/broadcast offsets)
  const exactHits: (TmdbSeasonMeta & { airDay: number; bestDiff: number })[] = [];
  for (const s of seasonsWithDays) {
    const diff = getMinDayDiff(pubDays, s.airDay);
    if (diff === null || diff > 4) continue;
    if (
      episodeCount <= 2 &&
      !isOngoingNow &&
      !(s.episodeCount !== undefined && s.episodeCount <= 2) &&
      !isExactBaseTitle
    ) {
      continue;
    }
    if (
      hasExplicitTitleSeason &&
      parsedSeasonNumber !== null &&
      parsedSeasonNumber !== s.seasonNumber &&
      diff > 2
    ) {
      continue;
    }
    exactHits.push({ ...s, bestDiff: diff });
  }

  if (exactHits.length === 1) {
    return { seasonNumber: exactHits[0].seasonNumber, matchKind: "exact_date" };
  }
  if (exactHits.length > 1) {
    exactHits.sort((a, b) => a.bestDiff - b.bestDiff);
    if (exactHits[0].bestDiff < exactHits[1].bestDiff) {
      return { seasonNumber: exactHits[0].seasonNumber, matchKind: "exact_date" };
    }
  }

  // Tier 2: Split-cour timeline interval match (e.g. Egypt Arc 2015-01-09 inside JoJo S2 2014..2016)
  if (episodeCount <= 2 && !isOngoingNow) return null;
  if (hasExplicitTitleSeason && parsedSeasonNumber !== null) return null;
  if (partNumber === null && !isFinalSeason && isAnimation !== true) return null;

  const intervalHits: TmdbSeasonMeta[] = [];
  for (let i = 0; i < seasonsWithDays.length; i++) {
    const s = seasonsWithDays[i];
    if (
      s.seasonNumber === 1 &&
      tmdbSeasons.length === 1 &&
      partNumber === null &&
      !isFinalSeason
    ) {
      continue;
    }
    if (
      s.episodeCount !== undefined &&
      s.episodeCount < 18 &&
      partNumber === null &&
      !isFinalSeason
    ) {
      continue;
    }
    const nextSeason = seasonsWithDays[i + 1];
    const upperBound = nextSeason
      ? nextSeason.airDay - 4
      : s.airDay + (partNumber !== null || isFinalSeason ? 730 : 540);
    const inInterval = pubDays.some((d) => d > s.airDay + 4 && d < upperBound);
    if (inInterval) {
      intervalHits.push(s);
    }
  }

  if (intervalHits.length === 1) {
    return { seasonNumber: intervalHits[0].seasonNumber, matchKind: "cour_interval" };
  }

  return null;
}

const GENERIC_SEASON_STOP_WORDS = new Set([
  "season",
  "part",
  "series",
  "specials",
  "special",
  "final",
  "finalseason",
  "最终季",
  "完结篇",
  "tv版",
  "动画版",
  "完结",
  "特别",
  "番外",
  "总集",
  "最终",
  "剧场",
  "前",
  "后",
  "上",
  "下",
  "中",
  "序",
  "终",
  "新",
  "真",
  "外",
  "续",
]);

function countCjkChars(str: string): number {
  return (str.match(/[\u4e00-\u9fff]/g) || []).length;
}

function isValidArcToken(tok: string): boolean {
  if (!tok || GENERIC_SEASON_STOP_WORDS.has(tok)) return false;
  if (/^第[一二两三四五六七八九十\d]+[季部期]$/.test(tok)) return false;
  if (/^(?:season|series|part|pt)\d+$/i.test(tok)) return false;
  const cjk = countCjkChars(tok);
  if (cjk >= 2) return true;
  const latin = (tok.match(/[a-z]/gi) || []).length;
  return latin >= 5;
}

export function extractTmdbSeasonArcTokens(
  season: TmdbSeasonMeta,
  preparedTargets: PreparedTargetTitle[]
): string[] {
  const rawName = toSimplifiedChinese(String(season?.name || "")).trim();
  if (!rawName) return [];

  let cleaned = rawName
    .replace(/第\s*[一二两三四五六七八九十\d]+\s*[季部期]/g, " ")
    .replace(/\b(?:Season|Series|Part|Pt)\.?\s*\d+\b/gi, " ")
    .replace(/(?:TV版|动画版)/gi, " ")
    .trim();

  // Strip leading target title prefix if TMDB season name repeats the show title
  const rawPrefixes = preparedTargets
    .map((pt) => pt.rawClean)
    .filter((s) => s.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const prefix of rawPrefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}[\\s:：·\\-—_]*`, "i");
    if (re.test(cleaned)) {
      cleaned = cleaned.replace(re, "").trim();
      break;
    }
  }

  const pieces = cleaned
    .split(/[\/、|·\-—:：,，;；]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const tokens: string[] = [];
  const seen = new Set<string>();
  const pushPiece = (raw: string) => {
    const norm = normalizeTitleForComparison(raw);
    if (!norm || seen.has(norm) || !isValidArcToken(norm)) return;
    seen.add(norm);
    tokens.push(norm);
    if (/[篇章]$/.test(norm)) {
      const stem = norm.slice(0, -1);
      if (stem && !seen.has(stem) && countCjkChars(stem) >= 2 && isValidArcToken(stem)) {
        seen.add(stem);
        tokens.push(stem);
      }
    }
  };

  for (const piece of pieces) {
    pushPiece(piece);
    const subParts = piece.split(/\s+/).filter(Boolean);
    if (subParts.length > 1) {
      for (const sp of subParts) {
        pushPiece(sp);
      }
    }
  }

  // Also include normalized whole cleaned string when multiple tokens combine into one arc name
  if (pieces.length > 1) {
    pushPiece(cleaned);
  }

  return tokens;
}

function doesAliasBaseMatchTargets(
  aliasBaseNorm: string,
  preparedTargets: PreparedTargetTitle[]
): boolean {
  if (!aliasBaseNorm) return false;
  for (const pt of preparedTargets) {
    if (aliasBaseNorm === pt.target || aliasBaseNorm === pt.normFullTarget) {
      return true;
    }
    if (
      countCjkChars(pt.rawClean) >= 2 &&
      aliasBaseNorm.startsWith(pt.target) &&
      aliasBaseNorm.length > pt.target.length
    ) {
      return true;
    }
  }
  return false;
}

export function extractSeasonFromAliases(
  vodSub: string,
  preparedTargets: PreparedTargetTitle[]
): {
  seasonNumber: number | null;
  partNumber: number | null;
  isFinalSeason: boolean;
} | null {
  if (!vodSub) return null;
  const parts = String(vodSub)
    .split(/[\/|,，;；、]+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  let best: {
    seasonNumber: number | null;
    partNumber: number | null;
    isFinalSeason: boolean;
    priority: number;
  } | null = null;

  for (const rawAlias of parts) {
    const cleanedAlias = toSimplifiedChinese(
      rawAlias
        .replace(/\s*[(（][港台陆美英日中韩新马澳加/]+[)）]\s*/g, " ")
        .replace(/\s*(?:TV版|动画版|新篇章)\s*/gi, " ")
        .trim()
    );
    if (!cleanedAlias) continue;

    const info = parseSeasonInfo(cleanedAlias);
    if (
      info.seasonNumber === null &&
      !info.isFinalSeason &&
      info.partNumber === null
    ) {
      continue;
    }

    const baseNorm = normalizeTitleForComparison(info.baseTitle);
    const hasPartPrefix = /^part\d+$/i.test(baseNorm) || baseNorm === "tv版";
    const matchesTarget =
      baseNorm && doesAliasBaseMatchTargets(baseNorm, preparedTargets);

    if (!matchesTarget && !hasPartPrefix) {
      // Allow standalone "第X季" inside multi-alias vod_sub when season token itself has no extra title words
      continue;
    }

    let priority = 0;
    if (matchesTarget && info.seasonNumber !== null) priority = 4;
    else if (matchesTarget && info.isFinalSeason) priority = 3;
    else if (matchesTarget && info.partNumber !== null) priority = 2;
    else if (hasPartPrefix && info.seasonNumber !== null) priority = 1;

    if (!best || priority > best.priority) {
      best = {
        seasonNumber: info.seasonNumber,
        partNumber: info.partNumber ?? null,
        isFinalSeason: Boolean(info.isFinalSeason),
        priority,
      };
    }
  }

  return best
    ? {
        seasonNumber: best.seasonNumber,
        partNumber: best.partNumber,
        isFinalSeason: best.isFinalSeason,
      }
    : null;
}

export function matchTmdbSeasonByArc(
  vodRestNorm: string,
  vodSubNorm: string,
  tmdbSeasons: TmdbSeasonMeta[] | undefined,
  preparedTargets: PreparedTargetTitle[]
): TmdbSeasonMeta | null {
  if (!tmdbSeasons || tmdbSeasons.length === 0) return null;

  let bestSeason: TmdbSeasonMeta | null = null;
  let bestScore = 0;

  for (const season of tmdbSeasons) {
    if (!season || season.seasonNumber <= 0) continue;
    const tokens = extractTmdbSeasonArcTokens(season, preparedTargets);
    if (tokens.length === 0) continue;

    for (const tok of tokens) {
      let score = 0;
      if (vodRestNorm && vodRestNorm === tok) {
        score = 300 + tok.length;
      } else if (vodRestNorm && vodRestNorm.includes(tok)) {
        score = 200 + tok.length;
      } else if (vodRestNorm && tok.includes(vodRestNorm) && countCjkChars(vodRestNorm) >= 2) {
        score = 160 + vodRestNorm.length;
      } else if (
        vodSubNorm &&
        (countCjkChars(tok) >= 2 || tok.length >= 6) &&
        vodSubNorm.includes(tok)
      ) {
        score = 120 + tok.length;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSeason = season;
      }
    }
  }

  return bestSeason;
}

function isOngoingCurrentYear(vodYear: string, vodRemarks: string): boolean {
  const curYear = new Date().getFullYear();
  const y = Number(vodYear);
  const simpRemarks = toSimplifiedChinese(vodRemarks || "");
  if (Number.isFinite(y) && y >= curYear && /更新至/.test(simpRemarks)) {
    return true;
  }
  return false;
}

function extractAnchoredPrefixAndRest(
  cleanVodNoPart: string,
  preparedTargets: PreparedTargetTitle[]
): {
  matchedTarget: PreparedTargetTitle;
  restRaw: string;
  normRest: string;
  hasCleanDelimiter: boolean;
} | null {
  const sortedTargets = [...preparedTargets].sort(
    (a, b) => b.rawClean.length - a.rawClean.length
  );
  const normWhole = normalizeTitleForComparison(cleanVodNoPart);

  for (const pt of sortedTargets) {
    const prefix = pt.rawClean;
    if (!prefix) continue;
    const targetCjk = countCjkChars(prefix);
    const lowerPrefix = toSimplifiedChinese(prefix).toLowerCase();
    const lowerWhole = cleanVodNoPart.toLowerCase();

    let rawRest: string | null = null;
    if (lowerWhole.startsWith(lowerPrefix)) {
      rawRest = cleanVodNoPart.slice(prefix.length);
    } else if (
      pt.target.length >= 2 &&
      normWhole.startsWith(pt.target) &&
      normWhole.length > pt.target.length
    ) {
      // Handle minor punctuation differences like "Re：" vs "Re:"
      const escapedChars = pt.target
        .split("")
        .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[\\s:：·\\-—_'’\"“”()（）]*");
      const fuzzyPrefixRe = new RegExp(`^${escapedChars}`, "i");
      const m = cleanVodNoPart.match(fuzzyPrefixRe);
      if (m) {
        rawRest = cleanVodNoPart.slice(m[0].length);
      }
    }

    if (rawRest === null) continue;

    const firstChar = rawRest.charAt(0);
    const hasCleanDelimiter =
      !firstChar || /^[\s:：\-—_·(（\[【]$/.test(firstChar);
    const trimmedRest = rawRest.replace(/^[\s:：\-—_·]+/, "").trim();
    const normRest = normalizeTitleForComparison(trimmedRest);

    if (!normRest) continue;

    // Boundary safety guard to avoid false prefix collisions like "海贼王女" or "死神来了"
    const restIsExplicitArc = normRest.startsWith("篇") || /篇\d*$/.test(normRest);
    if (!hasCleanDelimiter && targetCjk < 4 && !restIsExplicitArc) {
      continue;
    }

    return {
      matchedTarget: pt,
      restRaw: trimmedRest,
      normRest,
      hasCleanDelimiter,
    };
  }

  return null;
}

export interface TvCandidateResolution {
  matched: boolean;
  titleScore: number;
  seasonNumber: number | null;
  partNumber: number | null;
  isFinalSeason: boolean;
  arcKey: string;
  tmdbMatchedSeason: number | null;
  hasExplicitTitleSeason: boolean;
}

function reconcileAliasSeasonWithTmdb(
  aliasSeasonNum: number | null,
  vodYear: string,
  tmdbSeasons?: TmdbSeasonMeta[]
): { seasonNumber: number | null; tmdbYearMatched: number | null } {
  if (aliasSeasonNum === null || !tmdbSeasons || tmdbSeasons.length <= 1) {
    return { seasonNumber: aliasSeasonNum, tmdbYearMatched: null };
  }
  const vodY = vodYear ? Number(vodYear) : NaN;
  if (!Number.isFinite(vodY) || vodY <= 0) {
    return { seasonNumber: aliasSeasonNum, tmdbYearMatched: null };
  }
  const aliasTmdb = tmdbSeasons.find((s) => s.seasonNumber === aliasSeasonNum);
  const contradictsTmdb =
    !aliasTmdb ||
    (aliasTmdb.airYear !== undefined && Math.abs(vodY - aliasTmdb.airYear) >= 2);
  if (!contradictsTmdb) {
    return { seasonNumber: aliasSeasonNum, tmdbYearMatched: null };
  }
  const exactHits = tmdbSeasons.filter(
    (s) => s.seasonNumber >= 2 && s.airYear === vodY
  );
  if (exactHits.length === 1) {
    return {
      seasonNumber: exactHits[0].seasonNumber,
      tmdbYearMatched: exactHits[0].seasonNumber,
    };
  }
  const nearHits = tmdbSeasons.filter(
    (s) =>
      s.seasonNumber >= 2 &&
      s.airYear !== undefined &&
      Math.abs(s.airYear - vodY) <= 1
  );
  if (nearHits.length === 1) {
    return {
      seasonNumber: nearHits[0].seasonNumber,
      tmdbYearMatched: nearHits[0].seasonNumber,
    };
  }
  return { seasonNumber: null, tmdbYearMatched: null };
}

export function resolveTvCandidateMatch(params: {
  vodName: string;
  vodSub: string;
  vodYear: string;
  vodRemarks: string;
  episodeCount: number;
  preparedTargets: PreparedTargetTitle[];
  tmdbSeasons?: TmdbSeasonMeta[];
  isAnimation?: boolean;
  targetYear?: string;
  pubDays?: number[];
  doubanMatchedSeason?: number | null;
}): TvCandidateResolution {
  const {
    vodName,
    vodSub,
    vodYear,
    vodRemarks,
    episodeCount,
    preparedTargets,
    tmdbSeasons,
    isAnimation,
    targetYear,
    pubDays,
    doubanMatchedSeason,
  } = params;

  const noMatch: TvCandidateResolution = {
    matched: false,
    titleScore: 0,
    seasonNumber: null,
    partNumber: null,
    isFinalSeason: false,
    arcKey: "",
    tmdbMatchedSeason: null,
    hasExplicitTitleSeason: false,
  };

  if (preparedTargets.length === 0) return noMatch;

  const simpNoYear = toSimplifiedChinese(stripYearSuffix(vodName)).trim();
  const cleanVod = stripLanguageAndStatusTags(simpNoYear);
  const { cleaned: cleanVodNoPart, partNumber: parsedPart } =
    extractTrailingPartMarker(cleanVod);
  const parsed = parseSeasonInfo(vodName);

  const baseTitleScore = computeTitleMatchScore(
    vodName,
    vodSub,
    preparedTargets,
    "tv",
    targetYear
  );

  const anchored = extractAnchoredPrefixAndRest(cleanVodNoPart, preparedTargets);
  const normRest = anchored?.normRest || "";
  const normSub = normalizeTitleForComparison(vodSub);
  const aliasSeason = extractSeasonFromAliases(vodSub, preparedTargets);
  const tmdbArcMatch = anchored
    ? matchTmdbSeasonByArc(normRest, normSub, tmdbSeasons, preparedTargets)
    : null;

  const parsedBaseNorm = normalizeTitleForComparison(parsed.baseTitle);
  const parsedBaseIsTarget = preparedTargets.some(
    (pt) => parsedBaseNorm === pt.target || parsedBaseNorm === pt.normFullTarget
  );
  const subArcPartNumber =
    !parsedBaseIsTarget && parsed.seasonNumber !== null && tmdbArcMatch
      ? parsed.seasonNumber
      : null;
  const partNumber =
    parsed.partNumber ?? parsedPart ?? subArcPartNumber ?? aliasSeason?.partNumber ?? null;
  const isOngoingNow = isOngoingCurrentYear(vodYear, vodRemarks);
  const hasExplicitTitleSeason = parsed.seasonNumber !== null && parsedBaseIsTarget;
  const hasSeriesIdentity =
    baseTitleScore >= 140 ||
    anchored !== null ||
    (doubanMatchedSeason !== null && doubanMatchedSeason !== undefined);

  if (!hasSeriesIdentity) {
    return noMatch;
  }

  const resolvedArcKey = parsed.subtitle
    ? normalizeTitleForComparison(parsed.subtitle)
    : normRest;
  const resolvedFinalSeason = Boolean(
    parsed.isFinalSeason || aliasSeason?.isFinalSeason
  );

  // Deterministic tier 1: Exact air date / split-cour timeline interval match against TMDB seasons
  if (pubDays && pubDays.length > 0 && tmdbSeasons && tmdbSeasons.length > 0) {
    const dateMatch = matchTvSeasonByDateOrInterval({
      pubDays,
      tmdbSeasons,
      episodeCount,
      partNumber,
      isFinalSeason: resolvedFinalSeason,
      parsedSeasonNumber: parsed.seasonNumber,
      hasExplicitTitleSeason,
      isAnimation,
      isOngoingNow,
      isExactBaseTitle: baseTitleScore >= 240,
    });
    if (dateMatch) {
      return {
        matched: true,
        titleScore: Math.max(
          baseTitleScore,
          dateMatch.matchKind === "exact_date" ? 260 : 240
        ),
        seasonNumber: dateMatch.seasonNumber,
        partNumber,
        isFinalSeason: resolvedFinalSeason,
        arcKey: resolvedArcKey,
        tmdbMatchedSeason: dateMatch.seasonNumber,
        hasExplicitTitleSeason,
      };
    }
  }

  // Deterministic tier 2: Cross-site Douban ID consensus match
  if (
    doubanMatchedSeason !== null &&
    doubanMatchedSeason !== undefined &&
    doubanMatchedSeason > 0 &&
    (episodeCount > 2 || isOngoingNow || baseTitleScore >= 240)
  ) {
    return {
      matched: true,
      titleScore: Math.max(baseTitleScore, 250),
      seasonNumber: doubanMatchedSeason,
      partNumber,
      isFinalSeason: resolvedFinalSeason,
      arcKey: resolvedArcKey,
      tmdbMatchedSeason: doubanMatchedSeason,
      hasExplicitTitleSeason,
    };
  }

  // Path 1: Direct base title match (exact title or explicit Season X / 第X季 / 最终季 / digit sequel)
  if (baseTitleScore >= 140) {
    let seasonNumber: number | null = parsed.seasonNumber;
    const isFinalSeason = Boolean(parsed.isFinalSeason || aliasSeason?.isFinalSeason);
    let tmdbMatchedSeason: number | null = null;
    let resolvedScore = baseTitleScore;
    let hasExplicitTitleSeason = parsed.seasonNumber !== null && parsedBaseIsTarget;
    let fallthroughFromPath1 = false;

    if (seasonNumber !== null) {
      if (!parsedBaseIsTarget && tmdbArcMatch) {
        // The season/part number modifies the sub-arc itself (e.g. "死神千年血战篇2" -> Cour 2 of TMDB S2 "千年血战篇")
        seasonNumber = tmdbArcMatch.seasonNumber;
        tmdbMatchedSeason = tmdbArcMatch.seasonNumber;
        resolvedScore = Math.max(resolvedScore, 235);
        hasExplicitTitleSeason = false;
      }
    } else if (isFinalSeason) {
      if (tmdbArcMatch) {
        seasonNumber = tmdbArcMatch.seasonNumber;
        tmdbMatchedSeason = tmdbArcMatch.seasonNumber;
        resolvedScore = Math.max(resolvedScore, 235);
      } else if (aliasSeason?.seasonNumber) {
        const rec = reconcileAliasSeasonWithTmdb(
          aliasSeason.seasonNumber,
          vodYear,
          tmdbSeasons
        );
        seasonNumber = rec.seasonNumber;
        if (rec.tmdbYearMatched !== null) {
          tmdbMatchedSeason = rec.tmdbYearMatched;
        }
        resolvedScore = Math.max(resolvedScore, 225);
      } else {
        seasonNumber = null;
      }
    } else if (tmdbArcMatch && normRest.length >= 2) {
      seasonNumber = tmdbArcMatch.seasonNumber;
      tmdbMatchedSeason = tmdbArcMatch.seasonNumber;
      resolvedScore = Math.max(resolvedScore, 235);
    } else if (aliasSeason?.seasonNumber) {
      const rec = reconcileAliasSeasonWithTmdb(
        aliasSeason.seasonNumber,
        vodYear,
        tmdbSeasons
      );
      seasonNumber = rec.seasonNumber;
      if (rec.tmdbYearMatched !== null) {
        tmdbMatchedSeason = rec.tmdbYearMatched;
      }
      resolvedScore = Math.max(resolvedScore, 225);
    } else if (baseTitleScore < 240 && anchored && normRest.length >= 2) {
      fallthroughFromPath1 = true;
    } else {
      seasonNumber = 1;
    }

    if (!fallthroughFromPath1) {
      const arcKey = parsed.subtitle
        ? normalizeTitleForComparison(parsed.subtitle)
        : normRest;

      return {
        matched: true,
        titleScore: resolvedScore,
        seasonNumber,
        partNumber,
        isFinalSeason,
        arcKey,
        tmdbMatchedSeason,
        hasExplicitTitleSeason,
      };
    }
  }

  if (!anchored) {
    return noMatch;
  }

  // Filter out stray 1-2 ep TV specials unless actively airing this year
  if (episodeCount <= 2 && !isOngoingNow) {
    return noMatch;
  }

  // Path 2: Anchored prefix + TMDB season arc match (handles JoJo S2/S3/S4/S5/S6, Demon Slayer arcs, Bleach TYBW, Kaguya S3, SAO Alicization)
  if (tmdbArcMatch) {
    return {
      matched: true,
      titleScore: 235,
      seasonNumber: tmdbArcMatch.seasonNumber,
      partNumber,
      isFinalSeason: Boolean(parsed.isFinalSeason || aliasSeason?.isFinalSeason),
      arcKey: normRest,
      tmdbMatchedSeason: tmdbArcMatch.seasonNumber,
      hasExplicitTitleSeason: false,
    };
  }

  // Path 3: Anchored prefix + alias season metadata in vod_sub (e.g. "JOJO的奇妙冒险 TV版 第四季" or "鬼灭之刃 第三季")
  if (aliasSeason) {
    const rec = reconcileAliasSeasonWithTmdb(
      aliasSeason.seasonNumber,
      vodYear,
      tmdbSeasons
    );
    return {
      matched: true,
      titleScore: 225,
      seasonNumber: rec.seasonNumber,
      partNumber,
      isFinalSeason: Boolean(parsed.isFinalSeason || aliasSeason.isFinalSeason),
      arcKey: normRest,
      tmdbMatchedSeason: rec.tmdbYearMatched,
      hasExplicitTitleSeason: false,
    };
  }

  // Path 4: Structural anime arc fallback (when neither TMDB arc nor vod_sub season tag is present, e.g. ikun no-sub JoJo entries)
  const targetY = targetYear ? Number(targetYear) : NaN;
  const vodY = vodYear ? Number(vodYear) : NaN;
  if (
    Number.isFinite(targetY) &&
    Number.isFinite(vodY) &&
    vodY < targetY
  ) {
    return noMatch;
  }

  if (
    /(特别篇|番外篇|总集篇|情人节篇|剧场版|剪辑版|外传|学园|物语|纪念|前夜祭|幕后|汪|回忆|之绊|英雄)/i.test(
      anchored.restRaw
    ) ||
    /[!！]/.test(anchored.restRaw)
  ) {
    return noMatch;
  }

  const targetCjk = countCjkChars(anchored.matchedTarget.rawClean);
  const targetSigLen = anchored.matchedTarget.target.length;
  const restEndsArc = /(?:篇|章)$/.test(normRest);
  const qualifiesStructuralArc =
    isAnimation === true &&
    ((restEndsArc &&
      normRest.length >= 3 &&
      normRest.length <= 16 &&
      (targetCjk >= 3 || (normRest.length >= 4 && normRest.endsWith("篇")))) ||
      ((targetCjk >= 6 || (targetCjk >= 4 && targetSigLen >= 8)) &&
        anchored.hasCleanDelimiter &&
        normRest.length >= 2 &&
        normRest.length <= 10 &&
        Number.isFinite(targetY) &&
        Number.isFinite(vodY) &&
        vodY > targetY));

  if (!qualifiesStructuralArc) {
    return noMatch;
  }

  let yearMatchedSeason: number | null = null;
  if (Number.isFinite(vodY) && tmdbSeasons && tmdbSeasons.length > 1) {
    const yearHits = tmdbSeasons.filter(
      (s) =>
        s.seasonNumber >= 2 &&
        s.airYear !== undefined &&
        Math.abs(vodY - s.airYear) <= 1
    );
    if (yearHits.length === 1) {
      yearMatchedSeason = yearHits[0].seasonNumber;
    }
  }

  return {
    matched: true,
    titleScore: 195,
    seasonNumber: yearMatchedSeason,
    partNumber,
    isFinalSeason: false,
    arcKey: normRest,
    tmdbMatchedSeason: yearMatchedSeason,
    hasExplicitTitleSeason: false,
  };
}

const SITE_CIRCUIT_THRESHOLD = 4;
const SITE_CIRCUIT_COOLDOWN_MS = 60_000;
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

function sequentializeCourEpisodes(cours: { episodes: VodEpisode[] }[]): VodEpisode[] {
  if (cours.length === 0) return [];
  if (cours.length === 1) return cours[0].episodes;

  const restartsAtOne = cours.slice(1).some((c) =>
    /^(?:第\s*0*1\s*[集期话回]|Ep\s*0*1|0*1)$/i.test(
      (c.episodes?.[0]?.name || "").trim()
    )
  );
  if (!restartsAtOne) {
    return cours.flatMap((c) => c.episodes);
  }

  const combined = cours.flatMap((c) => c.episodes);
  let seq = 0;
  return combined.map((ep) => {
    const trimmed = ep.name.trim();
    if (/^(?:第\s*\d+\s*[集期话回]|Ep\s*\d+|\d{1,4})$/i.test(trimmed)) {
      seq++;
      return {
        name: `第${seq}集`,
        url: ep.url,
      };
    }
    return ep;
  });
}

function isExcludedVodItem(
  item: any,
  mediaType?: "movie" | "tv",
  isAnimation?: boolean
): boolean {
  const vodName = String(item?.vod_name || "").trim();
  const vodSub = String(item?.vod_sub || "").trim();
  const vodRemarks = String(item?.vod_remarks || "").trim();
  return (
    isIncompatibleVodCategory(item?.type_name, mediaType) ||
    isIncompatibleTvSpinOffOrAdaptation(
      vodName,
      item?.type_name,
      mediaType,
      isAnimation,
      vodSub
    ) ||
    vodName.includes("解说") ||
    vodName.includes("预告") ||
    vodName.includes("短剧") ||
    vodRemarks.includes("预告") ||
    vodRemarks.includes("花絮") ||
    vodRemarks.includes("先导") ||
    vodRemarks.includes("电影解说")
  );
}

function evaluateMovieCandidate(params: {
  item: any;
  preparedTargets: PreparedTargetTitle[];
  targetYear?: string;
  targetDateDay: number | null;
  doubanDates?: Map<string, Set<number>>;
  matchedMovieDoubanIds?: Set<string>;
}): { matched: boolean; score: number; matchedByExactDate: boolean } {
  const {
    item,
    preparedTargets,
    targetYear,
    targetDateDay,
    doubanDates,
    matchedMovieDoubanIds,
  } = params;
  const vodName = String(item?.vod_name || "").trim();
  const vodSub = String(item?.vod_sub || "").trim();
  const vodYearMatch = String(item?.vod_year || "").match(/(19|20)\d{2}/);
  const vodYear = vodYearMatch ? vodYearMatch[0] : "";

  let titleScore = computeTitleMatchScore(
    vodName,
    vodSub,
    preparedTargets,
    "movie",
    targetYear
  );
  const dbId = extractDoubanId(item?.vod_douban_id);
  const isConsensusDouban = Boolean(dbId && matchedMovieDoubanIds?.has(dbId));
  if (isConsensusDouban) {
    titleScore = Math.max(titleScore, 240);
  }

  const pubDays = getEffectivePubDays(item, doubanDates);
  const dayDiff = getMinDayDiff(pubDays, targetDateDay);

  if (dayDiff !== null && dayDiff <= 4 && titleScore >= 110) {
    return {
      matched: true,
      score: titleScore + 160,
      matchedByExactDate: true,
    };
  }
  if (dayDiff !== null && dayDiff <= 45 && titleScore >= 140) {
    return {
      matched: true,
      score: titleScore + 110,
      matchedByExactDate: false,
    };
  }
  if (titleScore < 140) {
    return { matched: false, score: 0, matchedByExactDate: false };
  }
  const yearCheck = evaluateYearMatch("movie", targetYear, vodYear, titleScore);
  if (!yearCheck.matched) {
    return { matched: false, score: 0, matchedByExactDate: false };
  }
  return {
    matched: true,
    score: titleScore + yearCheck.bonus,
    matchedByExactDate: false,
  };
}

async function fetchRawVodSiteBatch(
  site: VodSite,
  keyword: string,
  timeoutMs = 2400,
  externalSignal?: AbortSignal,
  onOutcome?: (outcome: "ok" | "error" | "timeout") => void
): Promise<RawSiteBatch | null> {
  if (externalSignal?.aborted) return null;
  const start = Date.now();
  const sep = site.api.includes("?") ? "&" : "?";
  const searchUrl = `${site.api}${sep}ac=videolist&wd=${encodeURIComponent(keyword)}`;

  let timedOut = false;
  const reqAc = new AbortController();
  const onExternalAbort = () => reqAc.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    reqAc.abort();
  }, timeoutMs);
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
      onOutcome?.("error");
      return null;
    }
    const data: any = await res.json();
    recordSiteSuccess(site.id);
    onOutcome?.("ok");
    const list = Array.isArray(data?.list) ? data.list : [];
    if (list.length === 0) return null;

    return {
      site,
      keyword,
      list,
      latencyMs: Date.now() - start,
    };
  } catch {
    if (!externalSignal?.aborted) {
      if (timedOut) {
        onOutcome?.("timeout");
        // Skip tripping circuit cooldown on short timeouts (slow PHP search != broken video CDN)
        if (timeoutMs >= 5000) {
          recordSiteFailure(site.id);
        }
      } else {
        onOutcome?.("error");
        recordSiteFailure(site.id);
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

function buildCrossSiteDoubanConsensus(params: {
  batches: RawSiteBatch[];
  preparedTargets: PreparedTargetTitle[];
  mediaType?: "movie" | "tv";
  targetYear?: string;
  targetDateDay: number | null;
  isAnimation?: boolean;
  tmdbSeasons?: TmdbSeasonMeta[];
}): CrossSiteDoubanConsensus {
  const {
    batches,
    preparedTargets,
    mediaType,
    targetYear,
    targetDateDay,
    isAnimation,
    tmdbSeasons,
  } = params;

  const doubanDates = buildDoubanDatesMap(batches);
  const doubanSeason = new Map<string, number>();
  const matchedMovieDoubanIds = new Set<string>();

  for (const batch of batches) {
    for (const item of batch.list) {
      if (!item?.vod_play_url) continue;
      if (isExcludedVodItem(item, mediaType, isAnimation)) continue;
      const dbId = extractDoubanId(item.vod_douban_id);
      if (!dbId) continue;

      const { bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;
      const hasNonTrailerEpisode = bestEpisodes.some(
        (ep) => !ep.name.includes("预告") && !ep.name.includes("花絮")
      );
      if (!hasNonTrailerEpisode) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYear = vodYearMatch ? vodYearMatch[0] : "";

      if (mediaType === "tv" && tmdbSeasons && tmdbSeasons.length > 0) {
        if (doubanSeason.has(dbId)) continue;
        const pubDays = getEffectivePubDays(item, doubanDates);
        if (pubDays.length === 0) continue;

        const tvRes = resolveTvCandidateMatch({
          vodName,
          vodSub,
          vodYear,
          vodRemarks,
          episodeCount: bestEpisodes.length,
          preparedTargets,
          tmdbSeasons,
          isAnimation,
          targetYear,
          pubDays,
        });
        if (tvRes.matched && tvRes.tmdbMatchedSeason !== null && tvRes.seasonNumber !== null) {
          doubanSeason.set(dbId, tvRes.seasonNumber);
        }
      } else if (mediaType !== "tv") {
        if (matchedMovieDoubanIds.has(dbId)) continue;
        const mEval = evaluateMovieCandidate({
          item,
          preparedTargets,
          targetYear,
          targetDateDay,
          doubanDates,
        });
        if (mEval.matched && (mEval.matchedByExactDate || mEval.score >= 300)) {
          matchedMovieDoubanIds.add(dbId);
        }
      }
    }
  }

  return { doubanDates, doubanSeason, matchedMovieDoubanIds };
}

function hasQuickPlayableMatch(params: {
  list: any[];
  preparedTargets: PreparedTargetTitle[];
  targetYear?: string;
  targetDateDay: number | null;
  mediaType?: "movie" | "tv";
  isAnimation?: boolean;
  tmdbSeasons?: TmdbSeasonMeta[];
}): boolean {
  const {
    list,
    preparedTargets,
    targetYear,
    targetDateDay,
    mediaType,
    isAnimation,
    tmdbSeasons,
  } = params;
  for (const item of list) {
    if (!item?.vod_play_url) continue;
    if (isExcludedVodItem(item, mediaType, isAnimation)) continue;
    const { bestEpisodes } = parseVodPlayGroups(
      item.vod_play_from,
      item.vod_play_url
    );
    if (bestEpisodes.length === 0) continue;
    if (!bestEpisodes.some((ep) => !ep.name.includes("预告") && !ep.name.includes("花絮"))) {
      continue;
    }

    const vodName = String(item.vod_name || "").trim();
    const vodSub = String(item.vod_sub || "").trim();
    const vodRemarks = String(item.vod_remarks || "").trim();
    const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
    const vodYear = vodYearMatch ? vodYearMatch[0] : "";

    if (mediaType === "tv") {
      const pubDays = parseAllIsoDateDays(item.vod_pubdate);
      const tvRes = resolveTvCandidateMatch({
        vodName,
        vodSub,
        vodYear,
        vodRemarks,
        episodeCount: bestEpisodes.length,
        preparedTargets,
        tmdbSeasons,
        isAnimation,
        targetYear,
        pubDays,
      });
      if (tvRes.matched && tvRes.titleScore >= 140) return true;
    } else {
      const mEval = evaluateMovieCandidate({
        item,
        preparedTargets,
        targetYear,
        targetDateDay,
      });
      if (mEval.matched && mEval.score >= 160) return true;
    }
  }
  return false;
}

function assembleSourcesFromRawBatch(params: {
  batch: RawSiteBatch;
  preparedTargets: PreparedTargetTitle[];
  targetYear?: string;
  targetDateDay: number | null;
  mediaType?: "movie" | "tv";
  isAnimation?: boolean;
  tmdbSeasons?: TmdbSeasonMeta[];
  consensus?: CrossSiteDoubanConsensus;
}): ResolvedStreamSource[] {
  const {
    batch,
    preparedTargets,
    targetYear,
    targetDateDay,
    mediaType,
    isAnimation,
    tmdbSeasons,
    consensus,
  } = params;
  const { site, keyword, list, latencyMs } = batch;

  type ScoredCandidate = {
    item: any;
    score: number;
    seasonNumber: number | null;
    partNumber: number | null;
    isFinalSeason: boolean;
    arcKey: string;
    tmdbMatchedSeason: number | null;
    hasExplicitTitleSeason: boolean;
    vodYearNum: number;
    audioLang?: "粤语" | "国语";
    explicitTitleLang?: "粤语" | "国语";
    playGroups: VodPlayGroup[];
    episodes: VodEpisode[];
  };

  const tmdbSeasonAirYears =
    tmdbSeasons
      ?.map((s) => s.airYear)
      .filter((y): y is number => typeof y === "number" && y > 0) || undefined;

  const validCandidates: ScoredCandidate[] = [];

  for (const item of list) {
    if (!item.vod_play_url) continue;

    const vodName = String(item.vod_name || "").trim();
    const vodSub = String(item.vod_sub || "").trim();
    const vodRemarks = String(item.vod_remarks || "").trim();
    const vodLang = String(item.vod_lang || "").trim();
    const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
    const vodYear = vodYearMatch ? vodYearMatch[0] : "";
    const vodYearNum = vodYear ? Number(vodYear) : 0;

    // Reject recaps ("解说"), trailers ("预告"/"花絮"/"先导"), micro-dramas ("短剧"), spin-offs/live-action adaptations, and wrong movie/tv categories
    if (isExcludedVodItem(item, mediaType, isAnimation)) {
      continue;
    }

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

    const titleAudioLang = parseSeasonInfo(vodName).audioLang;
    const detectedLang =
      titleAudioLang || extractAudioLangFromText(vodName, vodLang, vodRemarks);

    const dbId = extractDoubanId(item.vod_douban_id);
    const pubDays = getEffectivePubDays(item, consensus?.doubanDates);
    const doubanMatchedSeason = dbId
      ? consensus?.doubanSeason.get(dbId) ?? null
      : null;

    let score = 0;
    let seasonNumber: number | null = 1;
    let partNumber: number | null = null;
    let isFinalSeason = false;
    let arcKey = "";
    let tmdbMatchedSeason: number | null = null;
    let hasExplicitTitleSeason = false;

    if (mediaType === "tv") {
      const tvRes = resolveTvCandidateMatch({
        vodName,
        vodSub,
        vodYear,
        vodRemarks,
        episodeCount: bestEpisodes.length,
        preparedTargets,
        tmdbSeasons,
        isAnimation,
        targetYear,
        pubDays,
        doubanMatchedSeason,
      });
      if (!tvRes.matched || tvRes.titleScore < 140) {
        continue;
      }
      const evalSeasonNum = tvRes.seasonNumber === null ? 2 : tvRes.seasonNumber;
      const yearCheck = evaluateYearMatch(
        "tv",
        targetYear,
        vodYear,
        tvRes.titleScore,
        evalSeasonNum,
        tmdbSeasonAirYears
      );
      if (!yearCheck.matched && tvRes.tmdbMatchedSeason === null) {
        continue;
      }
      score = tvRes.titleScore + (yearCheck.matched ? yearCheck.bonus : 105);
      seasonNumber = tvRes.seasonNumber;
      partNumber = tvRes.partNumber;
      isFinalSeason = tvRes.isFinalSeason;
      arcKey = tvRes.arcKey;
      tmdbMatchedSeason = tvRes.tmdbMatchedSeason;
      hasExplicitTitleSeason = tvRes.hasExplicitTitleSeason;
      if (bestEpisodes.length > 1) score += 20;
    } else {
      const mEval = evaluateMovieCandidate({
        item,
        preparedTargets,
        targetYear,
        targetDateDay,
        doubanDates: consensus?.doubanDates,
        matchedMovieDoubanIds: consensus?.matchedMovieDoubanIds,
      });
      if (!mEval.matched) {
        continue;
      }
      score = mEval.score;
      if (bestEpisodes.length <= 4) score += 15;
    }

    if (score >= 160) {
      validCandidates.push({
        item,
        score,
        seasonNumber,
        partNumber,
        isFinalSeason,
        arcKey,
        tmdbMatchedSeason,
        hasExplicitTitleSeason,
        vodYearNum,
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

    const tmdbSeasonByNum = new Map<number, TmdbSeasonMeta>();
    if (tmdbSeasons) {
      for (const s of tmdbSeasons) {
        if (s.seasonNumber > 0) tmdbSeasonByNum.set(s.seasonNumber, s);
      }
    }

    const buildSourceFromCandidates = (
      cands: ScoredCandidate[],
      langTag?: "粤语" | "国语"
    ): ResolvedStreamSource | null => {
      if (cands.length === 0) return null;
      const suffix =
        langTag === "粤语" ? "_yue" : langTag === "国语" ? "_guo" : "";
      const sourceId = `${site.id}${suffix}`;

      if (mediaType === "tv") {
        // Resolve seasonNumber === null (final-season and structural-arc candidates) per site assembly
        const working = cands.map((c) => ({ ...c }));
        const maxExplicitSeason = working.reduce(
          (mx, c) => (c.seasonNumber !== null && c.seasonNumber > mx ? c.seasonNumber : mx),
          0
        );
        const maxTmdbSeason = tmdbSeasons?.reduce(
          (mx, s) => (s.seasonNumber > mx ? s.seasonNumber : mx),
          0
        ) ?? 0;

        // Step A: Resolve isFinalSeason entries with seasonNumber === null
        for (const c of working) {
          if (c.seasonNumber === null && c.isFinalSeason) {
            if (tmdbSeasons && tmdbSeasons.length > 1) {
              const yearHit =
                c.vodYearNum > 0
                  ? tmdbSeasons.find(
                      (s) =>
                        s.seasonNumber >= 2 &&
                        s.airYear !== undefined &&
                        Math.abs(c.vodYearNum - s.airYear) <= 1
                    )
                  : undefined;
              c.seasonNumber = yearHit ? yearHit.seasonNumber : maxTmdbSeason;
            } else {
              c.seasonNumber = Math.max(1, maxExplicitSeason) + 1;
            }
          }
        }

        // Step A2: Attach split-cour sub-arcs whose arcKey extends an existing S2+ parent arc
        // (e.g. "星尘斗士埃及篇" -> "星尘斗士", "爱丽丝篇异界战争" -> "爱丽丝篇")
        for (const c of working) {
          if (c.arcKey.length < 4) continue;
          if (c.hasExplicitTitleSeason || c.tmdbMatchedSeason !== null) continue;
          let bestParent: (typeof working)[0] | null = null;
          for (const p of working) {
            if (p === c) continue;
            if (p.seasonNumber === null || p.seasonNumber < 2) continue;
            if (p.arcKey.length < 3 || c.arcKey.length <= p.arcKey.length) continue;
            if (!c.arcKey.startsWith(p.arcKey)) continue;
            if (
              c.vodYearNum > 0 &&
              p.vodYearNum > 0 &&
              (c.vodYearNum < p.vodYearNum || c.vodYearNum > p.vodYearNum + 2)
            ) {
              continue;
            }
            if (!bestParent || p.arcKey.length > bestParent.arcKey.length) {
              bestParent = p;
            }
          }
          if (bestParent && bestParent.seasonNumber !== null) {
            c.seasonNumber = bestParent.seasonNumber;
          }
        }

        // Step B: Resolve remaining seasonNumber === null structural-arc candidates grouped by arcKey
        const unresolved = working.filter((c) => c.seasonNumber === null);
        if (unresolved.length > 0) {
          const arcGroups = new Map<
            string,
            { arcKey: string; minYear: number; items: typeof working }
          >();
          for (const c of unresolved) {
            const key = c.arcKey || normalizeTitleForComparison(String(c.item.vod_name || ""));
            const g = arcGroups.get(key);
            if (!g) {
              arcGroups.set(key, {
                arcKey: key,
                minYear: c.vodYearNum || 9999,
                items: [c],
              });
            } else {
              g.items.push(c);
              if (c.vodYearNum > 0 && c.vodYearNum < g.minYear) {
                g.minYear = c.vodYearNum;
              }
            }
          }

          const usedSeasons = new Set<number>();
          for (const c of working) {
            if (c.seasonNumber !== null) usedSeasons.add(c.seasonNumber);
          }

          const sortedGroups = Array.from(arcGroups.values()).sort((a, b) => {
            if (a.minYear !== b.minYear) return a.minYear - b.minYear;
            return a.arcKey.localeCompare(b.arcKey);
          });

          let nextSeasonNum =
            Math.max(1, maxExplicitSeason, ...Array.from(usedSeasons)) + 1;
          for (const grp of sortedGroups) {
            let assigned: number | null = null;
            if (grp.minYear < 9999 && tmdbSeasons && tmdbSeasons.length > 1) {
              const yearHit = tmdbSeasons.find(
                (s) =>
                  s.seasonNumber >= 2 &&
                  !usedSeasons.has(s.seasonNumber) &&
                  s.airYear !== undefined &&
                  Math.abs(grp.minYear - s.airYear) <= 1
              );
              if (yearHit) assigned = yearHit.seasonNumber;
            }
            if (assigned === null) {
              while (usedSeasons.has(nextSeasonNum)) nextSeasonNum++;
              assigned = nextSeasonNum++;
            }
            usedSeasons.add(assigned);
            for (const c of grp.items) {
              c.seasonNumber = assigned;
            }
          }
        }

        // Step C: Bucket by seasonNumber, deduplicate same-cour duplicates & merge distinct split cours
        const seasonBuckets = new Map<number, typeof working>();
        for (const cand of working) {
          const sNum = cand.seasonNumber ?? 1;
          const bucket = seasonBuckets.get(sNum);
          if (bucket) bucket.push(cand);
          else seasonBuckets.set(sNum, [cand]);
        }

        let assembledSeasons: {
          seasonNumber: number;
          primaryCand: (typeof working)[0];
          episodes: VodEpisode[];
        }[] = [];

        for (const [sNum, bucket] of seasonBuckets.entries()) {
          const minArcLen = bucket.reduce(
            (mn, c) => (c.arcKey && c.arcKey.length < mn ? c.arcKey.length : mn),
            Infinity
          );
          const courMap = new Map<string, (typeof working)[0]>();

          for (const cand of bucket) {
            let courKey: string;
            if (cand.partNumber !== null && cand.partNumber >= 2) {
              courKey = `part:${cand.partNumber}`;
            } else if (
              cand.arcKey &&
              Number.isFinite(minArcLen) &&
              cand.arcKey.length > minArcLen
            ) {
              courKey = `arc:${cand.arcKey}`;
            } else {
              courKey = "part:1";
            }

            const existing = courMap.get(courKey);
            if (!existing) {
              courMap.set(courKey, cand);
            } else {
              const scoreDiff = cand.score - existing.score;
              const preferNew =
                Math.abs(scoreDiff) <= 15
                  ? cand.episodes.length > existing.episodes.length ||
                    (cand.episodes.length === existing.episodes.length && scoreDiff > 0)
                  : scoreDiff > 0;
              if (preferNew) {
                courMap.set(courKey, cand);
              }
            }
          }

          const expectedYear = tmdbSeasonByNum.get(sNum)?.airYear;
          const anchor = [...courMap.values()].sort((a, b) => {
            const aTmdb = a.tmdbMatchedSeason === sNum ? 1 : 0;
            const bTmdb = b.tmdbMatchedSeason === sNum ? 1 : 0;
            if (aTmdb !== bTmdb) return bTmdb - aTmdb;

            const aExplicit = a.hasExplicitTitleSeason ? 1 : 0;
            const bExplicit = b.hasExplicitTitleSeason ? 1 : 0;
            if (aExplicit !== bExplicit) return bExplicit - aExplicit;

            if (expectedYear !== undefined && a.vodYearNum > 0 && b.vodYearNum > 0) {
              const aDiff = Math.abs(a.vodYearNum - expectedYear);
              const bDiff = Math.abs(b.vodYearNum - expectedYear);
              if (aDiff !== bDiff) return aDiff - bDiff;
            }

            const aP1 = a.partNumber === null || a.partNumber === 1 ? 1 : 0;
            const bP1 = b.partNumber === null || b.partNumber === 1 ? 1 : 0;
            if (aP1 !== bP1) return bP1 - aP1;

            if (a.score !== b.score) return b.score - a.score;
            return a.arcKey.length - b.arcKey.length;
          })[0];

          const compatibleCours = Array.from(courMap.values()).filter((c) => {
            if (c === anchor) return true;
            const sameTmdbSeason =
              anchor.tmdbMatchedSeason !== null &&
              c.tmdbMatchedSeason === anchor.tmdbMatchedSeason;
            const hasExplicitPart =
              (c.partNumber !== null && c.partNumber >= 2) ||
              (anchor.partNumber !== null && anchor.partNumber >= 2);
            const bothFinal = anchor.isFinalSeason && c.isFinalSeason;
            const shareArcPrefix =
              !anchor.arcKey ||
              !c.arcKey ||
              anchor.arcKey === c.arcKey ||
              c.arcKey.startsWith(anchor.arcKey) ||
              anchor.arcKey.startsWith(c.arcKey);
            return sameTmdbSeason || hasExplicitPart || bothFinal || shareArcPrefix;
          });

          const distinctCours = compatibleCours.sort((a, b) => {
            const ya = a.vodYearNum || 9999;
            const yb = b.vodYearNum || 9999;
            if (ya !== yb) return ya - yb;
            const pa = a.partNumber ?? 1;
            const pb = b.partNumber ?? 1;
            if (pa !== pb) return pa - pb;
            if (a.arcKey.length !== b.arcKey.length) {
              return a.arcKey.length - b.arcKey.length;
            }
            return String(a.item.vod_name || "").localeCompare(
              String(b.item.vod_name || "")
            );
          });

          const base = distinctCours[0];
          const tmdbExpectedEps = tmdbSeasonByNum.get(sNum)?.episodeCount;
          const mergedCours: typeof distinctCours = [base];

          for (const extra of distinctCours.slice(1)) {
            if (
              tmdbExpectedEps !== undefined &&
              base.episodes.length >= tmdbExpectedEps - 1 &&
              base.episodes.length + extra.episodes.length > tmdbExpectedEps + 3
            ) {
              continue;
            }
            if (
              extra.partNumber !== null &&
              extra.partNumber >= 2 &&
              base.partNumber === null &&
              base.episodes.length >= 22 &&
              base.episodes.length >= extra.episodes.length * 1.75 &&
              (!tmdbExpectedEps || base.episodes.length >= tmdbExpectedEps - 1)
            ) {
              continue;
            }
            mergedCours.push(extra);
          }

          assembledSeasons.push({
            seasonNumber: sNum,
            primaryCand: base,
            episodes: sequentializeCourEpisodes(mergedCours),
          });
        }

        assembledSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

        // Step D: Prune stray 1-2 episode OVA/special entries alongside a long-running continuous series
        const season1 = assembledSeasons.find((sc) => sc.seasonNumber === 1);
        if (season1 && season1.episodes.length >= 60 && assembledSeasons.length > 1) {
          assembledSeasons = assembledSeasons.filter(
            (sc) => sc.seasonNumber === 1 || sc.episodes.length > 2
          );
        }

        const primaryEntry = assembledSeasons[0];
        const primaryCand = primaryEntry.primaryCand;
        const seasons: VodSeasonGroup[] = assembledSeasons.map((sc) => ({
          seasonNumber: sc.seasonNumber,
          name: `Season ${sc.seasonNumber}`,
          vodId: sc.primaryCand.item.vod_id,
          vodName: toSimplifiedChinese(
            String(sc.primaryCand.item.vod_name || keyword).trim()
          ),
          episodes: sc.episodes,
        }));

        const tvQuality = detectSourceQuality(
          primaryCand.item.vod_remarks,
          primaryCand.item.vod_name,
          primaryEntry.episodes[0]?.name,
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
          episodes: primaryEntry.episodes,
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
      let neutralIsStandaloneOriginal = false;

      if (neutralCands.length > 0) {
        if (mediaType === "tv") {
          const dubSeasons = new Set<number>();
          for (const c of [...yueCands, ...guoCands]) {
            if (c.seasonNumber !== null) dubSeasons.add(c.seasonNumber);
          }
          const neutralHasS1 = neutralCands.some((c) => c.seasonNumber === 1);
          const neutralSharesDubSeason = neutralCands.some(
            (c) => c.seasonNumber !== null && dubSeasons.has(c.seasonNumber)
          );
          neutralIsStandaloneOriginal = neutralHasS1 && neutralSharesDubSeason;
        } else {
          neutralIsStandaloneOriginal = yueCands.length > 0 || guoCands.length > 0;
        }
      }

      if (neutralIsStandaloneOriginal) {
        const origSrc = buildSourceFromCandidates(neutralCands, undefined);
        if (origSrc) results.push(origSrc);
        if (yueCands.length > 0) {
          const yueSrc = buildSourceFromCandidates(yueCands, "粤语");
          if (yueSrc) results.push(yueSrc);
        }
        if (guoCands.length > 0) {
          const guoSrc = buildSourceFromCandidates(guoCands, "国语");
          if (guoSrc) results.push(guoSrc);
        }
      } else {
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
      }

      if (results.length > 0) {
        return results;
      }
    }

    const singleSource = buildSourceFromCandidates(validCandidates, undefined);
    return singleSource ? [singleSource] : [];
}

async function searchSingleVodSite(
  site: VodSite,
  keyword: string,
  targetTitles: string[] | PreparedTargetTitle[],
  targetYear?: string,
  mediaType?: "movie" | "tv",
  timeoutMs = 2400,
  externalSignal?: AbortSignal,
  onOutcome?: (outcome: "ok" | "error" | "timeout") => void,
  isAnimation?: boolean,
  tmdbSeasons?: TmdbSeasonMeta[]
): Promise<ResolvedStreamSource[]> {
  const batch = await fetchRawVodSiteBatch(
    site,
    keyword,
    timeoutMs,
    externalSignal,
    onOutcome
  );
  if (!batch) return [];
  const preparedTargets: PreparedTargetTitle[] =
    targetTitles.length > 0 && typeof targetTitles[0] === "string"
      ? prepareTargetTitles(targetTitles as string[], mediaType)
      : (targetTitles as PreparedTargetTitle[]);
  return assembleSourcesFromRawBatch({
    batch,
    preparedTargets,
    targetYear,
    targetDateDay: null,
    mediaType,
    isAnimation,
    tmdbSeasons,
  });
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
  releaseDate?: string;
  isUnreleased: boolean;
  primaryZhTitle?: string;
  isAnimation?: boolean;
  seasons?: TmdbSeasonMeta[];
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
      ? new Request(`https://tmdb-meta.101movies.internal/v6/${type}/${tmdbId}`, {
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
  let releaseDate: string | undefined;
  let isUnreleased = false;
  let primaryZhTitle: string | undefined;
  let isAnimation: boolean | undefined;
  let seasons: TmdbSeasonMeta[] | undefined;

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
      if (/^\d{4}-\d{2}-\d{2}/.test(hintDate)) {
        releaseDate = hintDate.slice(0, 10);
      }
      const todayIso = new Date().toISOString().slice(0, 10);
      if (hintDate > todayIso) {
        isUnreleased = true;
      }
    }
    if (Number(hintItem.vote_count || 0) === 0) {
      isUnreleased = true;
    }
    if (
      Array.isArray(hintItem.genre_ids) &&
      hintItem.genre_ids.some((id: any) => Number(id) === 16)
    ) {
      isAnimation = true;
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
          if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            releaseDate = dateStr.slice(0, 10);
          }
        }
        isUnreleased = isMediaUnreleased(type, d);
        if (
          Array.isArray(d.genres) &&
          d.genres.some((g: any) => Number(g?.id) === 16)
        ) {
          isAnimation = true;
        } else if (Array.isArray(d.genres)) {
          isAnimation = false;
        }
        if (type === "tv" && Array.isArray(d.seasons)) {
          const extractedSeasons: TmdbSeasonMeta[] = [];
          for (const s of d.seasons) {
            if (typeof s?.season_number === "number" && s.season_number > 0) {
              const rawAir = String(s?.air_date || "").trim();
              const airDate = /^\d{4}-\d{2}-\d{2}/.test(rawAir)
                ? rawAir.slice(0, 10)
                : undefined;
              const airMatch = rawAir.match(/(19|20)\d{2}/);
              const airYear = airMatch ? Number(airMatch[0]) : undefined;
              const epCount =
                typeof s?.episode_count === "number" && s.episode_count > 0
                  ? Number(s.episode_count)
                  : undefined;
              extractedSeasons.push({
                seasonNumber: Number(s.season_number),
                name: toSimplifiedChinese(String(s?.name || "").trim()),
                airDate,
                airYear,
                episodeCount: epCount,
              });
            }
          }
          if (extractedSeasons.length > 0) {
            extractedSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
            seasons = extractedSeasons;
          }
        }

        const officialZhTitles = new Set<string>();
        if (zhTitle && /[\u4e00-\u9fff]/.test(zhTitle)) {
          officialZhTitles.add(zhTitle.trim());
        }

        const transList = Array.isArray(d?.translations?.translations)
          ? d.translations.translations
          : [];
        const zhCountryOrder = ["CN", "SG", "TW", "HK"];
        for (const region of zhCountryOrder) {
          for (const tr of transList) {
            if (tr?.iso_639_1 === "zh" && tr?.iso_3166_1 === region) {
              const trTitle = tr?.data?.title || tr?.data?.name;
              if (
                trTitle &&
                (/[\u4e00-\u9fff]/.test(trTitle) ||
                  (region === "CN" && String(trTitle).trim().length >= 2))
              ) {
                officialZhTitles.add(String(trTitle).trim());
              }
            }
          }
        }

        const altZhTitles = new Set<string>();
        const altList = Array.isArray(d?.alternative_titles?.results)
          ? d.alternative_titles.results
          : Array.isArray(d?.alternative_titles?.titles)
          ? d.alternative_titles.titles
          : [];
        for (const alt of altList) {
          const altTitle = alt?.title || alt?.name;
          if (altTitle && /[\u4e00-\u9fff]/.test(altTitle)) {
            altZhTitles.add(String(altTitle).trim());
          }
        }

        for (const t of officialZhTitles) {
          if (!primaryZhTitle && /[\u4e00-\u9fff]/.test(t)) {
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

        for (const t of altZhTitles) {
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
    releaseDate,
    isUnreleased,
    primaryZhTitle,
    isAnimation,
    seasons,
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

async function fetchKeywordRoundBatches(params: {
  sites: VodSite[];
  keyword: string;
  roundTimeoutMs: number;
  maxSites: number;
  hasMatchFn: (batch: RawSiteBatch) => boolean;
  onOutcome: (outcome: "ok" | "error" | "timeout") => void;
}): Promise<RawSiteBatch[]> {
  const { sites, keyword, roundTimeoutMs, maxSites, hasMatchFn, onOutcome } = params;
  const targets = sites.slice(0, maxSites);
  if (targets.length === 0) return [];

  const roundAc = new AbortController();
  const roundStart = Date.now();
  let softDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let softDeadlineAt = Infinity;
  let quickMatchCount = 0;
  let tier3QuickMatchCount = 0;
  const collected: RawSiteBatch[] = [];

  const tightenSoftDeadline = (delayMs: number) => {
    const clampedDelay = Math.max(0, delayMs);
    const targetAt = Date.now() + clampedDelay;
    if (targetAt >= softDeadlineAt) return;
    softDeadlineAt = targetAt;
    if (softDeadlineTimer) {
      clearTimeout(softDeadlineTimer);
      softDeadlineTimer = null;
    }
    if (clampedDelay === 0) {
      roundAc.abort();
    } else {
      softDeadlineTimer = setTimeout(() => roundAc.abort(), clampedDelay);
    }
  };

  try {
    await Promise.allSettled(
      targets.map(async (site) => {
        const batch = await fetchRawVodSiteBatch(
          site,
          keyword,
          roundTimeoutMs,
          roundAc.signal,
          onOutcome
        );
        if (!batch) return;
        collected.push(batch);
        if (hasMatchFn(batch)) {
          quickMatchCount++;
          if (getSourceQualityTier(site.id) >= 3) {
            tier3QuickMatchCount++;
          }
          const elapsed = Date.now() - roundStart;
          if (quickMatchCount >= 6 && tier3QuickMatchCount >= 3) {
            tightenSoftDeadline(0);
          } else if (quickMatchCount >= 4 && tier3QuickMatchCount >= 2) {
            tightenSoftDeadline(Math.max(250, 900 - elapsed));
          } else if (quickMatchCount >= 2) {
            tightenSoftDeadline(Math.max(550, 2100 - elapsed));
          } else if (quickMatchCount >= 1) {
            tightenSoftDeadline(Math.max(700, 2800 - elapsed));
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

  return collected;
}

function buildDistinctSeasonKeyword(
  season: TmdbSeasonMeta | undefined,
  primaryQuery: string
): { distinctName: string | null; keywords: string[] } {
  const rawName = toSimplifiedChinese(String(season?.name || "")).trim();
  const isGeneric =
    !rawName ||
    /^第\s*[一二两三四五六七八九十\d]+\s*[季部期]$/i.test(rawName) ||
    /^(?:Season|Series)\s*\d+$/i.test(rawName);

  let distinctName: string | null = null;
  if (!isGeneric) {
    let cleaned = rawName;
    if (primaryQuery) {
      const escaped = primaryQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`^${escaped}[\\s:：·\\-—_]*`, "i"), "").trim();
    }
    const cjk = countCjkChars(cleaned);
    const latin = (cleaned.match(/[a-z]/gi) || []).length;
    if (cjk >= 2 || latin >= 4) {
      distinctName = cleaned;
    }
  }

  const keywords: string[] = [];
  const pushKw = (k?: string | null) => {
    const t = k?.trim();
    if (t && !keywords.includes(t)) keywords.push(t);
  };

  if (distinctName) {
    pushKw(distinctName);
    if (primaryQuery && normalizeTitleForComparison(distinctName) !== normalizeTitleForComparison(primaryQuery)) {
      pushKw(`${primaryQuery} ${distinctName}`);
    }
  } else if (primaryQuery && season) {
    pushKw(`${primaryQuery} 第${season.seasonNumber}季`);
    pushKw(`${primaryQuery}${season.seasonNumber}`);
    pushKw(primaryQuery);
  }

  return { distinctName, keywords };
}

function assembleSeasonSourcesFromBatches(params: {
  batches: RawSiteBatch[];
  seasonNumber: number;
  targetSeason?: TmdbSeasonMeta;
  allSeasons?: TmdbSeasonMeta[];
  primaryQuery: string;
  fallbackTitles: PreparedTargetTitle[];
  isAnimation?: boolean;
}): ResolvedStreamSource[] {
  const {
    batches,
    seasonNumber,
    targetSeason,
    allSeasons,
    primaryQuery,
    fallbackTitles,
    isAnimation,
  } = params;

  const doubanDates = buildDoubanDatesMap(batches);
  const { distinctName } = buildDistinctSeasonKeyword(targetSeason, primaryQuery);
  const seasonTargets = distinctName
    ? prepareTargetTitles(
        [
          distinctName,
          `${primaryQuery} ${distinctName}`,
          `${targetSeason?.name || ""}`,
        ].filter(Boolean),
        "tv"
      )
    : fallbackTitles;

  const targetAirDay = parseSingleIsoDateDay(targetSeason?.airDate);
  const targetYearStr = targetSeason?.airYear ? String(targetSeason.airYear) : undefined;
  const nextSeasonAirDay = (() => {
    if (!allSeasons || targetAirDay === null) return null;
    const later = allSeasons
      .filter((s) => s.seasonNumber > seasonNumber)
      .map((s) => parseSingleIsoDateDay(s.airDate))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);
    return later.length > 0 ? later[0] : null;
  })();

  const distinctTokens = distinctName
    ? [normalizeTitleForComparison(distinctName)]
    : [];
  const matchedSeasonDoubanIds = new Set<string>();

  const evalSeasonItem = (item: any, epCount: number) => {
    const vodName = String(item.vod_name || "").trim();
    const vodSub = String(item.vod_sub || "").trim();
    const vodRemarks = String(item.vod_remarks || "").trim();
    const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
    const vodYear = vodYearMatch ? vodYearMatch[0] : "";
    const parsed = parseSeasonInfo(vodName);
    const pubDays = getEffectivePubDays(item, doubanDates);
    const dbId = extractDoubanId(item.vod_douban_id);
    const isOngoingNow = isOngoingCurrentYear(vodYear, vodRemarks);

    const scoreAgainstSeason = computeTitleMatchScore(
      vodName,
      vodSub,
      seasonTargets,
      "tv",
      targetYearStr
    );
    const scoreAgainstSeries = computeTitleMatchScore(
      vodName,
      vodSub,
      fallbackTitles,
      "tv",
      targetYearStr
    );
    const normTitleSub = normalizeTitleForComparison(`${vodName} ${vodSub}`);
    const hasToken = distinctTokens.some(
      (tok) => tok.length >= 2 && normTitleSub.includes(tok)
    );
    const bestTitleScore = Math.max(scoreAgainstSeason, scoreAgainstSeries);

    const dayDiff = getMinDayDiff(pubDays, targetAirDay);
    const exactDateHit = dayDiff !== null && dayDiff <= 4;
    const intervalHit =
      targetAirDay !== null &&
      epCount > 2 &&
      pubDays.some(
        (d) =>
          d > targetAirDay + 4 &&
          d < (nextSeasonAirDay !== null ? nextSeasonAirDay - 4 : targetAirDay + 730)
      );

    if (exactDateHit && (bestTitleScore >= 110 || hasToken || matchedSeasonDoubanIds.has(dbId || ""))) {
      return { matched: true, score: Math.max(bestTitleScore, 240) + 140, partNumber: parsed.partNumber ?? null };
    }
    if (intervalHit && (bestTitleScore >= 140 || hasToken || matchedSeasonDoubanIds.has(dbId || ""))) {
      return { matched: true, score: Math.max(bestTitleScore, 220) + 100, partNumber: parsed.partNumber ?? null };
    }
    if (dbId && matchedSeasonDoubanIds.has(dbId) && (epCount > 2 || isOngoingNow || bestTitleScore >= 180)) {
      return { matched: true, score: Math.max(bestTitleScore, 240) + 110, partNumber: parsed.partNumber ?? null };
    }

    const strongTitleHit = distinctName
      ? scoreAgainstSeason >= 185
      : parsed.seasonNumber === seasonNumber && scoreAgainstSeries >= 185;
    if (strongTitleHit) {
      const targetY = targetSeason?.airYear;
      const vodY = vodYear ? Number(vodYear) : NaN;
      if (targetY && Number.isFinite(vodY) && Math.abs(vodY - targetY) > 1) {
        return { matched: false, score: 0, partNumber: null };
      }
      return { matched: true, score: bestTitleScore + (targetY && Number.isFinite(vodY) ? 100 : 20), partNumber: parsed.partNumber ?? null };
    }
    return { matched: false, score: 0, partNumber: null };
  };

  // Pass 1: Pool matching Douban IDs across batches
  for (const batch of batches) {
    for (const item of batch.list) {
      if (!item?.vod_play_url || isExcludedVodItem(item, "tv", isAnimation)) continue;
      const dbId = extractDoubanId(item.vod_douban_id);
      if (!dbId || matchedSeasonDoubanIds.has(dbId)) continue;
      const { bestEpisodes } = parseVodPlayGroups(item.vod_play_from, item.vod_play_url);
      if (bestEpisodes.length === 0) continue;
      if (!bestEpisodes.some((ep) => !ep.name.includes("预告") && !ep.name.includes("花絮"))) continue;
      const res = evalSeasonItem(item, bestEpisodes.length);
      if (res.matched) matchedSeasonDoubanIds.add(dbId);
    }
  }

  // Pass 2: Assemble per-site sources for this season
  const results: ResolvedStreamSource[] = [];
  for (const batch of batches) {
    const siteItems: {
      item: any;
      score: number;
      partNumber: number | null;
      vodYearNum: number;
      audioLang?: "粤语" | "国语";
      explicitTitleLang?: "粤语" | "国语";
      playGroups: VodPlayGroup[];
      episodes: VodEpisode[];
    }[] = [];

    for (const item of batch.list) {
      if (!item?.vod_play_url || isExcludedVodItem(item, "tv", isAnimation)) continue;
      const { playGroups, bestEpisodes } = parseVodPlayGroups(item.vod_play_from, item.vod_play_url);
      if (bestEpisodes.length === 0) continue;
      if (!bestEpisodes.some((ep) => !ep.name.includes("预告") && !ep.name.includes("花絮"))) continue;

      const ev = evalSeasonItem(item, bestEpisodes.length);
      if (!ev.matched) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodLang = String(item.vod_lang || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYearNum = vodYearMatch ? Number(vodYearMatch[0]) : 0;
      const titleAudioLang = parseSeasonInfo(vodName).audioLang;
      const detectedLang =
        titleAudioLang || extractAudioLangFromText(vodName, vodLang, vodRemarks);

      siteItems.push({
        item,
        score: ev.score + (bestEpisodes.length > 1 ? 20 : 0),
        partNumber: ev.partNumber,
        vodYearNum,
        audioLang: detectedLang,
        explicitTitleLang: titleAudioLang,
        playGroups,
        episodes: bestEpisodes,
      });
    }

    if (siteItems.length === 0) continue;

    const buildSingleLang = (
      cands: typeof siteItems,
      langTag?: "粤语" | "国语"
    ): ResolvedStreamSource | null => {
      if (cands.length === 0) return null;
      const suffix = langTag === "粤语" ? "_yue" : langTag === "国语" ? "_guo" : "";
      const byPart = new Map<string, (typeof siteItems)[0]>();
      for (const c of cands) {
        const key = c.partNumber !== null && c.partNumber >= 2 ? `p:${c.partNumber}` : "p:1";
        const ex = byPart.get(key);
        if (!ex || c.score > ex.score || (c.score === ex.score && c.episodes.length > ex.episodes.length)) {
          byPart.set(key, c);
        }
      }
      const cours = Array.from(byPart.values()).sort(
        (a, b) => (a.vodYearNum || 9999) - (b.vodYearNum || 9999) || (a.partNumber ?? 1) - (b.partNumber ?? 1)
      );
      const primary = cours[0];
      const mergedEps = sequentializeCourEpisodes(cours);
      const cleanName = toSimplifiedChinese(String(primary.item.vod_name || primaryQuery).trim());
      return {
        sourceId: `${batch.site.id}${suffix}`,
        sourceName: batch.site.name,
        audioLang: langTag,
        fromConfig: batch.site.fromConfig,
        vodId: primary.item.vod_id,
        vodName: cleanName,
        vodYear: primary.item.vod_year ? String(primary.item.vod_year) : undefined,
        vodRemarks: primary.item.vod_remarks ? String(primary.item.vod_remarks) : undefined,
        vodPic: primary.item.vod_pic ? String(primary.item.vod_pic) : undefined,
        latencyMs: batch.latencyMs,
        quality: detectSourceQuality(
          primary.item.vod_remarks,
          primary.item.vod_name,
          mergedEps[0]?.name,
          primary.playGroups[0]?.groupName
        ),
        playGroups: primary.playGroups,
        episodes: mergedEps,
        seasons: [
          {
            seasonNumber,
            name: `Season ${seasonNumber}`,
            vodId: primary.item.vod_id,
            vodName: cleanName,
            episodes: mergedEps,
          },
        ],
      };
    };

    const yue = siteItems.filter((c) => (c.explicitTitleLang || c.audioLang) === "粤语");
    const guo = siteItems.filter((c) => (c.explicitTitleLang || c.audioLang) === "国语");
    const neutral = siteItems.filter((c) => !c.explicitTitleLang && !c.audioLang);

    if (neutral.length > 0 && (yue.length > 0 || guo.length > 0)) {
      const s0 = buildSingleLang(neutral);
      if (s0) results.push(s0);
      const sy = buildSingleLang(yue, "粤语");
      if (sy) results.push(sy);
      const sg = buildSingleLang(guo, "国语");
      if (sg) results.push(sg);
    } else {
      const s0 = buildSingleLang(siteItems, yue.length === siteItems.length ? "粤语" : guo.length === siteItems.length ? "国语" : undefined);
      if (s0) results.push(s0);
    }
  }

  return results;
}

function assembleRawPickerSources(params: {
  batches: RawSiteBatch[];
  query: string;
  mediaType: "movie" | "tv";
  respectCategory: boolean;
}): ResolvedStreamSource[] {
  const { batches, query, mediaType, respectCategory } = params;
  const normQ = normalizeTitleForComparison(toSimplifiedChinese(query));
  const seenKey = new Set<string>();
  const scored: { src: ResolvedStreamSource; relScore: number }[] = [];

  for (const batch of batches) {
    for (const item of batch.list) {
      if (!item?.vod_play_url) continue;
      const vodName = String(item.vod_name || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      if (
        vodName.includes("解说") ||
        vodName.includes("预告") ||
        vodName.includes("短剧") ||
        vodRemarks.includes("预告") ||
        vodRemarks.includes("花絮") ||
        vodRemarks.includes("电影解说") ||
        (respectCategory && isIncompatibleVodCategory(item.type_name, mediaType))
      ) {
        continue;
      }

      const key = `${batch.site.id}:${item.vod_id}`;
      if (seenKey.has(key)) continue;

      const { playGroups, bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;
      if (!bestEpisodes.some((ep) => !ep.name.includes("预告") && !ep.name.includes("花絮"))) {
        continue;
      }
      seenKey.add(key);

      const cleanName = toSimplifiedChinese(vodName);
      const normName = normalizeTitleForComparison(cleanName);
      const exactHit = normQ && normName === normQ ? 200 : 0;
      const prefixHit = normQ && normName.startsWith(normQ) ? 100 : 0;
      const containsHit = normQ && normName.includes(normQ) ? 50 : 0;
      const epBonus = mediaType === "tv" ? Math.min(bestEpisodes.length, 50) : bestEpisodes.length <= 4 ? 30 : 0;
      const tierBonus = getSourceQualityTier(batch.site.id) * 20;
      const relScore = exactHit + prefixHit + containsHit + epBonus + tierBonus - Math.min(batch.latencyMs / 200, 15);

      const audioLang =
        parseSeasonInfo(vodName).audioLang ||
        extractAudioLangFromText(vodName, String(item.vod_lang || ""), vodRemarks);

      const src: ResolvedStreamSource = {
        sourceId: `${batch.site.id}_raw_${item.vod_id}`,
        sourceName: batch.site.name,
        audioLang,
        fromConfig: batch.site.fromConfig,
        vodId: item.vod_id,
        vodName: cleanName,
        vodYear: item.vod_year ? String(item.vod_year) : undefined,
        vodRemarks: vodRemarks || undefined,
        vodPic: item.vod_pic ? String(item.vod_pic) : undefined,
        latencyMs: batch.latencyMs,
        quality: detectSourceQuality(
          vodRemarks,
          vodName,
          bestEpisodes[0]?.name,
          playGroups[0]?.groupName
        ),
        playGroups,
        episodes: bestEpisodes,
        ...(mediaType === "tv"
          ? {
              seasons: [
                {
                  seasonNumber: 1,
                  name: cleanName,
                  vodId: item.vod_id,
                  vodName: cleanName,
                  episodes: bestEpisodes,
                },
              ],
            }
          : {}),
      };
      scored.push({ src, relScore });
    }
  }

  scored.sort((a, b) => b.relScore - a.relScore || a.src.latencyMs - b.src.latencyMs);
  return scored.slice(0, 24).map((x) => x.src);
}

export async function resolveStreamsForMedia(params: {
  tmdbId: string;
  type: "movie" | "tv";
  customKeyword?: string;
  disabledSiteIds?: string[];
  tmdbApiKey?: string;
  seasonNumber?: number;
  rawMode?: boolean;
}): Promise<VodResolveResponse> {
  const {
    tmdbId,
    type,
    customKeyword,
    disabledSiteIds = [],
    tmdbApiKey,
    seasonNumber,
    rawMode = false,
  } = params;
  const normalizedSeasonNum =
    type === "tv" &&
    typeof seasonNumber === "number" &&
    Number.isFinite(seasonNumber) &&
    seasonNumber > 0
      ? Math.floor(seasonNumber)
      : undefined;
  const cacheKey = `${type}:${tmdbId}:s${normalizedSeasonNum || 0}:r${rawMode ? 1 : 0}:${customKeyword || ""}:${disabledSiteIds.join(",")}`;
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
  const targetDateDay = parseSingleIsoDateDay(meta.releaseDate);
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
  if (isUnreleased && !trimmedCustomKeyword && !rawMode) {
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
  const useHealthyFilter = healthySites.length >= 3;
  const activeSites = useHealthyFilter ? healthySites : enabledSites;
  const skippedCooldownSites = useHealthyFilter
    ? enabledSites.filter((s) => isSiteInCooldown(s.id))
    : [];

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
  let hadUpstreamErrors = false;
  const resolveStart = Date.now();
  const trackOutcome = (outcome: "ok" | "error" | "timeout") => {
    if (outcome === "error" || outcome === "timeout") {
      hadUpstreamErrors = true;
    }
  };

  // Mode 1: Raw Cinetry-style manual picker mode
  if (rawMode) {
    const rawQuery = trimmedCustomKeyword ? toSimplifiedChinese(trimmedCustomKeyword) : primaryQuery;
    const rawBatches = await fetchKeywordRoundBatches({
      sites: activeSites,
      keyword: rawQuery,
      roundTimeoutMs: 4200,
      maxSites: Math.min(activeSites.length, 10),
      hasMatchFn: (b) => b.list.some((it) => Boolean(it?.vod_play_url)),
      onOutcome: trackOutcome,
    });
    matchedSources = assembleRawPickerSources({
      batches: rawBatches,
      query: rawQuery,
      mediaType: type,
      respectCategory: !trimmedCustomKeyword,
    });
    const response: VodResolveResponse = {
      tmdbId,
      mediaType: type,
      searchQuery: rawQuery,
      candidateTitles,
      releaseYear,
      sources: matchedSources,
      ...(matchedSources.length === 0 && hadUpstreamErrors ? { hadTransientErrors: true } : {}),
    };
    if (!(matchedSources.length === 0 && hadUpstreamErrors)) {
      setBoundedCache(resolvedStreamsCache, cacheKey, { data: response, expiresAt: Date.now() + 5 * 60 * 1000 }, 300);
    }
    return response;
  }

  // Mode 2: On-demand missing TMDB season lookup (handles renamed sequels like 化物语 -> 伪物语)
  if (normalizedSeasonNum !== undefined) {
    const targetSeason = meta.seasons?.find((s) => s.seasonNumber === normalizedSeasonNum);
    const { keywords: seasonKeywords } = buildDistinctSeasonKeyword(targetSeason, primaryQuery);
    const seasonBatchesBySite = new Map<string, RawSiteBatch>();
    let used = 0;

    for (const skw of seasonKeywords.slice(0, 2)) {
      if (used >= 18) break;
      const remSites = activeSites.filter((s) => !seasonBatchesBySite.has(s.id));
      if (remSites.length === 0) break;
      const cap = Math.min(remSites.length, 18 - used);
      used += cap;
      const batches = await fetchKeywordRoundBatches({
        sites: remSites,
        keyword: skw,
        roundTimeoutMs: 4200,
        maxSites: cap,
        hasMatchFn: (b) => b.list.some((it) => Boolean(it?.vod_play_url)),
        onOutcome: trackOutcome,
      });
      for (const b of batches) {
        if (!seasonBatchesBySite.has(b.site.id)) {
          seasonBatchesBySite.set(b.site.id, b);
        }
      }
      if (seasonBatchesBySite.size >= 6) break;
    }

    matchedSources = assembleSeasonSourcesFromBatches({
      batches: Array.from(seasonBatchesBySite.values()),
      seasonNumber: normalizedSeasonNum,
      targetSeason,
      allSeasons: meta.seasons,
      primaryQuery,
      fallbackTitles: preparedTargets,
      isAnimation: meta.isAnimation,
    });

    matchedSources.sort((a, b) => {
      const aTier = getSourceQualityTier(a.sourceId);
      const bTier = getSourceQualityTier(b.sourceId);
      if (aTier !== bTier) return bTier - aTier;
      const diffEps = (b.episodes?.length || 0) - (a.episodes?.length || 0);
      if (Math.abs(diffEps) >= 3) return diffEps;
      return a.latencyMs - b.latencyMs;
    });

    const hasTransientEmpty = matchedSources.length === 0 && hadUpstreamErrors;
    const response: VodResolveResponse = {
      tmdbId,
      mediaType: type,
      searchQuery: seasonKeywords[0] || primaryQuery,
      candidateTitles,
      releaseYear: targetSeason?.airYear ? String(targetSeason.airYear) : releaseYear,
      sources: matchedSources,
      ...(hasTransientEmpty ? { hadTransientErrors: true } : {}),
    };
    if (!hasTransientEmpty) {
      setBoundedCache(
        resolvedStreamsCache,
        cacheKey,
        { data: response, expiresAt: Date.now() + (matchedSources.length > 0 ? 30 : 2) * 60 * 1000 },
        300
      );
    }
    return response;
  }

  // Mode 3: Standard Movie & Multi-Season TV Resolution with Cross-Site Date + Douban ID Consensus
  // NOTE: Stay under Cloudflare Pages Functions' 50-subrequest ceiling across TMDB + up to 3 keyword rounds.
  const MAX_VOD_SUBREQUESTS = 26;
  const OVERALL_WITH_SOURCES_DEADLINE_MS = 3800;
  const OVERALL_EMPTY_DEADLINE_MS = 8500;
  const maxKeywordsToTry = Math.min(searchKeywords.length, 3);
  const batchesBySite = new Map<string, RawSiteBatch>();
  const quickMatchedSites = new Set<string>();
  let vodSubrequestsUsed = 0;

  const primaryNorm = normalizeTitleForComparison(searchKeywords[0] || "");
  for (let kIdx = 0; kIdx < maxKeywordsToTry; kIdx++) {
    if (vodSubrequestsUsed >= MAX_VOD_SUBREQUESTS) break;
    const kw = searchKeywords[kIdx];
    const kwNorm = normalizeTitleForComparison(kw || "");
    const isDistinctCjkAlias =
      kIdx > 0 &&
      /[\u4e00-\u9fff]/.test(kw || "") &&
      Boolean(primaryNorm) &&
      Boolean(kwNorm) &&
      !primaryNorm.includes(kwNorm) &&
      !kwNorm.includes(primaryNorm);
    if (kIdx > 0 && quickMatchedSites.size >= (isDistinctCjkAlias ? 6 : 2)) {
      break;
    }
    if (kIdx > 1 && quickMatchedSites.size > 0 && !isDistinctCjkAlias) {
      break;
    }

    const overallBudgetMs =
      quickMatchedSites.size > 0
        ? isDistinctCjkAlias
          ? 4600
          : OVERALL_WITH_SOURCES_DEADLINE_MS
        : OVERALL_EMPTY_DEADLINE_MS;
    const remainingWallMs = overallBudgetMs - (Date.now() - resolveStart);
    if (kIdx > 0 && remainingWallMs < 800) break;
    const maxRoundCapMs = quickMatchedSites.size > 0 ? 2600 : 6000;
    const roundTimeoutMs = Math.max(800, Math.min(maxRoundCapMs, remainingWallMs));
    const remainingBudget = MAX_VOD_SUBREQUESTS - vodSubrequestsUsed;
    const remainingSites = activeSites
      .filter((s) => !quickMatchedSites.has(s.id))
      .slice(0, remainingBudget);
    if (remainingSites.length === 0) break;

    vodSubrequestsUsed += remainingSites.length;

    const roundBatches = await fetchKeywordRoundBatches({
      sites: remainingSites,
      keyword: kw,
      roundTimeoutMs,
      maxSites: remainingBudget,
      hasMatchFn: (b) => {
        const prev = batchesBySite.get(b.site.id);
        if (!prev) {
          batchesBySite.set(b.site.id, b);
        } else {
          const seenIds = new Set(prev.list.map((it) => String(it?.vod_id)));
          const extras = b.list.filter((it) => !seenIds.has(String(it?.vod_id)));
          prev.list = [...prev.list, ...extras];
        }
        const ok = hasQuickPlayableMatch({
          list: b.list,
          preparedTargets,
          targetYear: releaseYear,
          targetDateDay,
          mediaType: type,
          isAnimation: meta.isAnimation,
          tmdbSeasons: meta.seasons,
        });
        if (ok) quickMatchedSites.add(b.site.id);
        return ok;
      },
      onOutcome: trackOutcome,
    });

    for (const b of roundBatches) {
      if (!batchesBySite.has(b.site.id)) {
        batchesBySite.set(b.site.id, b);
      }
    }
  }

  // Cooldown rescue pass: if quick matching found nothing across healthy sites, try skipped cooldown sites within budget
  if (
    quickMatchedSites.size === 0 &&
    skippedCooldownSites.length > 0 &&
    vodSubrequestsUsed < MAX_VOD_SUBREQUESTS
  ) {
    const rescueRemainingMs =
      OVERALL_EMPTY_DEADLINE_MS - (Date.now() - resolveStart);
    if (rescueRemainingMs >= 1000) {
      const rescueSites = skippedCooldownSites.slice(
        0,
        MAX_VOD_SUBREQUESTS - vodSubrequestsUsed
      );
      vodSubrequestsUsed += rescueSites.length;
      const rescueTimeoutMs = Math.min(4500, rescueRemainingMs);
      const rescueBatches = await fetchKeywordRoundBatches({
        sites: rescueSites,
        keyword: primaryQuery,
        roundTimeoutMs: rescueTimeoutMs,
        maxSites: rescueSites.length,
        hasMatchFn: (b) =>
          hasQuickPlayableMatch({
            list: b.list,
            preparedTargets,
            targetYear: releaseYear,
            targetDateDay,
            mediaType: type,
            isAnimation: meta.isAnimation,
            tmdbSeasons: meta.seasons,
          }),
        onOutcome: trackOutcome,
      });
      for (const b of rescueBatches) {
        if (!batchesBySite.has(b.site.id)) {
          batchesBySite.set(b.site.id, b);
        }
      }
    }
  }

  const allBatches = Array.from(batchesBySite.values());
  const consensus = buildCrossSiteDoubanConsensus({
    batches: allBatches,
    preparedTargets,
    mediaType: type,
    targetYear: releaseYear,
    targetDateDay,
    isAnimation: meta.isAnimation,
    tmdbSeasons: meta.seasons,
  });

  for (const batch of allBatches) {
    const siteSources = assembleSourcesFromRawBatch({
      batch,
      preparedTargets,
      targetYear: releaseYear,
      targetDateDay,
      mediaType: type,
      isAnimation: meta.isAnimation,
      tmdbSeasons: meta.seasons,
      consensus,
    });
    if (siteSources.length > 0) {
      matchedSources.push(...siteSources);
    }
  }

  const normPrimary = normalizeTitleForComparison(
    type === "tv"
      ? parseSeasonInfo(primaryQuery).baseTitle
      : stripLanguageAndStatusTags(toSimplifiedChinese(stripYearSuffix(primaryQuery)))
  );
  matchedSources.sort((a, b) => {
    const aBase = normalizeTitleForComparison(
      type === "tv"
        ? parseSeasonInfo(a.vodName).baseTitle
        : stripLanguageAndStatusTags(toSimplifiedChinese(stripYearSuffix(a.vodName)))
    );
    const bBase = normalizeTitleForComparison(
      type === "tv"
        ? parseSeasonInfo(b.vodName).baseTitle
        : stripLanguageAndStatusTags(toSimplifiedChinese(stripYearSuffix(b.vodName)))
    );
    const aExactTitle = aBase === normPrimary ? 1 : 0;
    const bExactTitle = bBase === normPrimary ? 1 : 0;
    if (aExactTitle !== bExactTitle) return bExactTitle - aExactTitle;

    const aHasFull = a.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    const bHasFull = b.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    if (aHasFull !== bHasFull) return bHasFull - aHasFull;

    if (type === "tv") {
      const aSeasons = a.seasons?.length || 1;
      const bSeasons = b.seasons?.length || 1;
      if (aSeasons !== bSeasons) return bSeasons - aSeasons;
    }

    const aTier = getSourceQualityTier(a.sourceId);
    const bTier = getSourceQualityTier(b.sourceId);
    if (aTier !== bTier) return bTier - aTier;

    if (type === "tv") {
      const sumEps = (src: ResolvedStreamSource) =>
        src.seasons && src.seasons.length > 0
          ? src.seasons.reduce((acc, se) => acc + (se.episodes?.length || 0), 0)
          : src.episodes?.length || 0;
      const diffEps = sumEps(b) - sumEps(a);
      if (Math.abs(diffEps) >= 4) return diffEps;
    }

    return a.latencyMs - b.latencyMs;
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const tmdbSeasonsSummary: TmdbSeasonSummary[] | undefined =
    type === "tv" && meta.seasons && meta.seasons.length > 0
      ? meta.seasons
          .filter((s) => s.seasonNumber > 0 && (!s.airDate || s.airDate <= todayIso))
          .map(({ seasonNumber: sNum, name, airDate, episodeCount }) => ({
            seasonNumber: sNum,
            name,
            airDate,
            episodeCount,
          }))
      : undefined;

  const hasTransientEmpty = matchedSources.length === 0 && hadUpstreamErrors;
  const response: VodResolveResponse = {
    tmdbId,
    mediaType: type,
    searchQuery: primaryQuery,
    candidateTitles,
    releaseYear,
    sources: matchedSources,
    ...(tmdbSeasonsSummary && tmdbSeasonsSummary.length > 0
      ? { tmdbSeasons: tmdbSeasonsSummary }
      : {}),
    ...(hasTransientEmpty ? { hadTransientErrors: true } : {}),
  };

  if (!hasTransientEmpty) {
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
  }
  if (matchedSources.length > 0) {
    setBoundedCache(
      availabilityCache,
      `${type}:${tmdbId}`,
      {
        available: true,
        primaryZhTitle: meta.primaryZhTitle,
        expiresAt: Date.now() + 30 * 60 * 1000,
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
            3200,
            undefined,
            undefined,
            meta.isAnimation,
            meta.seasons
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

const PARENT_FALLBACK_PROBE_SITE = "https://bfzyapi.com/api.php/provide/vod";

export async function resolveFallbackParentTitlesFromVod(
  query: string
): Promise<string[]> {
  const trimmed = toSimplifiedChinese(query.trim());
  const normQuery = normalizeTitleForComparison(trimmed);
  if (!normQuery || normQuery.length < 2) return [];

  const queryParts = trimmed.includes("之")
    ? trimmed
        .split("之")
        .map((p) => normalizeTitleForComparison(p))
        .filter((p) => p.length >= 2)
    : [];

  try {
    const res = await fetch(
      `${PARENT_FALLBACK_PROBE_SITE}?ac=videolist&wd=${encodeURIComponent(trimmed)}`,
      {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          Accept: "application/json, text/plain, */*",
        },
        signal: AbortSignal.timeout(2200),
      }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    const list = Array.isArray(data?.list) ? data.list : [];
    if (list.length === 0) return [];

    const candidates: string[] = [];
    const seenNorm = new Set<string>();

    const tryPush = (raw?: string) => {
      if (!raw) return;
      const cleaned = stripLanguageAndStatusTags(
        toSimplifiedChinese(stripYearSuffix(raw))
      ).trim();
      const norm = normalizeTitleForComparison(cleaned);
      if (!norm || norm.length < 2 || norm === normQuery || seenNorm.has(norm)) {
        return;
      }
      seenNorm.add(norm);
      candidates.push(cleaned);
    };

    for (const item of list) {
      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const typeName = toSimplifiedChinese(String(item.type_name || "")).trim();
      if (!vodName || !item.vod_play_from || !item.vod_play_url) continue;
      if (isIncompatibleVodCategory(typeName)) continue;
      if (typeName && !/(?:剧$|片$|电影|动漫)/.test(typeName)) continue;

      const haystack = normalizeTitleForComparison(`${vodName} ${vodSub}`);
      const isRelevant =
        haystack.includes(normQuery) ||
        (queryParts.length >= 2 && queryParts.every((p) => haystack.includes(p)));
      if (!isRelevant) continue;

      const { baseTitle } = parseSeasonInfo(vodName);
      tryPush(baseTitle);
      const colonBase = baseTitle.split(/[:：]/)[0].trim();
      tryPush(colonBase);

      if (candidates.length >= 2) break;
    }

    return candidates.slice(0, 2);
  } catch {
    return [];
  }
}
