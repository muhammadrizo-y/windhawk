import { getErrorMessage } from "@chrismessina/raycast-kit/errors";
import { execFileAsync, getCliPath } from "./helpers";
import { parseCliResponse } from "./cli-response";

export async function runCli<T>(args: string[]): Promise<T> {
  let stdout: string;
  try {
    const result = await execFileAsync(getCliPath(), [...args, "--json"], {
      env: { ...process.env, ProgramData: process.env.ProgramData || "C:\\ProgramData" },
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    stdout = result.stdout;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(
        "Windhawk CLI was not found. Install Windhawk 2.0 alpha 3 or newer and check CLI Path in extension preferences.",
        { cause: error },
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "stdout" in error &&
      typeof error.stdout === "string" &&
      error.stdout.trim()
    ) {
      parseCliResponse(error.stdout);
    }
    throw new Error(getErrorMessage(error), { cause: error });
  }
  return parseCliResponse<T>(stdout);
}
