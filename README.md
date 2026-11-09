<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="101Movies Logo" />
</p>

<h1 align="center">101Movies</h1>

<p align="center">
  <strong>A cinematic web streaming application engineered for Smart TVs, desktop, and mobile browsers.</strong>
</p>

<p align="center">
  <a href="https://101movies.pages.dev"><img src="https://img.shields.io/badge/Live_Demo-101movies.pages.dev-3b82f6?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Live Demo" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Cloudflare_Pages-Serverless-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License: MIT" />
</p>

---

## Preview

<p align="center">
  <img src="public/preview.png" width="900" alt="101Movies Interface Screenshot" />
</p>

---

## Features

- **Smart TV Navigation**: Zero-scroll locked 2x6 card viewport grid. Operable with keyboard arrows, Smart TV remote D-pads, mouse, and touch swipe.
- **Dynamic TMDB Feeds**: Real-time trending feeds for Movies and TV Shows, categorized by genre (Action, Sci-Fi, Hong Kong, Drama, Comedy, Horror, Anime, etc.).
- **Bilingual Title Resolution**: Automatic translation and matching between English and Chinese (`zh-CN`) titles to maximize discovery across Asian and international VOD aggregators.
- **Multi-Line VOD Aggregation**: Concurrent stream probing across multiple TVBox-compatible API providers with automatic line switching.
- **Custom HLS Video Player**: Built with `hls.js`, featuring an episode drawer, stream line picker, video quality selector, full-screen playback, and keyboard controls.
- **Watch History & Progress Resume**: Client-side watch state persistence across movies and show episodes via `localStorage` with zero account registration needed.
- **Cloudflare Edge Middleware**: Serverless API routes on Cloudflare Pages Functions utilizing the Cache API (`caches.default`) to return sub-50ms repeat queries.
- **Defensive TV Compatibility**: Hardened with legacy JS polyfills (`@vitejs/plugin-legacy`), CSS `@layer` unwrapping, safe `scrollTo` fallbacks, and a React Error Boundary for legacy Smart TV engines (Samsung Tizen, LG webOS).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | [React 19](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) and [Lucide Icons](https://lucide.dev/) |
| Media Engine | [HLS.js](https://github.com/video-dev/hls.js/) |
| Routing | [React Router DOM v7](https://reactrouter.com/) |
| Build Tool | [Vite 6](https://vitejs.dev/) with [`@vitejs/plugin-legacy`](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy) |
| Edge Runtime | [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/) |
| Caching | Cloudflare Cache API (`caches.default`) |
| Metadata Source | [The Movie Database (TMDB)](https://www.themoviedb.org/) |

---

## Project Structure

```text
101movies/
├── functions/                     # Cloudflare Pages Functions (Edge API)
│   ├── _shared/
│   │   └── tvboxService.ts        # Multi-provider VOD scraper and concurrency pool
│   └── api/
│       ├── _middleware.ts         # Edge caching middleware (TTL: 1h - 24h)
│       ├── tmdb/                  # Proxies TMDB with Chinese title batching
│       │   ├── trending/          # Movies and TV trending endpoints
│       │   ├── rankings/          # Yearly and genre rankings
│       │   ├── search.ts          # Search with bilingual title resolution
│       │   └── details.ts         # Title and metadata resolution
│       └── tvbox/                 # TVBox stream scraping and episode extraction
├── public/                        # Static assets, branding and SEO
│   ├── favicon.svg                # 1M vector favicon
│   ├── favicon.ico                # Multi-resolution ICO
│   ├── preview.png                # Live application screenshot
│   ├── og-image.png               # Social preview banner (1200x630)
│   ├── apple-touch-icon.png       # iOS home screen icon (180x180)
│   ├── android-chrome-192x192.png # PWA 192px icon
│   ├── android-chrome-512x512.png # PWA 512px icon
│   ├── robots.txt                 # Search engine crawler configuration
│   ├── sitemap.xml                # XML sitemap
│   └── site.webmanifest           # Progressive Web App manifest
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── ErrorBoundary.tsx      # Crash protection for TV browser engines
│   │   ├── HlsPlayer.tsx          # Custom HLS video player
│   │   ├── Layout.tsx             # Responsive shell and capsule navigation
│   │   ├── MediaCard.tsx          # Card with focus states and poster fallback
│   │   └── TvboxModal.tsx         # Source provider and line switcher
│   ├── pages/
│   │   ├── Home.tsx               # Trending Movies, Shows and Watch History
│   │   ├── Rankings.tsx           # Decade and Genre Rankings grid
│   │   ├── Search.tsx             # Instant search
│   │   └── Player.tsx             # Playback view with episode drawer
│   ├── api.ts                     # Client-side API abstraction
│   ├── index.css                  # Global styles and Flexbox grid fallbacks
│   ├── main.tsx                   # Application entry point with scrollTo polyfill
│   ├── types.ts                   # TypeScript interfaces
│   └── utils.ts                   # Helpers and safeScrollTo utility
├── index.html                     # HTML shell with SEO metadata and JSON-LD
├── vite.config.ts                 # Vite config with legacy polyfills and CSS transforms
└── wrangler.jsonc                 # Cloudflare configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- A [TMDB API Read Access Token or API Key](https://www.themoviedb.org/settings/api)

### 1. Clone the repository

```bash
git clone https://github.com/dexterchock/101movies.git
cd 101movies
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Optional TMDB Bearer Token or API Key for local development
TMDB_READ_TOKEN=your_tmdb_read_access_token_here
# or
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Run the Development Server

To run the local Vite development server:

```bash
npm run dev
```

To test with Cloudflare Pages Functions locally (using Wrangler):

```bash
npm run build
npm run pages:dev
```

Open `http://localhost:5173` or `http://localhost:8788` in your browser.

---

## Deployment

### Deploy to Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages.
2. Configure build settings:
   - **Framework preset**: `None` / `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Add the Environment Variable in your Cloudflare Pages dashboard:
   - `TMDB_READ_TOKEN`: *your TMDB API token*
4. Deploy.

Or deploy directly via Wrangler CLI:

```bash
npm run build
npx wrangler pages deploy dist --project-name 101movies
```

---

## Smart TV Engineering

Smart TV browsers (such as older Samsung Tizen and LG webOS models running Chromium 47–69) frequently lack modern ECMAScript features or enforce strict memory and subrequest limits. This project implements several critical adaptations:

1. **JavaScript Polyfills**: `@vitejs/plugin-legacy` transpiles bundles to target `chrome >= 60`, `safari >= 11`, and `edge >= 79`, injecting `regenerator-runtime` and `core-js` polyfills automatically.
2. **CSS Compatibility Transforms**: Vite build plugins unwrap modern CSS `@layer` rules and map `oklch()` color functions to standard HEX values.
3. **Safe Horizontal Scrolling**: Legacy TV engines throw unhandled exceptions when `element.scrollTo({ left, behavior: 'smooth' })` is passed an options dictionary. A runtime prototype polyfill and `safeScrollTo()` helper fall back to `element.scrollLeft = value`.
4. **Grid Fallbacks**: Flexbox wrapping rules ensure cards remain in structured columns even if the TV engine cannot parse CSS subgrid or multi-track CSS Grid.
5. **Subrequest Batching & Edge Caching**: Avoids Cloudflare's 50-subrequest ceiling by batching queries and persisting responses at the edge via the Cloudflare Cache API.

---

## Disclaimer

101Movies is an open-source educational project developed for pair-programming and web technology research.

- 101Movies does not host, upload, or store video files or media streams on any servers.
- All media metadata is provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).
- All video streams and playlist URLs are indexed dynamically from third-party public API endpoints.
- Users are responsible for complying with the copyright and intellectual property laws of their respective jurisdictions.

---

## License

This project is open-source under the [MIT License](LICENSE).
