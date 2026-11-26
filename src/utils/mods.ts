import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InstalledMod, InstalledModDetails, Mod, ModDetails, ModVersion } from "../types";
import { readSettings } from "../settings/api";
import { parseDefinitions } from "../settings/schema";
import { runCli } from "./cli";

type InstalledModSummary = Omit<InstalledMod, "availableUpdateVersion">;

async function listInstalledMods(): Promise<InstalledModSummary[]> {
  const data = await runCli<{ mods: InstalledModSummary[] }>(["mod", "list"]);
  if (!Array.isArray(data.mods)) throw new Error("Invalid installed mods response");
  return data.mods;
}

export async function getInstalledMods(): Promise<InstalledMod[]> {
  const mods = await listInstalledMods();
  return Promise.all(
    mods.map(async (mod) => ({
      ...mod,
      availableUpdateVersion: mod.updateAvailable ? await fetchLatestRepoVersion(mod.id) : null,
    })),
  );
}

async function fetchLatestRepoVersion(id: string): Promise<string | null> {
  try {
    const data = await runCli<{ version?: string }>(["repo", "show", id]);
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function getInstalledModDetails(id: string): Promise<InstalledModDetails> {
  const [data, installedMods, current] = await Promise.all([
    runCli<Omit<InstalledModDetails, "settingsSnapshot"> & { initialSettings?: unknown }>(["mod", "show", id]),
    listInstalledMods(),
    readSettings(id),
  ]);
  if (data.id !== id || !data.metadata) throw new Error(`Invalid details for ${id}`);
  const installed = installedMods.find((mod) => mod.id === id);
  const { initialSettings, ...details } = data;
  const definitions = parseDefinitions(initialSettings);
  return {
    ...details,
    settingsSnapshot: { definitions, ...current },
    enabled: installed?.enabled ?? false,
    updateAvailable: installed?.updateAvailable ?? false,
    availableUpdateVersion: installed?.updateAvailable ? await fetchLatestRepoVersion(id) : null,
  };
}

export async function hasModSettings(id: string): Promise<boolean> {
  const data = await runCli<{ initialSettings?: unknown }>(["mod", "show", id]);
  return parseDefinitions(data.initialSettings).length > 0;
}

export async function getMods(): Promise<Mod[]> {
  const [data, installedMods] = await Promise.all([runCli<{ mods: Mod[] }>(["repo", "list"]), listInstalledMods()]);
  if (!Array.isArray(data.mods)) throw new Error("Invalid repository mods response");
  const installedById = new Map(installedMods.map((mod) => [mod.id, mod]));
  return data.mods.map((mod) => {
    const installed = installedById.get(mod.id);
    return {
      ...mod,
      installed: installed !== undefined,
      enabled: installed?.enabled ?? false,
      updateAvailable: installed?.updateAvailable ?? false,
      installedVersion: installed?.version ?? null,
    };
  });
}

export async function getModDetails(id: string): Promise<ModDetails> {
  const [data, installedMods] = await Promise.all([runCli<ModDetails>(["repo", "show", id]), listInstalledMods()]);
  if (data.id !== id || !data.metadata) throw new Error(`Invalid details for ${id}`);
  const installed = installedMods.find((mod) => mod.id === id);
  return {
    ...data,
    installed: installed !== undefined,
    enabled: installed?.enabled ?? false,
    updateAvailable: installed?.updateAvailable ?? false,
    installedVersion: installed?.version ?? null,
  };
}

export async function listVersions(id: string): Promise<ModVersion[]> {
  const data = await runCli<{ versions: ModVersion[] }>(["repo", "versions", id]);
  if (!Array.isArray(data.versions)) throw new Error(`Invalid versions for ${id}`);
  return data.versions;
}

export function getInstalledModSource(id: string): Promise<string> {
  return readFile(
    path.join(process.env.ProgramData || "C:\\ProgramData", "Windhawk", "ModsSource", `${id}.wh.cpp`),
    "utf8",
  );
}
