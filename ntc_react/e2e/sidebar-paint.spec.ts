import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 1440, height: 900 },
  video: { mode: "on", size: { width: 1440, height: 900 } },
  reducedMotion: "no-preference",
});
test("desktop sidebar remains clipped after repeated closes", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator(".note-card").first().waitFor();
  const sidebar = page.locator("#workspace-navigation");
  const settle = () =>
    sidebar.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
      for (let frame = 0; frame < 8; frame++)
        await new Promise(requestAnimationFrame);
    });
  for (let repeat = 0; repeat < 6; repeat++) {
    await page
      .getByRole("button", { name: "Hide sidebar", exact: true })
      .click();
    await settle();
    await expect(sidebar).toHaveAttribute("inert", "");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect(sidebar).toHaveCSS("visibility", "visible");
    await expect(sidebar).toHaveCSS("clip-path", "inset(0px 100% 0px 0px)");
    await expect(sidebar).toHaveCSS("transition-property", "clip-path");
    await page
      .getByRole("button", { name: "Show sidebar", exact: true })
      .click();
    await settle();
    await expect(sidebar).not.toHaveAttribute("inert", "");
  }
  const video = page.video()!;
  await page.close();
  await video.saveAs("artifacts/frontend/sidebar-paint-close.webm");
});
