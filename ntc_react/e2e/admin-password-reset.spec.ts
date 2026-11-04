import { test, expect } from "@playwright/test";

for (const width of [1440, 393]) {
  test(`admin requests password recovery after confirmation at ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("admin@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await page.goto("/admin/users");
    const menu = page.getByRole("button", {
      name: "Manage a@example.test",
      exact: true,
    });
    await menu.click();
    await page
      .getByRole("menuitem", { name: "Send password reset link", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Send a password reset link?",
      exact: true,
    });
    await expect(dialog).toContainText("a@example.test");
    await expect(dialog.locator("input[type=password]")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(
      await (
        await request.get(
          "http://127.0.0.1:5199/__fixture/mail?email=a@example.test",
        )
      ).json(),
    ).toHaveLength(0);

    let attempts = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      "**/api/v1/admin/users/*/password-reset",
      async (route) => {
        attempts++;
        if (attempts === 1)
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              message: "Synthetic email service unavailable",
            }),
          });
        else {
          await gate;
          await route.continue();
        }
      },
    );
    await menu.click();
    await page
      .getByRole("menuitem", { name: "Send password reset link", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Send reset link", exact: true })
      .click();
    await expect(dialog.locator(".error-banner")).toBeVisible();
    expect(
      await (
        await request.get(
          "http://127.0.0.1:5199/__fixture/mail?email=a@example.test",
        )
      ).json(),
    ).toHaveLength(0);
    await dialog
      .getByRole("button", { name: "Send reset link", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Send reset link", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    release();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("Password reset email sent", { exact: true }),
    ).toBeVisible();
    const mail = await (
      await request.get(
        "http://127.0.0.1:5199/__fixture/mail?email=a@example.test",
      )
    ).json();
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toBe("Reset your password");
    expect(attempts).toBe(2);
  });
}
