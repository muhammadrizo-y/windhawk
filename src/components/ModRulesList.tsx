import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ModSetting } from "../types";
import { applyCurrentSettings, getModSettingsValues } from "../utils/mods";
import { setModSettings } from "../utils/actions";
import { ElevatedAction } from "./ElevatedAction";
import { dropdownLabel, isEmptyRule, isStringList } from "./ModSettingsList";
import ManageStringList from "./ManageStringList";

function blankRule(fields: ModSetting[]): ModSetting[] {
  return fields.map((field) => {
    if (Array.isArray(field.value)) {
      return { ...field, value: blankRule(field.value as ModSetting[]) };
    }
    const value = field.value;
    return { ...field, value: typeof value === "boolean" ? false : typeof value === "number" ? 0 : "" };
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Re-reads the flat runtime values and rebuilds the rule instances from
 * truth, so the UI never drifts from storage (blanked or compacted indices
 * alike). Falls back to a single blank rule when nothing is stored.
 */
async function refreshRuleInstances(modId: string, groupKey: string, template: ModSetting[]): Promise<ModSetting[][]> {
  const flat = await getModSettingsValues(modId);
  const pattern = new RegExp(`^${escapeRegExp(groupKey)}\\[(\\d+)\\]\\.`);
  const indices = new Set<number>();
  for (const key of Object.keys(flat)) {
    const match = key.match(pattern);
    if (match) indices.add(parseInt(match[1], 10));
  }
  const sorted = [...indices].sort((a, b) => a - b);
  const targets = sorted.length > 0 ? sorted : [0];
  return targets.map((index) => applyCurrentSettings(blankRule(template), flat, {}, `${groupKey}[${index}]`));
}

function ruleDisplayValue(field: ModSetting): string {
  if (typeof field.value === "boolean") return field.value ? "On" : "Off";
  if (field.options && typeof field.value === "string") return dropdownLabel(field);
  if (Array.isArray(field.value)) return "";
  return String(field.value);
}

function ruleMarkdown(displayNumber: number, rule: ModSetting[]): string {
  const lines = rule
    .filter((field) => !Array.isArray(field.value))
    .map((field) => `**${field.name ?? field.key}:** ${ruleDisplayValue(field) || "(empty)"}`);
  return [`## Rule ${displayNumber}`, ...lines].join("\n\n");
}

function ruleSummary(rule: ModSetting[]): string | undefined {
  for (const field of rule) {
    if (Array.isArray(field.value)) continue;
    const display = ruleDisplayValue(field);
    if (display) return `${field.name ?? field.key}: ${display}`;
  }
  return undefined;
}

export default function ManageRules({
  modId,
  groupKey,
  groupName,
  rules,
  onReplaced,
  onPatched,
}: {
  modId: string;
  groupKey: string;
  groupName: string;
  rules: ModSetting[][];
  onReplaced: (rules: ModSetting[][]) => void;
  onPatched: (path: string, value: ModSetting["value"]) => void;
}) {
  const template = rules[0];

  const doRefresh = async () => {
    if (!template) return;
    onReplaced(await refreshRuleInstances(modId, groupKey, template));
  };

  // Sync once on open: the pushed rules come from the mod's declared
  // instances, which can be sparse (some mods declare extra instances with
  // only a subset of fields, no names) and may not match what is actually
  // stored. Rebuilding from `settings get` normalizes every instance to the
  // full template field set and picks up blank slots added outside Raycast.
  useEffect(() => {
    void doRefresh();
  }, []);

  if (!template) {
    return <List navigationTitle={`${groupName} — Rules`} searchBarPlaceholder="Search rules…" />;
  }

  // The Windhawk-required all-empty rule stays in storage but is hidden;
  // display numbers are dense while storage indices drive all writes.
  // New rules reuse the first empty slot, else append.
  const firstEmpty = rules.findIndex((rule) => isEmptyRule(rule));
  const newIndex = firstEmpty === -1 ? rules.length : firstEmpty;
  const visible = rules.map((rule, storageIndex) => ({ rule, storageIndex })).filter(({ rule }) => !isEmptyRule(rule));

  return (
    <List navigationTitle={`${groupName} — Rules`} searchBarPlaceholder="Search rules…" isShowingDetail>
      {visible.map(({ rule, storageIndex }, displayIndex) => (
        <RuleRow
          key={storageIndex}
          modId={modId}
          groupKey={groupKey}
          ruleIndex={storageIndex}
          displayNumber={displayIndex + 1}
          rule={rule}
          rules={rules}
          template={template}
          newIndex={newIndex}
          onPatched={onPatched}
          onRefreshed={doRefresh}
        />
      ))}
      {visible.length === 0 && (
        <List.Item
          icon={Icon.Plus}
          title="No rules"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="New Rule"
                target={
                  <RuleForm
                    modId={modId}
                    groupKey={groupKey}
                    ruleIndex={newIndex}
                    fields={template}
                    rule={null}
                    onSaved={doRefresh}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function RuleRow({
  modId,
  groupKey,
  ruleIndex,
  displayNumber,
  rule,
  rules,
  template,
  newIndex,
  onPatched,
  onRefreshed,
}: {
  modId: string;
  groupKey: string;
  ruleIndex: number;
  displayNumber: number;
  rule: ModSetting[];
  rules: ModSetting[][];
  template: ModSetting[];
  newIndex: number;
  onPatched: (path: string, value: ModSetting["value"]) => void;
  onRefreshed: () => Promise<void>;
}) {
  const stringLists = rule.filter(isStringList);
  const blankPairs = (target: ModSetting[], index: number) =>
    target
      .filter((field) => !Array.isArray(field.value))
      .map((field) => ({
        key: `${groupKey}[${index}].${field.key}`,
        value: typeof field.value === "boolean" ? "0" : typeof field.value === "number" ? "0" : "",
      }));

  return (
    <List.Item
      title={`Rule ${displayNumber}`}
      subtitle={ruleSummary(rule)}
      detail={<List.Item.Detail markdown={ruleMarkdown(displayNumber, rule)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Rule"
              target={
                <RuleForm
                  modId={modId}
                  groupKey={groupKey}
                  ruleIndex={ruleIndex}
                  displayNumber={displayNumber}
                  fields={template}
                  rule={rule}
                  onSaved={onRefreshed}
                />
              }
            />
          </ActionPanel.Section>
          {stringLists.map((field) => {
            const listPath = `${groupKey}[${ruleIndex}].${field.key}`;
            const label = field.name ?? field.key;
            return (
              <ActionPanel.Section key={field.key} title={label}>
                <Action.Push
                  icon={Icon.List}
                  title={`Manage ${label}`}
                  target={
                    <ManageStringList
                      modId={modId}
                      path={listPath}
                      name={label}
                      entries={field.value as string[]}
                      onReplaced={(next) => onPatched(listPath, next)}
                    />
                  }
                />
              </ActionPanel.Section>
            );
          })}
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Plus}
              title="New Rule"
              target={
                <RuleForm
                  modId={modId}
                  groupKey={groupKey}
                  ruleIndex={newIndex}
                  fields={template}
                  rule={null}
                  onSaved={onRefreshed}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {ruleIndex > 0 ? (
              <ElevatedAction
                icon={Icon.Trash}
                title="Remove Rule"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: `Remove Rule ${displayNumber}?`,
                      message: "Its values will be cleared.",
                      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                    }))
                  ) {
                    return;
                  }
                  if (await setModSettings(modId, blankPairs(rule, ruleIndex))) {
                    await onRefreshed();
                  }
                }}
              />
            ) : undefined}
            <ElevatedAction
              icon={Icon.Trash}
              title="Remove All Rules"
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  !(await confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Remove All Rules?",
                    message: "Every rule will be cleared. One empty rule is kept, as Windhawk requires at least one.",
                    primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
                  }))
                ) {
                  return;
                }
                const pairs = rules.flatMap((target, index) => blankPairs(target, index));
                if (await setModSettings(modId, pairs)) {
                  await onRefreshed();
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RuleForm({
  modId,
  groupKey,
  ruleIndex,
  displayNumber,
  fields,
  rule,
  onSaved,
}: {
  modId: string;
  groupKey: string;
  ruleIndex: number;
  displayNumber?: number;
  fields: ModSetting[];
  rule: ModSetting[] | null;
  onSaved: () => Promise<void>;
}) {
  const leaves = fields.filter((field) => !Array.isArray(field.value));

  const initialValues: Record<string, string | boolean> = {};
  for (const field of leaves) {
    const current = rule?.find((entry) => entry.key === field.key)?.value;
    if (typeof field.value === "boolean") {
      initialValues[field.key] = typeof current === "boolean" ? current : false;
    } else if (field.options && field.options.length > 0) {
      initialValues[field.key] = current !== undefined ? String(current) : firstOptionValue(field);
    } else if (typeof field.value === "number") {
      initialValues[field.key] = current !== undefined ? String(current) : "";
    } else {
      initialValues[field.key] = current !== undefined ? String(current) : "";
    }
  }

  const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const update = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <Form
      navigationTitle={rule ? `Edit Rule ${displayNumber ?? ruleIndex + 1}` : "New Rule"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={rule ? "Save Rule" : "Add Rule"}
            onSubmit={async () => {
              const nextErrors: Record<string, string | undefined> = {};
              for (const field of leaves) {
                if (typeof field.value === "number") {
                  const raw = String(values[field.key] ?? "");
                  if (!raw.trim()) nextErrors[field.key] = "Value is required";
                  else if (isNaN(Number(raw))) nextErrors[field.key] = "Must be a number";
                }
              }
              if (Object.values(nextErrors).some(Boolean)) {
                setErrors(nextErrors);
                return false;
              }
              const pairs = leaves.map((field) => {
                const raw = values[field.key];
                const value = typeof raw === "boolean" ? (raw ? "1" : "0") : String(raw ?? "");
                return { key: `${groupKey}[${ruleIndex}].${field.key}`, value };
              });
              if (await setModSettings(modId, pairs)) {
                await onSaved();
                return;
              }
              return false;
            }}
          />
        </ActionPanel>
      }
    >
      {leaves.map((field) => {
        if (typeof field.value === "boolean") {
          return (
            <Form.Checkbox
              key={field.key}
              id={field.key}
              title={field.name}
              label={field.name}
              info={field.description}
              value={values[field.key] === true}
              error={errors[field.key]}
              onChange={(value) => update(field.key, value)}
            />
          );
        }
        if (field.options && field.options.length > 0) {
          return (
            <Form.Dropdown
              key={field.key}
              id={field.key}
              title={field.name}
              info={field.description}
              value={String(values[field.key] ?? "")}
              error={errors[field.key]}
              onChange={(value) => update(field.key, value)}
            >
              {field.options.map((option) => {
                const entry = Object.entries(option)[0];
                if (!entry) return null;
                return <Form.Dropdown.Item key={entry[0]} value={entry[0]} title={entry[1]} />;
              })}
            </Form.Dropdown>
          );
        }
        return (
          <Form.TextField
            key={field.key}
            id={field.key}
            title={field.name}
            info={field.description}
            value={String(values[field.key] ?? "")}
            error={errors[field.key]}
            onChange={(value) => update(field.key, value)}
          />
        );
      })}
    </Form>
  );
}

function firstOptionValue(field: ModSetting): string {
  const entry = field.options ? Object.entries(field.options[0] ?? {})[0] : undefined;
  return entry ? entry[0] : "";
}
