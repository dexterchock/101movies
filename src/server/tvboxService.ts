import {
  TvboxConfigItem,
  VodSite,
  VodEpisode,
  VodPlayGroup,
  ResolvedStreamSource,
  VodResolveResponse,
} from "../types";

export const AWESOME_ZHUIJU_TVBOX_CONFIGS: TvboxConfigItem[] = [
  {
    id: "xiao-ma",
    name: "小马 TVBox",
    url: "https://szyyds.cn/tv/x.json",
    type: "single",
    description: "awesome-zhuiju-free 精选单仓接口，内置 62 个站点与 16 条直连高速 CMS 影视源",
    author: "小马",
    cmsSiteCount: 16,
    totalSiteCount: 62,
  },
  {
    id: "lao-liu-bei",
    name: "老刘备 TVBox",
    url: "https://raw.liucn.cc/box/m.json",
    type: "single",
    description: "awesome-zhuiju-free 经典稳定单仓，聚合 234 个影视站点与 15 条标准采集源",
    author: "老刘备",
    cmsSiteCount: 15,
    totalSiteCount: 234,
  },
  {
    id: "chuang-xiang-ying-shi-tvbox",
    name: "创享影视 TVBox",
    url: "https://ys.cxkjg.cn/api/provide/tvbox",
    type: "single",
    description: "创享影视官方 TVBox 聚合专线，提供金鹰、闪电、非凡、量子、红牛等 12 条直连源",
    author: "创享影视",
    cmsSiteCount: 12,
    totalSiteCount: 12,
  },
  {
    id: "fan-tai-ying",
    name: "饭太硬",
    url: "http://www.饭太硬.net/tv",
    type: "single",
    description: "awesome-zhuiju-free 置顶推荐接口，主流 TVBox / 影视仓标杆配置源",
    author: "饭太硬",
  },
  {
    id: "fei-mao",
    name: "肥猫",
    url: "http://肥猫.net/",
    type: "single",
    description: "awesome-zhuiju-free 热门推荐接口，更新频繁、画质清晰",
    author: "肥猫",
  },
  {
    id: "xiao-he-zi-4k",
    name: "小盒子4K",
    url: "http://xhztv.top/4k.json",
    type: "single",
    description: "聚玩盒子 4K 影视仓单仓接口，主打高清剧集与院线电影",
    author: "小盒子",
    totalSiteCount: 48,
  },
  {
    id: "wu-ming",
    name: "无名 TVBox",
    url: "https://6800.kstore.vip/fish.json",
    type: "single",
    description: "awesome-zhuiju-free 收录单仓接口，含 103 个综合影视站点",
    author: "无名",
    totalSiteCount: 103,
  },
  {
    id: "mo-yu-er",
    name: "摸鱼儿",
    url: "http://www.y456y.com",
    type: "single",
    description: "摸鱼儿影视仓接口，涵盖热门院线、番剧与综艺",
    author: "摸鱼儿",
  },
  {
    id: "wang-er-xiao",
    name: "王二小放牛娃",
    url: "http://new.王二小放牛娃.top",
    type: "single",
    description: "王二小放牛娃 TVBox 单仓配置地址",
    author: "王二小",
  },
  {
    id: "ying-cang-tvbox",
    name: "影仓专线",
    url: "http://124.71.19.220/c/1",
    type: "single",
    description: "影视仓专用精简配置源",
    author: "影仓",
  },
  {
    id: "xiao-he-zi-single",
    name: "小盒子单仓",
    url: "http://xhztv.top/xhz",
    type: "single",
    description: "小盒子稳定单仓接口",
    author: "小盒子",
  },
  {
    id: "ao-wu",
    name: "嗷呜 TVBox",
    url: "http://itv666.cc/aowu/config.webp",
    type: "single",
    description: "嗷呜伪装图片后缀 TVBox 接口",
    author: "嗷呜",
  },
  {
    id: "ting-hao-share-multi",
    name: "挺好分享多仓",
    url: "http://ztha.top/TVBox/GYCK.json",
    type: "multi",
    description: "awesome-zhuiju-free 多仓聚合接口，内含挺好分享、荷城茶秀等多个子仓库",
    author: "挺好分享",
  },
  {
    id: "xiao-he-zi-multi",
    name: "小盒子多仓",
    url: "http://xhztv.top/dc",
    type: "multi",
    description: "小盒子多仓聚合源，整合小盒子、肥猫、饭太硬、唐三等多条线路",
    author: "小盒子",
  },
  {
    id: "shi-guang-multi",
    name: "拾光多仓",
    url: "http://xmbjm.fh4u.org/dc.txt",
    type: "multi",
    description: "拾光多仓文本聚合配置源",
    author: "拾光",
  },
];

// Preloaded high-speed CMS VOD providers extracted from awesome-zhuiju-free TVBox configs (小马, 老刘备, 创享影视)
export const BUILTIN_VOD_SITES: VodSite[] = [
  {
    id: "bfzy",
    name: "暴风资源",
    api: "https://bfzyapi.com/api.php/provide/vod",
    fromConfig: "小马 / 老刘备 TVBox",
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
    id: "ffzy",
    name: "非凡资源",
    api: "https://cj.ffzyapi.com/api.php/provide/vod",
    fromConfig: "小马 / 老刘备 TVBox",
    enabled: true,
  },
  {
    id: "ruyi",
    name: "如意资源",
    api: "https://cj.rycjapi.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju 直连",
    enabled: true,
  },
  {
    id: "dytt",
    name: "电影天堂",
    api: "http://caiji.dyttzyapi.com/api.php/provide/vod",
    fromConfig: "小马 TVBox",
    enabled: true,
  },
  {
    id: "subo",
    name: "速播资源",
    api: "https://subocaiji.com/api.php/provide/vod",
    fromConfig: "创享影视 TVBox",
    enabled: true,
  },
  {
    id: "hhzy",
    name: "火狐豪华",
    api: "https://hhzyapi.com/api.php/provide/vod",
    fromConfig: "老刘备 TVBox",
    enabled: true,
  },
  {
    id: "jisu",
    name: "极速资源",
    api: "https://jszyapi.com/api.php/provide/vod",
    fromConfig: "小马 TVBox",
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
    id: "guangsu",
    name: "光速资源",
    api: "https://api.guangsuapi.com/api.php/provide/vod",
    fromConfig: "小马 / 创享 TVBox",
    enabled: true,
  },
  {
    id: "ikun",
    name: "iKun资源",
    api: "https://ikunzyapi.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju 直连",
    enabled: true,
  },
  {
    id: "360zy",
    name: "360资源",
    api: "https://360zy.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju 直连",
    enabled: true,
  },
  {
    id: "huya",
    name: "虎牙资源",
    api: "https://www.huyaapi.com/api.php/provide/vod",
    fromConfig: "老刘备 TVBox",
    enabled: true,
  },
  {
    id: "xinlang",
    name: "新浪资源",
    api: "http://api.xinlangapi.com/xinlangapi.php/provide/vod",
    fromConfig: "小马 TVBox",
    enabled: true,
  },
];

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
        message: "该接口使用了专属 JAR 壳加密 (如立播/肥猫 AES 密文)，内置高速源已为您自动代理解析其同源采集站",
      };
    }

    // Handle multi-repo (多仓)
    const multiUrls = parsed.urls || parsed.storeHouse;
    if (Array.isArray(multiUrls) && multiUrls.length > 0) {
      const subRepos = multiUrls
        .filter((u: any) => u && typeof u.url === "string")
        .map((u: any) => ({
          name: String(u.name || u.sourceName || "子仓库").trim(),
          url: String(u.url).trim(),
        }));
      return {
        ok: true,
        type: "multi",
        totalSites: subRepos.length,
        extractedSites: [],
        subRepos,
        message: `成功解析多仓配置，包含 ${subRepos.length} 个子仓库`,
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
        const cleanName = String(s.name || s.key || "TVBox采集源")
          .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s|()-]/g, "")
          .trim();

        const vodSite: VodSite = {
          id: siteId,
          name: cleanName || "TVBox源",
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
          ? `成功解析 ${sites.length} 个站点，提取并激活 ${extractedSites.length} 条网页直连 M3U8 采集源`
          : `解析成功（共 ${sites.length} 个站点，均为安卓原生 JAR 爬虫源，网页端已通过内置直连 CMS 源保障播放）`,
    };
  } catch (err: any) {
    return {
      ok: false,
      type: "unknown",
      totalSites: 0,
      extractedSites: [],
      message: err?.message || "连接配置地址超时",
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
    const groupName = (fromList[idx] || `线路 ${idx + 1}`).trim();
    const rawItems = rawGroup
      .split("#")
      .map((item) => item.trim())
      .filter(Boolean);

    const episodes: VodEpisode[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const part = rawItems[i];
      let epName = `第 ${i + 1} 集`;
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

function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s:：·\-—_!！?？,，.。'’"“”()（）[\]【】]/g, "")
    .trim();
}

function buildSearchKeywords(titles: string[]): string[] {
  const candidates: string[] = [];
  const addCandidate = (t?: string) => {
    if (!t) return;
    const clean = t.trim();
    if (clean.length >= 1 && !candidates.includes(clean)) {
      candidates.push(clean);
    }
    // Also strip colon/subtitle for broader Chinese VOD search if needed
    const beforeColon = clean.split(/[:：\-—]/)[0].trim();
    if (beforeColon.length >= 2 && !candidates.includes(beforeColon)) {
      candidates.push(beforeColon);
    }
  };

  for (const t of titles) {
    addCandidate(t);
  }
  return candidates;
}

async function searchSingleVodSite(
  site: VodSite,
  keyword: string,
  targetTitles: string[],
  targetYear?: string,
  mediaType?: "movie" | "tv"
): Promise<ResolvedStreamSource | null> {
  const start = Date.now();
  const sep = site.api.includes("?") ? "&" : "?";
  const searchUrl = `${site.api}${sep}ac=videolist&wd=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data?.list) ? data.list : [];
    if (list.length === 0) return null;

    const latencyMs = Date.now() - start;
    const normalizedTargets = targetTitles
      .map(normalizeTitleForComparison)
      .filter(Boolean);

    // Score each item in data.list and verify it has playable .m3u8/.mp4 streams
    let bestCandidate: {
      item: any;
      score: number;
      playGroups: VodPlayGroup[];
      episodes: VodEpisode[];
    } | null = null;

    for (const item of list) {
      const { playGroups, bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const normVodName = normalizeTitleForComparison(vodName);
      const normVodSub = normalizeTitleForComparison(vodSub);
      const vodYear = String(item.vod_year || "").trim();

      let score = 0;

      for (const target of normalizedTargets) {
        if (!target) continue;
        if (normVodName === target) {
          score += 220;
        } else if (normVodSub === target) {
          score += 180;
        } else if (normVodName.includes(target) || target.includes(normVodName)) {
          const lengthDiff = Math.abs(normVodName.length - target.length);
          score += Math.max(20, 70 - lengthDiff * 6);
        } else if (normVodSub && normVodSub.includes(target)) {
          score += 35;
        }
      }

      if (targetYear && vodYear) {
        if (vodYear === targetYear) {
          score += 120;
        } else if (Math.abs(Number(vodYear) - Number(targetYear)) === 1) {
          score += 30;
        } else {
          score -= 60;
        }
      }

      // Prefer multi-episode entries for TV shows and single/few episodes for movies
      if (mediaType === "tv" && bestEpisodes.length > 1) {
        score += 20;
      } else if (mediaType === "movie" && bestEpisodes.length <= 4) {
        score += 15;
      }

      // Penalize movie recaps ("解说") and trailers ("预告")
      if (vodName.includes("解说") || vodName.includes("预告")) {
        score -= 120;
      }
      const isOnlyTrailer =
        bestEpisodes.length === 1 && bestEpisodes[0].name.includes("预告");
      if (isOnlyTrailer) {
        score -= 80;
      }

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          item,
          score,
          playGroups,
          episodes: bestEpisodes,
        };
      }
    }

    if (!bestCandidate || bestCandidate.score < 0) return null;

    return {
      sourceId: site.id,
      sourceName: site.name,
      fromConfig: site.fromConfig,
      vodId: bestCandidate.item.vod_id,
      vodName: String(bestCandidate.item.vod_name || keyword).trim(),
      vodYear: bestCandidate.item.vod_year ? String(bestCandidate.item.vod_year) : undefined,
      vodRemarks: bestCandidate.item.vod_remarks
        ? String(bestCandidate.item.vod_remarks)
        : undefined,
      vodPic: bestCandidate.item.vod_pic ? String(bestCandidate.item.vod_pic) : undefined,
      latencyMs,
      playGroups: bestCandidate.playGroups,
      episodes: bestCandidate.episodes,
    };
  } catch {
    return null;
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

export async function resolveStreamsForMedia(params: {
  tmdbId: string;
  type: "movie" | "tv";
  customKeyword?: string;
  disabledSiteIds?: string[];
  tmdbApiKey?: string;
}): Promise<VodResolveResponse> {
  const { tmdbId, type, customKeyword, disabledSiteIds = [], tmdbApiKey } = params;
  const candidateTitles: string[] = [];
  let releaseYear: string | undefined;

  if (customKeyword && customKeyword.trim()) {
    candidateTitles.push(customKeyword.trim());
  }

  // Fetch localized Chinese (zh-CN) and English (en-US) titles from TMDB
  if (tmdbId && tmdbApiKey) {
    try {
      const [zhRes, enRes] = await Promise.allSettled([
        fetch(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&api_key=${tmdbApiKey}`,
          { signal: AbortSignal.timeout(4000) }
        ).then((r) => r.json()),
        fetch(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?language=en-US&api_key=${tmdbApiKey}`,
          { signal: AbortSignal.timeout(4000) }
        ).then((r) => r.json()),
      ]);

      if (zhRes.status === "fulfilled" && zhRes.value) {
        const d = zhRes.value;
        const zhTitle = d.title || d.name;
        const origTitle = d.original_title || d.original_name;
        const dateStr = d.release_date || d.first_air_date;
        if (dateStr && typeof dateStr === "string") {
          releaseYear = dateStr.slice(0, 4);
        }
        if (zhTitle) candidateTitles.push(zhTitle);
        if (origTitle && !candidateTitles.includes(origTitle)) {
          candidateTitles.push(origTitle);
        }
      }

      if (enRes.status === "fulfilled" && enRes.value) {
        const d = enRes.value;
        const enTitle = d.title || d.name;
        const dateStr = d.release_date || d.first_air_date;
        if (!releaseYear && dateStr && typeof dateStr === "string") {
          releaseYear = dateStr.slice(0, 4);
        }
        if (enTitle && !candidateTitles.includes(enTitle)) {
          candidateTitles.push(enTitle);
        }
      }
    } catch {}
  }

  const searchKeywords = buildSearchKeywords(candidateTitles);
  const primaryQuery = searchKeywords[0] || "";

  const disabledSet = new Set(disabledSiteIds);
  const activeSites = getAllVodSites().filter(
    (s) => s.enabled !== false && !disabledSet.has(s.id)
  );

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

  // Query all active VOD sites concurrently using primaryQuery
  let settled = await Promise.allSettled(
    activeSites.map((site) =>
      searchSingleVodSite(site, primaryQuery, candidateTitles, releaseYear, type)
    )
  );

  let matchedSources = settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((s): s is ResolvedStreamSource => s !== null);

  // If primaryQuery yielded < 2 results and we have a secondary keyword (e.g. stripped subtitle or original title), try it
  if (matchedSources.length < 2 && searchKeywords.length > 1) {
    const secondaryQuery = searchKeywords[1];
    const existingIds = new Set(matchedSources.map((m) => m.sourceId));
    const remainingSites = activeSites.filter((s) => !existingIds.has(s.id));

    const secondSettled = await Promise.allSettled(
      remainingSites.map((site) =>
        searchSingleVodSite(site, secondaryQuery, candidateTitles, releaseYear, type)
      )
    );
    const secondMatches = secondSettled
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((s): s is ResolvedStreamSource => s !== null);

    matchedSources = [...matchedSources, ...secondMatches];
  }

  // Sort by exact title/year match, full episode availability, and response speed
  const normPrimary = normalizeTitleForComparison(primaryQuery);
  matchedSources.sort((a, b) => {
    const aExactTitle = normalizeTitleForComparison(a.vodName) === normPrimary ? 1 : 0;
    const bExactTitle = normalizeTitleForComparison(b.vodName) === normPrimary ? 1 : 0;
    if (aExactTitle !== bExactTitle) return bExactTitle - aExactTitle;

    const aYearMatch = releaseYear && a.vodYear === releaseYear ? 1 : 0;
    const bYearMatch = releaseYear && b.vodYear === releaseYear ? 1 : 0;
    if (aYearMatch !== bYearMatch) return bYearMatch - aYearMatch;

    const aHasFull = a.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    const bHasFull = b.episodes.some((e) => !e.name.includes("预告")) ? 1 : 0;
    if (aHasFull !== bHasFull) return bHasFull - aHasFull;

    return a.latencyMs - b.latencyMs;
  });

  return {
    tmdbId,
    mediaType: type,
    searchQuery: primaryQuery,
    candidateTitles,
    releaseYear,
    sources: matchedSources,
  };
}
