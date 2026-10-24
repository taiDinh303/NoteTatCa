import { test, expect } from '@playwright/test';
for (const width of [320, 1440]) {
  test(`labels header form and Close stay fixed ${width}`, async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const base = 'http://127.0.0.1:5199';
    await request.post(base + '/__fixture/reset');
    const credentials = { email: 'a@example.test', password: 'Synthetic-password-123!' };
    const login = await request.post(base + '/api/v1/auth/login', { data: credentials });
    const { token } = (await login.json()).data;
    for (let i = 0; i < 24; i++) {
      const response = await request.post(base + '/api/v1/tags', {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: `Sticky label ${String(i).padStart(2, '0')}`, color: '#326348', icon: null },
      });
      expect(response.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    if (width < 800) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Manage labels', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Your labels', exact: true });
    const done = modal.getByRole('button', { name: 'Close', exact: true });
    const input = modal.getByLabel('New label', { exact: true });
    const heading = modal.getByRole('heading', { name: 'Your labels', exact: true });
    await expect(modal.locator('.label-row')).toHaveCount(27);
    const before = await Promise.all([done, input, heading].map(el => el.boundingBox()));
    expect(before[0]!.y + before[0]!.height).toBeLessThan(740);
    const scroll = modal.locator('.labels-manager-scroll');
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
    const after = await Promise.all([done, input, heading].map(el => el.boundingBox()));
    for (let i = 0; i < before.length; i++) expect(after[i]!.y).toBeCloseTo(before[i]!.y, 0);
    await expect(modal.getByRole('button', { name: 'Edit label Sticky label 23', exact: true })).toBeInViewport();
    await modal.getByRole('button', { name: 'Edit label Sticky label 23', exact: true }).click();
    await expect(modal.getByRole('textbox', { name: 'Edit label', exact: true })).toHaveValue('Sticky label 23');
    await page.screenshot({ path: `test-results/labels-fixed-${width}.png` });
    await done.click();
    await expect(modal).toHaveCount(0);
  });
}
