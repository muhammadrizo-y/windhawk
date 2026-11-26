import { showError } from "@chrismessina/raycast-kit";
import { ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CopySourceCode, RefreshAction } from "./Actions";
import { getInstalledModSource } from "../utils/mods";

export default function InstalledModSourceCode({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: source,
    revalidate,
  } = useCachedPromise(getInstalledModSource, [id], {
    onError(error) {
      void showError(error, { title: `Could not get source code for ${id}` });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Source Code`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Source Code\n\n\`\`\`cpp\n${source}\n\`\`\``}
      actions={
        <ActionPanel>
          <CopySourceCode source={source ?? ""} />
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
