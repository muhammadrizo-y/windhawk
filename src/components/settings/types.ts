import type { Setting } from "../../settings/types";
import type { SettingsStore } from "../../settings/store";

export interface SettingItemProps<T extends Setting = Setting> {
  setting: T;
  store: SettingsStore;
  showDetail: boolean;
  onToggleDetails: () => void;
}
