import { test, expect } from '@playwright/test';

for (const width of [393, 1280]) {
  test(`View waits for save and keeps drafts on error ${width}`, async ({ page, request }) => {
    await request.post('http://127.0.0.1:5199/__fixture/reset');
    await page.setViewportSize({ width, height: 852 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Open Project notes', exact: true }).click();
    let viewer = page.getByRole('dialog', { name: 'View note', exact: true });
    await viewer.getByRole('button', { name: 'Edit', exact: true }).click();
    let editor = page.getByRole('dialog', { name: 'Edit note', exact: true });
    let reject = true;
    await page.route('**/api/v1/notes/*', async route => {
      if (route.request().method() === 'PATCH' && reject) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic save failure' }) });
      } else await route.continue();
    });
    await editor.getByRole('textbox', { name: 'Note content' }).fill('Draft survives failed View');
    await editor.getByRole('button', { name: 'View', exact: true }).click();
    await expect(editor.getByRole('alert')).toBeVisible();
    await expect(editor.getByRole('textbox', { name: 'Note content' })).toContainText('Draft survives failed View');
    await expect(page.getByRole('dialog', { name: 'View note', exact: true })).toHaveCount(0);
    reject = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/v1/notes/*', async route => {
      if (route.request().method() === 'PATCH') await gate;
      await route.fallback();
    });
    await editor.getByRole('button', { name: 'View', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'View', exact: true })).toHaveAttribute('aria-busy', 'true');
    await expect(editor.getByRole('button', { name: 'Close', exact: true })).toBeDisabled();
    await expect(page.getByRole('dialog', { name: 'View note', exact: true })).toHaveCount(0);
    release();
    viewer = page.getByRole('dialog', { name: 'View note', exact: true });
    await expect(viewer.getByRole('region', { name: 'Note content' })).toContainText('Draft survives failed View');
    await expect(viewer.locator('.editor-toolbar')).toHaveCount(0);
    await viewer.getByRole('button', { name: 'Edit', exact: true }).click();
    editor = page.getByRole('dialog', { name: 'Edit note', exact: true });
    await expect(editor.getByRole('textbox', { name: 'Note content' })).toContainText('Draft survives failed View');
    await editor.getByRole('button', { name: 'View', exact: true }).click();
    await expect(viewer.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Open Project notes', exact: true }).click();
    await expect(viewer.getByRole('region', { name: 'Note content' })).toContainText('Draft survives failed View');
    await viewer.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Take a note', exact: true }).click();
    editor = page.getByRole('dialog', { name: 'New note', exact: true });
    await editor.getByLabel('Note title').fill('New note preview');
    await editor.getByRole('textbox', { name: 'Note content' }).fill('New note can return to View');
    await editor.getByRole('button', { name: 'View', exact: true }).click();
    await expect(viewer.getByRole('region', { name: 'Note content' })).toContainText('New note can return to View');
    await viewer.getByRole('button', { name: 'Edit', exact: true }).click();
    editor = page.getByRole('dialog', { name: 'Edit note', exact: true });
    await expect(editor.getByLabel('Note title')).toHaveValue('New note preview');
    await page.screenshot({ path: `test-results/view-toggle-${width}.png`, animations: 'disabled' });
  });
}
