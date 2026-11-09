import {
  AWESOME_ZHUIJU_TVBOX_CONFIGS,
  getAllVodSites,
} from "../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async () => {
  return Response.json({
    configs: AWESOME_ZHUIJU_TVBOX_CONFIGS,
    sites: getAllVodSites(),
  });
};
