import { ActionPanel, Color, Icon } from "@raycast/api";
import type { Setting } from "../../settings/types";
import { displayValue, scalarPair } from "../../settings/operations";
import { ElevatedAction } from "../ElevatedAction";
import { SettingItemBase } from "./SettingItemBase";
import type { SettingItemProps } from "./types";

export function SelectSetting(props: SettingItemProps<Extract<Setting, { kind: "select" }>>) {
  const { setting, store } = props;
  const label = displayValue(setting);
  return (
    <SettingItemBase
      {...props}
      icon={Icon.List}
      accessories={[{ tag: { value: label, color: Color.Blue }, tooltip: label }]}
    >
      <ActionPanel.Submenu icon={Icon.List} title="Choose">
        {setting.options.map((option) => (
          <ElevatedAction
            key={option.value}
            icon={option.value === setting.value ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={option.label}
            onAction={async () => {
              await store.save([scalarPair(setting, option.value)]);
            }}
          />
        ))}
      </ActionPanel.Submenu>
    </SettingItemBase>
  );
}
