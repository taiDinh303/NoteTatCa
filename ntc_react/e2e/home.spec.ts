import { test, expect } from '@playwright/test';
for (const width of [320, 393, 430, 768]) {
  test(`Home centered at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/home');
    const heading = page.getByRole('heading', { name: 'Clear your mind. Keep your ideas.' });
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  });
}
test('signed in user can visit Home and return to workspace', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/Home/);
  await expect(page.getByRole('heading', { name: 'Clear your mind. Keep your ideas.' })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Open workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
});
