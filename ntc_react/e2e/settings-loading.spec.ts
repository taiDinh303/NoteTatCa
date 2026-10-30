import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.NTC_SETTINGS_LOADING !== "1", "Production settings loading regression");
test.use({ serviceWorkers: "block" });
const fixture = "http://127.0.0.1:5199";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
}
test.beforeEach(async ({ request }) => { expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy(); });

test("settings navigation commits and shows loading while its real module and account data are pending", async ({ page }) => {
  let releaseModule!: () => void, releaseData!: () => void;
  const moduleGate = new Promise<void>(resolve => { releaseModule = resolve; });
  const dataGate = new Promise<void>(resolve => { releaseData = resolve; });
  let moduleRequested = false;
  await page.route("**/assets/PreferencesPage-*.js", async route => { moduleRequested = true; await moduleGate; await route.continue(); });
  await page.route("**/api/v1/me/logins", async route => { await dataGate; await route.continue(); });
  await login(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/account$/);
  await expect(page.getByText("Loading connected accounts…", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Settings", exact: true }).getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/appearance$/);
  await expect(page.getByText("Loading settings…", { exact: true })).toBeVisible();
  expect(moduleRequested).toBe(true);
  await expect(page.getByRole("navigation", { name: "Workspace", exact: true })).toBeVisible();
  // Tabs remain usable even when the previous route's module is held.
  await page.getByRole("navigation", { name: "Settings", exact: true }).getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(page.locator(".profile-card")).toBeVisible();
  releaseModule(); releaseData();
  await page.unrouteAll({ behavior: "wait" });
  await page.getByRole("navigation", { name: "Settings", exact: true }).getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Fox", exact: true })).toBeVisible();
});

test("background previews show real loading and retry without canvas scans or blocking other settings", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const previewRequests: string[] = [];
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.getImageData;
    (window as unknown as { canvasReads: number }).canvasReads = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      (window as unknown as { canvasReads: number }).canvasReads++;
      return original.apply(this, args);
    };
  });
  await page.route("**/mascots/ntc-v6/previews/**", async route => { previewRequests.push(route.request().url()); await gate; await route.continue(); });
  await login(page);
  // Warming begins on Notes, before Appearance is opened, with bounded traffic.
  await expect.poll(() => previewRequests.length).toBe(4);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Settings", exact: true });
  await nav.getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/appearance$/);
  const fox = page.getByRole("radio", { name: "Fox", exact: true }).locator("..");
  await expect(fox.getByRole("status", { name: "Loading Fox…", exact: true })).toBeVisible();
  await expect(fox.locator(".mascot-choice-page")).toHaveCount(0);
  expect(previewRequests.length).toBe(4);
  await fox.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("appearance-loading.png") });
  await nav.getByRole("link", { name: "Language", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/language$/);
  await expect(page.getByRole("group", { name: "App language", exact: true })).toBeVisible();
  release();
  await page.unrouteAll({ behavior: "wait" });
  let fail = true;
  // A cold second tab verifies that a failed image has an explicit recovery path.
  const second = await page.context().newPage();
  await second.route("**/mascots/ntc-v6/previews/fox-directions.webp?*", route => fail ? route.fulfill({ status: 503, body: "" }) : route.continue());
  await second.goto("/settings/appearance");
  const retry = second.getByRole("button", { name: "Retry Fox", exact: true });
  await expect(retry).toBeVisible();
  fail = false;
  await retry.click();
  await expect(second.getByRole("radio", { name: "Fox", exact: true }).locator("..").locator(".mascot-choice-page")).toBeVisible();
  await expect(retry).toHaveCount(0);
  await second.close();
  await nav.getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page.locator('.mascot-choice-preview[data-preview-state="ready"]')).toHaveCount(50);
  expect(await page.evaluate(() => (window as unknown as { canvasReads: number }).canvasReads)).toBe(0);
  await fox.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("appearance-ready.png") });
});
