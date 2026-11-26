import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useElevatedOperation } from "../../hooks/useElevatedOperation";
import { scalarPair, scalarSettings, validateScalar } from "../../settings/operations";
import type { SettingsStore } from "../../settings/store";
import type { ScalarSetting, Setting } from "../../settings/types";
import { SettingField } from "./SettingField";
import { RefreshSettingsAction } from "./RefreshSettingsAction";
import { useModSettings } from "./useModSettings";

function initialFieldValue(field: ScalarSetting, isNew: boolean): string | boolean {
  if (field.kind === "boolean") return field.value;
  if (isNew && field.kind === "select") return field.options[0]?.value ?? "";
  if (isNew && field.kind === "number") return "";
  return String(field.value);
}

export function RuleForm({
  store,
  settings,
  displayNumber,
}: {
  store: SettingsStore;
  settings: Setting[];
  displayNumber?: number;
}) {
  const fields = scalarSettings(settings);
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(fields.map((field) => [field.path, initialFieldValue(field, !displayNumber)])),
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { isLoading, isSaving } = useModSettings(store);
  const runElevated = useElevatedOperation();
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={displayNumber ? `Edit Rule ${displayNumber}` : "New Rule"}
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={displayNumber ? "Save Rule" : "Add Rule"}
            onSubmit={async () => {
              const nextErrors = Object.fromEntries(
                fields.map((field) => [field.path, validateScalar(field, values[field.path])]),
              );
              setErrors(nextErrors);
              if (Object.values(nextErrors).some(Boolean)) return false;
              const pairs = fields.map((field) => scalarPair(field, values[field.path]));
              const saved = await runElevated(async () => {
                if (!(await store.save(pairs))) return false;
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
      {fields.map((field) => (
        <SettingField
          key={field.path}
          setting={field}
          value={values[field.path]}
          error={errors[field.path]}
          onChange={(value) => {
            setValues((previous) => ({ ...previous, [field.path]: value }));
            setErrors((previous) => ({ ...previous, [field.path]: undefined }));
          }}
          onBlur={() =>
            setErrors((previous) => ({ ...previous, [field.path]: validateScalar(field, values[field.path]) }))
          }
        />
      ))}
    </Form>
  );
}
