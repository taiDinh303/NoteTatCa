import { test, expect } from "@playwright/test";

for (const [width, admin] of [
  [393, false],
  [1440, false],
  [1440, true],
] as const) {
  test(`avatar survives sign out and timezone is selected ${width} admin=${admin}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 950 });
    const base = admin ? "/admin/settings/profile" : "/settings/profile";
    async function login() {
      await page.goto("/login");
      await page
        .getByLabel("Email address", { exact: true })
        .fill(admin ? "admin@example.test" : "a@example.test");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Synthetic-password-123!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(admin ? /\/admin\/overview$/ : /\/notes$/);
      await page.goto(base);
    }
    await login();
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    const zone = page.getByLabel("Timezone", { exact: true });
    await expect(zone).toHaveJSProperty("tagName", "SELECT");
    await zone.selectOption("UTC");
    const upload = page.getByLabel("Choose avatar", { exact: true });
    await upload.setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await expect(page.getByRole("alert")).toContainText("Choose a PNG");
    const mime = admin
      ? "image/webp"
      : width === 1440
        ? "image/jpeg"
        : "image/png";
    const png = await page.evaluate((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#2467ce";
      ctx.fillRect(0, 0, 300, 200);
      return canvas.toDataURL(type).split(",")[1];
    }, mime);
    await upload.setInputFiles({
      name: "avatar." + mime.split("/")[1],
      mimeType: mime,
      buffer: Buffer.from(png, "base64"),
    });
    const avatar = page.locator(".profile-identity img");
    await expect(avatar).toBeVisible();
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(128);
    const src = await avatar.getAttribute("src");
    const zoneLabel = (await page
      .locator(".timezone-heading .field-label")
      .boundingBox())!;
    const deviceButton = (await page
      .getByRole("button", { name: "Use device timezone", exact: true })
      .boundingBox())!;
    expect(
      Math.abs(
        zoneLabel.y +
          zoneLabel.height / 2 -
          deviceButton.y -
          deviceButton.height / 2,
      ),
    ).toBeLessThan(2);
    await expect(zone).toHaveCSS("appearance", "none");
    if (width > 800) {
      const locale = (await page.getByLabel("Locale", { exact: true }).boundingBox())!;
      expect(Math.abs((await zone.boundingBox())!.y - locale.y)).toBeLessThan(2);
    }
    await expect(page.locator(".timezone-select > svg")).toHaveCSS(
      "right",
      "12px",
    );
    await page.screenshot({
      path: `../artifacts/frontend/profile-avatar-edit-${width}-${admin}.png`,
      fullPage: true,
    });
    if (width === 1440 && !admin) {
      await page.route("**/api/v1/me", async (route) => {
        if (route.request().method() === "PATCH")
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Synthetic failure" }),
          });
        else await route.continue();
      });
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(avatar).toHaveAttribute("src", src!);
      await expect(zone).toHaveValue("UTC");
      await page.unroute("**/api/v1/me");
    }
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await expect(avatar).toHaveAttribute("src", src!);
    await page.goto("/logout");
    await expect(page).toHaveURL(/\/login$/);
    await login();
    await expect(avatar).toHaveAttribute("src", src!);
    if (width < 800) await page.goto("/notes");
    await expect(
      page
        .getByRole("button", { name: "Account menu", exact: true })
        .locator("img"),
    ).toHaveAttribute("src", src!);
    if (width < 800) await page.goto(base);
    await expect(page.locator(".settings-readonly")).toContainText("UTC");
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    const removal = page.getByRole("dialog", {
      name: "Remove avatar?",
      exact: true,
    });
    await expect(removal).toBeVisible();
    await removal.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(avatar).toHaveAttribute("src", src!);
    await page
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await removal
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await expect(avatar).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(avatar).toHaveAttribute("src", src!);
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use device timezone", exact: true })
      .click();
    await expect(zone).toHaveValue(
      await page.evaluate(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    );
    await page
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await removal
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await expect(avatar).toHaveCount(0);
    await page.screenshot({
      path: `../artifacts/frontend/profile-avatar-${width}-${admin}.png`,
      fullPage: true,
    });
  });
}
