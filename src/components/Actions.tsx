import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard } from "@raycast/api";
import { JSX, useState } from "react";
import { ElevatedAction } from "./ElevatedAction";
import { disableMod, enableMod, installMod, uninstallMod, updateMod } from "../utils/actions";
import ElevationSetup from "./ElevationSetup";
import { ModChangelog } from "./ModChangelog";
import { listVersions } from "../utils/mods";
import { ModSetting, ModVersion } from "../types";
import { showFailureToast } from "@raycast/utils";
import { exePath, timestampToUTCDate } from "../utils/helpers";
import ModVersionsList from "./ModVersionsList";
import InstalledModSourceCode from "./InstalledModSourceCode";
import ModSourceCode from "./ModSourceCode";
import ModSettingsList from "./ModSettingsList";

export function ShowDetailsAction({ target }: { target: JSX.Element }) {
  return <Action.Push icon={Icon.AppWindowSidebarRight} title="Show Details" target={target} />;
}

export function ToggleModAction<T>({
  enabled,
  id,
  onSuccess,
}: {
  enabled: boolean;
  id: string;
  onSuccess: () => Promise<T> | void;
}) {
  return (
    <ElevatedAction
      icon={enabled ? Icon.CircleDisabled : Icon.CheckCircle}
      title={enabled ? "Disable Mod" : "Enable Mod"}
      onAction={async () => {
        const ok = enabled ? await disableMod(id) : await enableMod(id);
        if (ok) {
          await onSuccess?.();
        }
      }}
    />
  );
}

export function ConfigureModAction({ id, name, settings }: { id: string; name: string; settings: ModSetting[] }) {
  return (
    <Action.Push
      icon={Icon.Cog}
      title="Configure Mod"
      target={<ModSettingsList modId={id} name={name} settings={settings} />}
      shortcut={Keyboard.Shortcut.Common.Edit}
    />
  );
}

export function OpenInWindhawkAction({ id }: { id: string }) {
  return (
    <Action.Open
      icon={{ fileIcon: exePath }}
      title="Open in Windhawk"
      target={`windhawk://mods/${id}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export function ViewChangelogAction({ id, name }: { id: string; name: string }) {
  return (
    <Action.Push
      icon={Icon.Document}
      title="View Changelog"
      target={<ModChangelog id={id} name={name} />}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "v" }}
    />
  );
}

export function ViewInstalledModSourceCodeAction({ id, name }: { id: string; name: string }) {
  return (
    <Action.Push
      icon={Icon.Code}
      title="View Source Code"
      target={<InstalledModSourceCode id={id} name={name} />}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
    />
  );
}

export function ViewModSourceCodeAction({ id, name }: { id: string; name: string }) {
  return (
    <Action.Push
      icon={Icon.Code}
      title="View Source Code"
      target={<ModSourceCode id={id} name={name} />}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
    />
  );
}

type OpenInBrowserActionProps = { id: string; url?: never } | { id?: never; url: string };

export function OpenInBrowserAction({ id, url }: OpenInBrowserActionProps) {
  return (
    <Action.OpenInBrowser
      url={url ?? `https://windhawk.net/mods/${id}`}
      shortcut={{ modifiers: ["ctrl", "alt"], key: "o" }}
    />
  );
}

export function CopyModIdAction({ id }: { id: string }) {
  return <Action.CopyToClipboard title="Copy Mod ID" content={id} />;
}

export function CopyModNameAction({ name }: { name: string }) {
  return <Action.CopyToClipboard title="Copy Mod Name" content={name} />;
}

export function CopyVersionAction({
  version,
  shortcut,
}: {
  version: string;
  shortcut?: Action.CopyToClipboard.Props["shortcut"];
}) {
  return <Action.CopyToClipboard title="Copy Version" content={version} shortcut={shortcut} />;
}

export function CopyAllModInfoAction({ id, name, version }: { id: string; name: string; version: string }) {
  return <Action.CopyToClipboard title="Copy All" content={`${name} (${id}): ${version}`} />;
}

export function CopyModInfoSubmenu({ id, name, version }: { id: string; name: string; version: string }) {
  return (
    <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy Mod Info" shortcut={Keyboard.Shortcut.Common.Copy}>
      <CopyModIdAction id={id} />
      <CopyModNameAction name={name} />
      <CopyVersionAction version={version} />
      <CopyAllModInfoAction id={id} name={name} version={version} />
    </ActionPanel.Submenu>
  );
}

export function CopyCommandsSubmenu({ id }: { id: string }) {
  return (
    <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy Commands" shortcut={Keyboard.Shortcut.Common.CopyName}>
      <CopyInstallCommandAction id={id} />
      <CopyUpdateCommandAction id={id} />
      <CopyUninstallCommandAction id={id} />
    </ActionPanel.Submenu>
  );
}

export function CopyInstallCommandAction({ id }: { id: string }) {
  return <Action.CopyToClipboard title="Copy Install Command" content={`windhawk-cli mod install ${id}`} />;
}

export function CopyUpdateCommandAction({ id }: { id: string }) {
  return <Action.CopyToClipboard title="Copy Update Command" content={`windhawk-cli mod update ${id}`} />;
}

export function CopyUninstallCommandAction({ id }: { id: string }) {
  return <Action.CopyToClipboard title="Copy Uninstall Command" content={`windhawk-cli mod remove ${id}`} />;
}

export function RefreshAction<T>({ revalidate }: { revalidate: () => Promise<T> | void }) {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      onAction={() => revalidate()}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}

export function InstallModAction({
  id,
  version,
  actionTitle,
  onSuccess,
}: {
  id: string;
  version?: string;
  actionTitle?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  return (
    <ElevatedAction
      icon={Icon.ArrowDownCircle}
      title={actionTitle ? actionTitle : "Install Mod"}
      onAction={async () => {
        if (await installMod(id, version)) {
          await onSuccess?.();
        }
      }}
    />
  );
}

export function InstallVersionAction({
  id,
  name,
  shortcut,
  onSuccess,
}: {
  id: string;
  name: string;
  shortcut?: Action.Push.Props["shortcut"];
  onSuccess?: (installedVersion: string) => void | Promise<void>;
}) {
  return (
    <Action.Push
      icon={Icon.List}
      title="Install Version…"
      target={<ModVersionsList id={id} name={name} onVersionInstalled={onSuccess} />}
      shortcut={shortcut}
    />
  );
}

export function InstallVersionSubmenu({
  id,
  shortcut,
  onSuccess,
}: {
  id: string;
  shortcut?: ActionPanel.Submenu.Props["shortcut"];
  onSuccess?: (installedVersion: string) => void | Promise<void>;
}) {
  const [versions, setVersions] = useState<ModVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ActionPanel.Submenu
      isLoading={isLoading}
      onOpen={async () => {
        setIsLoading(true);
        try {
          const versions = await listVersions(id);
          setVersions(versions);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showFailureToast(message, { title: `Failed to load versions for ${id}` });
        } finally {
          setIsLoading(false);
        }
      }}
      icon={Icon.List}
      title="Install Version"
      shortcut={shortcut}
    >
      {versions.toReversed().map((ver) => (
        <ElevatedAction
          key={ver?.version}
          icon={Icon.Tag}
          title={`${ver?.version ?? ""} · ${timestampToUTCDate(ver?.timestamp * 1000)}${ver?.isPreRelease ? " · Pre-release" : ""}`}
          onAction={async () => {
            if (await installMod(id, ver?.version ?? "")) {
              await onSuccess?.(ver?.version ?? "");
            }
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function UpdateModAction<T>({ id, onSuccess }: { id: string; onSuccess: () => Promise<T> | void }) {
  return (
    <ElevatedAction
      icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Green }}
      title="Update Mod"
      onAction={async () => {
        if (await updateMod(id)) {
          await onSuccess?.();
        }
      }}
      shortcut={{ modifiers: ["ctrl"], key: "u" }}
    />
  );
}

export function UninstallModAction<T>({
  id,
  name,
  onSuccess,
}: {
  id: string;
  name: string;
  onSuccess: () => Promise<T> | void;
}) {
  return (
    <ElevatedAction
      icon={Icon.Trash}
      title="Uninstall Mod"
      style={Action.Style.Destructive}
      onAction={async () => {
        if (
          await confirmAlert({
            icon: { source: Icon.Trash, tintColor: Color.Red },
            title: `Uninstall "${name}" mod`,
            message: `This will also remove its configuration and settings.`,
            primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
          })
        ) {
          if (await uninstallMod(id)) {
            await onSuccess?.();
          }
        }
      }}
      shortcut={Keyboard.Shortcut.Common.Remove}
    />
  );
}

export function ManageElevationAction() {
  return <Action.Push icon={Icon.Shield} title="Manage Elevation" target={<ElevationSetup />} />;
}
