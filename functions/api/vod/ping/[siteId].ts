import { pingVodSite } from "../../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async (context) => {
  const siteId = String(context.params.siteId || "");
  if (!siteId) {
    return Response.json({ ok: false, error: "Missing site ID" }, { status: 400 });
  }

  const status = await pingVodSite(siteId);
  return Response.json(status);
};
