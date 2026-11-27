import { MEDIA_CATEGORIES, type MediaCategoryOption } from "./types";

export type UiLang = "en" | "zh";

const UI_LANG_STORAGE_KEY = "ui_lang";

export function detectBrowserLang(): UiLang {
  if (typeof navigator === "undefined") return "en";
  try {
    const primary =
      (Array.isArray(navigator.languages) && navigator.languages[0]) ||
      navigator.language ||
      "";
    return /^zh\b/i.test(String(primary).trim()) ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function resolveInitialLang(): UiLang {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage?.getItem(UI_LANG_STORAGE_KEY);
      if (stored === "en" || stored === "zh") {
        return stored;
      }
    } catch {}
  }
  return detectBrowserLang();
}

let currentLang: UiLang = resolveInitialLang();
const listeners = new Set<(lang: UiLang) => void>();

export function syncDocumentLang(lang: UiLang = currentLang): void {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

syncDocumentLang(currentLang);

export function getLang(): UiLang {
  return currentLang;
}

export function isZh(): boolean {
  return currentLang === "zh";
}

export function setLang(next: UiLang): boolean {
  if (next !== "en" && next !== "zh") return false;
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(UI_LANG_STORAGE_KEY, next);
    }
  } catch {}

  const changed = next !== currentLang;
  currentLang = next;
  syncDocumentLang(next);

  if (changed) {
    listeners.forEach((fn) => {
      try {
        fn(next);
      } catch {}
    });
  }
  return changed;
}

export function onLangChange(
  listener: (lang: UiLang) => void,
  signal?: AbortSignal
): () => void {
  listeners.add(listener);
  const cleanup = () => {
    listeners.delete(listener);
  };
  if (signal) {
    if (signal.aborted) {
      cleanup();
    } else {
      signal.addEventListener("abort", cleanup, { once: true });
    }
  }
  return cleanup;
}

const CATEGORY_ZH_MAP: Record<string, string> = {
  all: "全部",
  hk: "港片",
  action: "动作",
  scifi: "科幻",
  comedy: "喜剧",
  drama: "剧情",
  animation: "动画",
  thriller: "惊悚",
  crime: "犯罪",
  mystery: "悬疑",
  horror: "恐怖",
  romance: "爱情",
};

export function getLocalizedCategories(
  lang: UiLang = currentLang
): MediaCategoryOption[] {
  if (lang !== "zh") return MEDIA_CATEGORIES;
  return MEDIA_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: CATEGORY_ZH_MAP[cat.id] || cat.label,
  }));
}

export const TMDB_GENRE_ZH_MAP: Record<number, string> = {
  28: "动作",
  12: "冒险",
  16: "动画",
  35: "喜剧",
  80: "犯罪",
  99: "纪录片",
  18: "剧情",
  10751: "家庭",
  14: "奇幻",
  36: "历史",
  27: "恐怖",
  10402: "音乐",
  9648: "悬疑",
  10749: "爱情",
  878: "科幻",
  10770: "电视电影",
  53: "惊悚",
  10752: "战争",
  37: "西部",
  10759: "动作冒险",
  10762: "儿童",
  10763: "新闻",
  10764: "真人秀",
  10765: "科幻奇幻",
  10766: "肥皂剧",
  10767: "脱口秀",
  10768: "战争政治",
};

export function getLocalizedGenreName(
  genre: { id: number; name: string },
  lang: UiLang = currentLang
): string {
  if (lang !== "zh") return genre.name;
  return TMDB_GENRE_ZH_MAP[genre.id] || genre.name;
}

export function formatEpisodeLabel(
  rawName: string,
  index: number,
  lang: UiLang = currentLang
): string {
  const trimmed = rawName.trim();

  // Format air-date variety episodes (e.g. "20230730", "20260905回顾特辑", "2026428特别加更")
  const fullDateMatch = trimmed.match(
    /^((?:19|20)\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(.*)$/
  );
  if (fullDateMatch) {
    const datePart = `${fullDateMatch[1]}-${fullDateMatch[2]}-${fullDateMatch[3]}`;
    const suffix = fullDateMatch[4].trim();
    return suffix ? `${datePart} ${suffix}` : datePart;
  }

  const shortMonthDateMatch = trimmed.match(
    /^((?:19|20)\d{2})([1-9])(0[1-9]|[12]\d|3[01])([\u4e00-\u9fff].+)$/
  );
  if (shortMonthDateMatch) {
    return `${shortMonthDateMatch[1]}-0${shortMonthDateMatch[2]}-${shortMonthDateMatch[3]} ${shortMonthDateMatch[4].trim()}`;
  }

  if (lang === "zh") {
    if (!trimmed) return `第${index + 1}集`;
    if (/^\d{1,4}$/.test(trimmed)) return `第${parseInt(trimmed, 10)}集`;
    const enEpMatch = trimmed.match(/^Ep\s*0*(\d+)$/i);
    if (enEpMatch) return `第${enEpMatch[1]}集`;
    const zhEpMatch = trimmed.match(/^第\s*0*(\d+)\s*([集期话回])$/);
    if (zhEpMatch) return `第${zhEpMatch[1]}${zhEpMatch[2]}`;
    if (/^Full$/i.test(trimmed)) return "正片";
    if (/^Trailer$/i.test(trimmed)) return "预告";
    return trimmed;
  }

  if (!trimmed) return `Ep ${index + 1}`;
  const epMatch = trimmed.match(/^第\s*0*(\d+)\s*[集期话回]$/);
  if (epMatch) {
    return `Ep ${epMatch[1]}`;
  }
  if (/^\d{1,4}$/.test(trimmed)) {
    return `Ep ${parseInt(trimmed, 10)}`;
  }
  if (/^(正片|高清|超清|蓝光|HD|Full|BD|TC|1080[pP]|720[pP]|4[kK])$/i.test(trimmed)) {
    return trimmed
      .replace("正片", "Full")
      .replace("高清", "HD")
      .replace("超清", "FHD")
      .replace("蓝光", "Blu-ray");
  }
  if (trimmed.includes("预告")) {
    return "Trailer";
  }
  return trimmed;
}

const MESSAGES = {
  en: {
    "nav.aria": "Primary Navigation",
    "nav.trending": "Trending",
    "nav.rankings": "Rankings",
    "nav.history": "History",
    "nav.saved": "Saved",
    "nav.search": "Search",
    "lang.aria": "Language switcher",
    "lang.switchToEn": "Switch interface language to English",
    "lang.switchToZh": "Switch interface language to Simplified Chinese",
    "type.all": "All",
    "type.movies": "Movies",
    "type.shows": "Shows",
    "type.movieSingular": "Movie",
    "type.showSingular": "Show",
    "type.tvSeriesLabel": "TV Series",
    "type.aria": "Content Type",
    "common.untitled": "Untitled",
    "common.prevPage": "Previous page",
    "common.nextPage": "Next page",
    "common.scrollCatsLeft": "Scroll categories left",
    "common.scrollCatsRight": "Scroll categories right",
    "common.scrollYearsNew": "Scroll to newer years",
    "common.scrollYearsOld": "Scroll to older years",
    "home.errorTitle": "Unable to load titles",
    "home.errorDesc": "Tap the selected category again to retry.",
    "home.emptyTitle": "No titles found",
    "home.emptyDesc": "Try switching categories or media type.",
    "rankings.errorTitle": "Unable to load rankings for {year}",
    "rankings.errorDesc": "Tap the active year or category again to retry.",
    "rankings.emptyTitle": "No rankings found for {year}",
    "rankings.emptyDesc": "Try selecting a different year or switching categories.",
    "search.placeholder": "Search movies, shows...",
    "search.aria": "Search movies and shows",
    "search.clearAria": "Clear search",
    "search.emptyHint": "Type to search movies and shows...",
    "search.noResultsTitle": "No movies or shows found for “{query}”",
    "search.noResultsDesc": "Check your spelling or try a different keyword.",
    "collection.sync": "Sync",
    "collection.synced": "Synced",
    "collection.syncAriaOff": "Sync across devices",
    "collection.syncAriaOn": "Device sync active",
    "collection.clear": "Clear",
    "history.filterAria": "History Filter",
    "history.clearTitle": "Clear History",
    "history.removeLabel": "Remove from history",
    "history.emptyAllTitle": "No watch history yet",
    "history.emptyAllDesc":
      "Start watching a movie or show to pick up right where you left off.",
    "history.emptyMoviesTitle": "No movies in watch history",
    "history.emptyShowsTitle": "No shows in watch history",
    "history.emptyFilteredDesc":
      "Try switching the filter tab or watching more titles.",
    "saved.filterAria": "Saved Filter",
    "saved.clearTitle": "Clear Saved",
    "saved.removeLabel": "Remove from saved",
    "saved.emptyAllTitle": "No saved titles yet",
    "saved.emptyAllDesc":
      "Open any movie or show and click Save to add it here.",
    "saved.emptyMoviesTitle": "No saved movies",
    "saved.emptyShowsTitle": "No saved shows",
    "saved.emptyFilteredDesc":
      "Try switching the filter tab or saving more titles from their detail page.",
    "sync.title": "Device Sync",
    "sync.closeAria": "Close sync dialog",
    "sync.subtitleSynced": "History & Saved stay synced in real time",
    "sync.subtitleUnpaired":
      "Sync History & Saved without creating an account",
    "sync.bannerSynced": "Synced across your devices",
    "sync.labelAddDevice": "Add another device",
    "sync.labelThisDevice": "This device's code",
    "sync.generating": "Generating...",
    "sync.expiresIn": "Expires in {time}",
    "sync.hintSynced": "Enter this code on another device to add it to sync",
    "sync.hintUnpaired": "Enter this code on your other device",
    "sync.pairLabel": "Enter code from another device",
    "sync.pairAria": "Enter 4-digit pairing code",
    "sync.pairAutoHint": "Auto-submits as soon as you enter the 4th digit",
    "sync.pairing": "Pairing and merging lists...",
    "sync.stop": "Stop Syncing",
    "sync.keep": "Keep local copy",
    "sync.clearDisconnect": "Clear & disconnect",
    "sync.errFetch": "Could not reach sync server.",
    "sync.errInvalidCode": "Invalid or expired pairing code.",
    "sync.errFourDigits": "Please enter a valid 4-digit code.",
    "sync.errCreateFailed": "Failed to generate pairing code",
    "sync.errNetworkPair": "Network error while pairing. Please try again.",
    "player.back": "Back",
    "player.backAria": "Go back",
    "player.upscale": "Upscale",
    "player.upscaleAria": "Upscale in fullscreen",
    "player.save": "Save",
    "player.saved": "Saved",
    "player.imdbAria": "Open IMDb page",
    "player.episodes": "Episodes",
    "player.seasonEpisodes": "S{season} · Episodes",
    "player.seasonName": "Season {season}",
    "player.selectEpisode": "Select Episode",
    "player.selectSeasonEpisode": "Select Season & Episode",
    "player.epsCount": "{count} eps",
    "player.sortNewestAria": "Show newest episodes first",
    "player.sortOldestAria": "Show oldest episodes first",
    "player.closeEpisodesAria": "Close episodes",
    "player.noStreams": "No playable streams found from enabled sources.",
    "player.retry": "Retry",
    "player.prevServersAria": "Previous servers",
    "player.nextServersAria": "Next servers",
    "player.highPing": "High Ping",
    "player.minutes": "{mins} min",
    "player.resume": "Resume",
    "player.resumeAt": "Resume · {time}",
    "player.resumeEp": "Resume {ep}",
    "player.resumeEpAt": "Resume {ep} · {time}",
    "player.manualSearchAria": "Search or switch match",
    "player.manualSearchTitle": "Switch Match",
    "player.manualSearchPlaceholder": "Search Chinese or English title...",
    "player.manualSearchBtn": "Search",
    "player.manualSearching": "Searching sources...",
    "player.manualNoMatches": "No playable matches found. Try another keyword.",
    "player.loadingSeason": "Loading Season {season}...",
    "player.seasonNotFound": "No streams found for Season {season}. Try Switch Match.",
    "player.searchFallback": "Search",
    "player.douban": "Douban",
    "player.doubanAria": "View on Douban",
    "player.customSourceTag": "Custom",
    "player.backToSearchAria": "Back to search",
    "player.resetManualAria": "Back to default match",
  },
  zh: {
    "nav.aria": "主导航",
    "nav.trending": "热门",
    "nav.rankings": "榜单",
    "nav.history": "历史",
    "nav.saved": "收藏",
    "nav.search": "搜索",
    "lang.aria": "语言切换",
    "lang.switchToEn": "切换界面语言为英文",
    "lang.switchToZh": "切换界面语言为简体中文",
    "type.all": "全部",
    "type.movies": "电影",
    "type.shows": "剧集",
    "type.movieSingular": "电影",
    "type.showSingular": "剧集",
    "type.tvSeriesLabel": "剧集",
    "type.aria": "内容类型",
    "common.untitled": "未命名",
    "common.prevPage": "上一页",
    "common.nextPage": "下一页",
    "common.scrollCatsLeft": "向左滚动分类",
    "common.scrollCatsRight": "向右滚动分类",
    "common.scrollYearsNew": "滚动至更新年份",
    "common.scrollYearsOld": "滚动至更早年份",
    "home.errorTitle": "内容加载失败",
    "home.errorDesc": "点击当前选中的分类可重新加载。",
    "home.emptyTitle": "暂无相关影视",
    "home.emptyDesc": "请尝试切换其他分类或类型。",
    "rankings.errorTitle": "{year} 年榜单加载失败",
    "rankings.errorDesc": "点击当前年份或分类可重试。",
    "rankings.emptyTitle": "暂无 {year} 年榜单内容",
    "rankings.emptyDesc": "请尝试选择其他年份或切换分类。",
    "search.placeholder": "搜索电影、剧集...",
    "search.aria": "搜索电影与剧集",
    "search.clearAria": "清空搜索",
    "search.emptyHint": "输入片名搜索电影或剧集...",
    "search.noResultsTitle": "未找到与“{query}”相关的影视",
    "search.noResultsDesc": "请检查拼写或尝试更换其他关键词。",
    "collection.sync": "同步",
    "collection.synced": "已同步",
    "collection.syncAriaOff": "跨设备同步",
    "collection.syncAriaOn": "已开启设备同步",
    "collection.clear": "清空",
    "history.filterAria": "观看历史筛选",
    "history.clearTitle": "清空历史",
    "history.removeLabel": "从历史移除",
    "history.emptyAllTitle": "暂无观看记录",
    "history.emptyAllDesc": "开始观看电影或剧集后，进度将保存在这里方便续播。",
    "history.emptyMoviesTitle": "暂无电影观看记录",
    "history.emptyShowsTitle": "暂无剧集观看记录",
    "history.emptyFilteredDesc": "请尝试切换筛选标签或观看更多影片。",
    "saved.filterAria": "收藏筛选",
    "saved.clearTitle": "清空收藏",
    "saved.removeLabel": "取消收藏",
    "saved.emptyAllTitle": "暂无收藏影片",
    "saved.emptyAllDesc": "打开任意电影或剧集详情页点击收藏即可添加到这里。",
    "saved.emptyMoviesTitle": "暂无收藏电影",
    "saved.emptyShowsTitle": "暂无收藏剧集",
    "saved.emptyFilteredDesc": "请尝试切换筛选标签或在详情页收藏更多影片。",
    "sync.title": "设备同步",
    "sync.closeAria": "关闭同步弹窗",
    "sync.subtitleSynced": "观看历史与收藏列表实时同步",
    "sync.subtitleUnpaired": "无需账号即可跨设备同步历史与收藏",
    "sync.bannerSynced": "已与您的设备保持同步",
    "sync.labelAddDevice": "添加新设备",
    "sync.labelThisDevice": "本设备配对码",
    "sync.generating": "生成中...",
    "sync.expiresIn": "有效期 {time}",
    "sync.hintSynced": "在其他设备上输入此配对码即可加入同步",
    "sync.hintUnpaired": "在另一台设备上输入此 4 位配对码",
    "sync.pairLabel": "输入其他设备的配对码",
    "sync.pairAria": "输入 4 位数字配对码",
    "sync.pairAutoHint": "输入第 4 位数字后自动完成配对",
    "sync.pairing": "正在配对并合并列表...",
    "sync.stop": "停止同步",
    "sync.keep": "保留本地数据",
    "sync.clearDisconnect": "清空并断开",
    "sync.errFetch": "无法连接同步服务器。",
    "sync.errInvalidCode": "配对码无效或已过期。",
    "sync.errFourDigits": "请输入有效的 4 位数字配对码。",
    "sync.errCreateFailed": "生成配对码失败。",
    "sync.errNetworkPair": "配对时发生网络错误，请重试。",
    "player.back": "返回",
    "player.backAria": "返回",
    "player.upscale": "超分",
    "player.upscaleAria": "全屏 AI 超分画质",
    "player.save": "收藏",
    "player.saved": "已收藏",
    "player.imdbAria": "打开 IMDb 页面",
    "player.episodes": "选集",
    "player.seasonEpisodes": "第{season}季 · 选集",
    "player.seasonName": "第{season}季",
    "player.selectEpisode": "选择剧集",
    "player.selectSeasonEpisode": "选择季与剧集",
    "player.epsCount": "共 {count} 集",
    "player.sortNewestAria": "切换为最新集数在前",
    "player.sortOldestAria": "切换为最早集数在前",
    "player.closeEpisodesAria": "关闭选集列表",
    "player.noStreams": "暂未找到可用播放源。",
    "player.retry": "重试",
    "player.prevServersAria": "上一组线路",
    "player.nextServersAria": "下一组线路",
    "player.highPing": "高延迟",
    "player.minutes": "{mins} 分钟",
    "player.resume": "续播",
    "player.resumeAt": "续播 · {time}",
    "player.resumeEp": "续播 {ep}",
    "player.resumeEpAt": "续播 {ep} · {time}",
    "player.manualSearchAria": "手动搜索或切换资源",
    "player.manualSearchTitle": "切换匹配资源",
    "player.manualSearchPlaceholder": "输入中文或英文片名...",
    "player.manualSearchBtn": "搜索",
    "player.manualSearching": "正在搜索片源...",
    "player.manualNoMatches": "未找到可播放资源，请尝试其他关键词。",
    "player.loadingSeason": "正在加载第{season}季...",
    "player.seasonNotFound": "未找到第{season}季资源，可点击右上角搜索手动切换。",
    "player.searchFallback": "手动搜索",
    "player.douban": "豆瓣",
    "player.doubanAria": "在豆瓣查看",
    "player.customSourceTag": "手动",
    "player.backToSearchAria": "返回搜索结果",
    "player.resetManualAria": "恢复默认匹配",
  },
} as const;

export type I18nKey = keyof typeof MESSAGES.en;

export function t(
  key: I18nKey,
  vars?: Record<string, string | number>,
  lang: UiLang = currentLang
): string {
  const dict = MESSAGES[lang] || MESSAGES.en;
  let str: string = dict[key] ?? MESSAGES.en[key] ?? String(key);
  if (vars) {
    for (const k of Object.keys(vars)) {
      str = str.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return str;
}
