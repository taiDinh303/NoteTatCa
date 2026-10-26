import { test, expect } from '@playwright/test';
for (const width of [1440, 1024, 393, 320]) {
  test(`workspace header layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/notes/);
    await expect(page.locator('.note-card').first()).toBeVisible();
    const header = page.locator('.customer-shell > .topbar');
    const layout = await page.evaluate(() => document.body.clientWidth);
    const box = (await header.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(layout);
    if (width > 800) {
      await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeVisible();
    } else {
      await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeHidden();
    }
    const search = page.getByRole('search');
    const searchBox = (await search.boundingBox())!;
    await expect(search).toHaveCSS("border-top-width", "1px");
    await expect(search).toHaveCSS("border-radius", "12px");
    if (width > 800) expect(Math.abs(searchBox.x + searchBox.width / 2 - layout / 2)).toBeLessThan(2);
    if (width > 800) {
      const sidebar = (await page.locator('#workspace-navigation').boundingBox())!;
      expect(sidebar.y).toBeGreaterThanOrEqual(box.y + box.height);
      await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
      await expect(page.locator('#workspace-navigation')).toHaveAttribute('inert', '');
      await expect.poll(() => page.locator('#workspace-navigation').evaluate(el => -el.getBoundingClientRect().x / el.getBoundingClientRect().width * 100)).toBe(100);
      await expect(header.getByRole('link', { name: 'NoteTatCa home' })).toBeVisible();
      await page.getByRole('button', { name: 'Show sidebar', exact: true }).click();
    } else {
      expect(box.height).toBe(66);
      expect(Math.abs(searchBox.y + searchBox.height / 2 - box.height / 2)).toBeLessThan(2);
      await expect(header.getByRole('button', { name: 'Account menu' })).toBeVisible();
      await expect(header.getByRole('button', { name: 'Use dark theme' })).toBeHidden();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'NoteTatCa.' });
      await expect(drawer).toBeVisible();
      await expect.poll(async () => (await drawer.boundingBox())!.x).toBeCloseTo(0);
      for (const height of [740, 852, 900]) {
        await page.setViewportSize({ width, height });
        await expect.poll(async () => (await drawer.boundingBox())!.height).toBeCloseTo(height, 0);
        const bounds = (await drawer.boundingBox())!;
        expect(bounds.x).toBeCloseTo(0);
        expect(bounds.y).toBeCloseTo(0);
        expect(bounds.y + bounds.height).toBeCloseTo(height, 0);
        expect(bounds.width).toBeLessThanOrEqual(width * 0.9 + 1);
        await expect(drawer).toHaveCSS('border-radius', '0px');
      }
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `test-results/drawer-${width}.png` });
      await expect(drawer.getByRole('button', { name: /Use (light|dark) theme/ })).toHaveCount(0);
      await drawer.getByRole('link', { name: 'Settings', exact: true }).click();
      await expect(drawer).toBeHidden();
      await page.getByRole('link', { name: 'Appearance', exact: true }).click();
      await page.getByRole('switch', { name: 'Dark mode' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(header.getByRole('search')).toBeHidden();
      await expect(page.locator('.preferences-back')).toBeHidden();
      await header.getByRole('link', { name: 'Back', exact: true }).click();
      await expect(page).toHaveURL(/\/settings$/);
      await header.getByRole('link', { name: 'Back', exact: true }).click();
      await expect(page).toHaveURL(/\/notes$/);
      await header.getByRole('button', { name: 'Account menu', exact: true }).click();
      await expect(page.getByRole('spinbutton', { name: 'Zoom percentage', exact: true })).toHaveValue('100');
      await page.keyboard.press('Escape');
      await header.getByRole('button', { name: 'Account menu', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Account settings', exact: true }).click();
      await expect(drawer).toBeHidden();
      await expect(page).toHaveURL(/settings\/profile/);
      await header.getByRole('link', { name: 'Back', exact: true }).click();
      await header.getByRole('link', { name: 'Back', exact: true }).click();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(drawer.getByRole('button', { name: 'Account menu', exact: true })).toHaveCount(0);
      await drawer.getByRole('link', { name: 'Open inbox', exact: true }).click();
      await expect(page).toHaveURL(/\/notifications$/);
      await expect(drawer).toBeHidden();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await drawer.getByRole('link', { name: 'All notes', exact: true }).click();
      await expect(page).toHaveURL(/\/notes$/);
      await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeAttached();
      await expect(drawer).toBeHidden();
    }
    if (width > 800) {
      await page.locator('#workspace-navigation').getByRole('link', { name: 'Settings', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page.getByRole('dialog', { name: 'NoteTatCa.' }).getByRole('link', { name: 'Settings', exact: true }).click();
    }
    await expect(page).toHaveURL(width > 800 ? /\/settings\/account$/ : /\/settings$/);
    for (const name of ['Language', 'Privacy']) {
      await page.getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await expect(page.locator('.preferences-page').getByRole('switch')).toHaveCount(0);
      if (width < 800) await header.getByRole('link', { name: 'Back', exact: true }).click();
    }
    await page.getByRole('link', { name: 'Appearance', exact: true }).click();
    const themeSwitch = page.getByRole('switch', { name: 'Dark mode' });
    await themeSwitch.setChecked(true);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (width > 800) {
      await header.getByRole('button', { name: 'Use light theme', exact: true }).click();
      await expect(themeSwitch).not.toBeChecked();
      await themeSwitch.click();
      await expect(header.getByRole('button', { name: 'Use light theme', exact: true })).toBeVisible();
    }
    await page.reload();
    await expect(themeSwitch).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.body.clientWidth)).toBe(0);
    await page.screenshot({ path: `test-results/appearance-${width}.png`, fullPage: true });
    await page.goto('/notes');
    await page.getByRole('textbox', { name: 'Search your notes', exact: true }).fill('Welcome');
    await expect(page).toHaveURL(/q=Welcome/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.body.clientWidth)).toBe(0);
    if (width <= 800) {
      for (const height of [650, 740, 900]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => {
          document.querySelector<HTMLElement>('.main-column')!.style.minHeight = '2400px';
          window.scrollTo(0, 301);
        });
        await expect.poll(async () => (await header.boundingBox())!.y).toBeLessThanOrEqual(1);
        const coverage = await header.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { top: rect.top, shadow: style.boxShadow, surface: style.backgroundColor,
            atTop: document.elementFromPoint(innerWidth / 2, 1)?.closest('.topbar') === element };
        });
        expect(coverage.top).toBeGreaterThanOrEqual(-1);
        expect(coverage.atTop).toBe(true);
        expect(coverage.shadow).toContain(coverage.surface);
        expect(coverage.shadow).toContain('0px -2px 0px');
      }
      await page.evaluate(() => {
        document.querySelector<HTMLElement>('.main-column')!.style.removeProperty('min-height');
        window.scrollTo(0, 0);
      });
    }
    await page.screenshot({ path: `test-results/header-${width}.png`, fullPage: true });
  });
}
