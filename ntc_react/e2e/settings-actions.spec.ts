import { test, expect } from "@playwright/test";
for (const width of [320, 393, 1440]) {
  test(`settings action rows and password setup ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/notes/);
    // Synthetic account state only: no real OAuth or password mail is sent.
    await page.route("**/api/v1/me", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.data.account.hasPassword = false;
      await route.fulfill({ response, json: body });
    });
    await page.route("**/api/v1/me/logins", (route) =>
      route.fulfill({ json: { data: [{ provider: "Google" }] } }),
    );
    await page.goto("/settings/account");
    await expect(
      page.getByRole("heading", { name: "Account details", exact: true }),
    ).toHaveCount(0);
    for (const name of ["Email address", "Phone number"]) {
      const section = page
        .locator(".account-section")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(section.locator(".settings-symbol svg")).toBeVisible();
      await expect(
        section.getByRole("button", { name: "Change", exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByText("Connected", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("No password is set for your account.", { exact: true }),
    ).toHaveCount(0);
    const setup = page.getByRole("button", {
      name: "Set your password",
      exact: true,
    });
    await expect(setup).toBeVisible();
    for (const row of await page.locator(".account-data-row").all()) {
      const bounds = await row.boundingBox();
      const button = await row.getByRole("button").boundingBox();
      expect(
        Math.abs(bounds!.x + bounds!.width - button!.x - button!.width),
      ).toBeLessThan(2);
    }
    await setup.click();
    await expect(
      page.getByRole("button", {
        name: "Send password setup link",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.screenshot({
      path: `../artifacts/frontend/settings-actions-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("link", { name: "Active sessions", exact: true })
      .click();
    const signout = page.getByRole("button", {
      name: "Sign out everywhere",
      exact: true,
    });
    await expect(signout).toBeVisible();
    const footer = await page.locator(".sessions-footer").boundingBox();
    const button = await signout.boundingBox();
    expect(
      Math.abs(footer!.x + footer!.width - button!.x - button!.width),
    ).toBeLessThan(2);
    await signout.click();
    await expect(
      page.getByRole("dialog", { name: "Sign out everywhere?", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}
