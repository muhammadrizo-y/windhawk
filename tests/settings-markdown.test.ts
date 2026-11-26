import assert from "node:assert/strict";
import { test } from "node:test";
import { detailMarkdown, ruleMarkdown } from "../src/components/settings/markdown";
import { parseDefinitions } from "../src/settings/schema";
import { resolveSettings } from "../src/settings/resolve";

test("scalar details keep the existing name, description, divider, and value layout", () => {
  const setting = resolveSettings(
    parseDefinitions([{ key: "enabled", name: "Enabled", description: "Description", value: true }]),
    {},
  )[0];
  assert.equal(detailMarkdown(setting), "\n## Enabled\n\nDescription\n\n---\n\n## ON\n");
});

test("string-list details keep bullets and omit blank anchors", () => {
  const setting = resolveSettings(
    parseDefinitions([{ key: "actions", name: "Actions", value: ["", "first|second\nthird"] }]),
    {},
  )[0];
  assert.equal(detailMarkdown(setting), "## Actions\n\n---\n\n- first\\|second third");
});

test("rule details keep table columns, option labels, pipe escaping, and dense numbering", () => {
  const definition = parseDefinitions([
    {
      key: "rules",
      name: "Rules",
      value: [
        [
          { key: "name", name: "Name", value: "" },
          { key: "mode", name: "Mode", value: "", options: [{ selected: "Selected" }] },
        ],
      ],
    },
  ]);
  const setting = resolveSettings(definition, {
    "rules[0].name": "",
    "rules[0].mode": "",
    "rules[3].name": "a|b",
    "rules[3].mode": "selected",
  })[0];
  if (setting.kind !== "rule-list") assert.fail();
  assert.equal(detailMarkdown(setting), "## Rules\n\n| Name | Mode |\n| --- | --- |\n| a\\|b | Selected |");
  assert.equal(ruleMarkdown(1, setting.entries[1]), "## Rule 1\n\n**Name:** a|b\n\n**Mode:** Selected");
});
