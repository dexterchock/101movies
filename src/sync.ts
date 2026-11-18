import type { MediaItem } from "./types";

const WATCH_HISTORY_KEY = "watch_history";
const WATCH_LATER_KEY = "watch_later";
const SYNC_GROUP_ID_KEY = "sync_group_id";
const SYNC_UPDATED_AT_KEY = "sync_updated_at";
const PENDING_GROUP_ID_KEY = "sync_pending_group_id";

const PULL_THROTTLE_MS = 15_000;
const PROGRESS_SYNC_INTERVAL_MS = 30_000;

let lastPullAt = 0;
let pullPromise: Promise<boolean> | null = null;

let lastProgressPushAt = 0;
let progressDirty = false;
let progressSyncTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleListenersAttached = false;

function readJsonArray(key: string): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, items: MediaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length > 0) {
      localStorage.setItem(key, JSON.stringify(items));
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}

function getLocalUpdatedAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(SYNC_UPDATED_AT_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function setLocalUpdatedAt(ts?: number): void {
  if (typeof window === "undefined" || !ts || !Number.isFinite(ts)) return;
  try {
    localStorage.setItem(SYNC_UPDATED_AT_KEY, String(ts));
  } catch {}
}

function notifySyncUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sync-state-updated"));
}

export function getSyncGroupId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(SYNC_GROUP_ID_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function isDeviceSynced(): boolean {
  return Boolean(getSyncGroupId());
}

function getPendingGroupId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PENDING_GROUP_ID_KEY);
  } catch {
    return null;
  }
}

function setPendingGroupId(groupId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (groupId) {
      sessionStorage.setItem(PENDING_GROUP_ID_KEY, groupId);
    } else {
      sessionStorage.removeItem(PENDING_GROUP_ID_KEY);
    }
  } catch {}
}

export interface SyncCodeResponse {
  code: string;
  groupId: string;
  expiresAt: number;
  paired: boolean;
}

export async function requestSyncCode(signal?: AbortSignal): Promise<SyncCodeResponse> {
  const existingGroupId = getSyncGroupId() || getPendingGroupId() || undefined;
  const history = readJsonArray(WATCH_HISTORY_KEY);
  const saved = readJsonArray(WATCH_LATER_KEY);

  const res = await fetch("/api/sync/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      groupId: existingGroupId,
      history,
      saved,
    }),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    groupId?: string;
    expiresAt?: number;
    paired?: boolean;
    error?: string;
  };

  if (!res.ok || !data.ok || !data.code || !data.groupId || !data.expiresAt) {
    throw new Error(data.error || "Failed to generate pairing code");
  }

  if (!data.paired && !getSyncGroupId()) {
    setPendingGroupId(data.groupId);
  }

  return {
    code: data.code,
    groupId: data.groupId,
    expiresAt: data.expiresAt,
    paired: Boolean(data.paired),
  };
}

export async function checkPendingGroupPaired(
  pendingGroupId: string,
  signal?: AbortSignal
): Promise<boolean> {
  if (!pendingGroupId || isDeviceSynced()) return isDeviceSynced();
  try {
    const res = await fetch(
      `/api/sync/state?groupId=${encodeURIComponent(pendingGroupId)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      ok?: boolean;
      paired?: boolean;
      history?: MediaItem[];
      saved?: MediaItem[];
      updatedAt?: number;
    };
    if (!data.ok || !data.paired) return false;

    localStorage.setItem(SYNC_GROUP_ID_KEY, pendingGroupId);
    setPendingGroupId(null);
    if (Array.isArray(data.history)) writeJsonArray(WATCH_HISTORY_KEY, data.history);
    if (Array.isArray(data.saved)) writeJsonArray(WATCH_LATER_KEY, data.saved);
    setLocalUpdatedAt(data.updatedAt);
    notifySyncUpdated();
    return true;
  } catch {
    return false;
  }
}

export async function pairWithSyncCode(
  rawCode: string,
  signal?: AbortSignal
): Promise<{ ok: boolean; error?: string }> {
  const code = rawCode.replace(/\D/g, "");
  if (!/^\d{4}$/.test(code)) {
    return { ok: false, error: "Please enter a 4-digit code." };
  }

  try {
    const history = readJsonArray(WATCH_HISTORY_KEY);
    const saved = readJsonArray(WATCH_LATER_KEY);

    const res = await fetch("/api/sync/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, history, saved }),
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      groupId?: string;
      history?: MediaItem[];
      saved?: MediaItem[];
      updatedAt?: number;
      error?: string;
    };

    if (!res.ok || !data.ok || !data.groupId) {
      return { ok: false, error: data.error || "Invalid or expired code." };
    }

    localStorage.setItem(SYNC_GROUP_ID_KEY, data.groupId);
    setPendingGroupId(null);
    if (Array.isArray(data.history)) writeJsonArray(WATCH_HISTORY_KEY, data.history);
    if (Array.isArray(data.saved)) writeJsonArray(WATCH_LATER_KEY, data.saved);
    setLocalUpdatedAt(data.updatedAt);
    lastPullAt = Date.now();
    notifySyncUpdated();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error while pairing. Please try again." };
  }
}

export async function pullSyncState(force = false): Promise<boolean> {
  const groupId = getSyncGroupId();
  if (!groupId || progressDirty) return false;

  const now = Date.now();
  if (!force && now - lastPullAt < PULL_THROTTLE_MS) {
    return false;
  }
  if (pullPromise) return pullPromise;

  pullPromise = (async () => {
    try {
      const since = getLocalUpdatedAt();
      const qs = since > 0 ? `&since=${since}` : "";
      const res = await fetch(
        `/api/sync/state?groupId=${encodeURIComponent(groupId)}${qs}`,
        { cache: "no-store" }
      );
      lastPullAt = Date.now();
      if (!res.ok) return false;

      const data = (await res.json()) as {
        ok?: boolean;
        unchanged?: boolean;
        history?: MediaItem[];
        saved?: MediaItem[];
        updatedAt?: number;
      };
      if (!data.ok || data.unchanged) return false;

      if (progressDirty) return false;
      if (Array.isArray(data.history)) writeJsonArray(WATCH_HISTORY_KEY, data.history);
      if (Array.isArray(data.saved)) writeJsonArray(WATCH_LATER_KEY, data.saved);
      setLocalUpdatedAt(data.updatedAt);
      notifySyncUpdated();
      return true;
    } catch {
      return false;
    } finally {
      pullPromise = null;
    }
  })();

  return pullPromise;
}

export interface PushSyncOptions {
  history?: MediaItem[];
  saved?: MediaItem[];
  historyMode?: "merge" | "replace";
  savedMode?: "merge" | "replace";
  keepalive?: boolean;
}

export async function pushSyncState(opts: PushSyncOptions): Promise<boolean> {
  const groupId = getSyncGroupId();
  if (!groupId) return false;

  try {
    const res = await fetch("/api/sync/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: Boolean(opts.keepalive),
      body: JSON.stringify({
        groupId,
        history: opts.history,
        saved: opts.saved,
        historyMode: opts.historyMode,
        savedMode: opts.savedMode,
      }),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as {
      ok?: boolean;
      history?: MediaItem[];
      saved?: MediaItem[];
      updatedAt?: number;
    };
    if (!data.ok) return false;

    if (opts.historyMode === "merge" && Array.isArray(data.history)) {
      writeJsonArray(WATCH_HISTORY_KEY, data.history);
    }
    if (opts.savedMode === "merge" && Array.isArray(data.saved)) {
      writeJsonArray(WATCH_LATER_KEY, data.saved);
    }
    setLocalUpdatedAt(data.updatedAt);
    lastPullAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

function attachPagehideFlush(): void {
  if (lifecycleListenersAttached || typeof window === "undefined") return;
  lifecycleListenersAttached = true;
  window.addEventListener("pagehide", () => {
    flushHistoryProgressSync(true);
  });
}

export function queueHistoryProgressSync(immediate = false): void {
  if (!isDeviceSynced()) return;
  attachPagehideFlush();
  progressDirty = true;

  const now = Date.now();
  const elapsed = now - lastProgressPushAt;

  if (immediate || elapsed >= PROGRESS_SYNC_INTERVAL_MS) {
    flushHistoryProgressSync(false);
    return;
  }

  if (!progressSyncTimer) {
    const waitMs = Math.max(1000, PROGRESS_SYNC_INTERVAL_MS - elapsed);
    progressSyncTimer = setTimeout(() => {
      progressSyncTimer = null;
      if (progressDirty) {
        flushHistoryProgressSync(false);
      }
    }, waitMs);
  }
}

export function flushHistoryProgressSync(keepalive = false): void {
  if (progressSyncTimer) {
    clearTimeout(progressSyncTimer);
    progressSyncTimer = null;
  }
  if (!progressDirty || !isDeviceSynced()) {
    progressDirty = false;
    return;
  }
  progressDirty = false;
  lastProgressPushAt = Date.now();
  const history = readJsonArray(WATCH_HISTORY_KEY);
  void pushSyncState({
    history,
    historyMode: "merge",
    keepalive,
  });
}

export function disconnectSync(mode: "keep" | "clear"): void {
  if (progressSyncTimer) {
    clearTimeout(progressSyncTimer);
    progressSyncTimer = null;
  }
  progressDirty = false;
  lastPullAt = 0;

  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SYNC_GROUP_ID_KEY);
    localStorage.removeItem(SYNC_UPDATED_AT_KEY);
  } catch {}
  setPendingGroupId(null);

  if (mode === "clear") {
    try {
      localStorage.removeItem(WATCH_HISTORY_KEY);
      localStorage.removeItem(WATCH_LATER_KEY);
    } catch {}
  }

  notifySyncUpdated();
}
