import { showError } from "@chrismessina/raycast-kit";
import { ActionPanel, Clipboard, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getInstalledModDetails } from "../utils/mods";
import {
  ConfigureModAction,
  CopyCommandsSubmenu,
  CopyModInfoSubmenu,
  OpenInBrowserAction,
  OpenInWindhawkAction,
  RefreshAction,
  ToggleModAction,
  UninstallModAction,
  UpdateModAction,
  ViewChangelogAction,
  ViewInstalledModSourceCodeAction,
} from "./Actions";
import { useMarkdownImages } from "../hooks/useMarkdownImages";

export default function InstalledModDetail({ modId }: { modId: string }) {
  const {
    data: mod,
    isLoading,
    revalidate,
  } = useCachedPromise(getInstalledModDetails, [modId], {
    onError(error) {
      void showError(error, { title: "Failed to load installed mod details" });
    },
  });

  const id = mod?.id;
  const version = mod?.metadata?.version;
  const readme = useMarkdownImages(mod?.readme ?? "");
  const name = mod?.metadata?.name;
  const author = mod?.metadata?.author;
  const github = mod?.metadata?.github;
  const twitter = mod?.metadata?.twitter;
  const homepage = mod?.metadata?.homepage;
  const enabled = mod?.enabled;
  const updateAvailable = mod?.updateAvailable;
  const availableUpdateVersion = mod?.availableUpdateVersion;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={readme || undefined}
      metadata={
        isLoading ? (
          <Detail.Metadata>
            <></>
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Mod ID">
              <Detail.Metadata.TagList.Item text={id} onAction={async () => await Clipboard.copy(id ?? "")} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              icon={
                enabled
                  ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                  : { source: Icon.CircleDisabled, tintColor: Color.Orange }
              }
              title="Enabled"
              text={enabled ? { value: "Yes", color: Color.Blue } : { value: "No", color: Color.Orange }}
            />
            <Detail.Metadata.Label icon={Icon.Tag} title="Installed" text={version} />
            {updateAvailable ? (
              <Detail.Metadata.Label
                icon={{ source: Icon.Tag, tintColor: Color.Green }}
                title="Available"
                text={{ value: availableUpdateVersion ?? "latest", color: Color.Green }}
              />
            ) : undefined}
            <Detail.Metadata.Label icon={Icon.Person} title="Author" text={author} />
            {mod?.metadata?.github ? (
              <Detail.Metadata.Link title="GitHub" text={github ?? ""} target={github ?? ""} />
            ) : undefined}
            {mod?.metadata?.twitter ? (
              <Detail.Metadata.Link title="Twitter / X" text={twitter ?? ""} target={twitter ?? ""} />
            ) : undefined}
            {mod?.metadata?.homepage ? (
              <Detail.Metadata.Link title="Homepage" text={homepage ?? ""} target={homepage ?? ""} />
            ) : undefined}
            <Detail.Metadata.TagList title="Target Processes">
              {mod?.metadata?.include?.map((entry) => (
                <Detail.Metadata.TagList.Item key={entry} text={entry} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        mod && !isLoading ? (
          <ActionPanel>
            <ActionPanel.Section>
              <ToggleModAction id={id ?? ""} enabled={enabled ?? false} onSuccess={revalidate} />
              {mod.settingsSnapshot?.definitions.length > 0 ? (
                <ConfigureModAction id={id ?? ""} name={name ?? ""} initial={mod.settingsSnapshot} />
              ) : undefined}
              {updateAvailable ? <UpdateModAction id={id ?? ""} onSuccess={revalidate} /> : undefined}
              <UninstallModAction id={id ?? ""} name={name ?? ""} onSuccess={revalidate} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <OpenInWindhawkAction id={id ?? ""} />
              <ViewChangelogAction id={id ?? ""} name={name ?? ""} />
              <ViewInstalledModSourceCodeAction id={id ?? ""} name={name ?? ""} />
              <OpenInBrowserAction id={id ?? ""} shortcut={{ modifiers: ["ctrl", "alt"], key: "o" }} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyModInfoSubmenu id={id ?? ""} name={name ?? ""} version={version ?? ""} />
              <CopyCommandsSubmenu id={id ?? ""} />
            </ActionPanel.Section>
            <RefreshAction revalidate={revalidate} />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <RefreshAction revalidate={revalidate} />
          </ActionPanel>
        )
      }
    />
  );
}
