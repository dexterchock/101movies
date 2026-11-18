import {
  handleGetSyncState,
  handleUpdateSyncState,
  type SyncEnv,
} from "../../_shared/syncService";

export const onRequestGet: PagesFunction<SyncEnv> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const groupId = url.searchParams.get("groupId") || "";
    const since = url.searchParams.get("since");
    const result = await handleGetSyncState(context.env, groupId, since);
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("Failed to fetch sync state:", err);
    return Response.json(
      { ok: false, error: err?.message || "Failed to load sync state" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};

export const onRequestPost: PagesFunction<SyncEnv> = async (context) => {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleUpdateSyncState(context.env, body);
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("Failed to update sync state:", err);
    return Response.json(
      { ok: false, error: err?.message || "Failed to update sync state" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};
