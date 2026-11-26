import assert from "node:assert/strict";
import { test } from "node:test";
import { validateWorkerRequest, type WorkerRequest } from "../src/utils/worker-protocol";

test("setting keys allow nested bracket paths while mod identifiers and versions remain strict", () => {
  assert.doesNotThrow(() =>
    validateWorkerRequest({
      action: "settings",
      modId: "buttons",
      pairs: [{ key: "buttons[3].submenu[0].action[7]", value: 'run="a=b"; $value' }],
    }),
  );
  assert.throws(() => validateWorkerRequest({ action: "enable", modId: "buttons[3]" }), /invalid mod id/);
  assert.throws(
    () => validateWorkerRequest({ action: "install", modId: "buttons", version: "1[0]" }),
    /invalid version/,
  );
});

test("validates every pair before dispatch and rejects empty or malformed batches", () => {
  assert.throws(() => validateWorkerRequest({ action: "settings", modId: "buttons", pairs: [] }), /no setting pairs/);
  assert.throws(
    () =>
      validateWorkerRequest({
        action: "settings",
        modId: "buttons",
        pairs: [
          { key: "good", value: "ok" },
          { key: "bad;command", value: "" },
        ],
      }),
    /invalid setting key/,
  );
  assert.throws(
    () =>
      validateWorkerRequest({
        action: "settings",
        modId: "buttons",
        pairs: [{ key: "good", value: undefined }],
      } as unknown as WorkerRequest),
    /missing setting value/,
  );
  assert.throws(
    () => validateWorkerRequest({ action: "execute", modId: "buttons" } as unknown as WorkerRequest),
    /unknown worker action/,
  );
});
