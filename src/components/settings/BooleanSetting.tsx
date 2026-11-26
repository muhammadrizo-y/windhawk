import { Color, Icon } from "@raycast/api";
import type { Setting } from "../../settings/types";
import { scalarPair } from "../../settings/operations";
import { ElevatedAction } from "../ElevatedAction";
import { SettingItemBase } from "./SettingItemBase";
import type { SettingItemProps } from "./types";

export function BooleanSetting(props: SettingItemProps<Extract<Setting, { kind: "boolean" }>>) {
  const { setting, store } = props;
  return (
    <SettingItemBase
      {...props}
      icon={setting.value ? Icon.CheckCircle : Icon.Circle}
      accessories={[{ tag: { value: setting.value ? "On" : "Off", color: setting.value ? Color.Blue : Color.Orange } }]}
    >
      <ElevatedAction
        icon={setting.value ? Icon.CircleDisabled : Icon.CheckCircle}
        title={setting.value ? "Turn Off" : "Turn On"}
        onAction={async () => {
          await store.save([scalarPair(setting, !setting.value)]);
        }}
      />
    </SettingItemBase>
  );
}
