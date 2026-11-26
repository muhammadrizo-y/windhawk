import { showToast, Toast } from "@raycast/api";
import { countOf, failToast, showError } from "@chrismessina/raycast-kit";
import { runElevatedCommand, runElevatedSettingsBatch } from "./admin-worker";
import type { SettingPair } from "../settings/types";

interface ActionFeedback {
  loading: string;
  success: string;
  failure: string;
  reshowOnSuccess?: boolean;
}

async function performAction(operation: () => Promise<unknown>, feedback: ActionFeedback): Promise<boolean> {
  let toast: Toast | undefined;
  try {
    toast = await showToast({ style: Toast.Style.Animated, title: feedback.loading });
    await operation();
    if (feedback.reshowOnSuccess) {
      await toast.hide();
      await toast.show();
    }
    toast.style = Toast.Style.Success;
    toast.title = feedback.success;
    return true;
  } catch (error) {
    if (toast) failToast(toast, error, { title: feedback.failure });
    else await showError(error, { title: feedback.failure });
    return false;
  }
}

export function enableMod(id: string): Promise<boolean> {
  return performAction(() => runElevatedCommand("enable", id), {
    loading: `Enabling ${id}…`,
    success: `Enabled ${id}`,
    failure: `Could not enable ${id}`,
    reshowOnSuccess: true,
  });
}

export function disableMod(id: string): Promise<boolean> {
  return performAction(() => runElevatedCommand("disable", id), {
    loading: `Disabling ${id}…`,
    success: `Disabled ${id}`,
    failure: `Could not disable ${id}`,
    reshowOnSuccess: true,
  });
}

export function installMod(id: string, version?: string): Promise<boolean> {
  return performAction(() => runElevatedCommand("install", id, version), {
    loading: `Installing ${id}…`,
    success: `Installed ${id}`,
    failure: `Could not install ${id}`,
  });
}

export function updateMod(id: string): Promise<boolean> {
  return performAction(() => runElevatedCommand("update", id), {
    loading: `Updating ${id}…`,
    success: `Updated ${id}`,
    failure: `Could not update ${id}`,
  });
}

export function uninstallMod(id: string): Promise<boolean> {
  return performAction(() => runElevatedCommand("uninstall", id), {
    loading: `Uninstalling ${id}…`,
    success: `Uninstalled ${id}`,
    failure: `Could not uninstall ${id}`,
  });
}

export function setModSettings(id: string, pairs: SettingPair[]): Promise<boolean> {
  return performAction(() => runElevatedSettingsBatch(id, pairs), {
    loading: "Updating settings…",
    success: pairs.length === 1 ? "Setting updated" : `${countOf(pairs.length, "setting")} updated`,
    failure: "Could not update settings",
  });
}
