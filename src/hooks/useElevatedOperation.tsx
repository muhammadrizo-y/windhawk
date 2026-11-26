import { useRef } from "react";
import { useNavigation } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { isWorkerOutdated, isWorkerRunning } from "../utils/admin-worker";
import ElevationSetup from "../components/ElevationSetup";
import ElevationUpgrade from "../components/ElevationUpgrade";

export function useElevatedOperation() {
  const { push } = useNavigation();
  const running = useRef(false);

  return async (operation: () => Promise<boolean>): Promise<boolean | undefined> => {
    if (running.current) return false;
    running.current = true;
    try {
      const resume = async () => {
        try {
          await operation();
        } catch (error) {
          await showError(error, { title: "Could not complete action" });
        }
      };
      if (!(await isWorkerRunning())) {
        push(<ElevationSetup onSetupSuccess={resume} />);
        return;
      }
      if (await isWorkerOutdated()) {
        push(<ElevationUpgrade onSetupSuccess={resume} />);
        return;
      }
      return await operation();
    } catch (error) {
      await showError(error, { title: "Could not complete action" });
      return false;
    } finally {
      running.current = false;
    }
  };
}
