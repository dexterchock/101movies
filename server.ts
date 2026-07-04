import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // TMDB Proxy helper
  const fetchTmdb = async (endpoint: string, res: express.Response) => {
    if (!TMDB_API_KEY) {
      console.warn("TMDB API Key not configured.");
      // Return mock data gracefully if API key is not yet provided
      return res.json({ results: [] });
    }
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
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
  app.get("/api/tmdb/search", (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json({ results: [] });
    fetchTmdb(`/search/multi?query=${encodeURIComponent(query)}`, res);
  });
  app.get("/api/tmdb/movie/:id", (req, res) => {
    fetchTmdb(`/movie/${req.params.id}`, res);
  });
  app.get("/api/tmdb/tv/:id", (req, res) => {
    fetchTmdb(`/tv/${req.params.id}`, res);
  });
  app.get("/api/tmdb/discover/:type", (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    fetchTmdb(`/discover/${req.params.type}?sort_by=popularity.desc&primary_release_year=${year}`, res);
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
