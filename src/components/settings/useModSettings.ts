import { useEffect, useSyncExternalStore } from "react";
import { showError } from "@chrismessina/raycast-kit";
import { readSettings } from "../../settings/api";
import { createSettingsStore, type SettingsSnapshot, type SettingsStore } from "../../settings/store";
import { setModSettings } from "../../utils/actions";

export function createModSettingsStore(modId: string, initial: SettingsSnapshot) {
  return createSettingsStore(initial, {
    read: () => readSettings(modId),
    write: (pairs) => setModSettings(modId, pairs),
    onError: (error, saved) =>
      showError(error, {
        title: saved ? "Settings saved, refresh failed" : "Could not load settings",
        copyContext: `Mod: ${modId}`,
      }),
  });
}

export function useModSettings(store: SettingsStore, refreshOnMount = false) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    if (refreshOnMount) void store.refresh();
  }, [store, refreshOnMount]);
  return state;
}
