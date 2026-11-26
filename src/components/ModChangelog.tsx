import { showError } from "@chrismessina/raycast-kit";
import { ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMarkdownImages } from "../hooks/useMarkdownImages";
import { RefreshAction } from "./Actions";

export function ModChangelog({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: markdown,
    revalidate,
  } = useFetch(
    `https://raw.githubusercontent.com/ramensoftware/windhawk-mods/refs/heads/pages/changelogs/${encodeURIComponent(id)}.md`,
    {
      onError(error) {
        void showError(error, { title: `Could not fetch changelog for ${id}` });
      },
    },
  );

  const source = typeof markdown === "string" ? markdown : "";
  const body = useMarkdownImages(source);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Changelog`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Changelog\n\n${body}`}
      actions={
        <ActionPanel>
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
