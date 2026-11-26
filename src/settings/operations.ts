import { entryPath } from "./paths";
import type { ScalarSetting, Setting, SettingPair } from "./types";

export function isScalar(setting: Setting): setting is ScalarSetting {
  return (
    setting.kind === "boolean" || setting.kind === "number" || setting.kind === "text" || setting.kind === "select"
  );
}

export function isEmptySetting(setting: Setting): boolean {
  switch (setting.kind) {
    case "group":
      return setting.children.every(isEmptySetting);
    case "rule-list":
      return setting.entries.every((entry) => entry.settings.every(isEmptySetting));
    case "string-list":
      return setting.entries.every((entry) => entry.value.trim() === "");
    default:
      return setting.value === "" || setting.value === false || setting.value === 0;
  }
}

export function scalarSettings(settings: Setting[]): ScalarSetting[] {
  return settings.flatMap((setting) =>
    setting.kind === "group" ? scalarSettings(setting.children) : isScalar(setting) ? [setting] : [],
  );
}

export function findSetting(settings: Setting[], path: string): Setting | undefined {
  for (const setting of settings) {
    if (setting.path === path) return setting;
    const nested =
      setting.kind === "group"
        ? setting.children
        : setting.kind === "rule-list"
          ? setting.entries.flatMap((entry) => entry.settings)
          : [];
    const found = findSetting(nested, path);
    if (found) return found;
  }
}

export function scalarPair(setting: ScalarSetting, value: string | number | boolean): SettingPair {
  return { key: setting.path, value: typeof value === "boolean" ? (value ? "1" : "0") : String(value) };
}

export function clearSettings(settings: Setting[]): SettingPair[] {
  return collectPairs(settings, true);
}

export function serializeSettings(settings: Setting[]): SettingPair[] {
  return collectPairs(settings, false);
}

function collectPairs(settings: Setting[], clear: boolean): SettingPair[] {
  return settings.flatMap((setting): SettingPair[] => {
    switch (setting.kind) {
      case "group":
        return collectPairs(setting.children, clear);
      case "rule-list":
        return setting.entries.flatMap((entry) => collectPairs(entry.settings, clear));
      case "string-list":
        return (setting.entries.length ? setting.entries : [{ storageIndex: 0, value: "" }]).map((entry) => ({
          key: entryPath(setting.path, entry.storageIndex),
          value: clear ? "" : entry.value,
        }));
      default:
        return [scalarPair(setting, clear ? emptyScalarValue(setting) : setting.value)];
    }
  });
}

function emptyScalarValue(setting: ScalarSetting): string | number | boolean {
  if (setting.kind === "boolean") return false;
  if (setting.kind === "number") return 0;
  return "";
}

export function validateScalar(setting: ScalarSetting, value: string | boolean): string | undefined {
  if (setting.kind !== "number") return undefined;
  if (!String(value).trim()) return "Value is required";
  if (!Number.isFinite(Number(value))) return "Must be a number";
}

export function displayValue(setting: ScalarSetting): string {
  if (setting.kind === "boolean") return setting.value ? "ON" : "OFF";
  if (setting.kind === "select")
    return setting.options.find((option) => option.value === setting.value)?.label ?? setting.value;
  return String(setting.value);
}
