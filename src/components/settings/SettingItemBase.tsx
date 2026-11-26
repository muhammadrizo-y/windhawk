import { ActionPanel, List } from "@raycast/api";
import type { SettingItemProps } from "./types";
import { detailMarkdown } from "./markdown";
import { ToggleDetailsAction } from "./ToggleDetailsAction";

export function SettingItemBase({
  setting,
  showDetail,
  onToggleDetails,
  icon,
  accessories,
  children,
}: Omit<SettingItemProps, "store"> & {
  icon: List.Item.Props["icon"];
  accessories: List.Item.Props["accessories"];
  children: ActionPanel.Props["children"];
}) {
  return (
    <List.Item
      id={setting.path}
      icon={icon}
      title={{ value: setting.name, tooltip: setting.name }}
      subtitle={
        !showDetail && setting.description ? { value: setting.description, tooltip: setting.description } : undefined
      }
      accessories={showDetail ? [] : accessories}
      detail={<List.Item.Detail markdown={detailMarkdown(setting)} />}
      actions={
        <ActionPanel>
          {children}
          <ActionPanel.Section>
            <ToggleDetailsAction onToggleDetails={onToggleDetails} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
