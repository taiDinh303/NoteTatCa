import type { RichNode } from "./models";
const attributes: Record<string, string[]> = {
  paragraph: ["textAlign"],
  heading: ["level", "textAlign"],
  orderedList: ["start"],
  taskItem: ["checked"],
  codeBlock: ["language"],
  link: ["href"],
  textStyle: ["color"],
  highlight: ["color"],
};
function cleanAttrs(type: string, attrs?: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of attributes[type] ?? []) {
    const value = attrs?.[key];
    if (value !== null && value !== undefined) {
      if (key === "textAlign") {
        if (
          value === "left" ||
          value === "center" ||
          value === "right" ||
          value === "justify"
        )
          result[key] = value;
      } else if (key === "color") {
        if (
          typeof value === "string" &&
          /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
        )
          result[key] = value;
      } else result[key] = value;
    }
  }
  return result;
}
export function canonicalDocument(node: RichNode): RichNode {
  const attrs = cleanAttrs(node.type, node.attrs);
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(node.content ? { content: node.content.map(canonicalDocument) } : {}),
    ...(node.marks?.length
      ? {
          marks: node.marks.map((mark) => {
            const a = cleanAttrs(mark.type, mark.attrs);
            return {
              type: mark.type,
              ...(Object.keys(a).length ? { attrs: a } : {}),
            };
          }),
        }
      : {}),
  };
}
export function serializeDocument(node: RichNode) {
  const document = canonicalDocument(node);
  const text = JSON.stringify(document);
  validateDocument(text);
  return text;
}
export function validateDocument(text: string) {
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error(
      "This note is too large. Rich notes can contain up to 1 MB of formatting.",
    );
  const count = (node: RichNode): number =>
    (node.text?.length ?? 0) +
    (node.content?.reduce((sum, child) => sum + count(child), 0) ?? 0);
  if (count(JSON.parse(text) as RichNode) > 100000)
    throw new Error("Note content can contain up to 100,000 characters.");
}
