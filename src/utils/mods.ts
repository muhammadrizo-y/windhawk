import { showFailureToast } from "@raycast/utils";
import { InstalledMod, InstalledModDetails, Mod, ModDetails, ModSetting, ModVersion } from "../types";
import { execFileAsync, getCliPath } from "./helpers";

const cliPath = getCliPath();

export async function getInstalledMods(): Promise<InstalledMod[]> {
  const res = await execFileAsync(cliPath, ["mod", "list", "--json"], {
    env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
  });

  let mods: InstalledMod[];
  try {
    const parsed = JSON.parse(res.stdout);
    mods = parsed?.data?.mods || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not get installed mods" });
    return [];
  }

  // The CLI reports updateAvailable but not the new version itself, so the
  // latest version is fetched from the repo - only for updated mods.
  const updateIds = mods.filter((mod) => mod.updateAvailable).map((mod) => mod.id);
  const versionEntries = await Promise.all(
    updateIds.map(async (id) => [id, await fetchLatestRepoVersion(id)] as const),
  );
  const versionById = new Map(versionEntries);

  return mods.map((mod) => ({
    id: mod.id,
    version: mod.version,
    name: mod.name,
    author: mod.author,
    description: mod.description,
    enabled: mod.enabled,
    updateAvailable: mod.updateAvailable,
    availableUpdateVersion: mod.updateAvailable ? (versionById.get(mod.id) ?? null) : null,
  }));
}

async function fetchLatestRepoVersion(id: string): Promise<string | null> {
  try {
    const res = await execFileAsync(cliPath, ["repo", "show", id, "--json"]);
    const parsed = JSON.parse(res.stdout);
    return parsed?.data?.version ?? null;
  } catch {
    return null;
  }
}

export async function getInstalledModDetails(id: string): Promise<InstalledModDetails> {
  // `mod show [id] --json` does not include enabled/updateAvailable,
  // so they are fetched separately from the installed mods list.
  // `mod settings get` returns the current values (flat, dotted keys for
  // groups, booleans as 0/1), merged over initialSettings below.
  // `mod settings options` returns runtime-written options for mods with
  // $dynamicSelect settings ({} when unused); they override declared options.
  const [res, installedMods, currentSettings, optionsRes] = await Promise.all([
    execFileAsync(cliPath, ["mod", "show", id, "--json"], {
      env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
    }),
    getInstalledMods().catch(() => [] as InstalledMod[]),
    getModSettingsValues(id),
    execFileAsync(cliPath, ["mod", "settings", "options", id, "--json"], {
      env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
    }).catch(() => null),
  ]);

  try {
    const parsed = JSON.parse(res.stdout);
    const installed = installedMods.find((mod) => mod.id === id);

    let dynamicOptions: Record<string, unknown> = {};
    try {
      dynamicOptions = JSON.parse(optionsRes?.stdout ?? "")?.data?.options ?? {};
    } catch {
      // fall back to declared options below
    }

    const initialSettings: ModSetting[] = parsed?.data?.initialSettings ?? [];

    const modDetails: InstalledModDetails = {
      ...parsed?.data,
      initialSettings,
      settings: applyCurrentSettings(initialSettings, currentSettings, dynamicOptions),
      enabled: installed?.enabled ?? false,
      updateAvailable: installed?.updateAvailable ?? false,
      availableUpdateVersion: installed?.availableUpdateVersion ?? null,
    };

    return modDetails;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get installed mod details for ${id}` });
    return {} as InstalledModDetails;
  }
}

/**
 * Fetches the current runtime setting values for a mod: a flat record with
 * dotted keys for groups and bracket indices for rule lists
 * (e.g. "suffixRules[0].search"), booleans as 0/1. Never throws; failures
 * yield an empty record so callers fall back to initial values.
 */
export async function getModSettingsValues(id: string): Promise<Record<string, unknown>> {
  try {
    const res = await execFileAsync(cliPath, ["mod", "settings", "get", id, "--json"], {
      env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
    });
    return JSON.parse(res.stdout)?.data?.settings ?? {};
  } catch {
    return {};
  }
}

/**
 * Overlays current values from `mod settings get` onto the initialSettings
 * tree. Groups recurse with dotted paths (e.g. "propertyPages.animate");
 * a missing key keeps its initial value. Booleans arrive as 0/1.
 * Repeatable rule lists (array of setting arrays, e.g. suffixRules) recurse
 * with bracket-indexed paths (e.g. "suffixRules[0].search").
 * Repeatable primitive lists (array of strings, e.g. Action) are stored as
 * `path[0]`, `path[1]`… with no trailing field; stored entries (including
 * extra blank ones beyond the declared length) fully replace the declared
 * list. Runtime options from `mod settings options` ($dynamicSelect)
 * override declared options when present and well-shaped, else declared
 * options stay.
 */
export function applyCurrentSettings(
  settings: ModSetting[],
  current: Record<string, unknown>,
  dynamicOptions: Record<string, unknown>,
  prefix = "",
): ModSetting[] {
  return settings.map((setting) => {
    if (Array.isArray(setting.value)) {
      const path = prefix ? `${prefix}.${setting.key}` : setting.key;
      if (setting.value.length > 0 && Array.isArray(setting.value[0])) {
        const rules = setting.value as ModSetting[][];
        return {
          ...setting,
          value: rules.map((rule, index) => applyCurrentSettings(rule, current, dynamicOptions, `${path}[${index}]`)),
        };
      }
      // Primitive (string) list — or a declared-empty array, which we treat as
      // one too so a storage-read list never disappears. Groups (arrays of
      // objects) keep the group branch.
      const first = setting.value.length > 0 ? setting.value[0] : undefined;
      if (!Array.isArray(first) && (first === undefined || typeof first !== "object")) {
        return { ...setting, value: readPrimitiveList(setting, current, path) };
      }
      return { ...setting, value: applyCurrentSettings(setting.value as ModSetting[], current, dynamicOptions, path) };
    }

    const path = prefix ? `${prefix}.${setting.key}` : setting.key;
    if (!(path in current)) return withDynamicOptions(setting, dynamicOptions[path]);

    const raw = current[path];
    let value: number | boolean | string;
    if (typeof setting.value === "boolean") {
      value = raw === 1 || raw === "1" || raw === true;
    } else if (typeof setting.value === "number") {
      const numeric = typeof raw === "number" ? raw : Number(raw);
      value = Number.isFinite(numeric) ? numeric : setting.value;
    } else {
      value = String(raw);
    }
    return withDynamicOptions({ ...setting, value }, dynamicOptions[path]);
  });
}

/**
 * Reads a repeatable primitive list (string list) from flat storage:
 * values are addressed directly as `path[i]`, no trailing field. Extra
 * blank entries beyond the declared length are kept as-is.
 */
function readPrimitiveList(
  setting: ModSetting,
  current: Record<string, unknown>,
  path: string,
): string[] {
  const stored = collectListIndices(current, path);
  if (stored.length > 0) {
    return stored.map((index) => String(current[`${path}[${index}]`]));
  }
  return (setting.value as unknown as Array<string | number | boolean>).map(String);
}

export function collectListIndices(
  current: Record<string, unknown>,
  path: string,
): number[] {
  const pattern = new RegExp(`^${escapeRegExp(path)}\\[(\\d+)\\]$`);
  const indices: number[] = [];
  for (const key of Object.keys(current)) {
    const match = key.match(pattern);
    if (match) indices.push(parseInt(match[1], 10));
  }
  return indices.sort((a, b) => a - b);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fetches the storage-truth entries of a primitive (string) list setting,
 * e.g. path "buttons[1].Action" → ["", "cmd"]. Never throws.
 */
export async function getStringListValues(modId: string, path: string): Promise<string[]> {
  const flat = await getModSettingsValues(modId);
  return collectListIndices(flat, path).map((index) => String(flat[`${path}[${index}]`]));
}

/**
 * Replaces declared dropdown options with runtime ones when the runtime entry
 * is a non-empty array of single-entry maps (same shape as declared options).
 * Anything else keeps the schema entry untouched.
 */
function withDynamicOptions(setting: ModSetting, runtime: unknown): ModSetting {
  if (
    Array.isArray(runtime) &&
    runtime.length > 0 &&
    runtime.every(
      (entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && Object.keys(entry).length > 0,
    )
  ) {
    return { ...setting, options: runtime as Record<string, string>[] };
  }
  return setting;
}

export async function getMods(): Promise<Mod[]> {
  const [repoResult, installedMods] = await Promise.all([
    execFileAsync(cliPath, ["repo", "list", "--json"]),
    getInstalledMods().catch(() => []),
  ]);

  try {
    const parsed = JSON.parse(repoResult.stdout);
    const mods: Mod[] = parsed?.data?.mods || [];

    const installedById = new Map(installedMods.map((installedMod) => [installedMod.id, installedMod]));

    return mods.map((mod) => {
      const installedMod = installedById.get(mod.id);

      return {
        id: mod.id,
        metadata: mod.metadata,
        details: mod.details,
        installed: installedMod !== undefined,
        enabled: installedMod?.enabled ?? false,
        updateAvailable: installedMod?.updateAvailable ?? false,
        installedVersion: installedMod?.version ?? null,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not get mods" });
    return [];
  }
}

export async function getModDetails(id: string): Promise<ModDetails> {
  // `repo show` has no installed-mod info, so the installed
  // version is fetched separately from the installed mods list.
  const [res, installedMods] = await Promise.all([
    execFileAsync(cliPath, ["repo", "show", id, "--json"]),
    getInstalledMods().catch(() => [] as InstalledMod[]),
  ]);

  try {
    const parsed = JSON.parse(res.stdout);
    const installed = installedMods.find((mod) => mod.id === id);

    const modDetails: ModDetails = {
      ...parsed?.data,
      installed: installed !== undefined,
      enabled: installed?.enabled ?? false,
      updateAvailable: installed?.updateAvailable ?? false,
      installedVersion: installed?.version ?? null,
    };

    return modDetails;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get mod details for ${id}` });
    return {} as ModDetails;
  }
}

export async function listVersions(id: string) {
  const res = await execFileAsync(cliPath, ["repo", "versions", id, "--json"]);

  try {
    const parsed = JSON.parse(res.stdout);
    const versions: ModVersion[] = parsed?.data?.versions || [];

    return versions.map((version) => ({
      version: version.version,
      timestamp: version.timestamp,
      isPreRelease: version.isPreRelease,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get versions for ${id}` });
    return [];
  }
}
