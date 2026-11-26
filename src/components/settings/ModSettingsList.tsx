import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { showError } from "@chrismessina/raycast-kit";
import { useState } from "react";
import { isScalar } from "../../settings/operations";
import type { SettingsSnapshot } from "../../settings/store";
import { createModSettingsStore, useModSettings } from "./useModSettings";
import { SettingItem } from "./SettingItem";
import { RefreshSettingsAction } from "./RefreshSettingsAction";
import { SettingsReadError } from "./SettingsReadError";
import { getInstalledModDetails } from "../../utils/mods";

export default function ModSettingsList({
  modId,
  name,
  initial,
}: {
  modId: string;
  name: string;
  initial?: SettingsSnapshot;
}) {
  const { data, isLoading, revalidate } = usePromise(getInstalledModDetails, [modId], {
    execute: !initial,
    onError(error) {
      void showError(error, { title: `Could not load settings for ${name}` });
    },
  });
  const snapshot = initial ?? data?.settingsSnapshot;

  if (snapshot) return <LoadedModSettingsList modId={modId} name={name} initial={snapshot} />;

  return (
    <List
      navigationTitle={`${name} — Settings`}
      searchBarPlaceholder="Search settings…"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={async () => {
              await revalidate();
            }}
          />
        </ActionPanel>
      }
    >
      {!isLoading ? <List.EmptyView title="Could not load settings" /> : undefined}
    </List>
  );
}

function LoadedModSettingsList({ modId, name, initial }: { modId: string; name: string; initial: SettingsSnapshot }) {
  const [store] = useState(() => createModSettingsStore(modId, initial));
  const { settings, isLoading, isSaving, error } = useModSettings(store, true);
  const [showDetail, setShowDetail] = useCachedState("mod-settings-show-detail", false);
  const shared = { store, showDetail, onToggleDetails: () => setShowDetail((previous) => !previous) };
  const scalars = settings.filter(isScalar);
  const groups = settings.filter((setting) => setting.kind === "group");
  const stringLists = settings.filter((setting) => setting.kind === "string-list");
  const ruleLists = settings.filter((setting) => setting.kind === "rule-list");
  return (
    <List
      navigationTitle={`${name} — Settings`}
      searchBarPlaceholder="Search settings…"
      isShowingDetail={showDetail}
      isLoading={isLoading || isSaving}
      throttle
      actions={
        <ActionPanel>
          <RefreshSettingsAction store={store} />
        </ActionPanel>
      }
    >
      {!settings.length && !error && !isLoading ? (
        <List.EmptyView title="This mod has no configurable settings" />
      ) : undefined}
      {error ? <SettingsReadError store={store} /> : undefined}
      {scalars.length ? (
        <List.Section title={groups.length + ruleLists.length + stringLists.length ? "General" : "Settings"}>
          {scalars.map((setting) => (
            <SettingItem key={setting.path} {...shared} setting={setting} />
          ))}
        </List.Section>
      ) : undefined}
      {[...groups, ...stringLists, ...ruleLists].map((setting) => (
        <List.Section key={setting.path} title={setting.name}>
          <SettingItem {...shared} setting={setting} />
        </List.Section>
      ))}
    </List>
  );
}
