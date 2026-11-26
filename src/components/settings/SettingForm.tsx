import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useElevatedOperation } from "../../hooks/useElevatedOperation";
import { scalarPair, validateScalar } from "../../settings/operations";
import type { ScalarSetting } from "../../settings/types";
import type { SettingsStore } from "../../settings/store";
import { SettingField } from "./SettingField";
import { useModSettings } from "./useModSettings";
import { RefreshSettingsAction } from "./RefreshSettingsAction";

export function SettingForm({ setting, store }: { setting: ScalarSetting; store: SettingsStore }) {
  const [value, setValue] = useState(String(setting.value));
  const [error, setError] = useState<string>();
  const { isLoading, isSaving } = useModSettings(store);
  const runElevated = useElevatedOperation();
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={setting.name}
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const validation = validateScalar(setting, value);
              setError(validation);
              if (validation) return false;
              const saved = await runElevated(async () => {
                if (!(await store.save([scalarPair(setting, value)]))) return false;
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
      <SettingField
        setting={setting}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(String(next));
          setError(undefined);
        }}
        onBlur={() => setError(validateScalar(setting, value))}
      />
      <Form.Description text={setting.description ?? ""} />
    </Form>
  );
}
