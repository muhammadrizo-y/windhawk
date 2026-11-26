import { showError } from "@chrismessina/raycast-kit";
import { ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { CopySourceCode, OpenInBrowserAction, RefreshAction } from "./Actions";

export default function ModSourceCode({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: source,
    revalidate,
  } = useFetch<string>(`https://raw.githubusercontent.com/ramensoftware/windhawk-mods/refs/heads/main/mods/${id}.wh.cpp`, {
    onError(error) {
      void showError(error, { title: `Could not fetch source code for ${id}` });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Source Code`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Source Code\n\n\`\`\`cpp\n${source}\n\`\`\``}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://github.com/ramensoftware/windhawk-mods/blob/main/mods/${id}.wh.cpp`} />
          <CopySourceCode source={source ?? ""} />
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
