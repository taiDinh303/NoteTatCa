import { expect, test } from "@playwright/test";

for (const scenario of [
  { width: 1440, view: "grid" },
  { width: 1440, view: "list" },
  { width: 393, view: "list" },
]) {
  test(`card edges open notes with an arrow cursor ${scenario.width} ${scenario.view}`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await page.addInitScript(view => localStorage.setItem("ntc.view.v1", view), scenario.view);
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const first = page.locator(".note-card").first();
    await expect(first).toBeVisible();
    const id = (await first.getAttribute("data-testid"))!;
    const card = page.getByTestId(id);
    await expect(card).toHaveCSS("cursor", "default");
    await expect(card.locator(".note-open")).toHaveCSS("cursor", "default");
    await expect(card.locator(".note-card-identity")).toHaveCSS("cursor", "default");
    for (const edge of ["top-left", "top-right", "left", "right", "bottom"]) {
      const box = (await card.boundingBox())!;
      const x = edge === "top-right" || edge === "right" ? box.width - 6 : edge === "bottom" ? box.width / 2 : 6;
      const y = edge.startsWith("top") ? 6 : edge === "bottom" ? box.height - 6 : box.height / 2;
      await card.click({ position: { x, y } });
      const dialog = page.getByRole("dialog", { name: "View note", exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    if (scenario.width === 1440 && scenario.view === "grid") {
      const group = page.locator(".notes-section").first();
      const source = (await card.boundingBox())!;
      const target = (await group.locator(".note-card").nth(1).boundingBox())!;
      await page.mouse.move(source.x + 6, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(source.x + 18, source.y + source.height / 2, { steps: 3 });
      await expect(card).toHaveClass(/dragging/);
      await expect(card).toHaveCSS("cursor", "default");
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
      await page.mouse.up();
      await expect(page.locator(".note-card.dragging")).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(group.locator(".note-card").nth(1)).toHaveAttribute("data-testid", id);
    }
    // Action buttons must not bubble into opening the surrounding card.
    await card.getByRole("button", { name: /^Unpin / }).click();
    await expect(card.getByRole("button", { name: /^Pin / })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await card.getByRole("button", { name: /^Actions for / }).click();
    await expect(page.getByRole("menuitem", { name: "Add label", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Move earlier", exact: true })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Move later", exact: true })).toHaveCount(0);
    const menu = page.getByRole("menu");
    const trigger = (await card.locator('button[aria-label^="Actions for "]').boundingBox())!;
    const rect = (await menu.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(scenario.width);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(900);
    if (trigger.y + trigger.height + 7 + rect.height <= 892 && trigger.x + rect.width <= scenario.width - 8) {
      await expect(menu).toHaveAttribute("data-side", "bottom");
      await expect(menu).toHaveAttribute("data-align", "start");
      expect(rect.y).toBeGreaterThanOrEqual(trigger.y + trigger.height);
      expect(Math.abs(rect.x - trigger.x)).toBeLessThan(2);
    }
    await page.keyboard.press("Escape");
    // The existing open button retains keyboard access.
    await card.locator(".note-open").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "View note", exact: true })).toBeVisible();
  });
}
