import {
  clearWatchLater,
  loadWatchLater,
  removeFromWatchLater,
} from "../utils";
import type { ViewCleanup } from "./Home";
import { mountSavedCollection } from "./SavedCollection";

export function mount(container: HTMLElement): ViewCleanup {
  return mountSavedCollection(container, {
    filterAriaLabel: "Saved Filter",
    storagePrefix: "watch_later",
    clearTitle: "Clear Saved",
    removeLabel: "Remove from saved",
    emptyAllTitle: "No saved titles yet",
    emptyAllDesc:
      "Open any movie or show and click Save to add it here.",
    emptyFilteredTitle: (f) =>
      f === "tv" ? "No saved shows" : "No saved movies",
    emptyFilteredDesc:
      "Try switching the filter tab or saving more titles from their detail page.",
    loadItems: loadWatchLater,
    clearItems: clearWatchLater,
    removeItem: removeFromWatchLater,
  });
}
