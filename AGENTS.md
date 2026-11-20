# 101Movies Engineering Handbook & Maintenance Guide

Notes for future coding sessions and automated agents working on this repository. Keep hard-won compatibility, quality, UI, and VOD source invariants intact unless explicitly asked to redesign them.

---

## 1. Hard Constraints & Invariants (Do Not Regress)

### 1.1 Visual Quality (4K 65" TVs, 2K Monitors, 3x iPhones)
- **Hero Backdrop (`src/pages/Player.ts`)**: Keep `https://image.tmdb.org/t/p/original` on the main `.player-backdrop`. TMDB has no intermediate tier between `w1280` and `original`, and `w1280` visibly softens on 2K/4K TVs and tall portrait phones. Only `.player-backdrop-ambient` (which is blurred with `filter: blur(42px)` when a show lacks a wide backdrop) uses `/t/p/w342`.
- **Poster Cards (`src/components/MediaCard.ts`)**: Keep `srcset` (`w342 342w, w500 500w`) + dynamic `sizes` + `fetchpriority="high"` on first-row cards (`isPriority`). Do NOT add `loading="lazy"` (grids are fixed-viewport paginated, so lazy-loading degrades LCP) and do NOT drop `w500` (needed for 4K TVs and 2x/3x Retina displays). Never proxy TMDB JPEGs into WebP/AVIF.

### 1.2 Samsung Tizen 4.0 / Chromium 56 Smart TV Compatibility
- **Vite Build (`vite.config.ts`)**: Keep `target: ["chrome56", "es2015"]`, `cssTarget: "chrome56"`, `modulePreload: false`, `format: "iife"`, `inlineDynamicImports: true`, and `tizenClassicBundlePlugin` (strips `type="module"` and `crossorigin`, outputs `<script defer>`). Do NOT switch to native ESM or raise the browser target.
- **Runtime Polyfills (`src/polyfills.ts`)**: Keep `URLSearchParams` plain-object constructor support, `Element.prototype.append` / `replaceChildren`, `String.prototype.padStart` / `padEnd`, `Promise.prototype.finally` / `Promise.allSettled`, `AbortController` / `AbortSignal` + `{ signal }` listener wrapper, and `html.no-focus-visible` detection.
- **Flexbox `gap` Fallbacks (`src/index.css`)**: Keep `@supports not (display: grid)` margin fallbacks (Chromium 56 lacks flex `gap`). Also keep Tizen Return/Back (`keyCode 10009` / `XF86Back`) navigation intact.
- **On-Demand `hls.js` (`src/components/HlsPlayer.ts`)**: Keep `public/vendor/hls.light-1.6.16.min.js` (~106 KiB gzip ES5 light build with AES-128 decryption support) lazy-loaded via `<script>` on the player route instead of statically importing `hls.js` into the main IIFE (saves ~160 KiB gzip on browse pages). All active MacCMS VOD playlists are verified free of `#EXT-X-MEDIA` / `#EXT-X-DEFINE` demuxed audio/subtitle tracks; revert to full `hls.min.js` only if a future source adds those tags. Keep standard-MSE check (`hasStandardMSE()`) so iOS Safari uses native HLS and skips downloading `hls.js`. Keep TV-safe buffer caps (`maxBufferLength: 60`, `maxBufferSize: 60000000`, `backBufferLength: 30`) and strict `hls.destroy()` teardown on exit to prevent OOM crashes on Tizen TVs.

### 1.3 Desktop AI Video Upscaler (`src/components/VideoUpscaler.ts`)
- Hidden on phones, tablets, touch laptops (`maxTouchPoints > 0`), and Smart TVs (`isDesktopUpscaleSupported()`).
- **WebGPU must use `anime4k/cnn-2x-m`** (not `cnn-2x-l`, which frame-hitches on mid-range desktop GPUs) with `tier: { tier: 3, isMobile: false }` (single-tile rendering). WebGL2 fallback intentionally keeps `anime4k/cnn-2x-l`.
- Auto-selects anime (`an`) vs live-action (`rl`) weights from TMDB genres (`id === 16`), runs fullscreen-only with auto-off + full GPU/buffer teardown when exiting fullscreen.

### 1.4 UI & Layout Invariants
- **Media Card Hover Compositing (`src/index.css`)**: Keep `transform: translate3d(0, 0, 0) scale(1)`, `will-change: transform`, and `backface-visibility: hidden` scoped inside `@media (hover: hover) and (pointer: fine)`. Removing `will-change` causes mouse-leave recenter stutter on desktop; putting it globally wastes GPU layer RAM on phones, tablets, and TVs.
- **Player Top Button Offset (`src/index.css`)**: Keep `.player-video-wrap` top `margin-top` offsets (`56px` / `74px` / `82px` + `safe-area-inset-top`, `margin-top: 0` in `:fullscreen`) so native `<video>` / iOS / tablet controls never overlap the Back/Save overlay bar.
- **Rankings & Trending Alignment (`src/index.css`)**: Keep `.pill-track--year` widths (`54px` mobile / `64px` sm / `200px` desktop) so mobile Rankings year stays centered and desktop Rankings vs Trending category bars keep matching lengths.
- **Home Tab Preloading (`src/pages/Home.ts`)**: Keep the inactive tab (`loadTV` or `loadMovies`) deferred until the active tab finishes so it does not compete with LCP.
- **Navigation Indicators**: Keep `aria-hidden="true"` on sliding `.capsule-indicator` elements inside `role="tablist"`.
- **SEO & Analytics**: Do NOT add `Agentmap` or non-standard directives to `public/robots.txt` (breaks PageSpeed Insights SEO 100). Ignore third-party Cloudflare `/beacon.min.js` PSI warnings, and do NOT add SSR solely for LCP poster discovery.

### 1.5 Device Sync & Edge Proxy Security
- **Cloudflare D1 Sync (`functions/_shared/syncService.ts`, `src/sync.ts`)**: Temporary 4-digit pairing code with 5-minute TTL (`PAIRING_CODE_TTL_MS`), auto-submit on 4th digit, first-pair merge of History & Saved (never overwrite), inline disconnect choices (`Keep local copy` / `Clear & disconnect`), `paired = 0` stale group cleanup, and `since` timestamp short-circuiting to minimize D1 reads/writes.
- **Hardened `/api/vod/proxy` (`functions/_shared/vodProxy.ts`, `functions/api/_middleware.ts`)**: Keep private/loopback/link-local/metadata IPv4 & IPv6 blocklist, manual validated redirects, MIME & `#EXTM3U` checks, and same-origin CORS (`url.origin`).

---

## 2. VOD Source Refresh Playbook

### 2.1 Why TVBox JAR / "4K" Repos Do Not Work Here (Audited 2026-11-20)
- **Compatible protocol only**: Plain **MacCMS V10 JSON** (`api.php/provide/vod`) returning direct HTTPS `.m3u8` playlists with `Access-Control-Allow-Origin: *` (including any AES `#EXT-X-KEY` URI).
- **`qist/tvbox`, `cluntop/tvbox`, `yoursmile66/TVBox`**:
  - `yoursmile66/TVBox` (`XC.json`) is hex/AES encrypted for TVBox + relies on `Yoursmile.jar` (compiled Android DEX spiders).
  - ~90% of `4K`-labeled sources in `qist/tvbox` and `cluntop/tvbox` (`csp_Wogg`, `csp_PanWebShare`, `csp_Wo4k`, `csp_FourKZN`, etc.) scrape Quark / UC / Aliyun / 115 cloud-drive share links. These require paid VIP cloud-drive cookies and usually serve 10–40 GB `.mkv` files with HEVC + AC3/EAC3/DTS audio that web browsers and Samsung Tizen 4.0 cannot play without server-side remuxing/transcoding.
  - Web scrapers (`4k4k.live`, `fun4k.com`, `4k-av.com`, `pianku4k.py`) were offline, Cloudflare WAF-blocked, or relied on iframe WebView sniffing (`parse: 1, jx: 1`).
- **`yujian0815/fnmedia-ext`**: Its 4K support requires local `redroid` (Android container) + Quark/UC QR login on a NAS; its direct MacCMS list (`proxy/providers.py`, `proxy/assets/cat_lite.json`) uses standard 720p/1080p sites we already track.
- **Reality of free public MacCMS HLS sites**: They almost all cap at **1080p** (and many encode `1080x540` or `1280x720`).

### 2.2 GitHub Repos to Trace Fresh MacCMS Sources
When existing sources go offline or slow down, extract `type: 0/1` `provide/vod` URLs from these maintained repos:
1. **Primary (actively updated CMS list)**: `https://github.com/hafrey1/LunaTV-config` (`LunaTV-config.json`)
2. **Curated CMS list + reliability notes**: `https://github.com/yujian0815/fnmedia-ext` (`proxy/providers.py`, `proxy/assets/cat_lite.json`)
3. **Directory & TVBox feeds**: `https://github.com/laoma528/awesome-zhuiju-free` (`resources/resources.json`)
4. **Mirror fallback list**: `https://github.com/katelya77/KatelyaTV` (`config.json`)

*(Avoid unmaintained pastebins — >90% of old CMS domain lists are dead or WAF-blocked.)*

### 2.3 Target Count & Cloudflare Budget
- Keep **8–10** verified sites in `BUILTIN_VOD_SITES` (`src/server/tvboxService.ts`).
- `MAX_VOD_SUBREQUESTS = 26` keeps stream resolution safely within Cloudflare Pages Functions' 50-subrequest limit across TMDB metadata + up to 3 fallback search keywords. With 10 sites, keyword #1 + keyword #2 both query all 10 sites cleanly (`10 + 10 = 20 < 26`).
- Keep `FAST_PROBE_SITES` (`functions/_shared/tvboxService.ts`) to our top **2** verified-playable, largest-catalog sites (`bfzy` + `lzzy`).

### 2.4 Benchmark Checklist Before Changing `BUILTIN_VOD_SITES`
Never swap sources based only on `?ac=list` or API search ping! Always verify all 5 items:
1. **Catalog depth & freshness**: `?ac=list&pg=1` — check `total` (prefer >= 65k) and latest `vod_time`.
2. **Real search behavior**: Test `?ac=videolist&wd=...` across ~8 varied titles (e.g., `沙丘`, `奥本海默`, `盗梦空间`, `怪奇物语`, `绝命毒师`, `无间道` for Cantonese `粤语`, `进击的巨人`, `流浪地球`). Reject any site returning `"暂不支持搜索"` or ignoring `wd=` (returning random homepage items).
3. **Live `.m3u8` + `.ts` + `#EXT-X-KEY` check from user's region**: A site can answer the JSON API in 25–115 ms from Cloudflare Edge while its actual video CDN times out (>8 s) or 403/404s. Always fetch the `.m3u8`, any AES key, and mid-movie `.ts` segments directly (browser uses direct fetch first when `CORS: *`) AND via `/api/vod/proxy`. Verify HTTPS support (`http://` forces mixed-content proxy fallback).
4. **Upstream deduplication**: Check video CDN hostname, catalog count, segment count, and bitrate so we do not include identical upstream mirrors under two names.
5. **Real pixel resolution & bitrate**: Measure H.264 SPS resolution and mid-movie bitrate (`kbps`) on sample `.ts` segments (skip segment 0–2 in case of 1-second ad/promo placeholders) and set `SOURCE_QUALITY_TIER` (`3` = sharp 1080p + fast CDN, `2` = broad catalog / mixed 1080p–720p, `1` = broad 720p backup).

### 2.5 Active & Disqualified Reference (Verified 2026-11-20)
- **Active 10 (`BUILTIN_VOD_SITES`)**:
  - Tier 3: `modu` (魔都资源, 92k, fastest `.m3u8` + ~1618 kbps 1080p), `bfzy` (暴风资源, 173k, largest catalog), `ffzy` (非凡资源, 99k, fast `.ts` 1080p), `dytt` (电影天堂, 85k, `https://`, ~1572 kbps 1080p), `ikun` (iKun资源, 67k, fast CDN 1080p)
  - Tier 2: `lzzy` (量子资源, 164k, #2 largest catalog), `ruyi` (如意资源, 90k), `hongniu` (红牛资源, 118k)
  - Tier 1: `wujin` (无尽资源, 125k, broad 720p fallback), `360zy` (360资源, 75k, fast 720p fallback)
- **Dropped / Disqualified (2026-11-20)**:
  - Video CDN timed out overseas on both direct PC & CF proxy despite fast API ping: `subo`, `hhzy`, `jisu`, `guangsu`, `huya`, `xinlang`
  - Search disabled (`暂不支持搜索`): `suoni`, `kuaiche`, `shandian`, `yaya`
  - Ignores `wd=` parameter: `api.zuidapi.com` (最大资源)
  - Duplicate upstream stream of `hongniu`: `jinying` (金鹰资源)
  - `.m3u8` unreachable during region test: `maoyan`, `iqiyi`, `uku88`

---

## 3. Local Windows Dev & Verification Commands
- PowerShell execution policy blocks `.ps1` shims — always run `npm.cmd` and `npx.cmd`.
- PowerShell 5.1 does not support `&&` — chain commands with `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };`.
- Inline `node -e '...'` loses quotes in PowerShell — pipe single-quoted here-strings (`@' ... '@ | node`) instead.
- Standard check before pushing: `npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run build`.
