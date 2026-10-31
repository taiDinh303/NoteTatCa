import { test, expect } from "@playwright/test";
for (const width of [320, 1440])
  test("templates preview append and outline " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await dialog
      .getByLabel("Note title", { exact: true })
      .fill("Template example");
    await dialog
      .getByRole("textbox", { name: "Note content" })
      .fill("Keep this text");
    await dialog
      .getByRole("button", { name: "Note templates", exact: true })
      .click();
    await page.getByRole("combobox").selectOption("Study notes");
    await expect(
      page.locator('.rich-editor[contenteditable="true"]'),
    ).not.toContainText("Key ideas");
    await page
      .getByRole("button", { name: "Append template", exact: true })
      .click();
    await expect(
      dialog.getByRole("textbox", { name: "Note content" }),
    ).toContainText("Keep this text");
    await expect(
      dialog.getByRole("heading", { name: "Key ideas", exact: true }),
    ).toBeVisible();
    await dialog.locator(".note-outline summary").click();
    await dialog
      .getByRole("navigation", { name: "Table of contents" })
      .getByRole("button", { name: "Key ideas", exact: true })
      .click();
    await expect(
      dialog.getByRole("textbox", { name: "Note content" }),
    ).toBeFocused();
    await expect(
      dialog.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Open Template example", exact: true })
      .click();
    const view = page.getByRole("dialog", { name: "View note", exact: true });
    await view.locator(".note-outline summary").click();
    await expect(
      view
        .getByRole("navigation", { name: "Table of contents" })
        .getByRole("button", { name: "Key ideas", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "artifacts/note-tools-" + width + ".png" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
