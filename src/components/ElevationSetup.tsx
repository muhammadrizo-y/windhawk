import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, useNavigation, showToast, Toast, Icon, Color } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { isWorkerOutdated, isWorkerRunning, registerWorker, unregisterWorker } from "../utils/admin-worker";
import ElevationUpgrade from "./ElevationUpgrade";

interface ElevationSetupProps {
  onSetupSuccess?: () => void | Promise<void>;
}

export default function ElevationSetup({ onSetupSuccess }: ElevationSetupProps) {
  const { pop } = useNavigation();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setIsLoading(true);

    try {
      const registered = await isWorkerRunning();
      setIsRegistered(registered);
      setNeedsUpgrade(registered && (await isWorkerOutdated()));
    } catch {
      setIsRegistered(false);
      setNeedsUpgrade(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister() {
    setIsLoading(true);
    try {
      await registerWorker();
      setIsRegistered(true);
      setNeedsUpgrade(false);
      await showToast({ style: Toast.Style.Success, title: "Admin worker registered" });
    } catch (error) {
      await showError(error, { title: "Registration failed" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnregister() {
    setIsLoading(true);
    try {
      await unregisterWorker();
      setIsRegistered(false);
      await showToast({ style: Toast.Style.Success, title: "Admin worker unregistered" });
    } catch (error) {
      await showError(error, { title: "Unregister failed" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinue() {
    if (!isRegistered || needsUpgrade) return;
    pop();
    await onSetupSuccess?.();
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="## _Checking administrator worker status…_" />;
  }

  const markdownContent = `
# Administrator Privileges Setup

${
  !isRegistered
    ? "Status: **Setup Required**\n\nTo execute elevated actions seamlessly, perform a one-time registration. This will prompt for Windows Administrator rights once."
    : needsUpgrade
      ? "Status: **Upgrade Required**\n\nThe extension upgraded its elevated worker since you registered. Upgrade below to replace the old worker (this fixes actions failing until you do)."
      : "Status: **Ready (Elevated Worker Active)**\n\nAdministrator setup is active. You can run elevated commands with zero UAC prompts."
}

---

Some actions require Windhawk CLI commands to be run as administrator, such as installing / uninstalling mods, enabling / disabling them, and changing their settings.

The UAC prompt may close the Raycast window; open Raycast again to continue.

You can unregister, register, or upgrade the worker by opening this page again. \`Manage Mods\` / \`Search Mods\` command -> \`Manage Elevation\`.
`;

  return (
    <Detail
      markdown={markdownContent}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={!isRegistered ? "Not Registered" : needsUpgrade ? "Upgrade Required" : "Registered"}
            icon={
              !isRegistered
                ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                : needsUpgrade
                  ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                  : { source: Icon.Checkmark, tintColor: Color.Green }
            }
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isRegistered ? (
            <>
              {needsUpgrade ? (
                <Action.Push
                  title="Upgrade Admin Worker"
                  icon={Icon.Shield}
                  target={
                    <ElevationUpgrade
                      onSetupSuccess={async () => {
                        await checkStatus();
                        if (onSetupSuccess) {
                          pop();
                          await onSetupSuccess();
                        }
                      }}
                    />
                  }
                />
              ) : (
                <Action title="Continue" icon={Icon.ArrowRight} onAction={handleContinue} />
              )}
              <Action title="Unregister Admin Worker" icon={Icon.Trash} onAction={handleUnregister} />
            </>
          ) : (
            <Action title="Register Admin Worker (1-Time UAC)" icon={Icon.Shield} onAction={handleRegister} />
          )}
        </ActionPanel>
      }
    />
  );
}
