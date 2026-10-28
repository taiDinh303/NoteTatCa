import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const fixture = "http://127.0.0.1:5199";
async function start(page: Page) {
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Guest mode", exact: true }),
  ).toBeVisible();
}
async function write(page: Page, title: string) {
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title", { exact: true }).click();
  await editor.getByLabel("Note title", { exact: true }).fill(title);
  await editor
    .getByRole("textbox", { name: "Note content" })
    .fill("A private guest draft");
  await expect(
    editor.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "Note reminders", exact: true }),
  ).toBeDisabled();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
}
async function nav(page: Page, name: RegExp) {
  const open = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await open.isVisible()) await open.click();
  await page.getByRole("link", { name }).first().click();
}
test("guest cannot enter account/admin routes or authorize backend requests", async ({
  page,
  request,
}) => {
  await start(page);
  for (const path of [
    "/settings/account",
    "/admin/overview",
    "/reminders",
    "/notifications",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/notes$/);
    await expect(
      page.getByRole("complementary", { name: "Guest mode", exact: true }),
    ).toBeVisible();
  }
  expect((await request.get(fixture + "/api/v1/notes")).status()).toBe(401);
});
for (const width of [320, 1440])
  test(`guest notes and labels persist without API requests ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const network: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/|\/health\//.test(request.url())) network.push(request.url());
    });
    await start(page);
    await expect(page.getByRole("article")).toHaveCount(3);
    await write(page, "Guest custom note");
    const open = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    if (await open.isVisible()) await open.click();
    await page
      .getByRole("button", { name: "Manage labels", exact: true })
      .click();
    const labels = page.getByRole("dialog", {
      name: "Your labels",
      exact: true,
    });
    await labels.getByLabel("New label", { exact: true }).fill("Guest label");
    await labels.getByRole("button", { name: "Add", exact: true }).click();
    await expect(
      labels.getByText("Guest label", { exact: true }),
    ).toBeVisible();
    await labels
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", {
        name: "Actions for Guest custom note",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Add label", exact: true })
      .click();
    const choose = page.getByRole("dialog", {
      name: "Note labels",
      exact: true,
    });
    await choose
      .getByRole("button", { name: "Guest label", exact: true })
      .click();
    await choose.getByRole("button", { name: "Save", exact: true }).click();
    await expect(choose).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Open Guest custom note", exact: true }),
    ).toBeVisible();
    const card = page.getByRole("article").filter({
      has: page.getByRole("button", {
        name: "Open Guest custom note",
        exact: true,
      }),
    });
    await expect(card).toContainText("Guest label");
    await page
      .getByRole("button", { name: "Pin Guest custom note", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Unpin Guest custom note",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Actions for Guest custom note",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Move to trash", exact: true })
      .click();
    await nav(page, /^Trash/);
    await expect(
      page.getByRole("button", {
        name: "Restore Guest custom note",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Restore Guest custom note", exact: true })
      .click();
    await nav(page, /^All notes/);
    await expect(
      page.getByRole("button", { name: "Open Guest custom note", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    const reset = page.getByRole("dialog", {
      name: "Reset this guest demo?",
      exact: true,
    });
    await reset.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(card).toBeVisible();
    await page.screenshot({
      path: info.outputPath("guest-workspace.png"),
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Reset this guest demo?", exact: true })
      .getByRole("button", { name: "Reset demo", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(3);
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.session.v1")),
    ).toBeNull();
    expect(network).toEqual([]);
  });
test("sign-in offers a safe copy, retry keeps the source and does not duplicate notes", async ({
  page,
  request,
}) => {
  await request.post(fixture + "/__fixture/reset");
  await start(page);
  await write(page, "Guest to account");
  await write(page, "Guest trash to account");
  await page
    .getByRole("button", {
      name: "Actions for Guest trash to account",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to trash", exact: true })
    .click();
  let fail = true;
  await page.route("**/api/v1/notes", async (route) => {
    if (fail && route.request().method() === "POST") {
      fail = false;
      await route.fulfill({
        status: 503,
        json: { message: "Temporary copy failure" },
      });
    } else await route.continue();
  });
  await page
    .getByRole("complementary", { name: "Guest mode", exact: true })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const prompt = page.getByRole("dialog", {
    name: "Copy guest notes to your account?",
    exact: true,
  });
  await expect(prompt).toBeVisible();
  await prompt
    .getByRole("button", { name: "Copy to my account", exact: true })
    .click();
  await expect(prompt.getByRole("alert")).toContainText(
    "Temporary copy failure",
  );
  await prompt
    .getByRole("button", { name: "Copy to my account", exact: true })
    .click();
  await expect(prompt).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Guest to account", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Open Project notes", exact: true }),
  ).toBeVisible();
  await nav(page, /^Trash/);
  await expect(
    page.getByRole("button", {
      name: "Restore Guest trash to account",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("30 days left", { exact: true })).toBeVisible();
  await nav(page, /^All notes/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open Guest to account", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("complementary", { name: "Guest mode", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await page.goto("/guest");
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Open Guest to account", exact: true }),
  ).toHaveCount(0);
});
test("declining the copy keeps guest data and account data separate", async ({
  page,
  request,
}) => {
  await request.post(fixture + "/__fixture/reset");
  await start(page);
  await write(page, "Keep local guest");
  await page
    .getByRole("complementary", { name: "Guest mode", exact: true })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("b@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Keep local guest", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Copy guest notes", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Copy guest notes to your account?",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await page.goto("/guest");
  await expect(
    page.getByRole("button", { name: "Open Keep local guest", exact: true }),
  ).toBeVisible();
});

test("discarding guest notes removes the copy menu and stays cleared after reload", async ({
  page,
  request,
}) => {
  await request.post(fixture + "/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 852 });
  await start(page);
  await page
    .getByRole("complementary", { name: "Guest mode", exact: true })
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("b@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Copy guest notes to your account?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  const rows = await dialog
    .locator(".modal-footer .button")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
  expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(2);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Copy guest notes", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeAttached();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Copy guest notes", exact: true }),
  ).toHaveCount(0);
});
