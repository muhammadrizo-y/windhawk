import { Action, Icon } from "@raycast/api";
import { countOf } from "@chrismessina/raycast-kit";
import type { Setting } from "../../settings/types";
import { SettingItemBase } from "./SettingItemBase";
import { StringList } from "./StringList";
import type { SettingItemProps } from "./types";

export function StringListSetting(props: SettingItemProps<Extract<Setting, { kind: "string-list" }>>) {
  const { setting, store } = props;
  const count = setting.entries.filter((entry) => entry.value.trim() !== "").length;
  return (
    <SettingItemBase {...props} icon={Icon.List} accessories={[{ text: countOf(count, "entry") }]}>
      <Action.Push
        icon={Icon.List}
        title="Manage Entries"
        target={<StringList store={store} path={setting.path} name={setting.name} />}
      />
    </SettingItemBase>
  );
}
