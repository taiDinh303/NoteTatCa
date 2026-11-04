import {
  createElement,
  Fragment,
  memo,
  useId,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RichNode } from "../../domain/models";
import { isNoteFontSize } from "../../domain/formatting";
import { t as tr, useLanguage } from "../../shared/i18n";
import ContentZoom from "./ContentZoom";
import "./NoteTools.css";

type Heading = { id: string; level: number; text: string };
const color = (value: unknown) =>
  typeof value === "string" &&
  /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    ? value
    : undefined;
const alignment = (value: unknown): CSSProperties["textAlign"] =>
  value === "left" ||
  value === "center" ||
  value === "right" ||
  value === "justify"
    ? value
    : undefined;
const text = (node: RichNode): string =>
  node.text ?? node.content?.map(text).join("") ?? "";

// Render the supported note schema as React elements: no editor instance, raw
// HTML, arbitrary tag names, event attributes or untrusted style objects.
function renderDocument(document: RichNode, scope: string) {
  const headings: Heading[] = [];
  function render(node: RichNode, path: string): ReactNode {
    const children = node.content?.map((child, index) =>
      render(child, `${path}-${index}`),
    );
    const attrs = node.attrs ?? {};
    const props = { key: path };
    switch (node.type) {
      case "doc":
        return children;
      case "text":
        return createElement(
          Fragment,
          props,
          (node.marks ?? []).reduceRight<ReactNode>((child, mark) => {
            const attrs = mark.attrs ?? {};
            switch (mark.type) {
              case "bold":
                return <strong>{child}</strong>;
              case "italic":
                return <em>{child}</em>;
              case "underline":
                return <u>{child}</u>;
              case "strike":
                return <s>{child}</s>;
              case "code":
                return <code>{child}</code>;
              case "textStyle":
                return (
                  <span
                    style={{
                      color: color(attrs.color),
                      fontSize: isNoteFontSize(attrs.fontSize)
                        ? attrs.fontSize
                        : undefined,
                    }}
                  >
                    {child}
                  </span>
                );
              case "highlight":
                return (
                  <mark
                    style={{
                      backgroundColor: color(attrs.color),
                      color: "inherit",
                    }}
                  >
                    {child}
                  </mark>
                );
              case "link":
                return typeof attrs.href === "string" &&
                  /^(https?:\/\/|mailto:)/i.test(attrs.href) ? (
                  <a
                    href={attrs.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {child}
                  </a>
                ) : (
                  child
                );
              default:
                return child;
            }
          }, node.text ?? ""),
        );
      case "paragraph":
        return (
          <p key={path} style={{ textAlign: alignment(attrs.textAlign) }}>
            {children?.length ? (
              children
            ) : (
              <br className="ProseMirror-trailingBreak" />
            )}
          </p>
        );
      case "heading": {
        const level =
          typeof attrs.level === "number" &&
          Number.isInteger(attrs.level) &&
          attrs.level >= 1 &&
          attrs.level <= 6
            ? attrs.level
            : 1;
        const id = `${scope}-${path}`;
        if (level <= 3) headings.push({ id, level, text: text(node) });
        return createElement(
          `h${level}`,
          {
            ...props,
            id,
            tabIndex: -1,
            style: { textAlign: alignment(attrs.textAlign) },
          },
          children,
        );
      }
      case "bulletList":
        return <ul key={path}>{children}</ul>;
      case "orderedList":
        return (
          <ol
            key={path}
            start={
              typeof attrs.start === "number" &&
              Number.isInteger(attrs.start) &&
              attrs.start >= 1
                ? attrs.start
                : undefined
            }
          >
            {children}
          </ol>
        );
      case "listItem":
        return <li key={path}>{children}</li>;
      case "taskList":
        return (
          <ul key={path} data-type="taskList">
            {children}
          </ul>
        );
      case "taskItem":
        return (
          <li
            key={path}
            data-type="taskItem"
            data-checked={attrs.checked === true}
          >
            <label>
              <input
                type="checkbox"
                checked={attrs.checked === true}
                readOnly
                disabled
              />
              <span />
            </label>
            <div>{children}</div>
          </li>
        );
      case "blockquote":
        return <blockquote key={path}>{children}</blockquote>;
      case "codeBlock":
        return (
          <pre key={path}>
            <code>{children}</code>
          </pre>
        );
      case "hardBreak":
        return <br key={path} />;
      case "horizontalRule":
        return <hr key={path} />;
      default:
        return children;
    }
  }
  const content = render(document, "doc");
  return { content, headings };
}

export default memo(function ReadOnlyContent({
  documentJson,
}: {
  documentJson: string;
}) {
  useLanguage();
  const scope = useId();
  const { content, headings } = useMemo(
    () => renderDocument(JSON.parse(documentJson) as RichNode, scope),
    [documentJson, scope],
  );
  return (
    <ContentZoom>
      {headings.length ? (
        <details className="note-outline">
          <summary>{tr("Table of contents")}</summary>
          <nav aria-label={tr("Table of contents")}>
            <ol>
              {headings.map((heading) => (
                <li
                  key={heading.id}
                  style={{ marginInlineStart: (heading.level - 1) * 12 }}
                >
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      const element = document.getElementById(heading.id);
                      element?.scrollIntoView({ block: "nearest" });
                      element?.focus({ preventScroll: true });
                    }}
                  >
                    {heading.text || tr("Untitled")}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      ) : null}
      <div>
        <div
          className="tiptap ProseMirror rich-editor"
          contentEditable={false}
          role="region"
          aria-label={tr("Note content")}
        >
          {content}
        </div>
      </div>
    </ContentZoom>
  );
});
