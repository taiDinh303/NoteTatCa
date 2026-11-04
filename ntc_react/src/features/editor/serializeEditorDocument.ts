import type { Node } from "@tiptap/pm/model";
import { canonicalDocument } from "../../domain/document";

// ProseMirror nodes are immutable and unchanged branches retain their identity.
// Cache those branches, rather than rebuilding every paragraph on every key.
// The root isn't cached: undo history mustn't retain a full JSON string per key.
export function createEditorSerializer() {
  const cache = new WeakMap<Node, string>();
  function serialize(node: Node, root = false): string {
    const cached = root ? undefined : cache.get(node);
    if (cached !== undefined) return cached;
    const { marks, ...header } = canonicalDocument({
      type: node.type.name,
      ...(node.isText ? { text: node.text } : {}),
      attrs: node.attrs,
      marks: node.marks.map((mark) => ({ type: mark.type.name, attrs: mark.attrs })),
    });
    const fields = [JSON.stringify(header).slice(0, -1)];
    if (node.childCount) {
      const children: string[] = [];
      node.forEach((child) => children.push(serialize(child)));
      fields.push(`"content":[${children.join(",")}]`);
    }
    if (marks) fields.push(`"marks":${JSON.stringify(marks)}`);
    const json = fields.join(",") + "}";
    // Large list/paragraph snapshots can also live in undo history. Bound each
    // cached fragment so those snapshots don't retain entire serialized notes.
    if (!root && json.length <= 4096) cache.set(node, json);
    return json;
  }
  return (document: Node) => serialize(document, true);
}
