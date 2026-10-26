import { ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
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
import { addRaycastWidthToMarkdownImages } from "../utils/helpers";

export default function InstalledModDetail({ modId }: { modId: string }) {
  const {
    data: mod,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      return await getInstalledModDetails(id);
    },
    [modId],
  );

  useEffect(() => {
    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      showFailureToast(message, { title: "Failed to load installed mod details" });
    }
  }, [error]);

  const id = mod?.id;
  const version = mod?.metadata?.version;
  const readme = addRaycastWidthToMarkdownImages(mod?.readme);
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
      markdown={readme}
      metadata={
        isLoading ? (
          <Detail.Metadata>
            <></>
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Mod ID">
              <Detail.Metadata.TagList.Item text={id} />
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
        !isLoading ? (
          <ActionPanel>
            <ActionPanel.Section>
              <ToggleModAction id={id ?? ""} enabled={enabled ?? false} onSuccess={revalidate} />
              {mod?.settings && mod.settings.length > 0 ? (
                <ConfigureModAction id={id ?? ""} name={name ?? ""} settings={mod.settings} />
              ) : undefined}
              {updateAvailable ? <UpdateModAction id={id ?? ""} onSuccess={revalidate} /> : undefined}
              <UninstallModAction id={id ?? ""} name={name ?? ""} onSuccess={revalidate} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <OpenInWindhawkAction id={id ?? ""} />
              <ViewChangelogAction id={id ?? ""} name={name ?? ""} />
              <ViewInstalledModSourceCodeAction id={id ?? ""} name={name ?? ""} />
              <OpenInBrowserAction id={id ?? ""} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyModInfoSubmenu id={id ?? ""} name={name ?? ""} version={version ?? ""} />
              <CopyCommandsSubmenu id={id ?? ""} />
            </ActionPanel.Section>
            <RefreshAction revalidate={revalidate} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
