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
    await page
      .getByRole("button", { name: "Edit avatar", exact: true })
      .click();
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
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(0, 0, 150, 200);
      return canvas.toDataURL(type).split(",")[1];
    }, mime);
    await upload.setInputFiles({
      name: "avatar." + mime.split("/")[1],
      mimeType: mime,
      buffer: Buffer.from(png, "base64"),
    });
    await expect(page.locator(".avatar-crop-stage img")).toBeVisible();
    const stage = await page.locator(".avatar-crop-stage").boundingBox();
    await page.mouse.move(stage!.x + 120, stage!.y + 120);
    await page.mouse.down();
    await page.mouse.move(stage!.x + 150, stage!.y + 130);
    await page.mouse.up();
    await expect(
      page.getByLabel("Horizontal position", { exact: true }),
    ).toHaveValue("30");
    await page.getByLabel("Vertical position", { exact: true }).fill("0");
    await page.getByLabel("Avatar zoom", { exact: true }).fill("0.25");
    expect(
      await page
        .locator(".avatar-crop-stage img")
        .evaluate((img) => img.getBoundingClientRect().width),
    ).toBeLessThan(240);
    await page.getByLabel("Avatar zoom", { exact: true }).fill("1.5");
    await page.getByLabel("Horizontal position", { exact: true }).fill("20");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    const avatar = page.locator(".profile-identity img");
    await expect(avatar).toBeVisible();
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(128);
    const pixel = await avatar.evaluate((img: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(64, 64, 1, 1).data);
    });
    expect(pixel[0]).toBeGreaterThan(150);
    expect(pixel[1]).toBeLessThan(30);
    expect(pixel[2]).toBeLessThan(30);
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
    await expect(page.getByLabel("Locale", { exact: true })).toHaveCount(0);
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
      .getByRole("button", { name: "Edit avatar", exact: true })
      .click();
    const removal = page.getByRole("dialog", {
      name: "Edit avatar",
      exact: true,
    });
    await removal.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(avatar).toHaveAttribute("src", src!);
    await page
      .getByRole("button", { name: "Edit avatar", exact: true })
      .click();
    await removal
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await removal.getByRole("button", { name: "Apply", exact: true }).click();
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
      .getByRole("button", { name: "Edit avatar", exact: true })
      .click();
    await removal
      .getByRole("button", { name: "Remove avatar", exact: true })
      .click();
    await removal.getByRole("button", { name: "Apply", exact: true }).click();
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
