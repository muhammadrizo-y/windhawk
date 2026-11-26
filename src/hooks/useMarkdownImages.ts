import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { loadImageDimensions } from "../utils/imageDimensions";
import { constrainMarkdownImages, getMarkdownImageSources } from "../utils/markdown";

/**
 * Returns the markdown with image widths capped to the Raycast pane, based on
 * measured image dimensions. Images already smaller than the pane are left
 * untouched, so they keep their natural size instead of being enlarged by a
 * forced `raycast-width`.
 */
export function useMarkdownImages(markdown: string): string {
  const sources = useMemo(() => getMarkdownImageSources(markdown), [markdown]);
  const { data } = useCachedPromise(loadImageDimensions, [sources], {
    execute: sources.length > 0,
    keepPreviousData: false,
  });
  return useMemo(() => constrainMarkdownImages(markdown, data), [markdown, data]);
}
