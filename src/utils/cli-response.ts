import { isRecord } from "../settings/schema";

export function parseCliResponse<T>(stdout: string): T {
  const envelope: unknown = JSON.parse(stdout.replace(/^\uFEFF/, ""));
  if (!isRecord(envelope)) throw new Error("Invalid Windhawk CLI response");
  if (envelope.success === false) {
    const message =
      isRecord(envelope.error) && typeof envelope.error.message === "string"
        ? envelope.error.message
        : "Windhawk CLI command failed";
    throw new Error(message);
  }
  if (envelope.schemaVersion !== 1 || envelope.success !== true || !isRecord(envelope.data)) {
    throw new Error("Unsupported Windhawk CLI response");
  }
  return envelope.data as T;
}
