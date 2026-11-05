import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const width of [320, 393, 430, 768, 1280]) {
  test(`aligned editor heading and inline emoji ${width}`, async ({
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
    if (width <= 800) {
      await expect(editor.getByRole("button", { name: /full screen/ })).toHaveCount(0);
      const bounds = (await editor.boundingBox())!;
      expect(bounds.width).toBeGreaterThan(width * .85);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(853);
    }
    await expect(
      editor.getByRole("button", { name: "Add title", exact: true }),
    ).toHaveCount(0);
    await expect(editor.getByLabel("Note title")).toBeVisible();
    await expect(editor.getByLabel("Note title")).not.toHaveAttribute(
      "placeholder",
    );
    await editor
      .getByRole("textbox", { name: "Note content" })
      .fill("Compact header content");
    await editor.getByLabel("Note title", { exact: true }).click();
    await editor.getByLabel("Note title").fill("Compact header title");
    const heading = editor.locator(".editor-heading");
    const boxes = await Promise.all(
      [
        editor.getByLabel("Note title"),
        editor.getByRole("button", { name: "Pin note", exact: true }),
        ...(width > 800 ? [editor.getByRole("button", { name: "Enter full screen" })] : []),
      ].map((element) => element.boundingBox()),
    );
    const center = boxes[0]!.y + boxes[0]!.height / 2;
    for (const box of boxes) {
      expect(Math.abs(box!.y + box!.height / 2 - center)).toBeLessThan(2);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await expect(heading.locator('[role="status"]')).toHaveClass("sr-only");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await expect(editor.getByRole("button", { name: "Choose note icon" })).toHaveCount(0);
    const title = editor.getByLabel("Note title", { exact: true });
    const paragraph = editor.locator(".rich-editor p").first();
    expect(Math.abs((await title.boundingBox())!.x - (await paragraph.boundingBox())!.x)).toBeLessThan(1);
    await title.fill("💡 Compact header title");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "View", exact: true }).click();
    const view = page.getByRole("dialog", { name: "View note", exact: true });
    expect(Math.abs((await view.locator(".note-heading-title").boundingBox())!.x - (await view.locator(".rich-editor p").first().boundingBox())!.x)).toBeLessThan(1);
    await view.getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await mkdir("../artifacts/frontend", { recursive: true });
    await page.screenshot({ path: `../artifacts/frontend/editor-header-${width}.png` });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open 💡 Compact header title", exact: true })
      .click();
    await page.getByRole("dialog", { name: "View note", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor).not.toHaveClass(/fullscreen/);
    if (width <= 800) {
      await expect(editor.getByRole("button", { name: "Enter full screen", exact: true })).toHaveCount(0);
      const bounds = (await editor.boundingBox())!;
      expect(bounds.width).toBeGreaterThan(width * .85);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(853);
    } else {
      await expect(editor.getByRole("button", { name: "Enter full screen", exact: true })).toBeVisible();
    }
    await expect(editor.getByLabel("Note title", { exact: true })).toHaveValue("💡 Compact header title");
    await expect(editor.getByRole("button", { name: "Choose note icon" })).toHaveCount(0);
  });
}
