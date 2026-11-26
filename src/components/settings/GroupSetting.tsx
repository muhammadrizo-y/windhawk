import type { JSX } from "react";
import type { GroupSetting as Group, Setting } from "../../settings/types";

export function GroupSetting({
  setting,
  renderSetting,
}: {
  setting: Group;
  renderSetting: (setting: Setting) => JSX.Element;
}) {
  return <>{setting.children.map(renderSetting)}</>;
}
