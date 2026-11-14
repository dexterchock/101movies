import {
  clearWatchHistory,
  loadWatchHistory,
  removeFromWatchHistory,
} from "../utils";
import type { ViewCleanup } from "./Home";
import { mountSavedCollection } from "./SavedCollection";

export function mount(container: HTMLElement): ViewCleanup {
  return mountSavedCollection(container, {
    filterAriaLabel: "History Filter",
    storagePrefix: "history",
    clearTitle: "Clear History",
    removeLabel: "Remove from history",
    emptyAllTitle: "No watch history yet",
    emptyAllDesc:
      "Start watching a movie or show to pick up right where you left off.",
    emptyFilteredTitle: (f) =>
      f === "tv" ? "No shows in watch history" : "No movies in watch history",
    emptyFilteredDesc:
      "Try switching the filter tab or watching more titles.",
    loadItems: loadWatchHistory,
    clearItems: clearWatchHistory,
    removeItem: removeFromWatchHistory,
  });
}
