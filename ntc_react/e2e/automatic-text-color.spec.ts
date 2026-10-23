import { test, expect } from "@playwright/test";

for (const width of [393, 1280]) {
  test(`automatic text color restores contrast ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 852 });
    if (width === 393)
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
    await editor
      .getByLabel("Note title", { exact: true })
      .fill("Automatic color note");
    let content = editor.getByRole("textbox", {
      name: "Note content",
      exact: true,
    });
    await content.fill("Contrast keeps formatting");
    await content.press("ControlOrMeta+A");
    await editor.getByRole("button", { name: "Bold", exact: true }).click();
    await editor
      .getByRole("spinbutton", { name: "Font size", exact: true })
      .fill("24");
    await editor
      .getByRole("spinbutton", { name: "Font size", exact: true })
      .press("Enter");
    await content.press("ControlOrMeta+A");
    await editor
      .getByRole("button", { name: "Text color", exact: true })
      .click();
    const textMenu = page.getByRole("dialog", {
      name: "Text color",
      exact: true,
    });
    await textMenu
      .getByLabel("Custom text color", { exact: true })
      .evaluate((input) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, "#d00000");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page.keyboard.press("Escape");
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(208, 0, 0)",
    );

    async function background(hex: string) {
      await editor
        .getByRole("button", { name: "Note background color", exact: true })
        .click();
      const palette = page.getByRole("dialog", {
        name: "Note colors",
        exact: true,
      });
      await palette
        .getByRole("textbox", { name: "Hex color", exact: true })
        .fill(hex);
      await palette
        .getByRole("button", { name: "Apply color", exact: true })
        .click();
      await page.keyboard.press("Escape");
    }
    await background("#c70000");
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(208, 0, 0)",
    );
    await content.press("ControlOrMeta+A");
    await editor
      .getByRole("button", { name: "Text color", exact: true })
      .click();
    await textMenu
      .getByRole("button", { name: "Automatic", exact: true })
      .click();
    await expect(content.locator('[style*="color"]')).toHaveCount(0);
    await expect(content.locator("strong")).toContainText(
      "Contrast keeps formatting",
    );
    await expect(content.locator("span").first()).toHaveCSS(
      "font-size",
      "24px",
    );
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    await background("#ffffff");
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(32, 40, 36)",
    );
    await background("#000000");
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    await editor.getByRole("button", { name: "View", exact: true }).click();
    let viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(
      viewer.getByRole("region", { name: "Note content", exact: true }),
    ).toHaveCSS("color", "rgb(255, 255, 255)");
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open Automatic color note", exact: true })
      .click();
    viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    content = editor.getByRole("textbox", {
      name: "Note content",
      exact: true,
    });
    await background("#ffffff");
    await expect(content.locator("span").first()).toHaveCSS(
      "color",
      "rgb(32, 40, 36)",
    );
    await expect(content.locator("span").first()).toHaveCSS(
      "font-size",
      "24px",
    );
    await editor
      .getByRole("button", { name: "Text color", exact: true })
      .click();
    await expect(
      textMenu.getByRole("button", { name: "Automatic", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: `test-results/automatic-text-${width}.png` });
  });
}
