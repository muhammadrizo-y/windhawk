import { Action, Icon } from "@raycast/api";

export function ToggleDetailsAction({ onToggleDetails }: { onToggleDetails: () => void }) {
  return (
    <Action
      icon={Icon.AppWindowSidebarLeft}
      title="Toggle Info Panel"
      onAction={onToggleDetails}
      shortcut={{ modifiers: ["ctrl"], key: "i" }}
    />
  );
}
