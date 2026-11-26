import { runCli } from "../utils/cli";
import { isRecord } from "./schema";
import type { FlatSettings } from "./types";

export async function getSettingsValues(modId: string): Promise<FlatSettings> {
  const data = await runCli<{ settings: unknown }>(["mod", "settings", "get", modId]);
  if (!isRecord(data.settings)) throw new Error("Invalid stored mod settings");
  return data.settings;
}

export async function getSettingsOptions(modId: string): Promise<FlatSettings> {
  const data = await runCli<{ options: unknown }>(["mod", "settings", "options", modId]);
  if (!isRecord(data.options)) throw new Error("Invalid dynamic mod settings options");
  return data.options;
}

export async function readSettings(modId: string) {
  const [values, dynamicOptions] = await Promise.all([getSettingsValues(modId), getSettingsOptions(modId)]);
  return { values, dynamicOptions };
}
