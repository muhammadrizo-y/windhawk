export type ImageDimensions = { width: number; height: number };
export type ImageDimensionsByUrl = Record<string, ImageDimensions>;

const RAYCAST_WIDTH = 440;

function imagePattern(): RegExp {
  return /(!\[[^\]]*\]\()(<[^>]*>|(?:\\.|[^\s)])+)(?=(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*)?\))/g;
}

function htmlImagePattern(): RegExp {
  return /<img\b[^>]*>/gi;
}

function attributeValue(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function attributeNumber(tag: string, name: string): number | undefined {
  const value = attributeValue(tag, name);
  if (!value || value.trim().endsWith("%")) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function setAttribute(tag: string, name: string, value: number): string {
  const pattern = new RegExp(`(\\s${name}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s"'=<>]+)`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `$1"${value}"`);
  const closingIndex = tag.endsWith("/>") ? tag.length - 2 : tag.length - 1;
  return `${tag.slice(0, closingIndex).replace(/\s+$/, "")} ${name}="${value}"${tag.slice(closingIndex)}`;
}

function fencedCodeMarker(line: string): string | undefined {
  return line.trim().match(/^(```+|~~~+)/)?.[1];
}

function closesFence(fence: string, marker: string | undefined): boolean {
  return marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length;
}

function unwrapDestination(destination: string): { url: string; bracketed: boolean } {
  const bracketed = destination.startsWith("<") && destination.endsWith(">");
  return { url: bracketed ? destination.slice(1, -1) : destination, bracketed };
}

/**
 * Caps image widths in Raycast markdown to the pane width (440px, or the
 * column width inside tables). Images that are already smaller are left
 * untouched — `raycast-width` is only added when the image is known to be
 * wider, so small images are never enlarged. Also handles raw <img> tags
 * (scaling their height proportionally), and skips fenced code blocks and
 * data: URIs.
 */
export function constrainMarkdownImages(markdown: string, dimensions: ImageDimensionsByUrl = {}): string {
  if (!markdown) return markdown;

  const lines = markdown.split(/(\r\n|\n|\r)/);
  const tableWidths = tableWidthsByLine(lines);
  let fence: string | undefined;

  return lines
    .map((line, index) => {
      if (index % 2 !== 0) return line;
      const marker = fencedCodeMarker(line);
      if (fence) {
        if (closesFence(fence, marker)) fence = undefined;
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      const width = tableWidths.get(index) ?? RAYCAST_WIDTH;
      const limited = line.replace(imagePattern(), (match, imageStart: string, destination: string) => {
        const { url, bracketed } = unwrapDestination(destination);
        if (url.startsWith("data:")) return match;
        const limitedUrl = limitImageUrl(url, width, dimensions[url]);
        if (limitedUrl === url) return match;
        return `${imageStart}${bracketed ? `<${limitedUrl}>` : limitedUrl}`;
      });
      return constrainHtmlImages(limited, width, dimensions);
    })
    .join("");
}

function constrainHtmlImages(line: string, width: number, dimensions: ImageDimensionsByUrl): string {
  return line.replace(htmlImagePattern(), (tag) => {
    const source = attributeValue(tag, "src");
    if (!source || source.startsWith("data:")) return tag;

    const measured = dimensions[source];
    const imageWidth = attributeNumber(tag, "width") ?? measured?.width;
    if (!imageWidth || imageWidth <= width) return tag;

    const imageHeight = attributeNumber(tag, "height") ?? measured?.height;
    const limited = setAttribute(tag, "width", width);
    if (!imageHeight) return limited;
    return setAttribute(limited, "height", Math.max(1, Math.round((imageHeight * width) / imageWidth)));
  });
}

/** Collects unique image sources for the markdown (skipping code blocks and data: URIs). */
export function getMarkdownImageSources(markdown: string): string[] {
  if (!markdown) return [];

  const sources = new Set<string>();
  const lines = markdown.split(/(\r\n|\n|\r)/);
  let fence: string | undefined;

  for (let index = 0; index < lines.length; index += 2) {
    const marker = fencedCodeMarker(lines[index]);
    if (fence) {
      if (closesFence(fence, marker)) fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker;
      continue;
    }
    for (const match of lines[index].matchAll(imagePattern())) {
      const { url } = unwrapDestination(match[2]);
      if (!url.startsWith("data:")) sources.add(url);
    }
    for (const match of lines[index].matchAll(htmlImagePattern())) {
      const source = attributeValue(match[0], "src");
      if (source && !source.startsWith("data:")) sources.add(source);
    }
  }

  return [...sources].sort();
}

function tableWidthsByLine(lines: string[]): Map<number, number> {
  const tableWidths = new Map<number, number>();

  for (let separatorIndex = 2; separatorIndex < lines.length; separatorIndex += 2) {
    const separatorCells = splitMarkdownTableRow(lines[separatorIndex]);
    if (!separatorCells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) continue;

    const columnCount = separatorCells.length;
    let rowIndex = separatorIndex - 2;

    if (rowIndex >= 0 && splitMarkdownTableRow(lines[rowIndex]).length === columnCount) {
      tableWidths.set(rowIndex, Math.floor(RAYCAST_WIDTH / columnCount));
    }

    rowIndex = separatorIndex + 2;
    while (rowIndex < lines.length && splitMarkdownTableRow(lines[rowIndex]).length === columnCount) {
      tableWidths.set(rowIndex, Math.floor(RAYCAST_WIDTH / columnCount));
      rowIndex += 2;
    }
  }

  return tableWidths;
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

function limitImageUrl(url: string, width: number, dimensions: ImageDimensions | undefined): string {
  const fragmentIndex = url.indexOf("#");
  const fragment = fragmentIndex === -1 ? "" : url.slice(fragmentIndex);
  const destination = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
  const queryIndex = destination.indexOf("?");
  const pathname = queryIndex === -1 ? destination : destination.slice(0, queryIndex);
  const queryParameters =
    queryIndex === -1
      ? []
      : destination
          .slice(queryIndex + 1)
          .split("&")
          .filter(Boolean);
  const widthParameterIndex = queryParameters.findIndex((parameter) => parameter.split("=")[0] === "raycast-width");
  const existingWidth = widthParameterIndex === -1 ? NaN : Number(queryParameters[widthParameterIndex].split("=")[1]);
  const imageWidth = existingWidth > 0 ? existingWidth : dimensions?.width;
  if (!imageWidth || imageWidth <= width) return url;

  const parameter = `raycast-width=${width}`;
  if (widthParameterIndex === -1) queryParameters.push(parameter);
  else queryParameters[widthParameterIndex] = parameter;

  return `${pathname}?${queryParameters.join("&")}${fragment}`;
}
