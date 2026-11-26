import type { SettingPair } from "../settings/types";

export type ModAction = "enable" | "disable" | "update" | "uninstall";
export type WorkerRequest =
  | { action: ModAction; modId: string }
  | { action: "install"; modId: string; version?: string }
  | { action: "settings"; modId: string; pairs: SettingPair[] };

const validIdentifier = /^[A-Za-z0-9_.-]+$/;
const validSettingKey = /^[A-Za-z0-9_.[\]-]+$/;

export function validateWorkerRequest(request: WorkerRequest): void {
  if (!validIdentifier.test(request.modId)) throw new Error("Blocked: invalid mod id.");
  switch (request.action) {
    case "enable":
    case "disable":
    case "update":
    case "uninstall":
      return;
    case "install":
      if (request.version && !validIdentifier.test(request.version)) throw new Error("Blocked: invalid version.");
      return;
    case "settings":
      if (!request.pairs.length) throw new Error("Blocked: no setting pairs to write.");
      for (const pair of request.pairs) {
        if (!validSettingKey.test(pair.key)) throw new Error("Blocked: invalid setting key.");
        if (typeof pair.value !== "string") throw new Error("Blocked: missing setting value.");
      }
      return;
    default:
      throw new Error("Blocked: unknown worker action.");
  }
}
