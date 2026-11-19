import { expect, test } from "@playwright/test";

// iPhone 16 landscape: 852 × 393.  Width > 800 so the @container max-width:800
// rules are bypassed; only the (orientation: landscape and max-height:500px)
// media query + updated useMobileLayout handle this case.
const W = 852;
const H = 393;

async function openNoteInLandscape(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.setViewportSize({ width: W, height: H });
  await page.addInitScript(() => {
    localStorage.setItem("ntc.note.fullscreen.v1", "false");
  });
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await page.locator(".note-card").first().getByRole("button", { name: /^Open / }).click();
  const viewer = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(viewer).toBeVisible();
  return viewer;
}

test("landscape phone: note modal fills full screen height", async ({ page, request }) => {
  const viewer = await openNoteInLandscape(page, request);
  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();
  // Height should be at least 85% of the viewport height (no desktop 176px offset)
  expect(box!.height).toBeGreaterThan(H * 0.85);
  // Top should be near 0
  expect(box!.y).toBeLessThan(20);
  // Full width
  expect(box!.width).toBeGreaterThanOrEqual(W - 4);
});

test("landscape phone: Edit mode also fills full screen", async ({ page, request }) => {
  const viewer = await openNoteInLandscape(page, request);
  await viewer.getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await expect(editor).toBeVisible();
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(H * 0.85);
  expect(box!.y).toBeLessThan(20);
});

test("landscape phone: Close returns to notes list", async ({ page, request }) => {
  const viewer = await openNoteInLandscape(page, request);
  await viewer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
});
