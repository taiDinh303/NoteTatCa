import { describe, it, expect } from "vitest";
import { canonicalDocument, serializeDocument } from "./document";
import { plainDocument } from "./models";
describe("document contract", () => {
  it("keeps old plain HTML-looking text literal", () => {
    const result = plainDocument("<script>private text</script>");
    expect(result.content?.[0].content?.[0]).toEqual({
      type: "text",
      text: "<script>private text</script>",
    });
  });
  it("removes editor-only default attributes while preserving supported rich formatting", () => {
    const doc = canonicalDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Link",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.test",
                    target: "_blank",
                    rel: "noopener",
                    class: null,
                  },
                },
                {
                  type: "textStyle",
                  attrs: { color: "#aabbcc", fontFamily: "arbitrary" },
                },
              ],
            },
          ],
        },
        { type: "orderedList", attrs: { start: 2, type: null }, content: [] },
        { type: "taskItem", attrs: { checked: true }, content: [] },
      ],
    });
    expect(JSON.stringify(doc)).not.toContain("target");
    expect(JSON.stringify(doc)).not.toContain("fontFamily");
    expect(doc.content?.[1].attrs).toEqual({ start: 2 });
    expect(doc.content?.[2].attrs).toEqual({ checked: true });
  });
  it("rejects a document over the UTF-8 byte limit", () => {
    expect(() => serializeDocument(plainDocument("🌿".repeat(300000)))).toThrow(
      "too large",
    );
  });
});

it("preserves center alignment only on supported blocks", () => {
  expect(
    canonicalDocument({ type: "paragraph", attrs: { textAlign: "center" } })
      .attrs,
  ).toEqual({ textAlign: "center" });
  expect(
    canonicalDocument({
      type: "heading",
      attrs: { level: 2, textAlign: "center" },
    }).attrs,
  ).toEqual({ level: 2, textAlign: "center" });
  expect(
    canonicalDocument({
      type: "paragraph",
      attrs: { textAlign: "expression(unsafe)" },
    }).attrs,
  ).toBeUndefined();
  expect(
    canonicalDocument({ type: "paragraph", attrs: { textAlign: null } }).attrs,
  ).toBeUndefined();
  expect(
    canonicalDocument({ type: "codeBlock", attrs: { textAlign: "center" } })
      .attrs,
  ).toBeUndefined();
});

it.each(["left", "center", "right", "justify"])(
  "preserves %s block alignment",
  (textAlign) => {
    expect(
      canonicalDocument({ type: "paragraph", attrs: { textAlign } }).attrs,
    ).toEqual({ textAlign });
  },
);

describe("font size contract", () => {
  it.each([
    "8px",
    "9px",
    "10px",
    "11px",
    "12px",
    "14px",
    "18px",
    "24px",
    "30px",
    "36px",
    "48px",
    "60px",
    "72px",
    "96px",
  ])("preserves %s alongside text color", (fontSize) => {
    expect(
      canonicalDocument({
        type: "text",
        text: "Size",
        marks: [{ type: "textStyle", attrs: { fontSize, color: "#123456" } }],
      }).marks?.[0].attrs,
    ).toEqual({ color: "#123456", fontSize });
  });
  it.each([null, "1000px", "1em", "16px;color:red", 16])(
    "drops unsupported font size %s",
    (fontSize) => {
      expect(
        canonicalDocument({
          type: "text",
          text: "Size",
          marks: [{ type: "textStyle", attrs: { fontSize } }],
        }).marks?.[0].attrs,
      ).toBeUndefined();
    },
  );
});
