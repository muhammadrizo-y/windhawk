import type { SettingDefinition, SettingOption } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOptions(value: unknown): SettingOption[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const options: SettingOption[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || Object.keys(entry).length !== 1) return undefined;
    const [key, label] = Object.entries(entry)[0];
    if (typeof label !== "string") return undefined;
    options.push({ value: key, label });
  }
  return options;
}

export function parseDefinitions(value: unknown): SettingDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Invalid mod settings declaration");
  return value.map(parseDefinition);
}

function parseDefinition(raw: unknown): SettingDefinition {
  if (!isRecord(raw) || typeof raw.key !== "string") throw new Error("Invalid setting declaration");
  const info = {
    key: raw.key,
    name: typeof raw.name === "string" ? raw.name : raw.key,
    description: typeof raw.description === "string" ? raw.description : undefined,
  };
  const value = raw.value;
  if (typeof value === "boolean") return { ...info, kind: "boolean", defaultValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { ...info, kind: "number", defaultValue: value };
  if (typeof value === "string") {
    const options = parseOptions(raw.options);
    return options
      ? { ...info, kind: "select", defaultValue: value, options }
      : { ...info, kind: "text", defaultValue: value };
  }
  if (!Array.isArray(value)) throw new Error(`Unsupported setting value: ${raw.key}`);
  if (value.length === 0 || value.every((entry) => typeof entry === "string")) {
    return { ...info, kind: "string-list", defaultValue: value };
  }
  if (value.every(Array.isArray)) {
    const template = mergeFields(value.flat());
    return {
      ...info,
      kind: "rule-list",
      template: parseDefinitions(template),
      defaults: value.map((fields) => parseDefinitions(mergeFields([...template, ...fields], true))),
    };
  }
  return { ...info, kind: "group", children: parseDefinitions(value) };
}

function mergeFields(fields: unknown[], replaceValues = false): Record<string, unknown>[] {
  const merged = new Map<string, Record<string, unknown>>();
  for (const field of fields) {
    if (!isRecord(field) || typeof field.key !== "string") throw new Error("Invalid rule field declaration");
    const existing = merged.get(field.key);
    merged.set(field.key, existing ? mergeField(existing, field, replaceValues) : field);
  }
  return [...merged.values()];
}

function mergeField(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  replaceValues: boolean,
): Record<string, unknown> {
  const result = replaceValues ? { ...existing, ...incoming } : { ...incoming, ...existing };
  const left = existing.value;
  const right = incoming.value;
  if (!Array.isArray(left) || !Array.isArray(right)) return result;
  if (left.length && right.length && left.every(isRecord) && right.every(isRecord)) {
    return { ...result, value: mergeFields([...left, ...right], replaceValues) };
  }
  if (left.length && right.length && left.every(Array.isArray) && right.every(Array.isArray)) {
    const preferred = replaceValues ? right : left;
    const fallback = replaceValues ? left : right;
    return {
      ...result,
      value: preferred.map((fields, index) => mergeFields([...(fallback[index] ?? fallback[0]), ...fields], true)),
    };
  }
  return result;
}
