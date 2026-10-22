import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const dark of [false, true]) {
  test(`card identity row and whole editor color ${dark ? "dark mobile" : "light desktop"}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: dark ? 393 : 1280, height: 852 });
    if (dark)
      await page.addInitScript(() =>
        localStorage.setItem("ntc.theme.v1", "dark"),
      );
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
    await editor.getByLabel("Note title").fill("Card appearance");
    await editor
      .getByRole("textbox", { name: "Note content" })
      .fill("A note with a full background");
    await editor.getByRole("button", { name: "Choose note icon" }).click();
    await page
      .getByRole("dialog", { name: "Note icons", exact: true })
      .getByRole("button", { name: "💡", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Note background color", exact: true })
      .click();
    await page.getByLabel("Note color 1", { exact: true }).click();
    await expect(editor).toHaveCSS("background-color", "rgb(255, 244, 212)");
    await expect(editor.locator(".editor-toolbar")).toHaveCSS(
      "background-color",
      "rgb(255, 244, 212)",
    );
    await editor
      .getByRole("button", { name: "Note background color", exact: true })
      .click();
    await page
      .getByLabel("Custom note color", { exact: true })
      .evaluate((input) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, "#202824");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCSS("background-color", "rgb(32, 40, 36)");
    await expect(editor.locator(".editor-toolbar")).toHaveCSS(
      "background-color",
      "rgb(32, 40, 36)",
    );
    await expect(
      editor.getByRole("textbox", { name: "Note content" }),
    ).toHaveCSS("color", "rgb(255, 255, 255)");
    await mkdir("../artifacts/frontend", { recursive: true });
    await editor.screenshot({
      path: `../artifacts/frontend/editor-full-color-${dark ? "dark-mobile" : "light-desktop"}.png`,
    });
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    const card = page
      .getByRole("article")
      .filter({
        has: page.getByRole("button", {
          name: "Open Card appearance",
          exact: true,
        }),
      });
    const heading = card.locator(".note-card-identity h3");
    await expect(heading).toHaveText("Card appearance");
    await expect(card.getByRole("heading")).toHaveCount(1);
    const titleBox = (await heading.boundingBox())!;
    const iconBox = (await card.locator(".note-emoji").boundingBox())!;
    expect(titleBox.x).toBeGreaterThan(iconBox.x);
    expect(
      Math.abs(
        titleBox.y + titleBox.height / 2 - iconBox.y - iconBox.height / 2,
      ),
    ).toBeLessThan(2);
    await card.screenshot({
      path: `../artifacts/frontend/card-identity-${dark ? "dark-mobile" : "light-desktop"}.png`,
    });
    await card
      .getByRole("button", { name: "View Card appearance", exact: true })
      .click();
    await page.getByRole("dialog", { name: "View note", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor).toHaveCSS("background-color", "rgb(32, 40, 36)");
    await editor
      .getByRole("button", { name: "Note background color", exact: true })
      .click();
    await page.getByLabel("Default note color", { exact: true }).click();
    await expect(editor).not.toHaveCSS("background-color", "rgb(32, 40, 36)");
  });
}
