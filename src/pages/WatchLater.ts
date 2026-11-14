import {
  clearWatchLater,
  loadWatchLater,
  removeFromWatchLater,
} from "../utils";
import type { ViewCleanup } from "./Home";
import { mountSavedCollection } from "./SavedCollection";

export function mount(container: HTMLElement): ViewCleanup {
  return mountSavedCollection(container, {
    filterAriaLabel: "Watch Later Filter",
    storagePrefix: "watch_later",
    clearTitle: "Clear Watch Later",
    removeLabel: "Remove from Watch Later",
    emptyAllTitle: "No saved titles yet",
    emptyAllDesc:
      "Open any movie or show and click Watch Later to save it without watching.",
    emptyFilteredTitle: (f) =>
      f === "tv" ? "No shows in Watch Later" : "No movies in Watch Later",
    emptyFilteredDesc:
      "Try switching the filter tab or saving more titles from their detail page.",
    loadItems: loadWatchLater,
    clearItems: clearWatchLater,
    removeItem: removeFromWatchLater,
  });
}
