import { test, expect } from "@playwright/test";

for (const width of [320, 1440]) {
  test(`note label buttons scroll above fixed actions ${width}`, async ({
    page,
    request,
  }) => {
    const base = "http://127.0.0.1:5199";
    await request.post(base + "/__fixture/reset");
    const credentials = {
      email: "a@example.test",
      password: "Synthetic-password-123!",
    };
    const login = await request.post(base + "/api/v1/auth/login", {
      data: credentials,
    });
    const { token } = (await login.json()).data;
    const headers = { Authorization: `Bearer ${token}` };
    for (let index = 0; index < 37; index++) {
      const response = await request.post(base + "/api/v1/tags", {
        headers,
        data: {
          name:
            index === 36
              ? "W".repeat(50)
              : `Selection label ${String(index).padStart(2, "0")} sample`,
          color: "#326348",
        },
      });
      expect(response.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (width === 320)
      await page.addInitScript(() =>
        localStorage.setItem("ntc.theme.v1", "dark"),
      );
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(credentials.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const card = page.getByRole("article").first();
    const openLabels = async () => {
      await card.getByRole("button", { name: /^Actions for / }).click();
      await page
        .getByRole("menuitem", { name: "Add label", exact: true })
        .click();
    };
    await openLabels();
    const dialog = page.getByRole("dialog", {
      name: "Note labels",
      exact: true,
    });
    await expect(dialog.locator(".note-label-option")).toHaveCount(40);
    await expect(dialog.locator(".modal-title-hidden")).toHaveCSS(
      "width",
      "1px",
    );
    await expect(dialog.locator(".modal-title-hidden")).toHaveCSS(
      "clip",
      "rect(0px, 0px, 0px, 0px)",
    );
    await expect(
      dialog.getByRole("button", { name: "Close dialog" }),
    ).toHaveCount(0);
    const save = dialog.getByRole("button", { name: "Save", exact: true });
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
    await expect(
      dialog.locator('.note-label-option[aria-pressed="true"]').first(),
    ).toHaveCSS("opacity", "1");
    await expect(
      dialog.locator('.note-label-option[aria-pressed="false"]').first(),
    ).toHaveCSS("opacity", "0.6");
    const before = await Promise.all(
      [save, cancel].map((button) => button.boundingBox()),
    );
    const body = dialog.locator(".modal-body");
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() => body.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(100);
    const after = await Promise.all(
      [save, cancel].map((button) => button.boundingBox()),
    );
    for (let index = 0; index < before.length; index++) {
      expect(after[index]!.y).toBeCloseTo(before[index]!.y, 0);
      expect(after[index]!.y + after[index]!.height).toBeLessThan(740);
    }
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBeTruthy();
    while (
      (await dialog
        .locator('.note-label-option[aria-pressed="true"]')
        .count()) < 20
    ) {
      await dialog
        .locator('.note-label-option[aria-pressed="false"]:enabled')
        .first()
        .click();
    }
    await expect(
      dialog.locator('.note-label-option[aria-pressed="false"]:disabled'),
    ).toHaveCount(20);
    const selected = dialog
      .locator('.note-label-option[aria-pressed="true"]')
      .first();
    await selected.focus();
    await page.keyboard.press("Space");
    await expect(
      dialog.locator('.note-label-option[aria-pressed="true"]'),
    ).toHaveCount(19);
    await expect(dialog.locator(".note-label-option:disabled")).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(
      dialog.locator('.note-label-option[aria-pressed="true"]'),
    ).toHaveCount(20);
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.screenshot({
      path: `test-results/note-label-buttons-${width}.png`,
    });
    await save.click();
    await expect(dialog).toBeHidden();
    await openLabels();
    await expect(
      dialog.locator('.note-label-option[aria-pressed="true"]'),
    ).toHaveCount(20);
    await dialog
      .locator('.note-label-option[aria-pressed="true"]')
      .first()
      .click();
    await cancel.click();
    await openLabels();
    await expect(
      dialog.locator('.note-label-option[aria-pressed="true"]'),
    ).toHaveCount(20);
    await cancel.click();
  });
}
