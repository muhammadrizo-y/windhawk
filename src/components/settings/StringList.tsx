import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import type { SettingsStore } from "../../settings/store";
import { clearSettings, findSetting } from "../../settings/operations";
import { entryPath, nextStorageIndex } from "../../settings/paths";
import { ElevatedAction } from "../ElevatedAction";
import { StringEntryForm } from "./StringEntryForm";
import { useModSettings } from "./useModSettings";
import { RefreshSettingsAction } from "./RefreshSettingsAction";
import { SettingsReadError } from "./SettingsReadError";

export function StringList({ store, path, name }: { store: SettingsStore; path: string; name: string }) {
  const { settings, isLoading, isSaving, error } = useModSettings(store, true);
  const setting = findSetting(settings, path);
  if (setting?.kind !== "string-list") return <List navigationTitle={`${name} — Entries`} isLoading={isLoading} />;
  const newIndex = nextStorageIndex(setting.entries, (entry) => entry.value.trim() === "");
  const visible = setting.entries.filter((entry) => entry.value.trim() !== "");
  const newForm = <StringEntryForm store={store} path={path} name={name} storageIndex={newIndex} />;
  return (
    <List
      navigationTitle={`${name} — Entries`}
      searchBarPlaceholder="Search entries…"
      isLoading={isLoading || isSaving}
      isShowingDetail
    >
      {error ? <SettingsReadError store={store} /> : undefined}
      {visible.map((entry, displayIndex) => (
        <List.Item
          key={entry.storageIndex}
          id={String(entry.storageIndex)}
          title={entry.value}
          detail={<List.Item.Detail markdown={`## Entry ${displayIndex + 1}\n\n${entry.value}`} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Entry"
                  target={
                    <StringEntryForm
                      store={store}
                      path={path}
                      name={name}
                      storageIndex={entry.storageIndex}
                      initial={entry.value}
                      displayNumber={displayIndex + 1}
                    />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push icon={Icon.Plus} title="New Entry" target={newForm} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {entry.storageIndex > 0 ? (
                  <ElevatedAction
                    icon={Icon.Trash}
                    title="Remove Entry"
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          icon: { source: Icon.Trash, tintColor: Color.Red },
                          title: `Remove Entry ${displayIndex + 1}?`,
                          message: entry.value,
                          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await store.save([{ key: entryPath(path, entry.storageIndex), value: "" }]);
                      }
                    }}
                  />
                ) : undefined}
                <ElevatedAction
                  icon={Icon.Trash}
                  title="Remove All Entries"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                        title: "Remove All Entries?",
                        message: "Every entry will be cleared. One empty slot is kept, as Windhawk requires it.",
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
          title="No entries"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Entry" target={newForm} />
              <RefreshSettingsAction store={store} />
            </ActionPanel>
          }
        />
      ) : undefined}
    </List>
  );
}
