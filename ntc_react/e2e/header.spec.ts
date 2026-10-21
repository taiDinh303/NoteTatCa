import { test, expect } from '@playwright/test';
for (const width of [1440, 1024, 393]) {
  test(`workspace header layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/notes/);
    const header = page.locator('.customer-shell > .topbar');
    const box = (await header.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.width).toBe(width);
    await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeVisible();
    const search = page.getByRole('search');
    const searchBox = (await search.boundingBox())!;
    expect(Math.abs(searchBox.x + searchBox.width / 2 - width / 2)).toBeLessThan(2);
    if (width > 800) {
      const sidebar = (await page.locator('#workspace-navigation').boundingBox())!;
      expect(sidebar.y).toBeGreaterThanOrEqual(box.y + box.height);
      await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
      await expect(page.locator('#workspace-navigation')).toBeHidden();
      await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeVisible();
      await page.getByRole('button', { name: 'Show sidebar', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Your workspace' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await page.getByRole('textbox', { name: 'Search your notes', exact: true }).fill('Welcome');
    await expect(page).toHaveURL(/q=Welcome/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `test-results/header-${width}.png`, fullPage: true });
  });
}
