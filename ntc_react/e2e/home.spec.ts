import { test, expect } from '@playwright/test';
for (const width of [320, 393, 430, 768]) {
  test(`Home centered at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/home');
    const heading = page.getByRole('heading', { name: 'Clear your mind. Keep your ideas.' });
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    // `html { scrollbar-gutter: stable }` reserves the gutter, so the heading is
    // centered within the layout width (`document.body.clientWidth`), not the physical
    // viewport set by `setViewportSize`.
    const layoutWidth = await page.evaluate(() => document.body.clientWidth);
    expect(Math.abs(box!.x + box!.width / 2 - layoutWidth / 2)).toBeLessThan(2);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    // With `scrollbar-gutter: stable` the layout width may be narrower than the
    // physical viewport (no native scrollbar on short pages), so the no-overflow
    // invariant is `scrollWidth <= physical width`.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.getByRole('button',{name:'Use light theme',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.getByRole('button',{name:'Use light theme',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','light');
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  });
}
test('signed in user can visit Home and return to workspace', async ({ page, request }) => {
  await request.post('http://127.0.0.1:5199/__fixture/reset');
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  await page.getByRole('link',{name:'NoteTatCa home',exact:true}).click();
  await expect(page).toHaveURL(/\/Home/);
  await expect(page.getByRole('heading', { name: 'Clear your mind. Keep your ideas.' })).toBeVisible();
  await expect(page.getByRole('button',{name:'Account menu',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('.account-name')).toHaveCount(0);
  await page.getByRole('banner').getByRole('button', {name:'Account menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Workspace',exact:true}).click();
  await expect(page).toHaveURL(/\/notes/);
  await expect(page.locator('.account-name')).toHaveCount(0);
  await page.getByRole('link',{name:'NoteTatCa home',exact:true}).click();
  await page.getByRole('button',{name:'Account menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
});
