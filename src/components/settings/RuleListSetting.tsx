import { Action, Icon } from "@raycast/api";
import { countOf } from "@chrismessina/raycast-kit";
import { isEmptySetting } from "../../settings/operations";
import type { Setting } from "../../settings/types";
import { SettingItemBase } from "./SettingItemBase";
import { RuleList } from "./RuleList";
import type { SettingItemProps } from "./types";

export function RuleListSetting(props: SettingItemProps<Extract<Setting, { kind: "rule-list" }>>) {
  const { setting, store } = props;
  const count = setting.entries.filter((entry) => !entry.settings.every(isEmptySetting)).length;
  return (
    <SettingItemBase {...props} icon={Icon.Box} accessories={[{ text: countOf(count, "rule") }]}>
      <Action.Push
        icon={Icon.List}
        title="Manage Rules"
        target={<RuleList store={store} path={setting.path} name={setting.name} />}
      />
    </SettingItemBase>
  );
}
