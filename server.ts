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
} from "./src/server/tvboxService";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // TMDB Proxy helper
  const fetchTmdb = async (endpoint: string, res: express.Response) => {
    if (!TMDB_API_KEY) {
      console.warn("TMDB API Key not configured.");
      return res.json({ results: [] });
    }
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  };

  app.get("/api/tmdb/trending/movie", (req, res) => {
    fetchTmdb("/trending/movie/week", res);
  });
  app.get("/api/tmdb/trending/tv", (req, res) => {
    fetchTmdb("/trending/tv/week", res);
  });
  app.get("/api/tmdb/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json({ results: [] });
    if (!TMDB_API_KEY) return res.json({ results: [] });
    try {
      const url = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const filtered = Array.isArray(data.results)
        ? data.results.filter(
            (item: any) => item.media_type === "movie" || item.media_type === "tv"
          )
        : [];
      res.json({ ...data, results: filtered });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  });
  app.get("/api/tmdb/movie/:id", (req, res) => {
    fetchTmdb(`/movie/${req.params.id}`, res);
  });
  app.get("/api/tmdb/tv/:id", (req, res) => {
    fetchTmdb(`/tv/${req.params.id}`, res);
  });
  app.get("/api/tmdb/discover/:type", async (req, res) => {
    const type = req.params.type === "tv" ? "tv" : "movie";
    const year = req.query.year || new Date().getFullYear();
    const yearParam =
      type === "tv"
        ? `first_air_date_year=${year}`
        : `primary_release_year=${year}`;
    if (!TMDB_API_KEY) return res.json({ results: [] });
    try {
      const url = `${TMDB_BASE_URL}/discover/${type}?sort_by=popularity.desc&${yearParam}&api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const results = Array.isArray(data.results)
        ? data.results.map((item: any) => ({ ...item, media_type: type }))
        : [];
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
