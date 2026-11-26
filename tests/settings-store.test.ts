import assert from "node:assert/strict";
import { test } from "node:test";
import { createSettingsStore } from "../src/settings/store";
import { parseDefinitions } from "../src/settings/schema";
import { parseCliResponse } from "../src/utils/cli-response";

const initial = {
  definitions: parseDefinitions([{ key: "name", value: "default" }]),
  values: { name: "current" },
  dynamicOptions: {},
};

test("failed reads preserve successful state and block writes until a successful refresh", async () => {
  let fails = true;
  let writes = 0;
  const errors: boolean[] = [];
  const store = createSettingsStore(initial, {
    read: async () => {
      if (fails) throw new Error("Read failed");
      return { values: { name: "fresh" }, dynamicOptions: {} };
    },
    write: async () => {
      writes++;
      return true;
    },
    onError: (_, saved) => {
      errors.push(saved);
    },
  });
  const original = store.getSnapshot().settings;
  assert.equal(await store.refresh(), false);
  assert.equal(store.getSnapshot().settings, original);
  assert.equal(await store.save([{ key: "name", value: "new" }]), false);
  assert.equal(writes, 0);
  fails = false;
  assert.equal(await store.refresh(), true);
  assert.equal(store.getSnapshot().error, undefined);
  assert.deepEqual(errors, [false]);
});

test("a successful write followed by a failed refresh reports saved status and does not request a second write", async () => {
  const errors: boolean[] = [];
  let writes = 0;
  const store = createSettingsStore(initial, {
    read: async () => {
      throw new Error("Refresh failed");
    },
    write: async () => {
      writes++;
      return true;
    },
    onError: (_, saved) => {
      errors.push(saved);
    },
  });
  assert.equal(await store.save([{ key: "name", value: "new" }]), true);
  assert.equal(writes, 1);
  assert.deepEqual(errors, [true]);
  assert.equal(store.getSnapshot().isSaving, false);
});

test("failed writes do not refresh or replace successful data", async () => {
  let reads = 0;
  const store = createSettingsStore(initial, {
    read: async () => {
      reads++;
      return initial;
    },
    write: async () => false,
    onError: () => {},
  });
  assert.equal(await store.save([{ key: "name", value: "new" }]), false);
  assert.equal(reads, 0);
});

test("concurrent refreshes share one read and concurrent saves cannot duplicate writes", async () => {
  let finish!: (value: typeof initial) => void;
  let writes = 0;
  const store = createSettingsStore(initial, {
    read: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    write: async () => {
      writes++;
      return true;
    },
    onError: () => {},
  });
  const first = store.refresh();
  assert.equal(store.refresh(), first);
  finish(initial);
  await first;
  const save = store.save([{ key: "name", value: "new" }]);
  assert.equal(await store.save([{ key: "name", value: "duplicate" }]), false);
  await Promise.resolve();
  finish(initial);
  assert.equal(await save, true);
  assert.equal(writes, 1);
});

test("CLI envelopes distinguish empty success from malformed and explicit failure responses", () => {
  assert.deepEqual(parseCliResponse('{"schemaVersion":1,"success":true,"data":{"settings":{}}}'), { settings: {} });
  assert.throws(() => parseCliResponse('{"schemaVersion":1,"success":false,"error":{"message":"Denied"}}'), /Denied/);
  assert.throws(() => parseCliResponse('{"data":{}}'), /Unsupported/);
  assert.throws(() => parseCliResponse("bad json"));
});
