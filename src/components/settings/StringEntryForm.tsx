import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useElevatedOperation } from "../../hooks/useElevatedOperation";
import { entryPath } from "../../settings/paths";
import type { SettingsStore } from "../../settings/store";
import { RefreshSettingsAction } from "./RefreshSettingsAction";
import { useModSettings } from "./useModSettings";

export function StringEntryForm({
  store,
  path,
  storageIndex,
  name,
  initial = "",
  displayNumber,
}: {
  store: SettingsStore;
  path: string;
  storageIndex: number;
  name: string;
  initial?: string;
  displayNumber?: number;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const { isLoading, isSaving } = useModSettings(store);
  const runElevated = useElevatedOperation();
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={displayNumber ? `Edit Entry ${displayNumber}` : `New ${name} Entry`}
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={displayNumber ? "Save Entry" : "Add Entry"}
            onSubmit={async () => {
              if (!displayNumber && !value.trim()) {
                setError("Value is required");
                return false;
              }
              const saved = await runElevated(async () => {
                if (!(await store.save([{ key: entryPath(path, storageIndex), value }]))) return false;
                pop();
                return true;
              });
              if (saved === false) return false;
            }}
          />
          <RefreshSettingsAction store={store} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="entry"
        title={name}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
        info="One entry. Each line of the list becomes one entry when stored — manage additional entries with the list actions."
      />
    </Form>
  );
}
