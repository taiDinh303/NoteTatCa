// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ReadOnlyContent from "./ReadOnlyContent";

vi.mock("./ContentZoom", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("preserves rich formatting, alignment, ordered lists and read-only checklists without an editor", () => {
  const { container } = render(
    <ReadOnlyContent
      documentJson={JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "right" },
            content: [
              {
                type: "text",
                text: "Formatted",
                marks: [
                  { type: "bold" },
                  { type: "italic" },
                  { type: "underline" },
                  { type: "strike" },
                  {
                    type: "textStyle",
                    attrs: { color: "#ff0000", fontSize: "24px" },
                  },
                  { type: "highlight", attrs: { color: "#fff0a3" } },
                ],
              },
            ],
          },
          {
            type: "orderedList",
            attrs: { start: 3 },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Third item" }],
                  },
                ],
              },
            ],
          },
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: true },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Done" }],
                  },
                ],
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Quote" }] },
            ],
          },
          { type: "codeBlock", content: [{ type: "text", text: "a < b" }] },
          { type: "paragraph" },
          { type: "hardBreak" },
          { type: "horizontalRule" },
        ],
      })}
    />,
  );
  expect(container.querySelector("p")!.style.textAlign).toBe("right");
  expect(
    container.querySelector("strong em u s span")!.getAttribute("style"),
  ).toContain("24px");
  expect(container.querySelector("mark")!.style.backgroundColor).toBe(
    "rgb(255, 240, 163)",
  );
  expect(container.querySelector("ol")!.start).toBe(3);
  const check = screen.getByRole("checkbox") as HTMLInputElement;
  expect(check.checked && check.disabled).toBe(true);
  expect(
    container.querySelector('li[data-checked="true"] div')!.textContent,
  ).toBe("Done");
  expect(container.querySelector("pre code")!.textContent).toBe("a < b");
  expect(container.querySelector("blockquote")!.textContent).toBe("Quote");
  expect(container.querySelector("hr")).not.toBeNull();
  expect(container.querySelector('[contenteditable="true"]')).toBeNull();
});

it("escapes text and drops unsafe links, arbitrary attributes and unsupported style values", () => {
  const { container } = render(
    <ReadOnlyContent
      documentJson={JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "url(javascript:bad)", onClick: "bad()" },
            content: [
              {
                type: "text",
                text: "<img src=x onerror=bad()>",
                marks: [
                  { type: "link", attrs: { href: "javascript:bad()" } },
                  {
                    type: "textStyle",
                    attrs: {
                      color: "red;background:url(x)",
                      fontSize: "999px",
                    },
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Safe link",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.test/path" },
                  },
                ],
              },
            ],
          },
          {
            type: "script",
            attrs: { src: "https://example.test/bad.js" },
            content: [{ type: "text", text: "Plain fallback" }],
          },
        ],
      })}
    />,
  );
  expect(container.querySelector("img, script, [onclick]")).toBeNull();
  expect(container.querySelector("p")!.style.textAlign).toBe("");
  expect(container.querySelector("span")!.style.fontSize).toBe("");
  expect(container.querySelector("span")!.style.color).toBe("");
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    "https://example.test/path",
  );
  expect(screen.getByRole("region").textContent).toContain(
    "<img src=x onerror=bad()>",
  );
  expect(screen.getByRole("region").textContent).toContain("Plain fallback");
});

it("gives duplicate headings distinct targets and updates when the actual document changes", () => {
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: scroll,
    configurable: true,
  });
  const doc = (value: string) =>
    JSON.stringify({
      type: "doc",
      content: [1, 2, 4].map((level) => ({
        type: "heading",
        attrs: { level },
        content: [{ type: "text", text: value }],
      })),
    });
  const view = render(<ReadOnlyContent documentJson={doc("Repeated")} />);
  fireEvent.click(screen.getByText("Table of contents"));
  const buttons = screen.getAllByRole("button", { name: "Repeated" });
  expect(buttons).toHaveLength(2);
  fireEvent.click(buttons[1]);
  const headings = screen.getAllByRole("heading", { name: "Repeated" });
  expect(headings[0].id).not.toBe(headings[1].id);
  expect(document.activeElement).toBe(headings[1]);
  expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  view.rerender(<ReadOnlyContent documentJson={doc("Changed")} />);
  expect(screen.queryByRole("heading", { name: "Repeated" })).toBeNull();
  expect(screen.getAllByRole("heading", { name: "Changed" })).toHaveLength(3);
});
