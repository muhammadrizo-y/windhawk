import { displayValue, isEmptySetting, isScalar } from "../../settings/operations";
import type { RuleInstance, Setting } from "../../settings/types";

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function detailMarkdown(setting: Setting): string {
  const header = [`## ${setting.name}`, setting.description ?? ""].filter(Boolean).join("\n\n");
  if (setting.kind === "string-list") {
    const entries = setting.entries.filter((entry) => entry.value.trim() !== "");
    return entries.length
      ? `${header}\n\n---\n\n${entries.map((entry) => `- ${escapeCell(entry.value)}`).join("\n")}`
      : header;
  }
  if (setting.kind === "rule-list") {
    const rules = setting.entries.filter((entry) => !entry.settings.every(isEmptySetting));
    if (!rules.length) return header;
    const columns = rules[0].settings.filter(isScalar);
    if (!columns.length) return header;
    const table = [
      `| ${columns.map((column) => escapeCell(column.name)).join(" | ")} |`,
      `| ${columns.map(() => "---").join(" | ")} |`,
      ...rules.map(
        (rule) =>
          `| ${columns
            .map((column) => {
              const field = rule.settings.find((entry) => entry.key === column.key && isScalar(entry));
              return escapeCell(field && isScalar(field) ? displayValue(field) : "");
            })
            .join(" | ")} |`,
      ),
    ].join("\n");
    return `${header}\n\n${table}`;
  }
  if (setting.kind === "group") return header;
  return `
## ${setting.name}

${setting.description ?? ""}

---

## ${displayValue(setting)}
`;
}

export function ruleMarkdown(displayNumber: number, rule: RuleInstance): string {
  const lines = rule.settings.filter(isScalar).map((field) => `**${field.name}:** ${ruleValue(field) || "(empty)"}`);
  return [`## Rule ${displayNumber}`, ...lines].join("\n\n");
}

function ruleValue(setting: Extract<Setting, { kind: "boolean" | "number" | "text" | "select" }>): string {
  return setting.kind === "boolean" ? (setting.value ? "On" : "Off") : displayValue(setting);
}

export function ruleSummary(rule: RuleInstance): string | undefined {
  for (const setting of rule.settings.filter(isScalar)) {
    const value = ruleValue(setting);
    if (value) return `${setting.name}: ${value}`;
  }
}
