import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { clearSettings, findSetting, isEmptySetting } from "../../settings/operations";
import { nextStorageIndex } from "../../settings/paths";
import { createRule } from "../../settings/resolve";
import type { SettingsStore } from "../../settings/store";
import type { Setting, StringListSetting } from "../../settings/types";
import { ElevatedAction } from "../ElevatedAction";
import { RuleForm } from "./RuleForm";
import { StringList } from "./StringList";
import { RefreshSettingsAction } from "./RefreshSettingsAction";
import { SettingsReadError } from "./SettingsReadError";
import { ruleMarkdown, ruleSummary } from "./markdown";
import { useModSettings } from "./useModSettings";

function stringLists(settings: Setting[]): StringListSetting[] {
  return settings.flatMap((setting) =>
    setting.kind === "group" ? stringLists(setting.children) : setting.kind === "string-list" ? [setting] : [],
  );
}

export function RuleList({ store, path, name }: { store: SettingsStore; path: string; name: string }) {
  const { settings, dynamicOptions, isLoading, isSaving, error } = useModSettings(store, true);
  const setting = findSetting(settings, path);
  if (setting?.kind !== "rule-list") return <List navigationTitle={`${name} — Rules`} isLoading={isLoading} />;
  const newIndex = nextStorageIndex(setting.entries, (entry) => entry.settings.every(isEmptySetting));
  const visible = setting.entries.filter((entry) => !entry.settings.every(isEmptySetting));
  const newForm = <RuleForm store={store} settings={createRule(setting, newIndex, dynamicOptions)} />;
  return (
    <List
      navigationTitle={`${name} — Rules`}
      searchBarPlaceholder="Search rules…"
      isLoading={isLoading || isSaving}
      isShowingDetail
    >
      {error ? <SettingsReadError store={store} /> : undefined}
      {visible.map((rule, displayIndex) => (
        <List.Item
          key={rule.storageIndex}
          id={String(rule.storageIndex)}
          title={`Rule ${displayIndex + 1}`}
          subtitle={ruleSummary(rule)}
          detail={<List.Item.Detail markdown={ruleMarkdown(displayIndex + 1, rule)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Rule"
                  target={<RuleForm store={store} settings={rule.settings} displayNumber={displayIndex + 1} />}
                />
              </ActionPanel.Section>
              {stringLists(rule.settings).map((field) => (
                <ActionPanel.Section key={field.path} title={field.name}>
                  <Action.Push
                    icon={Icon.List}
                    title={`Manage ${field.name}`}
                    target={<StringList store={store} path={field.path} name={field.name} />}
                  />
                </ActionPanel.Section>
              ))}
              <ActionPanel.Section>
                <Action.Push icon={Icon.Plus} title="New Rule" target={newForm} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {rule.storageIndex > 0 ? (
                  <ElevatedAction
                    icon={Icon.Trash}
                    title="Remove Rule"
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          icon: { source: Icon.Trash, tintColor: Color.Red },
                          title: `Remove Rule ${displayIndex + 1}?`,
                          message: "Its values will be cleared.",
                          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                        })
                      )
                        await store.save(clearSettings(rule.settings));
                    }}
                  />
                ) : undefined}
                <ElevatedAction
                  icon={Icon.Trash}
                  title="Remove All Rules"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                        title: "Remove All Rules?",
                        message:
                          "Every rule will be cleared. One empty rule is kept, as Windhawk requires at least one.",
                        primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
                      })
                    )
                      await store.save(clearSettings([setting]));
                  }}
                />
              </ActionPanel.Section>
              <RefreshSettingsAction store={store} />
            </ActionPanel>
          }
        />
      ))}
      {visible.length === 0 ? (
        <List.Item
          icon={Icon.Plus}
          title="No rules"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Rule" target={newForm} />
              <RefreshSettingsAction store={store} />
            </ActionPanel>
          }
        />
      ) : undefined}
    </List>
  );
}
