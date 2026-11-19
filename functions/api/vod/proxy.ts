import { handleVodProxyRequest } from "../../_shared/vodProxy";

export const onRequestGet: PagesFunction = async (context) => {
  const reqUrl = new URL(context.request.url);
  return handleVodProxyRequest({
    targetUrl: reqUrl.searchParams.get("url") || "",
    reqOrigin: reqUrl.origin,
    rangeHeader: context.request.headers.get("Range"),
  });
};
