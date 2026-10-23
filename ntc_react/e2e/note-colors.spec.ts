import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
for (const mobile of [false, true]) {
  test(`compact note colors ${mobile ? "mobile dark" : "desktop light"}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: mobile ? 393 : 1280, height: 852 });
    if (mobile)
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
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      mobile ? "dark" : "light",
    );
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    let editor = page.getByRole("dialog", { name: "New note", exact: true });
    await editor
      .getByRole("textbox", { name: "Note content" })
      .fill("Palette private note");
    const trigger = editor.getByRole("button", {
      name: "Note background color",
      exact: true,
    });
    await expect(page.getByLabel("Note color 1", { exact: true })).toBeHidden();
    await trigger.click();
    const palette = page.getByRole("dialog", {
      name: "Note colors",
      exact: true,
    });
    await expect(palette).toBeVisible();
    await expect(
      palette.getByLabel("Default note color", { exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const box = (await palette.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(mobile ? 393 : 1280);
    await mkdir("../artifacts/frontend", { recursive: true });
    await palette.screenshot({
      path: `../artifacts/frontend/note-colors-${mobile ? "mobile" : "desktop"}.png`,
    });
    await expect(
      palette.getByText("No saved colors yet.", { exact: true }),
    ).toBeVisible();
    await palette
      .getByRole("textbox", { name: "Hex color", exact: true })
      .fill("#fff4d4");
    await palette
      .getByRole("button", { name: "Save color", exact: true })
      .click();
    await expect(editor.locator(".editor-heading")).toHaveCSS(
      "background-color",
      "rgb(255, 244, 212)",
    );
    await expect(
      palette.getByRole("button", { name: "Use color #FFF4D4", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await palette
      .getByLabel("Custom note color", { exact: true })
      .evaluate((input) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, "#ae6262");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await expect(editor.locator(".editor-heading")).toHaveCSS(
      "background-color",
      "rgb(174, 98, 98)",
    );
    await palette
      .getByRole("button", { name: "Save color", exact: true })
      .click();
    await expect(
      palette.getByRole("button", { name: "Color saved", exact: true }),
    ).toBeDisabled();
    await palette
      .getByRole("button", { name: "Use color #AE6262", exact: true })
      .click();
    await expect(palette).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(editor).toBeVisible();
    await expect(
      editor.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page.getByText("Palette private note", { exact: true }).click();
    await page
      .getByRole("dialog", { name: "View note", exact: true })
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor.locator(".editor-heading")).toHaveCSS(
      "background-color",
      "rgb(174, 98, 98)",
    );
    await editor
      .getByRole("button", { name: "Note background color", exact: true })
      .click();
    await expect(
      palette.getByRole("button", { name: "Use color #FFF4D4", exact: true }),
    ).toBeVisible();
    await expect(
      palette.getByRole("button", { name: "Use color #AE6262", exact: true }),
    ).toBeVisible();
    await palette
      .getByRole("button", { name: "Remove saved color #FFF4D4", exact: true })
      .click();
    await expect(
      palette.getByRole("button", { name: "Use color #FFF4D4", exact: true }),
    ).toHaveCount(0);
    await expect(editor).toHaveCSS("background-color", "rgb(174, 98, 98)");
    await palette.getByLabel("Default note color", { exact: true }).click();
    await expect(editor.locator(".editor-heading")).not.toHaveCSS(
      "background-color",
      "rgb(174, 98, 98)",
    );
  });
}
