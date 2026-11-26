import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSettings, findSetting, isEmptySetting, scalarPair, validateScalar } from "../src/settings/operations";
import { nextStorageIndex, storedIndices } from "../src/settings/paths";
import { createRule, resolveSettings } from "../src/settings/resolve";
import { parseDefinitions } from "../src/settings/schema";

const declarations = [
  { key: "enabled", value: true, name: "Enabled" },
  { key: "offset", value: -4, name: "Offset" },
  { key: "group", name: "Group", value: [{ key: "fade", name: "Fade", value: false }] },
  {
    key: "buttons",
    name: "Buttons",
    value: [
      [
        { key: "Preset", name: "Preset", value: "power", options: [{ custom: "Custom" }, { power: "Power" }] },
        { key: "Name", name: "Name", value: "" },
        { key: "Action", name: "Action", value: [""] },
        {
          key: "submenu",
          name: "Submenu",
          value: [
            [
              { key: "name", name: "Item name", value: "" },
              { key: "action", name: "Item action", value: [""] },
              { key: "submenu", name: "Level 2", value: [[{ key: "name", value: "" }]] },
            ],
          ],
        },
      ],
      [{ key: "Preset", value: "settings" }],
    ],
  },
];

test("normalizes every setting kind and sparse rule metadata without losing per-instance defaults", () => {
  const settings = resolveSettings(parseDefinitions(declarations), {});
  const preset = findSetting(settings, "buttons[1].Preset");
  assert.equal(preset?.name, "Preset");
  assert.equal(preset?.kind, "select");
  if (preset?.kind === "select") assert.equal(preset.value, "settings");
  assert.equal(findSetting(settings, "buttons[1].submenu[0].submenu[0].name")?.name, "name");
  assert.deepEqual(parseDefinitions([{ key: "empty", value: [] }])[0], {
    key: "empty",
    name: "empty",
    description: undefined,
    kind: "string-list",
    defaultValue: [],
  });
});

test("retains actual storage indices for gapped rules, string entries, and nested lists", () => {
  const flat = {
    "buttons[0].Preset": "power",
    "buttons[3].Preset": "documents",
    "buttons[3].Action[0]": "",
    "buttons[3].Action[7]": "run",
    "buttons[3].submenu[4].name": "Nested",
    "buttons[3].submenu[4].action[9]": "launch",
  };
  const settings = resolveSettings(parseDefinitions(declarations), flat);
  const buttons = findSetting(settings, "buttons");
  assert.equal(buttons?.kind, "rule-list");
  if (buttons?.kind !== "rule-list") assert.fail();
  assert.deepEqual(
    buttons.entries.map((entry) => entry.storageIndex),
    [0, 3],
  );
  const actions = findSetting(settings, "buttons[3].Action");
  if (actions?.kind !== "string-list") assert.fail();
  assert.deepEqual(actions.entries, [
    { storageIndex: 0, value: "" },
    { storageIndex: 7, value: "run" },
  ]);
  assert.equal(
    nextStorageIndex(actions.entries, (entry) => !entry.value),
    0,
  );
  assert.equal(
    nextStorageIndex([{ storageIndex: 7, value: "run" }], () => false),
    8,
  );
  assert.equal(findSetting(settings, "buttons[3].submenu[4].action")?.kind, "string-list");
  assert.deepEqual(storedIndices(flat, "buttons[3].Action", "rule-list"), []);
  assert.deepEqual(storedIndices(flat, "buttons", "string-list"), []);
});

test("reads current values over defaults and preserves missing values and negative numbers", () => {
  const settings = resolveSettings(parseDefinitions(declarations), { enabled: 0, "group.fade": 1, offset: "-1" });
  assert.equal(settings[0].kind === "boolean" && settings[0].value, false);
  assert.equal(settings[1].kind === "number" && settings[1].value, -1);
  const fade = findSetting(settings, "group.fade");
  assert.equal(fade?.kind === "boolean" && fade.value, true);
  const initial = resolveSettings(parseDefinitions(declarations), {});
  assert.equal(initial[0].kind === "boolean" && initial[0].value, true);
});

test("validates runtime options and supports dynamic selects on declared text", () => {
  const definitions = parseDefinitions([{ key: "value", value: "a" }]);
  const valid = resolveSettings(definitions, {}, { value: [{ a: "Alpha" }] })[0];
  assert.equal(valid.kind, "select");
  for (const options of [[], [{ a: 12 }], [{ a: "A", b: "B" }], [null], "bad"]) {
    assert.equal(resolveSettings(definitions, {}, { value: options })[0].kind, "text");
  }
});

test("recursive clearing includes stored descendants and keeps blank anchors", () => {
  const settings = resolveSettings(parseDefinitions(declarations), {
    "buttons[3].Preset": "documents",
    "buttons[3].Action[7]": "run",
    "buttons[3].submenu[4].name": "Nested",
    "buttons[3].submenu[4].action[9]": "launch",
  });
  const buttons = findSetting(settings, "buttons");
  if (buttons?.kind !== "rule-list") assert.fail();
  const pairs = clearSettings(buttons.entries[0].settings);
  assert.ok(pairs.some((pair) => pair.key === "buttons[3].Action[7]" && pair.value === ""));
  assert.ok(pairs.some((pair) => pair.key === "buttons[3].submenu[4].action[9]" && pair.value === ""));
  const flat = Object.fromEntries(pairs.map((pair) => [pair.key, pair.value]));
  assert.equal(
    isEmptySetting(resolveSettings(parseDefinitions(declarations), flat).find((setting) => setting.key === "buttons")!),
    true,
  );
  assert.equal(isEmptySetting(resolveSettings(parseDefinitions([{ key: "strings", value: [""] }]), {})[0]), true);
  assert.equal(isEmptySetting(resolveSettings(parseDefinitions([{ key: "strings", value: ["run"] }]), {})[0]), false);
});

test("new rules are blank and never inherit another instance's live values", () => {
  const buttons = resolveSettings(parseDefinitions(declarations), { "buttons[0].Name": "Existing" })[3];
  if (buttons.kind !== "rule-list") assert.fail();
  const next = createRule(buttons, 5);
  assert.ok(next.every(isEmptySetting));
  assert.equal(findSetting(next, "buttons[5].Action")?.kind, "string-list");
});

test("serializes boolean writes as 0/1 and rejects non-finite numeric form values", () => {
  const settings = resolveSettings(parseDefinitions(declarations), {});
  if (settings[0].kind !== "boolean" || settings[1].kind !== "number") assert.fail();
  assert.deepEqual(scalarPair(settings[0], false), { key: "enabled", value: "0" });
  for (const value of ["", " ", "Infinity", "NaN"]) assert.ok(validateScalar(settings[1], value));
  assert.equal(validateScalar(settings[1], "-4"), undefined);
});

test("rejects unsupported declarations instead of interpreting arbitrary arrays as settings", () => {
  assert.throws(() => parseDefinitions([{ key: "bad", value: [1, 2] }]));
  assert.throws(() => parseDefinitions([{ key: "bad", value: null }]));
});

test("sparse nested declarations inherit child definitions while keeping their own defaults", () => {
  const definitions = parseDefinitions([
    {
      key: "rules",
      value: [
        [
          {
            key: "group",
            name: "Group",
            value: [
              { key: "a", name: "A", value: 1 },
              { key: "b", name: "B", value: false },
            ],
          },
          {
            key: "nested",
            name: "Nested",
            value: [
              [
                { key: "name", name: "Name", value: "first" },
                { key: "action", name: "Action", value: [""] },
              ],
            ],
          },
        ],
        [
          { key: "group", value: [{ key: "a", value: 2 }] },
          { key: "nested", value: [[{ key: "name", value: "second" }]] },
        ],
      ],
    },
  ]);
  const settings = resolveSettings(definitions, {});
  const a = findSetting(settings, "rules[1].group.a");
  assert.equal(a?.name, "A");
  assert.equal(a?.kind === "number" && a.value, 2);
  assert.equal(findSetting(settings, "rules[1].group.b")?.kind, "boolean");
  const nestedName = findSetting(settings, "rules[1].nested[0].name");
  assert.equal(nestedName?.name, "Name");
  assert.equal(nestedName?.kind === "text" && nestedName.value, "second");
  assert.equal(findSetting(settings, "rules[1].nested[0].action")?.kind, "string-list");
});
