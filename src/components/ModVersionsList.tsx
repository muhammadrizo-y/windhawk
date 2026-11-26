import { showError } from "@chrismessina/raycast-kit";
import { ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listVersions } from "../utils/mods";
import { timestampToLongUTCDate } from "../utils/helpers";
import { CopyVersionAction, InstallModAction, RefreshAction } from "./Actions";

export default function ModVersionsList({
  id,
  name,
  onVersionInstalled,
}: {
  id: string;
  name: string;
  onVersionInstalled?: (version: string) => void | Promise<void>;
}) {
  const {
    data: versions,
    isLoading,
    revalidate,
  } = useCachedPromise(listVersions, [id], {
    onError(error) {
      void showError(error, { title: `Failed to load versions for ${id}` });
    },
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${name} — Install Version`}
      searchBarPlaceholder={`Search ${name} versions…`}
    >
      {versions?.toReversed().map((ver) => (
        <List.Item
          key={ver?.version ?? ""}
          icon={Icon.Tag}
          title={ver?.version ?? ""}
          subtitle={ver?.isPreRelease ? "Pre-release" : undefined}
          accessories={[
            {
              icon: Icon.Calendar,
              tag: new Date(ver?.timestamp * 1000),
              tooltip: timestampToLongUTCDate(ver?.timestamp * 1000),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <InstallModAction
                  id={id}
                  version={ver?.version}
                  actionTitle="Install Version"
                  onSuccess={() => onVersionInstalled?.(ver?.version ?? "")}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyVersionAction version={ver?.version} shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <RefreshAction revalidate={revalidate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
