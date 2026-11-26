import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseDefinitions } from "../src/settings/schema";
import { resolveSettings } from "../src/settings/resolve";
import { serializeSettings } from "../src/settings/operations";
import { parseCliResponse } from "../src/utils/cli-response";
import type { FlatSettings } from "../src/settings/types";

const execute = promisify(execFile);
const cliPath = process.argv[2] || "C:\\Program Files\\Windhawk\\windhawk-cli.exe";

async function read<T>(...args: string[]): Promise<T> {
  const { stdout } = await execute(cliPath, [...args, "--json"], {
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return parseCliResponse<T>(stdout);
}

async function main() {
  const { mods } = await read<{ mods: { id: string }[] }>("mod", "list");
  let total = 0;
  for (const { id } of mods) {
    const [declared, stored, options] = await Promise.all([
      read<{ initialSettings: unknown }>("mod", "show", id),
      read<{ settings: FlatSettings }>("mod", "settings", "get", id),
      read<{ options: FlatSettings }>("mod", "settings", "options", id),
    ]);
    const definitions = parseDefinitions(declared.initialSettings);
    const settings = resolveSettings(definitions, stored.settings, options.options);
    const resolved = new Map(serializeSettings(settings).map((pair) => [pair.key, pair.value]));
    for (const [key, value] of Object.entries(stored.settings)) {
      assert.equal(resolved.get(key), String(value), `${id}: ${key} did not round-trip`);
      total++;
    }
    console.log(`${id}: ${Object.keys(stored.settings).length} stored values verified`);
  }
  console.log(`Verified ${total} stored values across ${mods.length} installed mods. No writes performed.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
