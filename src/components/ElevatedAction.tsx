import { Action } from "@raycast/api";
import { useElevatedOperation } from "../hooks/useElevatedOperation";

interface ElevatedActionProps {
  icon?: Action.Props["icon"];
  title: Action.Props["title"];
  style?: Action.Props["style"];
  shortcut?: Action.Props["shortcut"];
  onAction: () => void | Promise<void>;
}

export function ElevatedAction({ onAction, ...props }: ElevatedActionProps) {
  const runElevated = useElevatedOperation();
  return (
    <Action
      {...props}
      onAction={async () => {
        await runElevated(async () => {
          await onAction();
          return true;
        });
      }}
    />
  );
}
