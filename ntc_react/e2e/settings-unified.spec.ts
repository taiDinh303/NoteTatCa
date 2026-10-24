import { test, expect } from "@playwright/test";

for (const [width, admin] of [
  [320, false],
  [1440, false],
  [1440, true],
] as const) {
  test(`shared settings navigation ${width} admin=${admin}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(admin ? "admin@example.test" : "a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(admin ? /\/admin\/overview$/ : /\/notes$/);
    if (!admin) {
      if (width < 800)
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
      await page
        .getByRole("link", { name: "Settings", exact: true })
        .filter({ visible: true })
        .click();
    } else await page.goto("/admin/settings");
    const base = admin ? "/admin/settings" : "/settings";
    await expect(page).toHaveURL(new RegExp(base + "/account$"));
    const nav = page.getByRole("navigation", { name: "Settings", exact: true });
    await expect(nav.getByRole("link")).toHaveText([
      "Profile",
      "Account & security",
      "Appearance",
      "Language",
      "Privacy",
      "Active sessions",
    ]);
    for (const name of [
      "Language",
      "Privacy",
      "Appearance",
      "Active sessions",
      "Profile",
    ]) {
      await nav.getByRole("link", { name, exact: true }).click();
      await expect(
        nav.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      if (name === "Language")
        await expect(
          page.getByRole("radio", { name: "English", exact: true }),
        ).toBeChecked();
      if (name === "Appearance")
        await expect(
          page.getByRole("switch", { name: "Dark mode", exact: true }),
        ).toBeVisible();
      if (name === "Privacy")
        await expect(
          page.getByRole("heading", { name: "Your notes", exact: true }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth > document.body.clientWidth,
        ),
      ).toBe(false);
    }
    await nav.getByRole("link", { name: "Language", exact: true }).click();
    await page.screenshot({
      path: `../artifacts/frontend/settings-unified-${width}-${admin}.png`,
      fullPage: true,
    });
    if (width > 800) {
      await page
        .getByRole("button", { name: "Account menu", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "Account settings", exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(base + "/profile$"));
    }
  });
}
