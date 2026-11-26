import { resolveSettings } from "./resolve";
import type { FlatSettings, Setting, SettingDefinition, SettingPair } from "./types";

export interface SettingsSnapshot {
  definitions: SettingDefinition[];
  values: FlatSettings;
  dynamicOptions: FlatSettings;
}

interface SettingsState {
  settings: Setting[];
  dynamicOptions: FlatSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: unknown;
}

interface SettingsAccess {
  read: () => Promise<Pick<SettingsSnapshot, "values" | "dynamicOptions">>;
  write: (pairs: SettingPair[]) => Promise<boolean>;
  onError: (error: unknown, saved: boolean) => void | Promise<unknown>;
}

export function createSettingsStore(initial: SettingsSnapshot, access: SettingsAccess) {
  let state: SettingsState = {
    settings: resolveSettings(initial.definitions, initial.values, initial.dynamicOptions),
    dynamicOptions: initial.dynamicOptions,
    isLoading: false,
    isSaving: false,
    error: undefined,
  };
  const listeners = new Set<() => void>();
  let pendingRead: Promise<boolean> | undefined;

  function update(patch: Partial<SettingsState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  function refresh(saved = false): Promise<boolean> {
    if (pendingRead) return pendingRead;
    update({ isLoading: true });
    pendingRead = (async () => {
      try {
        const next = await access.read();
        update({
          settings: resolveSettings(initial.definitions, next.values, next.dynamicOptions),
          dynamicOptions: next.dynamicOptions,
          error: undefined,
        });
        return true;
      } catch (error) {
        update({ error });
        await access.onError(error, saved);
        return false;
      } finally {
        pendingRead = undefined;
        update({ isLoading: false });
      }
    })();
    return pendingRead;
  }

  async function save(pairs: SettingPair[]): Promise<boolean> {
    if (state.isSaving || state.isLoading || state.error || pairs.length === 0) return false;
    update({ isSaving: true });
    try {
      if (!(await access.write(pairs))) return false;
      await refresh(true);
      return true;
    } finally {
      update({ isSaving: false });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    save,
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
