import { t } from "../i18n";
import {
  clearWatchLater,
  loadWatchLater,
  removeFromWatchLater,
} from "../utils";
import type { ViewCleanup } from "./Home";
import { mountSavedCollection } from "./SavedCollection";

export function mount(container: HTMLElement): ViewCleanup {
  return mountSavedCollection(container, {
    filterAriaLabel: t("saved.filterAria"),
    storagePrefix: "watch_later",
    clearTitle: t("saved.clearTitle"),
    removeLabel: t("saved.removeLabel"),
    emptyAllTitle: t("saved.emptyAllTitle"),
    emptyAllDesc: t("saved.emptyAllDesc"),
    emptyFilteredTitle: (f) =>
      f === "tv" ? t("saved.emptyShowsTitle") : t("saved.emptyMoviesTitle"),
    emptyFilteredDesc: t("saved.emptyFilteredDesc"),
    loadItems: loadWatchLater,
    clearItems: clearWatchLater,
    removeItem: removeFromWatchLater,
  });
}
