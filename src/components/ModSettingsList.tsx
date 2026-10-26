import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { ModSetting } from "../types";
import { isWorkerRunning } from "../utils/admin-worker";
import { setModSetting } from "../utils/actions";
import { ElevatedAction } from "./ElevatedAction";
import ElevationSetup from "./ElevationSetup";
import ManageRules from "./ModRulesList";
import ManageStringList from "./ManageStringList";

type SettingKind = "toggle" | "dropdown" | "number" | "text";

export function settingKind(setting: ModSetting): SettingKind {
  if (setting.options && setting.options.length > 0) return "dropdown";
  if (typeof setting.value === "boolean") return "toggle";
  if (typeof setting.value === "number") return "number";
  return "text";
}

export function dropdownLabel(setting: ModSetting): string {
  const stored = String(setting.value);
  for (const option of setting.options ?? []) {
    const entry = Object.entries(option)[0];
    if (entry && entry[0] === stored) return entry[1];
  }
  return stored;
}

function titles(setting: ModSetting) {
  return {
    title: { value: setting.name, tooltip: setting.name },
    subtitle: setting.description ? { value: setting.description, tooltip: setting.description } : undefined,
  };
}

function isRuleList(setting: ModSetting): boolean {
  return Array.isArray(setting.value) && setting.value.length > 0 && Array.isArray(setting.value[0]);
}

export function isStringList(setting: ModSetting): boolean {
  const value = setting.value;
  if (!Array.isArray(value)) return false;
  const first = value.length > 0 ? value[0] : undefined;
  return !Array.isArray(first) && (first === undefined || typeof first !== "object");
}

export function isEmptyRule(rule: ModSetting[]): boolean {
  return rule.every((field) => {
    if (Array.isArray(field.value)) {
      const nested = field.value as ModSetting[];
      if (nested.length > 0 && Array.isArray(nested[0])) {
        return (nested as unknown as ModSetting[][]).every(isEmptyRule);
      }
      return isEmptyRule(nested);
    }
    const value = field.value;
    return value === "" || value === false || value === 0;
  });
}

function detailMarkdown(setting: ModSetting): string {
  if (isRuleList(setting)) {
    return rulesTableMarkdown(setting);
  }
  if (isStringList(setting)) {
    return stringListMarkdown(setting);
  }

  let value: string;

  if (typeof setting.value === "boolean") {
    value = setting.value ? "ON" : "OFF";
  } else if (setting.options && typeof setting.value === "string") {
    value = dropdownLabel(setting);
  } else {
    value = `${setting.value}`;
  }

  return `
## ${setting.name}

${setting.description ? setting.description : ""}

---

## ${value}
`;
}

function stringListMarkdown(setting: ModSetting): string {
  const entries = (setting.value as string[]).filter((entry) => entry.trim() !== "");
  const header = [`## ${setting.name}`, setting.description ?? ""].filter(Boolean).join("\n\n");
  if (entries.length === 0) return header;
  const esc = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return `${header}\n\n---\n\n${entries.map((entry) => `- ${esc(entry)}`).join("\n")}`;
}

function rulesTableMarkdown(group: ModSetting): string {
  const rules = (group.value as ModSetting[][]).filter((rule) => !isEmptyRule(rule));
  const header = [`## ${group.name}`, group.description ?? ""].filter(Boolean).join("\n\n");
  if (rules.length === 0) return header;

  const esc = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const cellValue = (field: ModSetting): string => {
    if (typeof field.value === "boolean") return field.value ? "ON" : "OFF";
    if (field.options && typeof field.value === "string") return dropdownLabel(field);
    if (Array.isArray(field.value)) return "";
    return String(field.value);
  };

  const columns = rules[0].filter((field) => !Array.isArray(field.value));
  const table = [
    `| ${columns.map((column) => esc(column.name)).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rules.map(
      (rule) =>
        `| ${columns
          .map((column) => {
            const field = rule.find((entry) => !Array.isArray(entry.value) && entry.key === column.key);
            return esc(field ? cellValue(field) : "");
          })
          .join(" | ")} |`,
    ),
  ].join("\n");

  return `${header}\n\n${table}`;
}

function ToggleDetailsAction({ onToggleDetails }: { onToggleDetails: () => void }) {
  return (
    <Action
      icon={Icon.Sidebar}
      title="Toggle Info Panel"
      onAction={onToggleDetails}
      shortcut={{ modifiers: ["ctrl"], key: "i" }}
    />
  );
}

function patchSettingsTree(settings: ModSetting[], segments: string[], value: ModSetting["value"]): ModSetting[] {
  const [head, ...rest] = segments;
  const indexed = head.match(/^(.+)\[(\d+)\]$/);
  const key = indexed ? indexed[1] : head;
  const index = indexed ? parseInt(indexed[2], 10) : null;
  return settings.map((setting) => {
    if (setting.key !== key) return setting;
    if (!Array.isArray(setting.value)) {
      return rest.length === 0 && index === null ? { ...setting, value } : setting;
    }
    if (index !== null) {
      if (rest.length === 0) return setting;
      const rules = setting.value as ModSetting[][];
      return {
        ...setting,
        value: rules.map((rule, i) => (i === index ? patchSettingsTree(rule, rest, value) : rule)),
      };
    }
    if (rest.length === 0) {
      // Whole-list replace: the new value must be a list too (rules or strings).
      return Array.isArray(value) ? { ...setting, value } : setting;
    }
    return { ...setting, value: patchSettingsTree(setting.value as ModSetting[], rest, value) };
  });
}

export default function ModSettingsList({
  modId,
  name,
  settings,
}: {
  modId: string;
  name: string;
  settings: ModSetting[];
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showDetail, setShowDetail] = useCachedState("mod-settings-show-detail", false);

  const toggleDetails = () => setShowDetail((prev) => !prev);

  const applyChange = (path: string, value: ModSetting["value"]) => {
    setLocalSettings((prev) => patchSettingsTree(prev, path.split("."), value));
  };

  const leaves = localSettings.filter((setting) => !Array.isArray(setting.value));
  const stringLists = localSettings.filter(isStringList);
  const groups = localSettings.filter(
    (setting) => Array.isArray(setting.value) && !isRuleList(setting) && !isStringList(setting),
  );
  const ruleLists = localSettings.filter(isRuleList);

  return (
    <List
      navigationTitle={`${name} — Settings`}
      searchBarPlaceholder="Search settings…"
      isShowingDetail={showDetail}
      throttle
    >
      {leaves.length > 0 && (
        <List.Section title={groups.length + ruleLists.length + stringLists.length > 0 ? "General" : "Settings"}>
          <Settings
            modId={modId}
            settings={leaves}
            prefix=""
            showDetail={showDetail}
            onToggleDetails={toggleDetails}
            onChanged={applyChange}
          />
        </List.Section>
      )}
      {groups.map((group) => (
        <List.Section key={group.key} title={group.name}>
          <Settings
            modId={modId}
            settings={group.value as ModSetting[]}
            prefix={group.key}
            showDetail={showDetail}
            onToggleDetails={toggleDetails}
            onChanged={applyChange}
          />
        </List.Section>
      ))}
      {stringLists.map((list) => (
        <List.Section key={list.key} title={list.name}>
          <StringListSetting
            modId={modId}
            setting={list}
            path={list.key}
            showDetail={showDetail}
            onToggleDetails={toggleDetails}
            onChanged={applyChange}
          />
        </List.Section>
      ))}
      {ruleLists.map((group) => {
        const rules = group.value as ModSetting[][];
        const count = rules.filter((rule) => !isEmptyRule(rule)).length;
        const t = titles(group);
        return (
          <List.Section key={group.key} title={group.name}>
            <List.Item
              icon={Icon.Box}
              title={t.title}
              subtitle={showDetail ? undefined : t.subtitle}
              accessories={showDetail ? [] : [{ text: `${count} rule${count === 1 ? "" : "s"}` }]}
              detail={<List.Item.Detail markdown={detailMarkdown(group)} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.List}
                    title="Manage Rules"
                    target={
                      <ManageRules
                        modId={modId}
                        groupKey={group.key}
                        groupName={group.name}
                        rules={rules}
                        onReplaced={(next) => applyChange(group.key, next)}
                        onPatched={applyChange}
                      />
                    }
                  />
                  <ActionPanel.Section>
                    <ToggleDetailsAction onToggleDetails={toggleDetails} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
        );
      })}
    </List>
  );
}

function Settings({
  modId,
  settings,
  prefix,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  settings: ModSetting[];
  prefix: string;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: ModSetting["value"]) => void;
}) {
  return (
    <>
      {settings.map((setting) => {
        if (isRuleList(setting)) {
          const rulePrefix = prefix ? `${prefix}.${setting.key}` : setting.key;
          return (setting.value as ModSetting[][]).map((rule, index) => (
            <Settings
              key={`${setting.key}[${index}]`}
              modId={modId}
              settings={rule}
              prefix={`${rulePrefix}[${index}]`}
              showDetail={showDetail}
              onToggleDetails={onToggleDetails}
              onChanged={onChanged}
            />
          ));
        }
        if (isStringList(setting)) {
          const childPrefix = prefix ? `${prefix}.${setting.key}` : setting.key;
          return (
            <StringListSetting
              key={setting.key}
              modId={modId}
              setting={setting}
              path={childPrefix}
              showDetail={showDetail}
              onToggleDetails={onToggleDetails}
              onChanged={onChanged}
            />
          );
        }
        if (Array.isArray(setting.value)) {
          const childPrefix = prefix ? `${prefix}.${setting.key}` : setting.key;
          return (
            <Settings
              key={setting.key}
              modId={modId}
              settings={setting.value as ModSetting[]}
              prefix={childPrefix}
              showDetail={showDetail}
              onToggleDetails={onToggleDetails}
              onChanged={onChanged}
            />
          );
        }
        const path = prefix ? `${prefix}.${setting.key}` : setting.key;
        return (
          <Setting
            key={setting.key}
            modId={modId}
            setting={setting}
            path={path}
            showDetail={showDetail}
            onToggleDetails={onToggleDetails}
            onChanged={onChanged}
          />
        );
      })}
    </>
  );
}

function StringListSetting({
  modId,
  setting,
  path,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  setting: ModSetting;
  path: string;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: ModSetting["value"]) => void;
}) {
  const entries = setting.value as string[];
  const count = entries.filter((entry) => entry.trim() !== "").length;
  const t = titles(setting);
  return (
    <List.Item
      icon={Icon.List}
      title={t.title}
      subtitle={showDetail ? undefined : t.subtitle}
      accessories={showDetail ? [] : [{ text: `${count} ${count === 1 ? "entry" : "entries"}` }]}
      detail={<List.Item.Detail markdown={detailMarkdown(setting)} />}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.List}
            title="Manage Entries"
            target={
              <ManageStringList
                modId={modId}
                path={path}
                name={setting.name}
                entries={entries}
                onReplaced={(next) => onChanged(path, next)}
              />
            }
          />
          <ActionPanel.Section>
            <ToggleDetailsAction onToggleDetails={onToggleDetails} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Setting({
  modId,
  setting,
  path,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  setting: ModSetting;
  path: string;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: ModSetting["value"]) => void;
}) {
  const kind = settingKind(setting);
  const shared = { modId, setting, path, showDetail, onToggleDetails, onChanged };

  if (kind === "toggle") {
    return <ToggleSetting {...shared} />;
  }

  if (kind === "dropdown") {
    return <DropdownSetting {...shared} />;
  }

  return <EditableSetting {...shared} isNumber={kind === "number"} />;
}

function ToggleSetting({
  modId,
  setting,
  path,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  setting: ModSetting;
  path: string;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: boolean) => void;
}) {
  const enabled = setting.value === true;
  const t = titles(setting);
  return (
    <List.Item
      icon={enabled ? Icon.CheckCircle : Icon.Circle}
      title={t.title}
      subtitle={showDetail ? undefined : t.subtitle}
      accessories={
        showDetail
          ? []
          : [
              {
                tag: {
                  value: enabled ? "On" : "Off",
                  color: enabled ? Color.Blue : Color.Orange,
                },
              },
            ]
      }
      detail={<List.Item.Detail markdown={detailMarkdown(setting)} />}
      actions={
        <ActionPanel>
          <ElevatedAction
            icon={enabled ? Icon.CircleDisabled : Icon.CheckCircle}
            title={enabled ? "Turn Off" : "Turn On"}
            onAction={async () => {
              const next = !enabled;
              if (await setModSetting(modId, path, next ? "1" : "0")) {
                onChanged(path, next);
              }
            }}
          />
          <ActionPanel.Section>
            <ToggleDetailsAction onToggleDetails={onToggleDetails} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function DropdownSetting({
  modId,
  setting,
  path,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  setting: ModSetting;
  path: string;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: string) => void;
}) {
  const label = dropdownLabel(setting);
  const t = titles(setting);
  return (
    <List.Item
      icon={Icon.List}
      title={t.title}
      subtitle={showDetail ? undefined : t.subtitle}
      accessories={showDetail ? [] : [{ tag: { value: label, color: Color.Blue }, tooltip: label }]}
      detail={<List.Item.Detail markdown={detailMarkdown(setting)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu icon={Icon.List} title="Choose">
            {(setting.options ?? []).map((option) => {
              const entry = Object.entries(option)[0];
              if (!entry) return null;
              const [storedValue, optionLabel] = entry;
              const current = storedValue === String(setting.value);
              return (
                <ElevatedAction
                  key={storedValue}
                  icon={current ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                  title={optionLabel}
                  onAction={async () => {
                    if (await setModSetting(modId, path, storedValue)) {
                      onChanged(path, storedValue);
                    }
                  }}
                />
              );
            })}
          </ActionPanel.Submenu>
          <ActionPanel.Section>
            <ToggleDetailsAction onToggleDetails={onToggleDetails} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditableSetting({
  modId,
  setting,
  path,
  isNumber,
  showDetail,
  onToggleDetails,
  onChanged,
}: {
  modId: string;
  setting: ModSetting;
  path: string;
  isNumber: boolean;
  showDetail: boolean;
  onToggleDetails: () => void;
  onChanged: (path: string, value: string | number) => void;
}) {
  const displayValue = String(setting.value);
  const t = titles(setting);
  return (
    <List.Item
      icon={Icon.TextInput}
      title={t.title}
      subtitle={showDetail ? undefined : t.subtitle}
      accessories={showDetail ? [] : [{ tag: { value: displayValue, color: Color.Blue }, tooltip: displayValue }]}
      detail={<List.Item.Detail markdown={detailMarkdown(setting)} />}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Pencil}
            title="Edit"
            target={
              <EditSettingForm
                modId={modId}
                settingKey={path}
                settingName={setting.name}
                description={setting.description}
                initial={displayValue}
                isNumber={isNumber}
                onSaved={(value) => onChanged(path, value)}
              />
            }
          />
          <ActionPanel.Section>
            <ToggleDetailsAction onToggleDetails={onToggleDetails} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditSettingForm({
  modId,
  settingKey,
  settingName,
  description,
  initial,
  isNumber,
  onSaved,
}: {
  modId: string;
  settingKey: string;
  settingName: string;
  description?: string;
  initial: string;
  isNumber: boolean;
  onSaved: (value: string | number) => void;
}) {
  const { pop, push } = useNavigation();

  const save = async (raw: string) => {
    if (!(await isWorkerRunning())) {
      push(<ElevationSetup onSetupSuccess={() => save(raw)} />);
      return;
    }
    if (await setModSetting(modId, settingKey, raw)) {
      onSaved(isNumber ? Number(raw) : raw);
      pop();
    }
  };

  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    initialValues: { value: initial },
    validation: isNumber
      ? {
          value: (value) => {
            if (!value?.trim()) return "Value is required";
            if (isNaN(Number(value))) return "Must be a number";
          },
        }
      : {},
    onSubmit: ({ value }) => save(value),
  });

  return (
    <Form
      navigationTitle={settingName}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title={settingName} {...itemProps.value} />
      <Form.Description text={description ?? ""} />
    </Form>
  );
}
