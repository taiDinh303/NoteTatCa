import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const width of [393, 1280]) {
  test(`compact editor heading and icon dropdown ${width}`, async ({
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
        editor.getByRole("button", { name: "Choose note icon" }),
        editor.getByLabel("Note title"),
        editor.getByRole("button", { name: "Pin note", exact: true }),
        editor.getByRole("button", { name: "Exit full screen" }),
      ].map((element) => element.boundingBox()),
    );
    const center = boxes[0]!.y + boxes[0]!.height / 2;
    for (const box of boxes) {
      expect(Math.abs(box!.y + box!.height / 2 - center)).toBeLessThan(2);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await expect(heading.locator('[role="status"]')).toHaveClass("sr-only");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    const before = (await heading.boundingBox())!.height;
    await editor.getByRole("button", { name: "Choose note icon" }).click();
    const picker = page.getByRole("dialog", {
      name: "Note icons",
      exact: true,
    });
    await expect(picker).toBeVisible();
    expect((await heading.boundingBox())!.height).toBe(before);
    await mkdir("../artifacts/frontend", { recursive: true });
    await page.screenshot({
      path: `../artifacts/frontend/editor-header-${width}.png`,
    });
    await picker.getByRole("button", { name: "💡", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(
      editor.getByRole("button", { name: "Choose note icon" }),
    ).toHaveText("💡");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open Compact header title", exact: true })
      .click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(
      editor.getByRole("button", { name: "Choose note icon" }),
    ).toHaveText("💡");
    await editor.getByRole("button", { name: "Choose note icon" }).click();
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    await expect(editor).toBeVisible();
  });
}
