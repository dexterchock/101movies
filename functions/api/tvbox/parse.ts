import {
  getAllVodSites,
  parseTvboxConfig,
} from "../../_shared/tvboxService";

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
    const result = await parseTvboxConfig(url.trim(), name || "Custom TVBox");
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
