# Implementation Plan

## 1. Unified Watch History with Episode & Timestamp Memory
- **Data Model (`/src/types.ts`)**:
  - Extend `MediaItem` with optional playback progress fields (`watchProgress`) stored directly inside `localStorage` under the existing `watch_history` key:
    - `sourceId?: string` (last played server ID)
    - `seasonNumber?: number` (last played season number, e.g. `1`)
    - `seasonIndex?: number` (season array index)
    - `episodeIndex?: number` (0-based episode index)
    - `episodeLabel?: string` (formatted label such as `Ep 3`)
    - `currentTime?: number` (playback position in seconds)
    - `duration?: number` (total duration in seconds)
    - `updatedAt?: number`
- **Add to Continue Watching Only When Playback Starts (`/src/pages/Player.tsx`)**:
  - Stop adding items to `watch_history` when merely opening the movie/show detail screen.
  - Persist/update the item in `watch_history` only when playback actually starts (clicking a server pill, selecting an episode, or clicking the `Resume` pill) and continuously update `currentTime` (throttled every ~2 seconds) while the video plays.
  - Because all episode and timestamp progress lives inside `watch_history`, clicking **Clear** on the Home page's *Continue Watching* row (`localStorage.removeItem("watch_history")`) will clear both the *Continue Watching* row and all saved episode/time resume states at once.

## 2. Player Resume Pill & Seeking (`/src/components/HlsPlayer.tsx` & `/src/pages/Player.tsx`)
- **HLS & Video Timestamp Support (`/src/components/HlsPlayer.tsx`)**:
  - Add `initialTime?: number` and `onTimeUpdate?: (currentTime: number, duration: number) => void` props to `HlsPlayer`.
  - When a stream loads (`Hls.Events.MANIFEST_PARSED` or `loadedmetadata`) and `initialTime > 0`, seek the video element to `initialTime` before starting playback.
  - Attach an `onTimeUpdate` listener to the `<video>` element to report playback progress back to `Player.tsx`.
- **Bottom Bar Resume Pill (`/src/pages/Player.tsx`)**:
  - When the current movie or TV show has saved `watchProgress` in `watch_history` (and is not already actively playing that exact episode/state), display a **Resume** pill in the bottom bar right next to the `Episodes` button (or at the right side of the bottom bar for movies).
  - Format the label cleanly with tabular numerals:
    - **TV Shows**: `Resume S1:E3 · 14:20` (or `Resume Ep 3 · 14:20` for single-season shows)
    - **Movies**: `Resume · 42:15`
  - Clicking **Resume** selects the saved server (falling back to the fastest available server if unavailable), restores the saved season and episode, passes the saved `currentTime` to `HlsPlayer`, and starts playback immediately.

## 3. Chinese Default Title for Chinese Movies & Shows (`/server.ts`, `/src/pages/Player.tsx`, `/src/components/MediaCard.tsx`)
- **Backend Title Normalization (`/server.ts`)**:
  - Add a helper in `server.ts` that inspects each TMDB item's `original_language` (`"zh"`, `"cn"`, `"yue"`, `"bo"`) or `origin_country` (`"CN"`, `"HK"`, `"TW"`) and `original_title` / `original_name`.
  - When a movie or TV show is Chinese-origin and its `original_title` / `original_name` contains Chinese characters, convert it to Simplified Chinese (`toSimplifiedChinese`) and set it as the primary `title` / `name` returned by `/api/tmdb/trending/*`, `/api/tmdb/discover/*`, `/api/tmdb/search`, and `/api/tmdb/:type/:id`, while preserving the English title in `en_title` for the secondary `/ English Name` display on the Player page.
- **Player Header Display (`/src/pages/Player.tsx`)**:
  - For Chinese-origin media, display the Chinese name as the primary bold title (`title`) and the English name (if distinct) as the secondary `/ English Title` alongside it. For non-Chinese media, keep `English Title / 中文名`.

## 4. "HK" Category in Trending TV Shows (`/src/pages/Home.tsx` & `/server.ts`)
- **Trending TV Categories (`/src/pages/Home.tsx`)**:
  - Insert `{ id: "hk", label: "HK" }` right after `All` in `TV_CATEGORIES` to keep the pill label compact:
    `All`, `HK`, `Drama`, `Sci-Fi`, `Action`, `Comedy`, `Animation`, `Crime`, `Mystery`.
- **Backend HK Drama Discovery (`/server.ts`)**:
  - Update `/api/tmdb/trending/tv` so when `genre === "hk"`, it queries TMDB for recent trending Hong Kong dramas (`/discover/tv?sort_by=popularity.desc&with_origin_country=HK&first_air_date.gte=<recent_cutoff>&vote_count.gte=1`, falling back/combining with popular HK dramas so a full grid of playable HK dramas is returned).

## 5. Silent Click-to-Copy for English & Chinese Titles (`/src/pages/Player.tsx`)
- In the `<h1>` title block on the Movie/TV Player page:
  - Keep the exact same typography, colors, and default cursor (`select-none`, no pointer cursor, no button borders or hover effects).
  - Attach an `onClick` handler to the primary title `<span>` that copies its exact text to `navigator.clipboard.writeText(...)` silently.
  - Attach a separate `onClick` handler to the secondary title `<span>` (excluding the `/ ` separator) that copies only the secondary title text to the clipboard silently.
