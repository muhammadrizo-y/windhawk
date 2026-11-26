import { createHash } from "node:crypto";
import { Cache } from "@raycast/api";
import { imageSize } from "image-size";
import type { ImageDimensions, ImageDimensionsByUrl } from "./markdown";

const cache = new Cache({ namespace: "markdown-image-dimensions" });
const pending = new Map<string, Promise<ImageDimensions | undefined>>();
const MAX_HEADER_BYTES = 256 * 1024;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const FAILURE_TTL = 60 * 1000;

function dimensionsFromBuffer(buffer: Uint8Array): ImageDimensions | undefined {
  try {
    const size = imageSize(buffer);
    if (!size.width || !size.height) return undefined;
    const rotated = size.orientation !== undefined && size.orientation >= 5;
    const width = rotated ? size.height : size.width;
    const height = rotated ? size.width : size.height;
    return width > 0 && height > 0 ? { width, height } : undefined;
  } catch {
    return undefined;
  }
}

async function readDimensions(source: string): Promise<ImageDimensions | undefined> {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:image\/[^,]+,(.*)$/s);
    if (!match || match[1].length > MAX_HEADER_BYTES * 2) return undefined;
    const encoded = source.slice(0, source.indexOf(",")).endsWith(";base64");
    const buffer = encoded ? Buffer.from(match[1], "base64") : Buffer.from(decodeURIComponent(match[1]));
    return dimensionsFromBuffer(buffer.subarray(0, MAX_HEADER_BYTES));
  }

  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  url.hash = "";
  url.searchParams.delete("raycast-width");
  url.searchParams.delete("raycast-height");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) return undefined;
    reader = response.body.getReader();
    let buffer = Buffer.alloc(0);
    while (buffer.length < MAX_HEADER_BYTES) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer = Buffer.concat([buffer, chunk.value.subarray(0, MAX_HEADER_BYTES - buffer.length)]);
      const dimensions = dimensionsFromBuffer(buffer);
      if (dimensions) return dimensions;
    }
  } finally {
    clearTimeout(timer);
    void reader?.cancel().catch(() => {});
    controller.abort();
  }

  return undefined;
}

async function getImageDimensions(source: string): Promise<ImageDimensions | undefined> {
  const key = createHash("sha256").update(source).digest("hex");
  const saved = cache.get(key);
  if (saved) {
    try {
      const entry = JSON.parse(saved) as { dimensions?: ImageDimensions; expiresAt: number };
      if (entry.expiresAt > Date.now()) return entry.dimensions;
    } catch {
      cache.remove(key);
    }
  }

  const existing = pending.get(key);
  if (existing) return existing;

  const request = (async () => {
    let dimensions: ImageDimensions | undefined;
    try {
      dimensions = await readDimensions(source);
    } catch {
      dimensions = undefined;
    }
    cache.set(key, JSON.stringify({ dimensions, expiresAt: Date.now() + (dimensions ? CACHE_TTL : FAILURE_TTL) }));
    return dimensions;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}

export async function loadImageDimensions(sources: string[]): Promise<ImageDimensionsByUrl> {
  const dimensions: ImageDimensionsByUrl = {};
  let index = 0;

  await Promise.all(
    Array.from({ length: Math.min(4, sources.length) }, async () => {
      while (index < sources.length) {
        const source = sources[index++];
        const size = await getImageDimensions(source);
        if (size) dimensions[source] = size;
      }
    }),
  );

  return dimensions;
}
