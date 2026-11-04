import { expect, test } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { canonicalDocument, validateDocument } from "../../domain/document";
import type { RichNode } from "../../domain/models";
import { createEditorSerializer } from "./serializeEditorDocument";

const schema = new Schema({
  nodes: {
    doc: { content: "block*" },
    paragraph: { group: "block", content: "inline*", attrs: { textAlign: { default: null }, ignored: { default: "private" } } },
    bulletList: { group: "block", content: "paragraph+", attrs: { bulletStyle: { default: "dash" } } },
    text: { group: "inline" },
    hardBreak: { group: "inline", inline: true },
  },
  marks: {
    bold: {},
    link: { attrs: { href: {}, target: { default: "_blank" } } },
    textStyle: { attrs: { color: { default: "#123456" }, fontSize: { default: "16px" } } },
  },
});
const reference = (doc: ReturnType<typeof schema.node>) =>
  JSON.stringify(canonicalDocument(doc.toJSON() as RichNode));

test("cached serialization preserves canonical formatting, escaping, empty blocks and edit/undo branches", () => {
  const paragraph = schema.node("paragraph", { textAlign: "center" }, [
    schema.text('Tiếng Việt, 中文, emoji 🐰; quote " and slash \\ \n', [schema.mark("bold"), schema.mark("link", { href: "https://example.test/?a=1&b=2" })]),
    schema.node("hardBreak"),
    schema.text("styled", [schema.mark("textStyle")]),
  ]);
  const original = schema.node("doc", null, [schema.node("bulletList", null, [paragraph]), schema.node("paragraph")]);
  const serialize = createEditorSerializer();
  let state = EditorState.create({ schema, doc: original });
  for (const text of ["one", "two", "三"]) {
    const json = serialize(state.doc);
    expect(json).toBe(reference(state.doc));
    validateDocument(json);
    state = state.apply(state.tr.insertText(text, state.doc.content.size - 1));
  }
  expect(serialize(state.doc)).toBe(reference(state.doc));
  expect(serialize(original)).toBe(reference(original));
  expect(serialize(schema.node("doc"))).toBe(reference(schema.node("doc")));
});

test("large edits reuse immutable paragraphs while retaining character and byte validation", () => {
  const paragraph = schema.node("paragraph", null, [schema.text("a".repeat(200))]);
  const original = schema.node("doc", null, Array.from({ length: 450 }, () => paragraph));
  const serialize = createEditorSerializer();
  expect(serialize(original)).toBe(reference(original));
  const state = EditorState.create({ schema, doc: original });
  const edited = state.apply(state.tr.insertText("changed", 1)).doc;
  expect(edited.child(1)).toBe(original.child(1));
  expect(serialize(edited)).toBe(reference(edited));
  validateDocument(serialize(edited));
  const overLimit = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("a".repeat(100001))])]);
  expect(() => validateDocument(serialize(overLimit))).toThrow("100,000");
  const largeFormatting = schema.node("doc", null, [schema.node("paragraph", null, [
    schema.text("x", [schema.mark("link", { href: "https://example.test/" + "a".repeat(1024 * 1024) })]),
  ])]);
  expect(() => validateDocument(serialize(largeFormatting))).toThrow("1 MB");
});

test.skipIf(process.env.NTC_EDITOR_PERF !== "1")("synthetic serialization CPU observation (not input latency)", () => {
  const original = schema.node("doc", null, Array.from({ length: 450 }, (_, index) =>
    schema.node("paragraph", null, [schema.text(`${index}:` + "a".repeat(195))])));
  let state = EditorState.create({ schema, doc: original });
  const documents = Array.from({ length: 100 }, () => {
    state = state.apply(state.tr.insertText("x", 1));
    return state.doc;
  });
  const serialize = createEditorSerializer();
  const measure = (run: (doc: typeof original) => string) => {
    const start = performance.now();
    for (const doc of documents) validateDocument(run(doc));
    return Math.round((performance.now() - start) * 100) / 100;
  };
  // Warm runtime paths, including the first cache population, before sampling.
  reference(original); serialize(original);
  const samples = Array.from({ length: 5 }, () => ({
    originalMs: measure(reference), cachedMs: measure(serialize),
  }));
  for (const doc of documents) expect(serialize(doc)).toBe(reference(doc));
  process.stdout.write("NTC_SERIALIZATION_CPU " + JSON.stringify({ editsPerSample: documents.length, paragraphs: 450, samples }) + "\n");
});
