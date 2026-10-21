import { test, expect } from "@playwright/test";
for (const admin of [false, true]) {
  test(`dismisses ${admin ? "admin" : "customer"} navigation outside without a close icon`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(admin ? "admin@example.test" : "a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const trigger = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    await trigger.click();
    const drawer = page.getByRole("dialog", {
      name: admin ? "Administration navigation" : "Your workspace",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: "Close dialog" }),
    ).toHaveCount(0);
    await drawer.getByRole("heading").click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(380, 300);
    await expect(drawer).toBeHidden();
    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await trigger.click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link").first().click();
    await expect(drawer).toBeHidden();
  });
}
