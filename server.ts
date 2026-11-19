import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resvg } from "@cf-wasm/resvg/node";
import { buildMovieOgSvg, extractOgCardInput } from "./functions/_shared/ogCard";
import {
  TMDB_BASE_URL,
  fetchMediaDetails as fetchTmdbMediaDetails,
  fetchTmdb as fetchSharedTmdb,
  fetchTrendingHk,
  filterReleasedMedia,
  resolveTmdbGenre,
} from "./functions/_shared/tmdb";
import {
  handleCreateSyncCode,
  handleGetSyncState,
  handlePairSyncCode,
  handleUpdateSyncState,
} from "./functions/_shared/syncService";
import {
  handleVodProxyRequest,
  validateProxyTargetUrl,
} from "./functions/_shared/vodProxy";
import {
  AWESOME_ZHUIJU_TVBOX_CONFIGS,
  filterItemsByServerAvailability,
  getAllVodSites,
  parseTvboxConfig,
  pingVodSite,
  resolveStreamsForMedia,
} from "./src/server/tvboxService";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // TMDB Proxy helper delegating to shared Cloudflare/Node logic
  const fetchTmdb = async (
    endpoint: string,
    res: express.Response,
    defaultType: "movie" | "tv",
    minVotes = 3
  ) => {
    try {
      const data = await fetchSharedTmdb(
        endpoint,
        defaultType,
        TMDB_API_KEY,
        minVotes
      );
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  };

  app.get("/api/tmdb/trending/movie", async (req, res) => {
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    if (genre.toLowerCase() === "hk") {
      if (!TMDB_API_KEY) return res.json({ results: [] });
      try {
        const results = await fetchTrendingHk("movie", TMDB_API_KEY);
        return res.json({
          page: 1,
          results,
          total_pages: 1,
          total_results: results.length,
        });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch HK movies from TMDB" });
      }
    }
    if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre("movie", genre);
      fetchTmdb(
        `/discover/movie?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(resolvedGenre)}`,
        res,
        "movie"
      );
    } else {
      fetchTmdb("/trending/movie/week", res, "movie");
    }
  });
  app.get("/api/tmdb/trending/tv", async (req, res) => {
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    if (genre.toLowerCase() === "hk") {
      if (!TMDB_API_KEY) return res.json({ results: [] });
      try {
        const results = await fetchTrendingHk("tv", TMDB_API_KEY);
        return res.json({
          page: 1,
          results,
          total_pages: 1,
          total_results: results.length,
        });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Failed to fetch HK dramas from TMDB" });
      }
    }
    if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre("tv", genre);
      fetchTmdb(
        `/discover/tv?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(resolvedGenre)}`,
        res,
        "tv"
      );
    } else {
      fetchTmdb("/trending/tv/week", res, "tv");
    }
  });
function computeSearchRelevance(item: any, query: string, cleanQuery: string): number {
  const titles = [
    item.title,
    item.name,
    item.zh_title,
    item.original_title,
    item.original_name,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  const q = query.toLowerCase().trim();
  const cleanQ = cleanQuery.toLowerCase().trim();
  const normQ = q.replace(/[:：\s\-_]/g, "");
  const normCleanQ = cleanQ.replace(/[:：\s\-_]/g, "");

  let score = 0;

  const hasExactTitle = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT === normQ || normT === normCleanQ;
  });

  const startsWithQuery = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT.startsWith(normQ) || (normCleanQ && normT.startsWith(normCleanQ));
  });

  const containsQuery = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT.includes(normQ) || (normCleanQ && normT.includes(normCleanQ));
  });

  if (hasExactTitle) {
    score += 1000;
  } else if (startsWithQuery) {
    score += 600;
  } else if (containsQuery) {
    score += 400;
  } else if (item.fromZhSearch) {
    score += 450;
  } else if (
    item.overview &&
    (item.overview.includes(q) || (cleanQ && item.overview.includes(cleanQ)))
  ) {
    score += 150;
  }

  score += (Number(item.popularity) || 0) * 1.5;
  score += Math.min(Number(item.vote_count) || 0, 10000) * 0.05;

  const year = Number((item.release_date || item.first_air_date || "").slice(0, 4));
  if (year >= 2000) {
    score += 50;
  }

  return score;
}

  app.get("/api/tmdb/search", async (req, res) => {
    const query = (req.query.q as string)?.trim() || "";
    if (!query) return res.json({ results: [] });
    if (!TMDB_API_KEY) return res.json({ results: [] });
    try {
      const isZhQuery = /[\u4e00-\u9fff]/.test(query);
      const cleanQuery = query.replace(/[:：]+$/, "").trim();
      const compactQuery = query.replace(/[:：\s]+/g, "").trim();

      const fetchConfigs: { url: string; isZh: boolean }[] = [
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=1&api_key=${TMDB_API_KEY}`,
          isZh: false,
        },
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=2&api_key=${TMDB_API_KEY}`,
          isZh: false,
        },
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=1&language=zh-CN&api_key=${TMDB_API_KEY}`,
          isZh: true,
        },
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=2&language=zh-CN&api_key=${TMDB_API_KEY}`,
          isZh: true,
        },
      ];

      if (isZhQuery) {
        fetchConfigs.push({
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=3&language=zh-CN&api_key=${TMDB_API_KEY}`,
          isZh: true,
        });
      }

      if (cleanQuery && cleanQuery !== query) {
        fetchConfigs.push(
          {
            url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(cleanQuery)}&page=1&api_key=${TMDB_API_KEY}`,
            isZh: false,
          },
          {
            url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(cleanQuery)}&page=1&language=zh-CN&api_key=${TMDB_API_KEY}`,
            isZh: true,
          }
        );
      }

      if (compactQuery && compactQuery !== query && compactQuery !== cleanQuery) {
        fetchConfigs.push({
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(compactQuery)}&page=1&language=zh-CN&api_key=${TMDB_API_KEY}`,
          isZh: true,
        });
      }

      const responses = await Promise.allSettled<any>(
        fetchConfigs.map((cfg) => fetch(cfg.url).then((r) => r.json()))
      );

      const zhMap = new Map<number, string>();
      const enMap = new Map<number, string>();
      const rawCandidateMap = new Map<number, any>();

      responses.forEach((res, i) => {
        if (res.status !== "fulfilled" || !Array.isArray(res.value?.results)) return;
        const isFromZhEndpoint = fetchConfigs[i].isZh;

        for (const item of res.value.results) {
          if (!item || typeof item.id !== "number") continue;
          if (item.media_type !== "movie" && item.media_type !== "tv") continue;

          const t = item.title || item.name;
          if (t) {
            if (/[\u4e00-\u9fff]/.test(t)) {
              zhMap.set(item.id, t.trim());
            } else {
              enMap.set(item.id, t.trim());
            }
          }

          if (!rawCandidateMap.has(item.id)) {
            rawCandidateMap.set(item.id, {
              ...item,
              fromZhSearch: isFromZhEndpoint,
            });
          } else if (isFromZhEndpoint) {
            rawCandidateMap.get(item.id).fromZhSearch = true;
          }
        }
      });

      const rawResults: any[] = [];
      for (const item of rawCandidateMap.values()) {
        const zhTitle =
          zhMap.get(item.id) ||
          (isZhQuery && /[\u4e00-\u9fff]/.test(item.title || item.name)
            ? item.title || item.name
            : undefined);
        const enTitle =
          enMap.get(item.id) ||
          item.original_title ||
          item.original_name ||
          item.title ||
          item.name;

        rawResults.push({
          ...item,
          title: item.title !== undefined ? enTitle || item.title : undefined,
          name: item.name !== undefined ? enTitle || item.name : undefined,
          zh_title: zhTitle,
        });
      }

      // Sort by search relevance and popularity so blockbuster movies and direct title matches rank at the top
      rawResults.sort(
        (a, b) =>
          computeSearchRelevance(b, query, cleanQuery) -
          computeSearchRelevance(a, query, cleanQuery)
      );

      const releasedCandidates = filterReleasedMedia(rawResults, 1).slice(0, 36);
      const verified = await filterItemsByServerAvailability(
        releasedCandidates,
        "movie",
        TMDB_API_KEY
      );
      res.json({ page: 1, results: verified });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  });
  const sendMediaDetails = async (
    type: "movie" | "tv",
    id: string,
    res: express.Response
  ) => {
    try {
      const data = await fetchTmdbMediaDetails(type, id, TMDB_API_KEY);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  };

  app.get("/api/tmdb/movie/:id", (req, res) => {
    sendMediaDetails("movie", req.params.id, res);
  });
  app.get("/api/tmdb/tv/:id", (req, res) => {
    sendMediaDetails("tv", req.params.id, res);
  });
  app.get("/api/tmdb/discover/:type", async (req, res) => {
    const type = req.params.type === "tv" ? "tv" : "movie";
    const year = req.query.year || new Date().getFullYear();
    const genre = req.query.genre ? String(req.query.genre).trim() : "";
    const yearParam =
      type === "tv"
        ? `first_air_date_year=${year}`
        : `primary_release_year=${year}`;
    let genreParam = "";
    if (genre.toLowerCase() === "hk") {
      genreParam = "&with_origin_country=HK";
    } else if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre(type, genre);
      genreParam = `&with_genres=${encodeURIComponent(resolvedGenre)}`;
    }
    fetchTmdb(
      `/discover/${type}?sort_by=popularity.desc&vote_count.gte=10&${yearParam}${genreParam}`,
      res,
      type
    );
  });

  let localOgFontsPromise: Promise<Uint8Array[]> | null = null;
  const loadLocalOgFonts = (): Promise<Uint8Array[]> => {
    if (localOgFontsPromise) return localOgFontsPromise;
    localOgFontsPromise = Promise.all([
      fs.readFile(path.resolve(process.cwd(), "public/fonts/Poppins-Bold.ttf")),
      fs.readFile(path.resolve(process.cwd(), "public/fonts/Poppins-Regular.ttf")),
    ])
      .then(([bold, regular]) => [new Uint8Array(bold), new Uint8Array(regular)])
      .catch((err) => {
        localOgFontsPromise = null;
        throw err;
      });
    return localOgFontsPromise;
  };

  app.get("/api/og/:type/:id", async (req, res) => {
    const rawType = String(req.params.type || "").toLowerCase();
    const id = String(req.params.id || "").trim();
    const fallbackUrl = "/og-image.png?v=5";

    if ((rawType !== "movie" && rawType !== "tv") || !/^\d+$/.test(id) || !TMDB_API_KEY) {
      return res.redirect(302, fallbackUrl);
    }

    try {
      const mediaType = rawType as "movie" | "tv";
      const details = await fetchTmdbMediaDetails(mediaType, id, TMDB_API_KEY);
      const input = extractOgCardInput(details, mediaType);
      if (!input) {
        return res.redirect(302, fallbackUrl);
      }

      const [svg, fontBuffers] = await Promise.all([
        buildMovieOgSvg(input),
        loadLocalOgFonts(),
      ]);

      const resvg = await Resvg.async(svg, {
        fitTo: { mode: "width", value: 1200 },
        font: {
          fontBuffers,
          loadSystemFonts: false,
          defaultFontFamily: "Poppins",
        },
      });
      const pngBytes = resvg.render().asPng();

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(pngBytes));
    } catch (err) {
      console.error("[og-image] render failed:", err);
      return res.redirect(302, fallbackUrl);
    }
  });

  // Device Sync Routes (uses in-memory fallback when Cloudflare D1 is absent)
  app.post("/api/sync/code", async (req, res) => {
    try {
      const result = await handleCreateSyncCode({}, req.body);
      res.setHeader("Cache-Control", "no-store");
      return res.status(result.status).json(result.body);
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Failed to generate pairing code" });
    }
  });

  app.post("/api/sync/pair", async (req, res) => {
    try {
      const result = await handlePairSyncCode({}, req.body);
      res.setHeader("Cache-Control", "no-store");
      return res.status(result.status).json(result.body);
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Failed to pair device" });
    }
  });

  app.get("/api/sync/state", async (req, res) => {
    try {
      const groupId = String(req.query.groupId || "");
      const since = req.query.since ? String(req.query.since) : undefined;
      const result = await handleGetSyncState({}, groupId, since);
      res.setHeader("Cache-Control", "no-store");
      return res.status(result.status).json(result.body);
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Failed to load sync state" });
    }
  });

  app.post("/api/sync/state", async (req, res) => {
    try {
      const result = await handleUpdateSyncState({}, req.body);
      res.setHeader("Cache-Control", "no-store");
      return res.status(result.status).json(result.body);
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, error: err?.message || "Failed to update sync state" });
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
    const validation = validateProxyTargetUrl(url.trim());
    if ("reason" in validation) {
      return res.status(400).json({ error: validation.reason });
    }
    const result = await parseTvboxConfig(
      validation.url.toString(),
      name || "Custom TVBox"
    );
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
    const proto = req.protocol || "http";
    const host = req.get("host") || `localhost:${PORT}`;
    const reqOrigin = `${proto}://${host}`;
    const targetUrl = typeof req.query.url === "string" ? req.query.url : "";

    const proxyRes = await handleVodProxyRequest({
      targetUrl,
      reqOrigin,
      rangeHeader: req.get("range") || null,
      timeoutMs: 12000,
    });

    res.status(proxyRes.status);
    proxyRes.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (!proxyRes.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(proxyRes.body as any);
    req.on("close", () => {
      nodeStream.destroy();
    });
    nodeStream.on("error", () => {
      if (!res.headersSent) {
        res.status(502);
      }
      res.end();
    });
    nodeStream.pipe(res);
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
    // Pre-warm default Home page rows so first page load is instantaneous
    setTimeout(() => {
      fetch(`http://localhost:${PORT}/api/tmdb/trending/movie`).catch(() => {});
      fetch(`http://localhost:${PORT}/api/tmdb/trending/tv`).catch(() => {});
      fetch(`http://localhost:${PORT}/api/tmdb/trending/tv?genre=hk`).catch(() => {});
    }, 100);
  });
}

startServer();
