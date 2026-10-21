import { test, expect } from '@playwright/test';
for (const width of [1440, 1024, 393, 320]) {
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
    await expect(search).toHaveCSS("border-top-width", "1px");
    await expect(search).toHaveCSS("border-radius", "12px");
    if (width > 800) expect(Math.abs(searchBox.x + searchBox.width / 2 - width / 2)).toBeLessThan(2);
    if (width > 800) {
      const sidebar = (await page.locator('#workspace-navigation').boundingBox())!;
      expect(sidebar.y).toBeGreaterThanOrEqual(box.y + box.height);
      await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
      await expect(page.locator('#workspace-navigation')).toBeHidden();
      await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeVisible();
      await page.getByRole('button', { name: 'Show sidebar', exact: true }).click();
    } else {
      expect(box.height).toBe(66);
      expect(Math.abs(searchBox.y + searchBox.height / 2 - box.height / 2)).toBeLessThan(2);
      await expect(header.getByRole('button', { name: 'Account menu' })).toBeVisible();
      await expect(header.getByRole('button', { name: 'Use dark theme' })).toBeHidden();
      await expect(header.getByRole('button', { name: 'Open inbox' })).toBeHidden();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Your workspace' });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('button', { name: 'Use dark theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.keyboard.press('Escape');
      await header.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Zoom (100%)', exact: true }).click();
      const zoom = page.getByRole('dialog', { name: 'Interface zoom', exact: true });
      await expect(zoom).toBeVisible();
      await zoom.getByRole('button', { name: 'Done', exact: true }).click();
      await header.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Your profile', exact: true }).click();
      await expect(drawer).toBeHidden();
      await expect(page).toHaveURL(/settings\/profile/);
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(drawer.getByRole('button', { name: 'Account menu', exact: true })).toHaveCount(0);
      await drawer.getByRole('button', { name: 'Open inbox', exact: true }).click();
      await expect(page).toHaveURL(/\/notifications$/);
      await expect(drawer).toBeHidden();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await drawer.getByRole('link', { name: 'All notes', exact: true }).click();
      await expect(page).toHaveURL(/\/notes$/);
      await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeAttached();
      await expect(drawer).toBeHidden();
    }
    await page.getByRole('textbox', { name: 'Search your notes', exact: true }).fill('Welcome');
    await expect(page).toHaveURL(/q=Welcome/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `test-results/header-${width}.png`, fullPage: true });
  });
}
