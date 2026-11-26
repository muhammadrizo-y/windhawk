export interface SettingInfo {
  key: string;
  name: string;
  description?: string;
}

export interface SettingOption {
  value: string;
  label: string;
}

export type ScalarDefinition = SettingInfo &
  (
    | { kind: "boolean"; defaultValue: boolean }
    | { kind: "number"; defaultValue: number }
    | { kind: "text"; defaultValue: string }
    | { kind: "select"; defaultValue: string; options: SettingOption[] }
  );

export interface GroupDefinition extends SettingInfo {
  kind: "group";
  children: SettingDefinition[];
}

export interface StringListDefinition extends SettingInfo {
  kind: "string-list";
  defaultValue: string[];
}

export interface RuleListDefinition extends SettingInfo {
  kind: "rule-list";
  template: SettingDefinition[];
  defaults: SettingDefinition[][];
}

export type SettingDefinition = ScalarDefinition | GroupDefinition | StringListDefinition | RuleListDefinition;

export type ScalarSetting =
  | (Extract<ScalarDefinition, { kind: "boolean" }> & { path: string; value: boolean })
  | (Extract<ScalarDefinition, { kind: "number" }> & { path: string; value: number })
  | (Extract<ScalarDefinition, { kind: "text" }> & { path: string; value: string })
  | (Extract<ScalarDefinition, { kind: "select" }> & { path: string; value: string });

export interface GroupSetting extends Omit<GroupDefinition, "children"> {
  path: string;
  children: Setting[];
}

export interface StringEntry {
  storageIndex: number;
  value: string;
}

export interface StringListSetting extends StringListDefinition {
  path: string;
  entries: StringEntry[];
}

export interface RuleInstance {
  storageIndex: number;
  settings: Setting[];
}

export interface RuleListSetting extends RuleListDefinition {
  path: string;
  entries: RuleInstance[];
}

export type Setting = ScalarSetting | GroupSetting | StringListSetting | RuleListSetting;
export type FlatSettings = Record<string, unknown>;

export interface SettingPair {
  key: string;
  value: string;
}
