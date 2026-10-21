import { test, expect } from "@playwright/test";
for (const scenario of [
  { width: 1440, admin: false },
  { width: 393, admin: false },
  { width: 1440, admin: true },
]) {
  test(`settings view then edit ${scenario.width} admin=${scenario.admin}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: scenario.width, height: 900 });
    const base = scenario.admin ? "/admin/settings" : "/settings";
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(scenario.admin ? "admin@example.test" : "a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(
      scenario.admin ? /admin\/overview/ : /\/notes/,
    );
    await page.goto(base + "/profile?edit=name");
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    const main = page.locator(".workspace-main");
    await expect(main.locator("input, select")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    const name = page.getByLabel("First name", { exact: true });
    const original = await name.inputValue();
    await name.fill("Discard this");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(main.locator("input, select")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await expect(name).toHaveValue(original);
    await name.fill("Reviewed");
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
    await expect(name).toHaveValue("Reviewed");
    await page.unroute("**/api/v1/me");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await expect(main.locator("input, select")).toHaveCount(0);
    await page.reload();
    await expect(
      main.locator("dd").filter({ hasText: /^Reviewed$/ }),
    ).toBeVisible();
    await page.getByRole("navigation", { name: "Settings", exact: true })
      .getByRole("link", { name: "Account & security", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit email", exact: true }),
    ).toBeVisible();
    await expect(main.locator("input, select")).toHaveCount(0);
    await page.getByRole("button", { name: "Edit email", exact: true }).click();
    await page
      .getByLabel("New email address", { exact: true })
      .fill("discard@example.test");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Edit email", exact: true }).click();
    await expect(
      page.getByLabel("New email address", { exact: true }),
    ).toHaveValue("");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit phone number", exact: true })
      .click();
    await page.getByLabel("Phone number", { exact: true }).fill("0901234567");
    await page
      .getByRole("button", { name: "Save phone number", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit phone number", exact: true }),
    ).toBeVisible();
    await expect(main.getByText("0901234567", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Edit password", exact: true })
      .click();
    await expect(
      page.getByLabel("Current password", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Current password", { exact: true })
      .fill("discard-secret");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(main.locator("input, select")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Edit password", exact: true })
      .click();
    await expect(
      page.getByLabel("Current password", { exact: true }),
    ).toHaveValue("");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(scenario.width);
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({
      path: `../artifacts/frontend/settings-readonly-${scenario.width}-${scenario.admin}.png`,
      fullPage: true,
    });
  });
}
