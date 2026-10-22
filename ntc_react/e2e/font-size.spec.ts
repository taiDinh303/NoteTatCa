import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const width of [393, 1280]) {
  test(`font size stepper and persist ${width}`, async ({
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

    // The font size control is a [ - ] N [ + ] stepper, defaulting to 11.
    const input = editor.getByRole("spinbutton", { name: "Font size" });
    await expect(input).toHaveValue("11");
    await mkdir("../artifacts/frontend", { recursive: true });
    await page.screenshot({
      path: `../artifacts/frontend/font-size-${width}.png`,
    });

    // Typing a value and committing with Enter applies it.
    await input.fill("24");
    await input.press("Enter");
    await expect(
      content.locator("span").filter({ hasText: "Size changes persist" }),
    ).toHaveCSS("font-size", "24px");
    await expect(input).toHaveValue("24");

    // The + and - buttons step to the next/previous preset.
    await editor
      .getByRole("button", { name: "Increase font size", exact: true })
      .click();
    await expect(input).toHaveValue("30");
    await editor
      .getByRole("button", { name: "Decrease font size", exact: true })
      .click();
    await expect(input).toHaveValue("24");

    await editor.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(content.locator("strong")).toHaveText("Size changes persist");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open Font size note", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "View note", exact: true })
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    content = editor.getByRole("textbox", { name: "Note content" });
    await expect(
      content.locator("span").filter({ hasText: "Size changes persist" }),
    ).toHaveCSS("font-size", "24px");
    await content.press("Control+a");
    // The stepper reads back the saved size and can commit 8 again.
    await expect(editor.getByRole("spinbutton", { name: "Font size" })).toHaveValue(
      "24",
    );
    const input2 = editor.getByRole("spinbutton", { name: "Font size" });
    await input2.fill("8");
    await input2.press("Enter");
    await expect(
      content.locator("span").filter({ hasText: "Size changes persist" }),
    ).toHaveCSS("font-size", "8px");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
  });
}
