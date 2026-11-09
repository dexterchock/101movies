import {
  TvboxConfigItem,
  VodSite,
  VodEpisode,
  VodPlayGroup,
  VodSeasonGroup,
  ResolvedStreamSource,
  VodResolveResponse,
} from "../types";

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
    fromConfig: "awesome-zhuiju Direct",
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
    fromConfig: "awesome-zhuiju Direct",
    enabled: true,
  },
  {
    id: "360zy",
    name: "360资源",
    api: "https://360zy.com/api.php/provide/vod",
    fromConfig: "awesome-zhuiju Direct",
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

const TRAD_CHARS =
  "複復質閃電俠龍戰絕師權遊戲語鏡紙將軍輻異聯驚隊長級壞腦轉彎奧達鐵號駭國際啟動盜夢間門開關見觀視聽聲音樂傳說話記錄憶愛戀親兒孫媽爺兄敵殺傷醫藥療運氣風雲霧陽陰紅綠藍黃銀銅鋼鑽寶島樹葉鳥獸魚蟲馬貓獅鷹鷗鴿雞鴨鵝鳳聖偵諜賊幫會團黨鎮鄉莊園館樓橋場廠鋪宮廟獄籠網線絲繩帶環鏈鎖鑰匙劍槍彈車艦機飛時紀節曉東內後淺遠強舊醜貧貴賤難遲閒熱溫涼乾濕淨髒亂齊雙單萬億貳弎陸柒捌玖拾佰仟兩隻條種類眾獨們誰麼樣裏裡邊處點體頭臉齒膽腎腸膚髮腳殼劇員導編寫畫圖書籍頁冊報雜志碼數學練試驗證據實況態勢論識覺緒願懼淚歡慶祿壽財業務勞動飯湯飲裝襪褲牆層階躍潛墜滯離終敗輸贏勝負爭奪搶佔統規懲罰賞賜贈給歸返還進尋覓詢應諾許認塗測算謀術藝慣聞稱題載擊斷滅毀損觸擁護衛禦襲闖過顯隱換變創築補癒甦";
const SIMP_CHARS =
  "复复质闪电侠龙战绝师权游戏语镜纸将军辐异联惊队长级坏脑转弯奥达铁号骇国际启动盗梦间门开关见观视听声音乐传说话记录忆爱恋亲儿孙妈爷兄敌杀伤医药疗运气风云雾阳阴红绿蓝黄银铜钢钻宝岛树叶鸟兽鱼虫马猫狮鹰鸥鸽鸡鸭鹅凤圣侦谍贼帮会团党镇乡庄园馆楼桥场厂铺宫庙狱笼网线丝绳带环链锁钥匙剑枪弹车舰机飞时纪节晓东内后浅远强旧丑贫贵贱难迟闲热温凉干湿净脏乱齐双单万亿二三六七八九十百千两只条种类众独们谁么样里里边处点体头脸齿胆肾肠肤发脚壳剧员导编写画图书籍页册报杂志码数学练试验证据实况态势论识觉绪愿惧泪欢庆禄寿财业务劳动饭汤饮装袜裤墙层阶跃潜坠滞离终败输赢胜负争夺抢占统规惩罚赏赐赠给归返还进寻觅询应诺许认涂测算谋术艺惯闻称题载击断灭毁损触拥护卫御袭闯过显隐换变创筑补愈苏";

const TRAD_TO_SIMP_MAP: Record<string, string> = {};
for (let i = 0; i < TRAD_CHARS.length; i++) {
  TRAD_TO_SIMP_MAP[TRAD_CHARS[i]] = SIMP_CHARS[i];
}

export function toSimplifiedChinese(input: string): string {
  if (!input) return "";
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    out += TRAD_TO_SIMP_MAP[ch] || ch;
  }
  return out;
}

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

function stripYearSuffix(title: string): string {
  return title.replace(/\s*[(（【[]?(19|20)\d{2}[)）】\]]?\s*$/, "").trim();
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

function stripLanguageAndStatusTags(input: string): string {
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

function normalizeTitleForComparison(title: string): string {
  return toSimplifiedChinese(title)
    .toLowerCase()
    .replace(/[\s:：·\-—_!！?？,，.。'’"“”()（）[\]【】*＊]/g, "")
    .trim();
}

function extractNumbers(str: string): string[] {
  return str.match(/\d+/g) || [];
}

function buildSearchKeywords(titles: string[]): string[] {
  const candidates: string[] = [];
  const addCandidate = (t?: string) => {
    if (!t) return;
    const simp = toSimplifiedChinese(stripYearSuffix(t)).trim();
    const { baseTitle } = parseSeasonInfo(simp);
    for (const variant of [baseTitle, simp]) {
      if (variant.length >= 1 && !candidates.includes(variant)) {
        candidates.push(variant);
      }
      const beforeColon = variant.split(/[:：]/)[0].trim();
      if (
        beforeColon.length >= 2 &&
        beforeColon !== variant &&
        !candidates.includes(beforeColon)
      ) {
        candidates.push(beforeColon);
      }
    }
  };

  // Prioritize titles containing Chinese characters first since VOD CMS sites index primarily in Chinese
  const zhTitles = titles.filter((t) => /[\u4e00-\u9fff]/.test(t));
  const otherTitles = titles.filter((t) => !/[\u4e00-\u9fff]/.test(t));

  for (const t of [...zhTitles, ...otherTitles]) {
    addCandidate(t);
  }
  return candidates;
}

function computeTitleMatchScore(
  vodName: string,
  vodSub: string,
  targetTitles: string[],
  mediaType?: "movie" | "tv"
): number {
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
  let bestScore = 0;

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

    if (normVodName === target || normCleanVod === normFullTarget) {
      bestScore = Math.max(bestScore, 260);
      continue;
    }

    if (normAliases.includes(target) || normAliases.includes(normFullTarget)) {
      bestScore = Math.max(bestScore, 210);
      continue;
    }

    const targetNumbers = extractNumbers(target);
    const numbersConflict =
      (targetNumbers.length > 0 || vodNumbers.length > 0) &&
      targetNumbers.join(",") !== vodNumbers.join(",");

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

async function searchSingleVodSite(
  site: VodSite,
  keyword: string,
  targetTitles: string[],
  targetYear?: string,
  mediaType?: "movie" | "tv",
  timeoutMs = 3800
): Promise<ResolvedStreamSource[]> {
  const start = Date.now();
  const sep = site.api.includes("?") ? "&" : "?";
  const searchUrl = `${site.api}${sep}ac=videolist&wd=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return [];
    const data: any = await res.json();
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
      const { playGroups, bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodLang = String(item.vod_lang || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYear = vodYearMatch ? vodYearMatch[0] : "";

      // Reject recaps ("解说") and trailer-only placeholders ("预告") or short-drama parodies ("短剧版")
      if (
        vodName.includes("解说") ||
        vodName.includes("预告") ||
        vodName.includes("短剧") ||
        vodRemarks.includes("预告")
      ) {
        continue;
      }
      const hasNonTrailerEpisode = bestEpisodes.some(
        (ep) => !ep.name.includes("预告") && !ep.name.includes("花絮")
      );
      if (!hasNonTrailerEpisode) {
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

      // Release year verification
      if (targetYear && vodYear) {
        const targetY = Number(targetYear);
        const vodY = Number(vodYear);
        const yearDiff = Math.abs(vodY - targetY);

        if (mediaType === "tv") {
          // Multi-season TV shows have Season 1 in targetYear and Season 2..N in subsequent years
          if (vodY === targetY) {
            score += 120;
          } else if (
            seasonNumber > 1 &&
            vodY >= targetY &&
            vodY <= targetY + seasonNumber + 3 &&
            titleScore >= 200
          ) {
            score += 95;
          } else if (yearDiff === 1 && titleScore >= 210) {
            score += 40;
          } else if (vodY > targetY && titleScore >= 250) {
            score += 30;
          } else {
            continue;
          }
        } else {
          // Strict release year verification for movies
          if (vodY === targetY) {
            score += 120;
          } else if (yearDiff === 1 && titleScore >= 240) {
            score += 25;
          } else {
            continue;
          }
        }
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
          vodName: String(sc.item.vod_name || keyword).trim(),
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
          vodName: String(primaryCand.item.vod_name || keyword).trim(),
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
        vodName: String(bestCandidate.item.vod_name || keyword).trim(),
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
    return [];
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
  releaseYear?: string;
  isUnreleased: boolean;
  primaryZhTitle?: string;
  expiresAt: number;
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

const UNRELEASED_STATUSES = new Set([
  "Rumored",
  "Planned",
  "In Production",
  "Post Production",
  "Canceled",
]);

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

  const candidateTitles: string[] = [];
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
      const promises: Promise<any>[] = [
        fetch(
          `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${tmdbApiKey}`,
          { signal: AbortSignal.timeout(4000) }
        ).then((r) => r.json()),
      ];
      if (!hintItem) {
        promises.push(
          fetch(
            `https://api.themoviedb.org/3/${type}/${tmdbId}?language=en-US&api_key=${tmdbApiKey}`,
            { signal: AbortSignal.timeout(4000) }
          ).then((r) => r.json())
        );
      }

      const [zhRes, enRes] = await Promise.allSettled(promises);

      if (zhRes && zhRes.status === "fulfilled" && zhRes.value) {
        const d = zhRes.value;
        const zhTitle = d.title || d.name;
        const origTitle = d.original_title || d.original_name;
        const dateStr = d.release_date || d.first_air_date;
        if (dateStr && typeof dateStr === "string") {
          releaseYear = dateStr.slice(0, 4);
          const todayIso = new Date().toISOString().slice(0, 10);
          if (dateStr > todayIso) {
            isUnreleased = true;
          }
        }
        if (
          (d.status && UNRELEASED_STATUSES.has(String(d.status))) ||
          Number(d.vote_count || 0) === 0
        ) {
          isUnreleased = true;
        }

        if (zhTitle && /[\u4e00-\u9fff]/.test(zhTitle)) {
          primaryZhTitle = toSimplifiedChinese(String(zhTitle).trim());
          addCandidateTitle(zhTitle);
        }

        // Extract Chinese titles from translations (CN, SG, TW, HK)
        const transList = Array.isArray(d?.translations?.translations)
          ? d.translations.translations
          : [];
        const zhCountryOrder = ["CN", "SG", "TW", "HK"];
        for (const region of zhCountryOrder) {
          for (const tr of transList) {
            if (tr?.iso_639_1 === "zh" && tr?.iso_3166_1 === region) {
              const trTitle = tr?.data?.title || tr?.data?.name;
              if (trTitle && /[\u4e00-\u9fff]/.test(trTitle)) {
                if (!primaryZhTitle) {
                  primaryZhTitle = toSimplifiedChinese(String(trTitle).trim());
                }
                addCandidateTitle(trTitle);
              }
            }
          }
        }

        // Extract Chinese titles from alternative_titles
        const altList = Array.isArray(d?.alternative_titles?.results)
          ? d.alternative_titles.results
          : Array.isArray(d?.alternative_titles?.titles)
          ? d.alternative_titles.titles
          : [];
        for (const alt of altList) {
          const altTitle = alt?.title || alt?.name;
          if (altTitle && /[\u4e00-\u9fff]/.test(altTitle)) {
            if (!primaryZhTitle) {
              primaryZhTitle = toSimplifiedChinese(String(altTitle).trim());
            }
            addCandidateTitle(altTitle);
          }
        }

        if (zhTitle) addCandidateTitle(zhTitle);
        if (origTitle) addCandidateTitle(origTitle);
      }

      if (enRes && enRes.status === "fulfilled" && enRes.value) {
        const d = enRes.value;
        const enTitle = d.title || d.name;
        const dateStr = d.release_date || d.first_air_date;
        if (dateStr && typeof dateStr === "string" && !releaseYear) {
          releaseYear = dateStr.slice(0, 4);
        }
        if (
          (d.status && UNRELEASED_STATUSES.has(String(d.status))) ||
          Number(d.vote_count || 0) === 0
        ) {
          isUnreleased = true;
        }
        if (enTitle) addCandidateTitle(enTitle);
      }
    } catch {}
  }

  if (hintItem) {
    const hintEn = hintItem.en_title || hintItem.title || hintItem.name;
    const hintOrig = hintItem.original_title || hintItem.original_name;
    if (hintEn) addCandidateTitle(String(hintEn));
    if (hintOrig) addCandidateTitle(String(hintOrig));
  }

  const meta: TmdbCandidateMetadata = {
    candidateTitles,
    releaseYear,
    isUnreleased,
    primaryZhTitle,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  tmdbMetadataCache.set(cacheKey, meta);
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
  const releaseYear = meta.releaseYear;
  const isUnreleased = meta.isUnreleased;

  if (customKeyword && customKeyword.trim()) {
    const trimmed = customKeyword.trim();
    const simp = toSimplifiedChinese(trimmed);
    if (!candidateTitles.includes(simp)) candidateTitles.unshift(simp);
    if (trimmed !== simp && !candidateTitles.includes(trimmed)) {
      candidateTitles.unshift(trimmed);
    }
  }

  const searchKeywords = buildSearchKeywords(candidateTitles);
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
    availabilityCache.set(`${type}:${tmdbId}`, {
      available: false,
      primaryZhTitle: meta.primaryZhTitle,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
    return emptyRes;
  }

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

  let matchedSources: ResolvedStreamSource[] = [];
  const matchedBaseSiteIds = new Set<string>();
  const maxKeywordsToTry = Math.min(searchKeywords.length, 3);

  for (let kIdx = 0; kIdx < maxKeywordsToTry; kIdx++) {
    const kw = searchKeywords[kIdx];
    const remainingSites = activeSites.filter(
      (s) => !matchedBaseSiteIds.has(s.id)
    );
    if (remainingSites.length === 0) break;

    if (kIdx > 0 && matchedBaseSiteIds.size >= 6 && !/[\u4e00-\u9fff]/.test(kw)) {
      break;
    }

    const settled = await Promise.allSettled(
      remainingSites.map(async (site) => {
        const siteSources = await searchSingleVodSite(
          site,
          kw,
          candidateTitles,
          releaseYear,
          type
        );
        return { siteId: site.id, siteSources };
      })
    );

    for (const r of settled) {
      if (r.status === "fulfilled" && r.value.siteSources.length > 0) {
        matchedBaseSiteIds.add(r.value.siteId);
        matchedSources.push(...r.value.siteSources);
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

  const ttl = matchedSources.length > 0 ? 30 * 60 * 1000 : 15 * 60 * 1000;
  resolvedStreamsCache.set(cacheKey, {
    data: response,
    expiresAt: Date.now() + ttl,
  });
  availabilityCache.set(`${type}:${tmdbId}`, {
    available: matchedSources.length > 0,
    primaryZhTitle: meta.primaryZhTitle,
    expiresAt: Date.now() + ttl,
  });

  return response;
}

// Fast probe sites ordered by lowest latency and broadest catalog coverage
const FAST_PROBE_SITE_IDS = new Set([
  "jisu",
  "huya",
  "hhzy",
  "hongniu",
  "guangsu",
  "bfzy",
  "lzzy",
  "ffzy",
  "ruyi",
  "ikun",
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

  const searchKeywords = buildSearchKeywords(meta.candidateTitles);
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
