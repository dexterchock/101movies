import { handlePairSyncCode, type SyncEnv } from "../../_shared/syncService";

export const onRequestPost: PagesFunction<SyncEnv> = async (context) => {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handlePairSyncCode(context.env, body);
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("Failed to pair sync code:", err);
    return Response.json(
      { ok: false, error: err?.message || "Failed to pair device" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};
