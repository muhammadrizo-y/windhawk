import { childPath, entryPath, storedIndices } from "./paths";
import { parseOptions } from "./schema";
import type { FlatSettings, RuleListSetting, Setting, SettingDefinition } from "./types";

export function resolveSettings(
  definitions: SettingDefinition[],
  values: FlatSettings,
  dynamicOptions: FlatSettings = {},
  prefix = "",
  blank = false,
): Setting[] {
  return definitions.map((definition): Setting => {
    const path = childPath(prefix, definition.key);
    const raw = Object.hasOwn(values, path) ? values[path] : undefined;
    switch (definition.kind) {
      case "boolean":
        return {
          ...definition,
          path,
          value: raw === undefined ? !blank && definition.defaultValue : raw === 1 || raw === "1" || raw === true,
        };
      case "number": {
        const fallback = blank ? 0 : definition.defaultValue;
        const numeric = typeof raw === "number" || (typeof raw === "string" && raw.trim()) ? Number(raw) : NaN;
        return { ...definition, path, value: Number.isFinite(numeric) ? numeric : fallback };
      }
      case "text":
      case "select": {
        const value =
          typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
            ? String(raw)
            : blank
              ? ""
              : definition.defaultValue;
        const options = parseOptions(dynamicOptions[path]);
        if (options) return { ...definition, path, kind: "select", value, options };
        return { ...definition, path, value };
      }
      case "group":
        return {
          ...definition,
          path,
          children: resolveSettings(definition.children, values, dynamicOptions, path, blank),
        };
      case "string-list": {
        const stored = storedIndices(values, path, definition.kind);
        const entries = stored.length
          ? stored.map((storageIndex) => ({ storageIndex, value: String(values[entryPath(path, storageIndex)] ?? "") }))
          : (blank ? [""] : definition.defaultValue).map((value, storageIndex) => ({ storageIndex, value }));
        return { ...definition, path, entries };
      }
      case "rule-list": {
        const stored = storedIndices(values, path, definition.kind);
        const indices = stored.length ? stored : blank ? [0] : definition.defaults.map((_, index) => index);
        return {
          ...definition,
          path,
          entries: indices.map((storageIndex) => ({
            storageIndex,
            settings: resolveSettings(
              blank ? definition.template : (definition.defaults[storageIndex] ?? definition.template),
              values,
              dynamicOptions,
              entryPath(path, storageIndex),
              blank || !definition.defaults[storageIndex],
            ),
          })),
        };
      }
    }
  });
}

export function createRule(list: RuleListSetting, storageIndex: number, dynamicOptions: FlatSettings = {}): Setting[] {
  return resolveSettings(list.template, {}, dynamicOptions, entryPath(list.path, storageIndex), true);
}
