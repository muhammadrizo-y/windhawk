import { BooleanSetting } from "./BooleanSetting";
import { EditableSetting } from "./EditableSetting";
import { GroupSetting } from "./GroupSetting";
import { RuleListSetting } from "./RuleListSetting";
import { SelectSetting } from "./SelectSetting";
import { StringListSetting } from "./StringListSetting";
import type { SettingItemProps } from "./types";

export function SettingItem({ setting, ...shared }: SettingItemProps) {
  switch (setting.kind) {
    case "boolean":
      return <BooleanSetting {...shared} setting={setting} />;
    case "select":
      return <SelectSetting {...shared} setting={setting} />;
    case "number":
    case "text":
      return <EditableSetting {...shared} setting={setting} />;
    case "string-list":
      return <StringListSetting {...shared} setting={setting} />;
    case "rule-list":
      return <RuleListSetting {...shared} setting={setting} />;
    case "group":
      return (
        <GroupSetting
          setting={setting}
          renderSetting={(child) => <SettingItem key={child.path} {...shared} setting={child} />}
        />
      );
  }
}
