import assert from "node:assert/strict";
import { test } from "node:test";
import { constrainMarkdownImages, getMarkdownImageSources } from "../src/utils/markdown";

const WIDE = "https://example.com/wide.png";
const SMALL = "https://example.com/small.png";
const UNKNOWN = "https://example.com/unknown.png";
const dimensions = {
  [WIDE]: { width: 800, height: 400 },
  [SMALL]: { width: 200, height: 100 },
};

test("caps images wider than the pane and leaves smaller images untouched", () => {
  assert.equal(
    constrainMarkdownImages(`![wide](${WIDE})\n![small](${SMALL})`, dimensions),
    `![wide](${WIDE}?raycast-width=440)\n![small](${SMALL})`,
  );
});

test("does not guess for images whose dimensions are unknown", () => {
  assert.equal(constrainMarkdownImages(`![x](${UNKNOWN})`, dimensions), `![x](${UNKNOWN})`);
});

test("keeps smaller explicit raycast-width parameters and replaces oversized ones", () => {
  assert.equal(
    constrainMarkdownImages(`![small](${WIDE}?raycast-width=200)`, dimensions),
    `![small](${WIDE}?raycast-width=200)`,
  );
  assert.equal(
    constrainMarkdownImages(`![large](${WIDE}?raycast-width=900)`, dimensions),
    `![large](${WIDE}?raycast-width=440)`,
  );
});

test("preserves other query parameters, fragments, and angle brackets", () => {
  const queryUrl = `${WIDE}?v=2`;
  const fragmentUrl = `${WIDE}?v=2#top`;
  const known = {
    ...dimensions,
    [queryUrl]: { width: 800, height: 400 },
    [fragmentUrl]: { width: 800, height: 400 },
  };

  assert.equal(
    constrainMarkdownImages(`![x](${fragmentUrl})`, known),
    `![x](${WIDE}?v=2&raycast-width=440#top)`,
  );
  assert.equal(
    constrainMarkdownImages(`![x](<${queryUrl}>)`, known),
    `![x](<${WIDE}?v=2&raycast-width=440>)`,
  );
});

test("uses the column width for images inside tables", () => {
  const markdown = `| A | B |\n| --- | --- |\n| ![x](${WIDE}) | y |`;
  assert.equal(
    constrainMarkdownImages(markdown, dimensions),
    `| A | B |\n| --- | --- |\n| ![x](${WIDE}?raycast-width=220) | y |`,
  );
});

test("clamps oversized <img> tags and scales their height proportionally", () => {
  assert.equal(
    constrainMarkdownImages(`<img src="${WIDE}" width="800" height="400">`, dimensions),
    `<img src="${WIDE}" width="440" height="220">`,
  );
  assert.equal(
    constrainMarkdownImages(`<img src="${SMALL}" width="100">`, dimensions),
    `<img src="${SMALL}" width="100">`,
  );
});

test("skips fenced code blocks and data URIs", () => {
  const dataUri = "![x](data:image/png;base64,AAAA)";
  const code = "```html\n![x](https://example.com/wide.png)\n```";
  assert.equal(constrainMarkdownImages(`${code}\n${dataUri}`, dimensions), `${code}\n${dataUri}`);
});

test("collects unique image sources and skips code blocks and data URIs", () => {
  const markdown = [
    `![a](${WIDE})`,
    `![again](${WIDE})`,
    `<img src="${SMALL}">`,
    "![x](data:image/png;base64,AAAA)",
    "```",
    `![hidden](${UNKNOWN})`,
    "```",
  ].join("\n");

  assert.deepEqual(getMarkdownImageSources(markdown), [SMALL, WIDE].sort());
});
