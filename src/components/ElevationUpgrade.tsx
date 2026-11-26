import { useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { registerWorker, unregisterWorker } from "../utils/admin-worker";

interface ElevationUpgradeProps {
  onSetupSuccess?: () => void | Promise<void>;
}

export default function ElevationUpgrade({ onSetupSuccess }: ElevationUpgradeProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpgrade() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await unregisterWorker();
      await registerWorker();
      await showToast({ style: Toast.Style.Success, title: "Admin worker upgraded" });
      pop();
      await onSetupSuccess?.();
    } catch (error) {
      await showError(error, { title: "Upgrade failed" });
    } finally {
      setIsLoading(false);
    }
  }

  const markdownContent = `
# Upgrade Required

Status: **Upgrade Required**\n\nThe extension upgraded its elevated worker since you registered (for example with new privileged actions such as mod settings), but the worker running on your machine is still the old one.

Upgrading replaces it. This takes two Administrator prompts back to back: one to remove the old worker, one to install the new worker.

---

The UAC prompts may close the Raycast window; open Raycast again to continue.
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Upgrade Required"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Upgrade Admin Worker" icon={Icon.Shield} onAction={handleUpgrade} />
        </ActionPanel>
      }
    />
  );
}
