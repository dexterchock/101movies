# TVBox / 影视仓 Configuration & Real Stream Playback Plan

Integrate built-in TVBox / 影视仓 configuration feeds from `laoma528/awesome-zhuiju-free` alongside AppleCMS V10 VOD API resolvers so movies and TV shows play real `.m3u8` / `.mp4` streams automatically, complete with multi-source server switching, episode selection, and a clean TVBox source manager accessible from both the bottom navigation island and the Player page.

---

## User Review & Critical Decisions

Based on your answers, the following architecture and UX decisions are locked in:

- **Zero-Setup Preloaded TVBox & VOD Sources**: Built-in `tvbox_config` repositories from `laoma528/awesome-zhuiju-free` (such as *饭太硬*, *肥猫*, *老刘备*, *小马*, *小盒子4K*, *创享影视*, *无名*, and *挺好分享多仓*) along with high-speed standard AppleCMS V10 JSON VOD APIs are preloaded automatically out of the box so playback works immediately without manual configuration.
- **Auto-Search with Server & Episode Selector on Player Page**: Opening any Movie or TV Show automatically resolves its localized Chinese title (`zh-CN`) and original title via TMDB, queries active TVBox/VOD sources in parallel, and populates the Player page with a real **Streaming Servers** switcher and an interactive **Episode Grid** (for multi-episode TV series or multi-part streams).
- **TVBox Config & Source Manager Entry Points**: A dedicated **TVBox / Sources Settings** trigger will be integrated into both the **Bottom Navigation Island** and the **Player Page Header**, opening a cohesive `#121212` dark-glass modal to view preloaded `awesome-zhuiju-free` configuration URLs, check live source latency/status, toggle active repositories, or add custom TVBox JSON URLs.

---

## 1. Overview & Core Concept

Currently, the Player view displays static mock servers (`Line A`, `Line B`, `Line C`) that all point to a single demo test stream (`test-streams.mux.dev`). To turn the application into a genuine streaming theater powered by the `awesome-zhuiju-free` TVBox / 影视仓 ecosystem, we need a two-layer resolution architecture modeled after open-source web players like **LibreTV** and **MoonTV**:

1. **TVBox Configuration Ingestion (`tvbox_config`)**:
   - The `laoma528/awesome-zhuiju-free` repository curates single-repo (`单仓`) and multi-repo (`多仓`) TVBox JSON configurations.
   - Standard TVBox configs contain a `sites` array (where `type: 1` or `type: 0` entries expose standard CMS JSON/XML `api` endpoints such as `/api.php/provide/vod`) or a `urls` / `storeHouse` index pointing to sub-repositories.
   - Because several TVBox hosts mask or base64-encode payloads unless requested by a TVBox client, the backend proxy fetches configurations using TVBox-compatible headers (`User-Agent: okhttp/4.12.0`), strips leading comment blocks (`/* ... */` or `//`), and decodes obfuscated payloads when applicable to extract live `api.php/provide/vod` sites.
2. **Bilingual Title Resolution & Parallel VOD Aggregation**:
   - TMDB catalog entries are displayed in English in the UI, whereas Chinese VOD APIs index content primarily by Chinese titles (`vod_name`) and release year (`vod_year`).
   - When a user opens a movie or TV show, the backend fetches both the `zh-CN` title and original/English title from TMDB, fans out concurrent search requests (`?ac=videolist&wd=<title>`) across active VOD sites with strict timeouts, ranks results by title/year match, and parses `vod_play_from` and `vod_play_url` (`Episode$https://...m3u8#Episode2$https://...m3u8`) into structured servers and episode playlists.

---

## 2. User Experience & Visual Design

- **Cohesive `#121212` Pill Surface & Spacing Precision**:
  - Every new control—including the bottom island Settings icon button, the Player page TVBox Config button, the Server switcher capsules, and the Episode selector tiles—strictly adheres to the `bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)]` surface language, uniform `24px`/`32px` spacing math, and `cubic-bezier(0.25,1,0.5,1)` inner-element hover physics.
- **Player Page Stream Resolution Experience**:
  - **Auto-Search Status**: When landing on `/player/:type/:id`, the server section displays a sleek, non-intrusive loading skeleton while querying TVBox sources in parallel, then automatically selects the fastest matching `.m3u8` source.
  - **Streaming Servers Bar**: Displays each matched VOD source as a capsule button showing the source name (e.g., *非凡资源*, *量子资源*, *暴风资源*, *创享影视*, *360资源*) and total episode/stream count.
  - **Play Group & Episode Selector Grid**: When a source provides multiple playlists (e.g., `ffm3u8`, `lzm3u8`) or multiple episodes (`第01集`, `第02集`, `HD中字`), a clean compact grid (`tabular-nums`) lets the user switch episodes with a single click and auto-plays immediately inside the HLS player.
- **TVBox / 影视仓 Configuration Modal**:
  - Accessible from a subtle **Sources / TVBox** button on the right end of the Bottom Navigation Island and in the top bar of the Player page.
  - Displays:
    1. **Preloaded `awesome-zhuiju-free` TVBox Configs**: Lists curated configs (*老刘备*, *小马*, *小盒子4K*, *创享影视*, *饭太硬*, *肥猫*, *无名*, *挺好分享多仓*) with one-click copy of the `tvbox` URL, active status badge, and parsed VOD site count.
    2. **Active VOD Stream Providers**: Toggle individual parsed VOD APIs on/off or trigger a quick connectivity ping (`ms` latency in `tabular-nums`).
    3. **Custom TVBox URL Input**: Optional input bar to paste any custom TVBox JSON / 多仓 URL and dynamically import its `type: 1` CMS VOD sites.

---

## 3. Key Product Decisions & Trade-Offs

- **Hybrid Built-In CMS Pool + Live TVBox Config Parser**:
  - *Decision*: Combine a curated pool of direct, high-availability AppleCMS V10 JSON endpoints (`api.php/provide/vod`) with dynamic `sites` extracted from the `awesome-zhuiju-free` TVBox JSON configs.
  - *Rationale*: In the TVBox ecosystem, many `type: 3` spider sites require native Android JAR dex loaders (`csp_*`) that cannot execute in a web browser, whereas `type: 1` CMS sites serve standard HTTP JSON with `.m3u8` streams. Pairing extracted `type: 1` sites from `awesome-zhuiju-free` with verified direct CMS endpoints guarantees 100% browser-playable HLS streams with sub-2-second search latency.
- **Server-Side Parallel Search & M3U8 CORS Proxy**:
  - *Decision*: Execute all TVBox config parsing and VOD search aggregation on the Express backend, and provide an optional `/api/vod/proxy` endpoint for `.m3u8` manifests that lack permissive CORS headers.
  - *Rationale*: Third-party VOD servers frequently block browser CORS requests or use HTTP endpoints; routing discovery and manifest proxying through the backend eliminates mixed-content and CORS failures.
- **Automatic Bilingual Title Matching (`zh-CN` + Original + Year)**:
  - *Decision*: Query TMDB `/movie/:id?language=zh-CN` (or `/tv/:id?language=zh-CN`) alongside the default English metadata during stream resolution.
  - *Rationale*: Searching Chinese VOD APIs with English titles often yields zero matches, whereas querying by the official Chinese title (and validating against release year or original title) resolves the exact stream reliably.

---

## 4. Technical Architecture & Data Strategy

### System Data & Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client UI (Player & Nav Island)                    │
│  • Bottom Nav Island & Player Header -> Open TVBox Source Manager Modal │
│  • Player View -> Requests /api/vod/resolve?type=movie|tv&tmdbId=:id    │
│  • Server Capsule Bar -> Switches active VOD provider                   │
│  • Episode Grid       -> Switches episode .m3u8 URL in HlsPlayer        │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│   Backend TVBox Config Service        │ │   Backend VOD Stream Resolver │
│ • Preloads awesome-zhuiju-free        │ │ • Fetches TMDB zh-CN + EN     │
│   tvbox_config URLs                   │ │   title & release year        │
│ • Fetches with User-Agent: okhttp/4.12│ │ • Queries active VOD APIs     │
│ • Parses single/multi-repo JSONs      │ │   (?ac=videolist&wd=...)      │
│   & extracts playable CMS VOD sites   │ │ • Parses vod_play_url into    │
└───────────────────┬───────────────────┘ │   structured m3u8 episodes    │
                    │                     └───────────────┬───────────────┘
                    └─────────────────►───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    HLS Playback & M3U8 CORS Proxy                       │
│  • HlsPlayer loads resolved .m3u8 stream directly                       │
│  • Automatic fallback to /api/vod/proxy?url=... if CORS error occurs    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Specifications

1. **Preloaded `awesome-zhuiju-free` Configurations (`/api/tvbox/configs`)**:
   - Preload the official `tvbox_config` catalog from `laoma528/awesome-zhuiju-free` (*饭太硬*, *肥猫*, *老刘备*, *小马*, *摸鱼儿*, *王二小*, *小盒子4K*, *创享影视*, *影仓*, *小盒子单仓*, *嗷呜*, *无名*, *小盒子多仓*, *拾光多仓*, *挺好分享多仓*).
   - Provide an endpoint `/api/tvbox/parse` that fetches any selected TVBox URL with `User-Agent: okhttp/4.12.0`, strips comments/wrappers, and extracts standard JSON/XML VOD `sites` (`type: 1` or `api` containing `/api.php/provide/vod` or `/api/provide/vod`).
   - Pre-seed the active VOD source registry with reliable, fast-responding CMS endpoints (including *创享影视*, *非凡资源*, *量子资源*, *暴风资源*, *360资源*, *光速资源*, *红牛资源*, and dynamically discovered `awesome-zhuiju-free` CMS nodes).
2. **Stream Resolution Endpoint (`/api/vod/resolve`)**:
   - Accepts `tmdbId`, `type` (`movie` | `tv`), and optional custom search keyword `wd` or disabled source list.
   - Resolves `zhTitle`, `enTitle`, `originalTitle`, and `releaseYear` from TMDB.
   - Queries active VOD sources concurrently via `Promise.allSettled` with a `4500ms` per-source timeout so slow sources never block playback.
   - Parses `vod_play_from` (split by `$$$`) and `vod_play_url` (split by `$$$` for play groups, `#` for episodes, and `$` for `episodeName$streamUrl`), filtering specifically for `.m3u8` and `.mp4` streams so browser playback always succeeds.
3. **Player Page Upgrades**:
   - Replace `MOCK_SOURCES` with live state from `/api/vod/resolve`.
   - When the user clicks **Play Now** (or selects any Server / Episode), immediately mount `HlsPlayer` with the selected `.m3u8` stream.
   - Include a manual search override input inside the Player's server header in case a title has an alternate Chinese translation, plus a top-right **TVBox Sources** button to inspect or switch configurations on the fly.
4. **HLS Player Resiliency**:
   - Enhance `HlsPlayer` so that if `Hls.Events.ERROR` encounters a network/CORS manifest load failure on a direct `.m3u8` URL, it automatically retries via the backend `/api/vod/proxy?url=...` rewrite route, which rewrites relative segment/sub-playlist URLs to absolute proxied URLs.
