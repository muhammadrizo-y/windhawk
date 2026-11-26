import { ActionPanel, Icon, List } from "@raycast/api";
import type { SettingsStore } from "../../settings/store";
import { RefreshSettingsAction } from "./RefreshSettingsAction";

export function SettingsReadError({ store }: { store: SettingsStore }) {
  return (
    <List.Item
      id="settings-read-error"
      icon={Icon.ExclamationMark}
      title="Could not refresh settings"
      subtitle="Refresh before making further changes"
      actions={
        <ActionPanel>
          <RefreshSettingsAction store={store} />
        </ActionPanel>
      }
    />
  );
}
