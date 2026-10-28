import { expect, test } from "@playwright/test";

async function openReminderForm(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Project notes", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "View note", exact: true })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Edit note", exact: true })
    .getByRole("button", { name: "Note reminders", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Reminders", exact: true });
  await dialog
    .getByRole("button", { name: "Add reminder", exact: true })
    .click();
  return dialog;
}

test("creates a reminder immediately while the request saves in background", async ({
  page,
}) => {
  const dialog = await openReminderForm(page);
  await expect(dialog.getByLabel("Recurrence timezone")).toHaveCount(0);
  await expect(dialog).toContainText("device timezone");

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let postedZone = "";
  await page.route("**/api/v1/notes/*/reminders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    postedZone = route.request().postDataJSON().timeZoneId;
    await gate;
    await route.continue();
  });
  await dialog
    .getByRole("button", { name: "Set reminder", exact: true })
    .click();
  await expect(dialog.getByText("Saving in background…")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Set reminder", exact: true }),
  ).toHaveCount(0);
  release();
  await expect(dialog.getByText(/Does not repeat · Active/)).toBeVisible();
  expect(postedZone).toBe(
    await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("dialog", { name: "Edit note", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("link", { name: "Reminders", exact: true }).click();
  const card = page
    .locator(".reminder-card")
    .filter({ hasText: "Project notes" });
  await expect(
    card.getByText("Keep it simple.", { exact: false }),
  ).toBeVisible();
  await expect(card).toHaveCSS("background-color", "rgb(222, 237, 248)");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    const status = card.locator(".status-pill");
    await expect(status).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(181, 235, 199)" : "rgb(32, 92, 56)",
    );
    await card.getByRole("button", { name: "Reminder actions" }).click();
    await page.getByRole("menuitem", { name: "Pause reminder" }).click();
    await expect(status).toHaveText("Paused");
    await expect(status).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(255, 218, 150)" : "rgb(117, 70, 0)",
    );
    await expect(card).toHaveCSS("opacity", "1");
    await card.getByRole("button", { name: "Reminder actions" }).click();
    await page.getByRole("menuitem", { name: "Enable reminder" }).click();
    await expect(status).toHaveText("Active");
  }
  await expect(card.getByText("View note", { exact: true })).toHaveCount(0);
  await card.click({ position: { x: 100, y: 65 } });
  await expect(page.getByRole("dialog", { name: "View note" })).toContainText(
    "Make the important things easy to find.",
  );
  await expect(page).toHaveURL(/\/reminders$/);
  await page
    .getByRole("dialog", { name: "View note" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Edit note" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "Edit note" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(card).toBeVisible();
  await expect(page).toHaveURL(/\/reminders$/);
  await card
    .getByRole("button", { name: "Project notes", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "View note" })).toBeVisible();
});

test("restores entered reminder details when background creation fails", async ({
  page,
}) => {
  const dialog = await openReminderForm(page);
  const date = dialog.getByLabel("Date & time");
  const chosen = await date.inputValue();
  await dialog.getByLabel("Repeat").selectOption("1");
  await dialog.getByLabel("Every").fill("2");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/notes/*/reminders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await gate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Save failed" }),
    });
  });
  await dialog
    .getByRole("button", { name: "Set reminder", exact: true })
    .click();
  await expect(dialog.getByText("Saving in background…")).toBeVisible();
  release();
  await expect(
    dialog.getByRole("button", { name: "Set reminder", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Date & time")).toHaveValue(chosen);
  await expect(dialog.getByLabel("Repeat")).toHaveValue("1");
  await expect(dialog.getByLabel("Every")).toHaveValue("2");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByText("Saving in background…")).toHaveCount(0);
});
