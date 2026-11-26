import { Action, Icon, Keyboard } from "@raycast/api";
import type { SettingsStore } from "../../settings/store";

export function RefreshSettingsAction({ store }: { store: SettingsStore }) {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={async () => {
        await store.refresh();
      }}
    />
  );
}
