import { test, expect } from '@playwright/test';
for (const [language, width, heading] of [['en',1440,'Help & feedback'],['vi',393,'Trợ giúp và phản hồi'],['zh',393,'帮助与反馈'],['ja',393,'ヘルプとフィードバック']] as const) {
  test(`help content and feedback ${language} ${width}`, async ({ page, request, context }) => {
    await request.post('http://127.0.0.1:5199/__fixture/reset');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.note-grid').first()).toBeVisible();
    await page.addInitScript(value => localStorage.setItem('ntc.language.v1', value), language);
    await page.goto('/help');
    const help = page.locator('.help-page');
    await expect(help.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(help.locator('.help-guide')).toHaveCount(3);
    await expect(help.locator('details')).toHaveCount(5);
    await help.locator('summary').first().click();
    await expect(help.locator('details').first()).toHaveAttribute('open','');
    const message = help.locator('textarea');
    const buttons = help.locator('.help-feedback-actions button');
    await expect(buttons.first()).toBeDisabled();
    await message.fill('Synthetic feedback: the labels list scrolls correctly.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await buttons.first().click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Synthetic feedback');
    const saved = page.waitForEvent('download');
    await buttons.nth(1).click();
    expect((await saved).suggestedFilename()).toBe('notetatca-feedback.txt');
    expect(await help.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/help-${language}-${width}.png`, fullPage: true });
    await help.locator('a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
  });
}
