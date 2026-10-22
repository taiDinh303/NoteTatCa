import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const width of [393, 1280]) {
  test(`font size replaces Heading and persists ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    let editor = page.getByRole("dialog", { name: "New note", exact: true });
    await editor.getByLabel("Note title").fill("Font size note");
    let content = editor.getByRole("textbox", { name: "Note content" });
    await content.fill("Size changes persist");
    await expect(
      editor.getByRole("button", { name: "Heading", exact: true }),
    ).toHaveCount(0);
    await content.press("Control+a");
    await editor
      .getByRole("button", { name: "Font size", exact: true })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "Default", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await mkdir("../artifacts/frontend", { recursive: true });
    await page.screenshot({
      path: `../artifacts/frontend/font-size-${width}.png`,
    });
    await page
      .getByRole("menuitemradio", { name: "24 px", exact: true })
      .click();
    await expect(
      content.locator("span").filter({ hasText: "Size changes persist" }),
    ).toHaveCSS("font-size", "24px");
    await expect(
      editor.getByRole("button", { name: "Font size", exact: true }),
    ).toContainText("24");
    await editor.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(content.locator("strong")).toHaveText("Size changes persist");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open Font size note", exact: true })
      .click();
    await page.getByRole("dialog", { name: "View note", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    content = editor.getByRole("textbox", { name: "Note content" });
    await expect(
      content.locator("span").filter({ hasText: "Size changes persist" }),
    ).toHaveCSS("font-size", "24px");
    await content.press("Control+a");
    await editor
      .getByRole("button", { name: "Font size", exact: true })
      .click();
    await page
      .getByRole("menuitemradio", { name: "Default", exact: true })
      .click();
    await expect(content.locator('[style*="font-size"]')).toHaveCount(0);
    await expect(content.locator("strong")).toHaveText("Size changes persist");
  });
}
