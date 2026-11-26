import { Action, Color, Icon } from "@raycast/api";
import type { Setting } from "../../settings/types";
import { SettingForm } from "./SettingForm";
import { SettingItemBase } from "./SettingItemBase";
import type { SettingItemProps } from "./types";

export function EditableSetting(props: SettingItemProps<Extract<Setting, { kind: "text" | "number" }>>) {
  const value = String(props.setting.value);
  return (
    <SettingItemBase
      {...props}
      icon={Icon.TextInput}
      accessories={[{ tag: { value, color: Color.Blue }, tooltip: value }]}
    >
      <Action.Push
        icon={Icon.Pencil}
        title="Edit"
        target={<SettingForm setting={props.setting} store={props.store} />}
      />
    </SettingItemBase>
  );
}
