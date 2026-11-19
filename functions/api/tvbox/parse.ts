import {
  getAllVodSites,
  parseTvboxConfig,
} from "../../_shared/tvboxService";
import { validateProxyTargetUrl } from "../../_shared/vodProxy";

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as {
      url?: string;
      name?: string;
    };
    const { url, name } = body || {};
    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "Missing TVBox configuration URL" },
        { status: 400 }
      );
    }
    const validation = validateProxyTargetUrl(url.trim());
    if ("reason" in validation) {
      return Response.json({ error: validation.reason }, { status: 400 });
    }
    const result = await parseTvboxConfig(
      validation.url.toString(),
      name || "Custom TVBox"
    );
    return Response.json({
      result,
      sites: getAllVodSites(),
    });
  } catch (err: any) {
    console.error("TVBox parse failed:", err);
    return Response.json(
      { error: err?.message || "Failed to parse TVBox config" },
      { status: 500 }
    );
  }
};
