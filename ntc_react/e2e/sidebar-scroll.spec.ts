import { test, expect } from "@playwright/test";

for (const width of [320, 393, 1440]) {
  test(`only sidebar labels scroll ${width}`, async ({ page, request }) => {
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
    for (let index = 0; index < 35; index++) {
      const response = await request.post(base + "/api/v1/tags", {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: `Scroll label ${String(index).padStart(2, "0")}`,
          color: "#326348",
        },
      });
      expect(response.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(credentials.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    if (width < 800)
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
    const sidebar = page.locator(
      width < 800 ? ".workspace-drawer" : "#workspace-navigation",
    );
    const labels = sidebar.getByRole("navigation", {
      name: "Labels",
      exact: true,
    });
    await expect(labels.getByRole("link")).toHaveCount(38);
    const fixed = [
      sidebar.locator(".primary-nav"),
      sidebar.locator(".labels-heading"),
      sidebar.locator(".sidebar-bottom"),
    ];
    if (width < 800) fixed.push(sidebar.locator(".modal-header"));
    const before = await Promise.all(
      fixed.map((element) => element.boundingBox()),
    );
    await labels.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() => labels.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(100);
    const after = await Promise.all(
      fixed.map((element) => element.boundingBox()),
    );
    before.forEach((box, index) =>
      expect(after[index]!.y).toBeCloseTo(box!.y, 0),
    );
    await expect(labels.getByRole("link").last()).toBeInViewport();
    await expect(
      sidebar.getByRole("link", { name: "Settings", exact: true }),
    ).toBeInViewport();
    await expect(
      sidebar.getByRole("link", { name: "Help & feedback", exact: true }),
    ).toBeInViewport();
    expect(await sidebar.evaluate((element) => element.scrollTop)).toBe(0);
    if (width < 800) {
      const notifications = sidebar.getByRole("link", {
        name: "Open inbox",
        exact: true,
      });
      const settings = sidebar.getByRole("link", {
        name: "Settings",
        exact: true,
      });
      const style = (element: HTMLElement) => {
        const css = getComputedStyle(element);
        return [
          css.fontSize,
          css.padding,
          css.color,
          css.gap,
          element.getBoundingClientRect().height,
        ];
      };
      expect(await notifications.evaluate(style)).toEqual(
        await settings.evaluate(style),
      );
      await page.screenshot({
        path: `test-results/sidebar-label-scroll-${width}.png`,
      });
      await notifications.click();
      await expect(page).toHaveURL(/\/notifications$/);
      await expect(sidebar).toBeHidden();
    }
  });
}
