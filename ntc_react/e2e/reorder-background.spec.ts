import { test, expect } from "@playwright/test";
async function signIn(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.locator(".notes-section").first().locator("h3").first(),
  ).toHaveText("An idea worth exploring");
}
async function drag(
  page: import("@playwright/test").Page,
  source: string,
  target: string,
) {
  const a = (await page
    .getByRole("button", { name: `Open ${source}`, exact: true })
    .boundingBox())!;
  const b = (await page
    .getByRole("button", { name: `Open ${target}`, exact: true })
    .boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + 15);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + 15, { steps: 3 });
  await expect(page.locator(".note-card.dragging")).toHaveCount(1);
  await page.mouse.move(b.x + b.width / 2, b.y + 15, { steps: 12 });
  await page.mouse.up();
}
test("can drag again while the previous reorder request is still pending", async ({
  page,
  request,
}) => {
  await signIn(page, request);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/v1/notes/reorder", async (route) => {
    writes++;
    if (writes === 1) await held;
    await route.continue();
  });
  await drag(page, "An idea worth exploring", "Little things, lately");
  const group = page.locator(".notes-section").first();
  await expect(group.locator("h3").first()).toHaveText("Little things, lately");
  await expect.poll(() => writes).toBe(1);
  await drag(page, "An idea worth exploring", "Little things, lately");
  await expect(group.locator("h3").first()).toHaveText(
    "An idea worth exploring",
  );
  expect(writes).toBe(1);
  const settled = page.waitForResponse(
    (r) =>
      r.url().includes("/notes?") &&
      r.url().includes("pinned=true") &&
      r.status() === 200,
  );
  release();
  await expect.poll(() => writes).toBe(2);
  await settled;
  await page.reload();
  await expect(
    page.locator(".notes-section").first().locator("h3").first(),
  ).toHaveText("An idea worth exploring");
});
test("failed reorder keeps the requested layout and supports explicit retry", async ({
  page,
  request,
}) => {
  await signIn(page, request);
  let fail = true;
  await page.route("**/api/v1/notes/reorder", (route) =>
    fail
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic failure" }),
        })
      : route.continue(),
  );
  await drag(page, "An idea worth exploring", "Little things, lately");
  const group = page.locator(".notes-section").first();
  await expect(page.getByRole("alert")).toContainText(
    "Note order is not saved.",
  );
  await expect(group.locator("h3").first()).toHaveText("Little things, lately");
  fail = false;
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator(".notes-section").first().locator("h3").first(),
  ).toHaveText("Little things, lately");
});
