import { t } from "../i18n";
import {
  clearWatchHistory,
  loadWatchHistory,
  removeFromWatchHistory,
} from "../utils";
import type { ViewCleanup } from "./Home";
import { mountSavedCollection } from "./SavedCollection";

export function mount(container: HTMLElement): ViewCleanup {
  return mountSavedCollection(container, {
    filterAriaLabel: t("history.filterAria"),
    storagePrefix: "history",
    clearTitle: t("history.clearTitle"),
    removeLabel: t("history.removeLabel"),
    emptyAllTitle: t("history.emptyAllTitle"),
    emptyAllDesc: t("history.emptyAllDesc"),
    emptyFilteredTitle: (f) =>
      f === "tv" ? t("history.emptyShowsTitle") : t("history.emptyMoviesTitle"),
    emptyFilteredDesc: t("history.emptyFilteredDesc"),
    loadItems: loadWatchHistory,
    clearItems: clearWatchHistory,
    removeItem: removeFromWatchHistory,
  });
}
