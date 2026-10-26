import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

export const exePath = path.join("C:", "Program Files", "Windhawk", "windhawk.exe");

export const preferences = getPreferenceValues();

export const execFileAsync = promisify(execFile);

export function getCliPath(): string {
  const cliPath = preferences.cliPath;

  if (cliPath) return cliPath.replace(/^"|"$/g, "");

  return path.join("C:", "Program Files", "Windhawk", "windhawk-cli.exe");
}

export function addRaycastWidthToMarkdownImages(markdown: string | undefined): string | undefined {
  if (!markdown) return markdown;

  const lines = markdown.split(/(\r\n|\n|\r)/);
  const tableWidths = new Map<number, number>();

  for (let separatorIndex = 2; separatorIndex < lines.length; separatorIndex += 2) {
    const separatorCells = splitMarkdownTableRow(lines[separatorIndex]);
    if (!separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) continue;

    const columnCount = separatorCells.length;
    let rowIndex = separatorIndex - 2;

    if (rowIndex >= 0 && splitMarkdownTableRow(lines[rowIndex]).length === columnCount) {
      tableWidths.set(rowIndex, Math.floor(440 / columnCount));
    }

    rowIndex = separatorIndex + 2;
    while (rowIndex < lines.length && splitMarkdownTableRow(lines[rowIndex]).length === columnCount) {
      tableWidths.set(rowIndex, Math.floor(440 / columnCount));
      rowIndex += 2;
    }
  }

  return lines
    .map((line, index) => (index % 2 === 0 ? addWidthToMarkdownImages(line, tableWidths.get(index) ?? 440) : line))
    .join("");
}

function splitMarkdownTableRow(row: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let escaped = false;

  for (const character of row.trim()) {
    if (character === "|" && !escaped) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }

    if (character === "\\" && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  cells.push(cell);

  if (row.trim().startsWith("|")) cells.shift();
  if (row.trim().endsWith("|")) cells.pop();

  return cells;
}

function addWidthToMarkdownImages(markdown: string, width: number): string {
  return markdown.replace(
    /(!\[[^\]]*\]\()(<[^>]*>|(?:\\.|[^\s)])+)(?=(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*)?\))/g,
    (_match, imageStart: string, destination: string) => {
      const isAngleBracketed = destination.startsWith("<") && destination.endsWith(">");
      const imageUrl = isAngleBracketed ? destination.slice(1, -1) : destination;
      const fragmentIndex = imageUrl.indexOf("#");
      const fragment = fragmentIndex === -1 ? "" : imageUrl.slice(fragmentIndex);
      const urlWithoutFragment = fragmentIndex === -1 ? imageUrl : imageUrl.slice(0, fragmentIndex);
      const queryIndex = urlWithoutFragment.indexOf("?");
      const pathname = queryIndex === -1 ? urlWithoutFragment : urlWithoutFragment.slice(0, queryIndex);
      const query = queryIndex === -1 ? "" : urlWithoutFragment.slice(queryIndex + 1);
      const queryParameters = query.split("&").filter(Boolean);
      const widthParameterIndex = queryParameters.findIndex((parameter) => parameter.split("=")[0] === "raycast-width");

      if (widthParameterIndex === -1) {
        queryParameters.push(`raycast-width=${width}`);
      } else {
        queryParameters[widthParameterIndex] = `raycast-width=${width}`;
      }

      const updatedUrl = `${pathname}?${queryParameters.join("&")}${fragment}`;
      const updatedDestination = isAngleBracketed ? `<${updatedUrl}>` : updatedUrl;
      return `${imageStart}${updatedDestination}`;
    },
  );
}

export function timestampToUTCDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function timestampToLongUTCDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);

  return `${datePart} at ${timePart}`;
}
