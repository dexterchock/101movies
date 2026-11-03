import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  AWESOME_ZHUIJU_TVBOX_CONFIGS,
  getAllVodSites,
  parseTvboxConfig,
  pingVodSite,
  resolveStreamsForMedia,
  toSimplifiedChinese,
} from "./src/server/tvboxService";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const CHINESE_LANGS = new Set(["zh", "cn", "yue", "bo", "za"]);
const CHINESE_COUNTRIES = new Set(["CN", "HK", "TW", "MO"]);

function hasChineseChars(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

function isChineseOriginItem(item: any): boolean {
  if (!item) return false;
  const origLang = String(item.original_language || "").toLowerCase().trim();
  if (CHINESE_LANGS.has(origLang)) return true;

  if (Array.isArray(item.origin_country)) {
    if (
      item.origin_country.some((c: any) =>
        CHINESE_COUNTRIES.has(String(c || "").toUpperCase().trim())
      )
    ) {
      return true;
    }
  }

  if (Array.isArray(item.production_countries)) {
    if (
      item.production_countries.some((c: any) =>
        CHINESE_COUNTRIES.has(String(c?.iso_3166_1 || "").toUpperCase().trim())
      )
    ) {
      return true;
    }
  }

  const origText = String(item.original_title || item.original_name || "").trim();
  if (hasChineseChars(origText) && (origLang === "zh" || origLang === "cn" || origLang === "yue")) {
    return true;
  }

  return false;
}

function normalizeMediaItemTitles(item: any): any {
  if (!item || typeof item !== "object") return item;
  const isZhOrigin = isChineseOriginItem(item);
  const enTitle = String(item.title || item.name || "").trim();
  const rawOrigTitle = String(item.original_title || item.original_name || "").trim();

  if (isZhOrigin && hasChineseChars(rawOrigTitle)) {
    const simpTitle = toSimplifiedChinese(rawOrigTitle);
    return {
      ...item,
      title: item.title !== undefined ? simpTitle : undefined,
      name: item.name !== undefined ? simpTitle : undefined,
      en_title: enTitle && enTitle !== simpTitle ? enTitle : undefined,
      zh_title: simpTitle,
      is_chinese_origin: true,
    };
  }

  return {
    ...item,
    en_title: enTitle || undefined,
    is_chinese_origin: isZhOrigin,
  };
}

function filterReleasedMedia(items: any[], minVotes = 3): any[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item: any) => {
      if (!item || !item.poster_path) return false;
      const dateStr = item.release_date || item.first_air_date;
      if (!dateStr || typeof dateStr !== "string") return false;
      // Unreleased future movies/shows (like Avengers: Doomsday) have 0 votes/rating on TMDB
      const voteCount = Number(item.vote_count || 0);
      const voteAvg = Number(item.vote_average || 0);
      if (voteCount < minVotes || voteAvg <= 0) return false;
      return true;
    })
    .map(normalizeMediaItemTitles);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // TMDB Proxy helper
  const fetchTmdb = async (
    endpoint: string,
    res: express.Response,
    minVotes = 3
  ) => {
    if (!TMDB_API_KEY) {
      console.warn("TMDB API Key not configured.");
      return res.json({ results: [] });
    }
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data?.results)) {
        data.results = filterReleasedMedia(data.results, minVotes);
      }
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  };

  app.get("/api/tmdb/trending/movie", (req, res) => {
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    if (genre && genre !== "all") {
      fetchTmdb(
        `/discover/movie?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(genre)}`,
        res
      );
    } else {
      fetchTmdb("/trending/movie/week", res);
    }
  });
  app.get("/api/tmdb/trending/tv", async (req, res) => {
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    if (genre.toLowerCase() === "hk") {
      if (!TMDB_API_KEY) return res.json({ results: [] });
      try {
        const recentYear = new Date().getFullYear() - 3;
        const recentDate = `${recentYear}-01-01`;
        const [recentRes, popRes] = await Promise.allSettled([
          fetch(
            `${TMDB_BASE_URL}/discover/tv?sort_by=popularity.desc&with_origin_country=HK&first_air_date.gte=${recentDate}&vote_count.gte=1&api_key=${TMDB_API_KEY}`
          ).then((r) => r.json()),
          fetch(
            `${TMDB_BASE_URL}/discover/tv?sort_by=popularity.desc&with_origin_country=HK&vote_count.gte=2&api_key=${TMDB_API_KEY}`
          ).then((r) => r.json()),
        ]);

        const combined: any[] = [];
        const seenIds = new Set<number>();
        for (const settled of [recentRes, popRes]) {
          if (settled.status === "fulfilled" && Array.isArray(settled.value?.results)) {
            for (const item of settled.value.results) {
              if (item && typeof item.id === "number" && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                combined.push({ ...item, media_type: "tv" });
              }
            }
          }
        }
        const results = filterReleasedMedia(combined, 1);
        return res.json({ page: 1, results, total_pages: 1, total_results: results.length });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch HK dramas from TMDB" });
      }
    }
    if (genre && genre !== "all") {
      fetchTmdb(
        `/discover/tv?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(genre)}`,
        res
      );
    } else {
      fetchTmdb("/trending/tv/week", res);
    }
  });
  app.get("/api/tmdb/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json({ results: [] });
    if (!TMDB_API_KEY) return res.json({ results: [] });
    try {
      const url = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const filtered = filterReleasedMedia(
        Array.isArray(data.results)
          ? data.results.filter(
              (item: any) => item.media_type === "movie" || item.media_type === "tv"
            )
          : [],
        1
      );
      res.json({ ...data, results: filtered });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  });
  const fetchMediaDetails = async (type: "movie" | "tv", id: string, res: express.Response) => {
    if (!TMDB_API_KEY) {
      console.warn("TMDB API Key not configured.");
      return res.json({});
    }
    try {
      const [enRes, zhRes] = await Promise.allSettled([
        fetch(
          `${TMDB_BASE_URL}/${type}/${id}?language=en-US&append_to_response=credits&api_key=${TMDB_API_KEY}`
        ).then((r) => r.json()),
        fetch(
          `${TMDB_BASE_URL}/${type}/${id}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${TMDB_API_KEY}`
        ).then((r) => r.json()),
      ]);

      const enData = enRes.status === "fulfilled" && enRes.value ? enRes.value : {};
      const zhData = zhRes.status === "fulfilled" && zhRes.value ? zhRes.value : {};

      let rawZhTitle = "";

      const zhPrimary = (zhData.title || zhData.name || "").trim();
      const origPrimary = (enData.original_title || enData.original_name || "").trim();

      if (hasChineseChars(zhPrimary)) {
        rawZhTitle = zhPrimary;
      } else if (hasChineseChars(origPrimary)) {
        rawZhTitle = origPrimary;
      } else {
        const transList = Array.isArray(zhData?.translations?.translations)
          ? zhData.translations.translations
          : [];
        for (const region of ["CN", "SG", "TW", "HK"]) {
          const found = transList.find(
            (tr: any) =>
              tr?.iso_639_1 === "zh" &&
              tr?.iso_3166_1 === region &&
              hasChineseChars(String(tr?.data?.title || tr?.data?.name || ""))
          );
          if (found) {
            rawZhTitle = String(found.data.title || found.data.name).trim();
            break;
          }
        }
        if (!rawZhTitle) {
          const altList = Array.isArray(zhData?.alternative_titles?.results)
            ? zhData.alternative_titles.results
            : Array.isArray(zhData?.alternative_titles?.titles)
            ? zhData.alternative_titles.titles
            : [];
          const foundAlt = altList.find((a: any) =>
            hasChineseChars(String(a?.title || a?.name || ""))
          );
          if (foundAlt) {
            rawZhTitle = String(foundAlt.title || foundAlt.name).trim();
          }
        }
      }

      const zh_title = rawZhTitle ? toSimplifiedChinese(rawZhTitle) : undefined;
      const en_title = String(enData.title || enData.name || "").trim() || undefined;
      const is_chinese_origin = isChineseOriginItem(enData);

      const cast: string[] = Array.isArray(enData?.credits?.cast)
        ? enData.credits.cast
            .slice(0, 5)
            .map((c: any) => String(c?.name || "").trim())
            .filter(Boolean)
        : [];

      const primaryDisplayTitle =
        is_chinese_origin && zh_title ? zh_title : en_title || zh_title || "";

      res.json({
        ...enData,
        title: type === "movie" ? primaryDisplayTitle : enData.title,
        name: type === "tv" ? primaryDisplayTitle : enData.name,
        en_title,
        zh_title,
        is_chinese_origin,
        cast,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  };

  app.get("/api/tmdb/movie/:id", (req, res) => {
    fetchMediaDetails("movie", req.params.id, res);
  });
  app.get("/api/tmdb/tv/:id", (req, res) => {
    fetchMediaDetails("tv", req.params.id, res);
  });
  app.get("/api/tmdb/discover/:type", async (req, res) => {
    const type = req.params.type === "tv" ? "tv" : "movie";
    const year = req.query.year || new Date().getFullYear();
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    const yearParam =
      type === "tv"
        ? `first_air_date_year=${year}`
        : `primary_release_year=${year}`;
    const genreParam =
      genre && genre !== "all" ? `&with_genres=${encodeURIComponent(genre)}` : "";
    if (!TMDB_API_KEY) return res.json({ results: [] });
    try {
      const url = `${TMDB_BASE_URL}/discover/${type}?sort_by=popularity.desc&vote_count.gte=10&${yearParam}${genreParam}&api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const results = filterReleasedMedia(
        Array.isArray(data.results)
          ? data.results.map((item: any) => ({ ...item, media_type: type }))
          : []
      );
      res.json({ ...data, results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  });

  // TVBox / 影视仓 Configuration & VOD Stream Resolver Routes
  app.get("/api/tvbox/configs", (req, res) => {
    res.json({
      configs: AWESOME_ZHUIJU_TVBOX_CONFIGS,
      sites: getAllVodSites(),
    });
  });

  app.post("/api/tvbox/parse", async (req, res) => {
    const { url, name } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing TVBox configuration URL" });
    }
    const result = await parseTvboxConfig(url.trim(), name || "Custom TVBox");
    res.json({
      result,
      sites: getAllVodSites(),
    });
  });

  app.get("/api/vod/ping/:siteId", async (req, res) => {
    const status = await pingVodSite(req.params.siteId);
    res.json(status);
  });

  app.get("/api/vod/resolve", async (req, res) => {
    const type = req.query.type === "tv" ? "tv" : "movie";
    const tmdbId = String(req.query.id || "");
    const customKeyword = req.query.wd ? String(req.query.wd) : undefined;
    const disabledStr = req.query.disabled ? String(req.query.disabled) : "";
    const disabledSiteIds = disabledStr
      ? disabledStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      const resolved = await resolveStreamsForMedia({
        tmdbId,
        type,
        customKeyword,
        disabledSiteIds,
        tmdbApiKey: TMDB_API_KEY,
      });
      res.json(resolved);
    } catch (err) {
      console.error("Failed to resolve VOD streams:", err);
      res.status(500).json({ error: "Failed to resolve VOD streams" });
    }
  });

  // HLS M3U8 & Media Segment CORS Proxy
  app.get("/api/vod/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(400).send("Invalid proxy URL");
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!upstream.ok) {
        return res.status(upstream.status).send(`Upstream HTTP ${upstream.status}`);
      }

      const contentType = upstream.headers.get("content-type") || "";
      const isM3u8 =
        targetUrl.toLowerCase().includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("x-mpegurl");

      res.setHeader("Access-Control-Allow-Origin", "*");

      if (isM3u8) {
        const text = await upstream.text();
        const baseUrl = new URL(targetUrl);
        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith("#")) {
              // Rewrite URI="..." inside #EXT-X-KEY or #EXT-X-MAP if present
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

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
        return res.send(rewritten);
      }

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      const arrayBuf = await upstream.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      return res.status(502).send(err?.message || "Proxy fetch failed");
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
