import type { MediaItem, WatchProgress } from "../../src/types";

export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
const MAX_HISTORY_ITEMS = 20;
const MAX_SAVED_ITEMS = 60;

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface SyncEnv {
  DB?: D1DatabaseLike;
}

interface SyncGroupRow {
  group_id: string;
  history_json: string;
  saved_json: string;
  paired: number;
  updated_at: number;
}

interface SyncCodeRow {
  code: string;
  group_id: string;
  expires_at: number;
}

interface MemoryStore {
  groups: Map<string, SyncGroupRow>;
  codes: Map<string, SyncCodeRow>;
}

const MEM_KEY = "__101movies_sync_memory_store__";

function getMemoryStore(): MemoryStore {
  const g = globalThis as Record<string, unknown>;
  if (!g[MEM_KEY]) {
    g[MEM_KEY] = {
      groups: new Map<string, SyncGroupRow>(),
      codes: new Map<string, SyncCodeRow>(),
    } satisfies MemoryStore;
  }
  return g[MEM_KEY] as MemoryStore;
}

function resolveItemType(item: MediaItem): "movie" | "tv" {
  return item.media_type === "tv" || (!item.media_type && !item.title && Boolean(item.name))
    ? "tv"
    : "movie";
}

function getItemKey(item: MediaItem): string {
  return `${resolveItemType(item)}_${String(item.id)}`;
}

function sanitizeWatchProgress(raw: unknown): WatchProgress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const wp = raw as Record<string, unknown>;
  const clean: WatchProgress = {};
  if (typeof wp.sourceId === "string" && wp.sourceId) clean.sourceId = wp.sourceId;
  if (typeof wp.seasonNumber === "number" && Number.isFinite(wp.seasonNumber)) {
    clean.seasonNumber = wp.seasonNumber;
  }
  if (typeof wp.seasonIndex === "number" && Number.isFinite(wp.seasonIndex)) {
    clean.seasonIndex = wp.seasonIndex;
  }
  if (typeof wp.episodeIndex === "number" && Number.isFinite(wp.episodeIndex)) {
    clean.episodeIndex = wp.episodeIndex;
  }
  if (typeof wp.episodeLabel === "string" && wp.episodeLabel) {
    clean.episodeLabel = wp.episodeLabel;
  }
  if (typeof wp.currentTime === "number" && Number.isFinite(wp.currentTime)) {
    clean.currentTime = wp.currentTime;
  }
  if (typeof wp.duration === "number" && Number.isFinite(wp.duration)) {
    clean.duration = wp.duration;
  }
  if (typeof wp.updatedAt === "number" && Number.isFinite(wp.updatedAt)) {
    clean.updatedAt = wp.updatedAt;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function sanitizeMediaItem(raw: unknown): MediaItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const idNum = Number(r.id);
  if (!Number.isFinite(idNum) || idNum <= 0) return null;

  const mediaType: "movie" | "tv" =
    r.media_type === "tv" || (!r.media_type && !r.title && typeof r.name === "string")
      ? "tv"
      : "movie";

  const clean: MediaItem = {
    id: idNum,
    poster_path: typeof r.poster_path === "string" ? r.poster_path : null,
    backdrop_path: typeof r.backdrop_path === "string" ? r.backdrop_path : null,
    overview: typeof r.overview === "string" ? r.overview : "",
    vote_average:
      typeof r.vote_average === "number" && Number.isFinite(r.vote_average)
        ? r.vote_average
        : 0,
    media_type: mediaType,
  };

  if (typeof r.title === "string") clean.title = r.title;
  if (typeof r.name === "string") clean.name = r.name;
  if (typeof r.en_title === "string") clean.en_title = r.en_title;
  if (typeof r.zh_title === "string") clean.zh_title = r.zh_title;
  if (typeof r.is_chinese_origin === "boolean") {
    clean.is_chinese_origin = r.is_chinese_origin;
  }
  if (typeof r.release_date === "string") clean.release_date = r.release_date;
  if (typeof r.first_air_date === "string") clean.first_air_date = r.first_air_date;

  const wp = sanitizeWatchProgress(r.watchProgress);
  if (wp) clean.watchProgress = wp;
  return clean;
}

export function sanitizeMediaList(raw: unknown, limit: number): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const entry of raw) {
    const clean = sanitizeMediaItem(entry);
    if (!clean) continue;
    const key = getItemKey(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function mergeItemMetadata(primary: MediaItem, secondary: MediaItem): MediaItem {
  return {
    ...secondary,
    ...primary,
    poster_path: primary.poster_path || secondary.poster_path || null,
    backdrop_path: primary.backdrop_path || secondary.backdrop_path || null,
    overview: primary.overview || secondary.overview || "",
    en_title: primary.en_title || secondary.en_title,
    zh_title: primary.zh_title || secondary.zh_title,
    title: primary.title || secondary.title,
    name: primary.name || secondary.name,
    vote_average: primary.vote_average || secondary.vote_average || 0,
    watchProgress: primary.watchProgress || secondary.watchProgress,
  };
}

export function mergeHistoryItems(a: MediaItem[], b: MediaItem[]): MediaItem[] {
  const map = new Map<string, { item: MediaItem; updatedAt: number; order: number }>();
  let orderCounter = 0;

  const ingest = (list: MediaItem[]) => {
    for (const rawItem of list) {
      const item = sanitizeMediaItem(rawItem);
      if (!item) continue;
      const key = getItemKey(item);
      const ts = item.watchProgress?.updatedAt ?? 0;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { item, updatedAt: ts, order: orderCounter++ });
      } else {
        const primary = ts > existing.updatedAt ? item : existing.item;
        const secondary = primary === item ? existing.item : item;
        map.set(key, {
          item: mergeItemMetadata(primary, secondary),
          updatedAt: Math.max(ts, existing.updatedAt),
          order: Math.min(existing.order, orderCounter++),
        });
      }
    }
  };

  ingest(a);
  ingest(b);

  return Array.from(map.values())
    .sort((x, y) => {
      if (y.updatedAt !== x.updatedAt) return y.updatedAt - x.updatedAt;
      return x.order - y.order;
    })
    .slice(0, MAX_HISTORY_ITEMS)
    .map((entry) => entry.item);
}

export function mergeSavedItems(a: MediaItem[], b: MediaItem[]): MediaItem[] {
  const map = new Map<string, MediaItem>();
  const maxLen = Math.max(a.length, b.length);
  const add = (rawItem: MediaItem | undefined) => {
    if (!rawItem) return;
    const item = sanitizeMediaItem(rawItem);
    if (!item) return;
    const key = getItemKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      map.set(key, mergeItemMetadata(existing, item));
    }
  };

  for (let i = 0; i < maxLen; i++) {
    add(a[i]);
    add(b[i]);
  }

  return Array.from(map.values()).slice(0, MAX_SAVED_ITEMS);
}

function parseStoredList(json: string | undefined, limit: number): MediaItem[] {
  if (!json) return [];
  try {
    return sanitizeMediaList(JSON.parse(json), limit);
  } catch {
    return [];
  }
}

function generateGroupId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateFourDigitCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10000).padStart(4, "0");
}

async function dbGetGroup(env: SyncEnv, groupId: string): Promise<SyncGroupRow | null> {
  if (!env?.DB) {
    return getMemoryStore().groups.get(groupId) || null;
  }
  return env.DB.prepare(
    "SELECT group_id, history_json, saved_json, paired, updated_at FROM sync_groups WHERE group_id = ?"
  )
    .bind(groupId)
    .first<SyncGroupRow>();
}

async function dbUpsertGroup(env: SyncEnv, row: SyncGroupRow): Promise<void> {
  if (!env?.DB) {
    getMemoryStore().groups.set(row.group_id, row);
    return;
  }
  await env.DB.prepare(
    `INSERT INTO sync_groups (group_id, history_json, saved_json, paired, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(group_id) DO UPDATE SET
       history_json = excluded.history_json,
       saved_json = excluded.saved_json,
       paired = excluded.paired,
       updated_at = excluded.updated_at`
  )
    .bind(row.group_id, row.history_json, row.saved_json, row.paired, row.updated_at)
    .run();
}

async function dbDeleteExpiredCodes(env: SyncEnv, now: number): Promise<void> {
  if (!env?.DB) {
    const store = getMemoryStore();
    for (const [k, v] of store.codes.entries()) {
      if (v.expires_at <= now) store.codes.delete(k);
    }
    return;
  }
  await env.DB.prepare("DELETE FROM sync_codes WHERE expires_at <= ?").bind(now).run();
}

async function dbGetCode(env: SyncEnv, code: string): Promise<SyncCodeRow | null> {
  if (!env?.DB) {
    return getMemoryStore().codes.get(code) || null;
  }
  return env.DB.prepare(
    "SELECT code, group_id, expires_at FROM sync_codes WHERE code = ?"
  )
    .bind(code)
    .first<SyncCodeRow>();
}

async function dbDeleteCode(env: SyncEnv, code: string): Promise<void> {
  if (!env?.DB) {
    getMemoryStore().codes.delete(code);
    return;
  }
  await env.DB.prepare("DELETE FROM sync_codes WHERE code = ?").bind(code).run();
}

async function dbInsertUniqueCode(
  env: SyncEnv,
  groupId: string,
  expiresAt: number
): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = generateFourDigitCode();
    if (!env?.DB) {
      const store = getMemoryStore();
      if (!store.codes.has(code)) {
        store.codes.set(code, { code, group_id: groupId, expires_at: expiresAt });
        return code;
      }
      continue;
    }

    const existing = await dbGetCode(env, code);
    if (!existing) {
      try {
        await env.DB.prepare(
          "INSERT INTO sync_codes (code, group_id, expires_at) VALUES (?, ?, ?)"
        )
          .bind(code, groupId, expiresAt)
          .run();
        return code;
      } catch {
        // Retry if another concurrent request claimed the same 4-digit code
      }
    }
  }
  throw new Error("Unable to allocate unique 4-digit pairing code");
}

export interface SyncHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleCreateSyncCode(
  env: SyncEnv,
  rawBody: unknown
): Promise<SyncHandlerResult> {
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as {
    groupId?: unknown;
    history?: unknown;
    saved?: unknown;
  };

  const now = Date.now();
  const expiresAt = now + PAIRING_CODE_TTL_MS;
  const incomingHistory = sanitizeMediaList(body.history, MAX_HISTORY_ITEMS);
  const incomingSaved = sanitizeMediaList(body.saved, MAX_SAVED_ITEMS);
  const requestedGroupId =
    typeof body.groupId === "string" ? body.groupId.trim() : "";

  await dbDeleteExpiredCodes(env, now);

  let row: SyncGroupRow | null = requestedGroupId
    ? await dbGetGroup(env, requestedGroupId)
    : null;

  if (row) {
    const mergedHistory = mergeHistoryItems(
      parseStoredList(row.history_json, MAX_HISTORY_ITEMS),
      incomingHistory
    );
    const mergedSaved = mergeSavedItems(
      parseStoredList(row.saved_json, MAX_SAVED_ITEMS),
      incomingSaved
    );
    row = {
      group_id: row.group_id,
      history_json: JSON.stringify(mergedHistory),
      saved_json: JSON.stringify(mergedSaved),
      paired: row.paired,
      updated_at: now,
    };
  } else {
    row = {
      group_id: requestedGroupId || generateGroupId(),
      history_json: JSON.stringify(incomingHistory),
      saved_json: JSON.stringify(incomingSaved),
      paired: 0,
      updated_at: now,
    };
  }

  await dbUpsertGroup(env, row);
  const code = await dbInsertUniqueCode(env, row.group_id, expiresAt);

  return {
    status: 200,
    body: {
      ok: true,
      code,
      groupId: row.group_id,
      expiresAt,
      paired: Boolean(row.paired),
    },
  };
}

export async function handlePairSyncCode(
  env: SyncEnv,
  rawBody: unknown
): Promise<SyncHandlerResult> {
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as {
    code?: unknown;
    history?: unknown;
    saved?: unknown;
  };

  const code = String(body.code || "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(code)) {
    return {
      status: 400,
      body: { ok: false, error: "Please enter a valid 4-digit code." },
    };
  }

  const now = Date.now();
  const codeRow = await dbGetCode(env, code);
  if (!codeRow || codeRow.expires_at <= now) {
    if (codeRow) {
      await dbDeleteCode(env, code);
    }
    return {
      status: 400,
      body: { ok: false, error: "Code is invalid or has expired." },
    };
  }

  const targetRow = await dbGetGroup(env, codeRow.group_id);
  if (!targetRow) {
    await dbDeleteCode(env, code);
    return {
      status: 404,
      body: { ok: false, error: "Sync session not found." },
    };
  }

  const existingHistory = parseStoredList(targetRow.history_json, MAX_HISTORY_ITEMS);
  const existingSaved = parseStoredList(targetRow.saved_json, MAX_SAVED_ITEMS);
  const incomingHistory = sanitizeMediaList(body.history, MAX_HISTORY_ITEMS);
  const incomingSaved = sanitizeMediaList(body.saved, MAX_SAVED_ITEMS);

  const mergedHistory = mergeHistoryItems(existingHistory, incomingHistory);
  const mergedSaved = mergeSavedItems(existingSaved, incomingSaved);

  const updatedRow: SyncGroupRow = {
    group_id: targetRow.group_id,
    history_json: JSON.stringify(mergedHistory),
    saved_json: JSON.stringify(mergedSaved),
    paired: 1,
    updated_at: now,
  };

  await dbUpsertGroup(env, updatedRow);
  await dbDeleteCode(env, code);

  return {
    status: 200,
    body: {
      ok: true,
      groupId: updatedRow.group_id,
      paired: true,
      history: mergedHistory,
      saved: mergedSaved,
      updatedAt: now,
    },
  };
}

export async function handleGetSyncState(
  env: SyncEnv,
  groupIdRaw: string,
  sinceRaw?: string | null
): Promise<SyncHandlerResult> {
  const groupId = String(groupIdRaw || "").trim();
  if (!groupId) {
    return { status: 400, body: { ok: false, error: "Missing groupId" } };
  }

  const row = await dbGetGroup(env, groupId);
  if (!row) {
    return { status: 404, body: { ok: false, error: "Sync group not found" } };
  }

  const since = sinceRaw ? Number(sinceRaw) : 0;
  if (Number.isFinite(since) && since > 0 && row.updated_at <= since) {
    return {
      status: 200,
      body: {
        ok: true,
        unchanged: true,
        groupId: row.group_id,
        paired: Boolean(row.paired),
        updatedAt: row.updated_at,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      unchanged: false,
      groupId: row.group_id,
      paired: Boolean(row.paired),
      history: parseStoredList(row.history_json, MAX_HISTORY_ITEMS),
      saved: parseStoredList(row.saved_json, MAX_SAVED_ITEMS),
      updatedAt: row.updated_at,
    },
  };
}

export async function handleUpdateSyncState(
  env: SyncEnv,
  rawBody: unknown
): Promise<SyncHandlerResult> {
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as {
    groupId?: unknown;
    history?: unknown;
    saved?: unknown;
    historyMode?: unknown;
    savedMode?: unknown;
  };

  const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
  if (!groupId) {
    return { status: 400, body: { ok: false, error: "Missing groupId" } };
  }

  const row = await dbGetGroup(env, groupId);
  if (!row) {
    return { status: 404, body: { ok: false, error: "Sync group not found" } };
  }

  let nextHistory = parseStoredList(row.history_json, MAX_HISTORY_ITEMS);
  let nextSaved = parseStoredList(row.saved_json, MAX_SAVED_ITEMS);

  if (body.history !== undefined) {
    const incoming = sanitizeMediaList(body.history, MAX_HISTORY_ITEMS);
    nextHistory =
      body.historyMode === "replace"
        ? incoming
        : mergeHistoryItems(nextHistory, incoming);
  }

  if (body.saved !== undefined) {
    const incoming = sanitizeMediaList(body.saved, MAX_SAVED_ITEMS);
    nextSaved =
      body.savedMode === "replace"
        ? incoming
        : mergeSavedItems(nextSaved, incoming);
  }

  const now = Date.now();
  const updatedRow: SyncGroupRow = {
    group_id: row.group_id,
    history_json: JSON.stringify(nextHistory),
    saved_json: JSON.stringify(nextSaved),
    paired: row.paired,
    updated_at: now,
  };

  await dbUpsertGroup(env, updatedRow);

  return {
    status: 200,
    body: {
      ok: true,
      groupId: updatedRow.group_id,
      paired: Boolean(updatedRow.paired),
      history: nextHistory,
      saved: nextSaved,
      updatedAt: now,
    },
  };
}
