import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Opt in with VITE_GOOGLE_CLIENT_ID set to a synthetic ID; no real Google calls.
test.skip(process.env.NTC_TEST_GOOGLE !== '1', 'Requires synthetic Google fixture environment');

for (const width of [393, 1280]) {
  test(`Google reauthentication preserves the same account draft ${width}`, async ({ page, request }) => {
    await request.post('http://127.0.0.1:5199/__fixture/reset');
    await page.setViewportSize({ width, height: 852 });
    await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
      contentType: 'application/javascript',
      body: `(() => {
        let callback;
        window.google = { accounts: { id: {
          initialize: options => { callback = options.callback; },
          renderButton: element => {
            const button = document.createElement('button');
            button.textContent = 'Continue with Google (fixture)';
            button.onclick = () => callback({ credential: 'synthetic-google-proof' });
            element.appendChild(button);
          }
        } } };
      })();`,
    }));
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill('a@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Open Project notes', exact: true }).click();
    await page.getByRole('dialog', { name: 'View note', exact: true }).getByRole('button', { name: 'Edit', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Edit note', exact: true });
    let expired = true;
    await page.route('**/api/v1/notes/*', async route => {
      if (expired && route.request().method() === 'PATCH')
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      else await route.continue();
    });
    await page.route('**/api/v1/auth/refresh', async route => {
      if (expired) await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      else await route.continue();
    });
    let googleRequests = 0;
    await page.route('**/api/v1/auth/google', async route => {
      expect(route.request().postDataJSON()).toEqual({ idToken: 'synthetic-google-proof' });
      googleRequests++;
      const login = await request.post('http://127.0.0.1:5199/api/v1/auth/login', {
        data: { email: 'a@example.test', password: 'Synthetic-password-123!' },
      });
      expect(login.ok()).toBeTruthy();
      expired = false;
      await route.fulfill({ status: 200, contentType: 'application/json', body: await login.text() });
    });
    await editor.getByRole('textbox', { name: 'Note content' }).fill('My draft survives Google reauthentication.');
    const reauth = page.getByRole('dialog', { name: 'Welcome back', exact: true });
    await expect(reauth).toBeVisible();
    await expect(reauth.getByText('Use email to sign in for now.')).toHaveCount(0);
    const google = reauth.getByRole('button', { name: 'Continue with Google (fixture)' });
    await expect(google).toBeEnabled();
    await mkdir('../artifacts/frontend', { recursive: true });
    await page.screenshot({ path: `../artifacts/frontend/google-reauth-${width}.png`, animations: 'disabled' });
    await google.click();
    await expect(reauth).toHaveCount(0);
    await expect(editor.getByRole('textbox', { name: 'Note content' })).toHaveText('My draft survives Google reauthentication.');
    await editor.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'View note', exact: true })).toContainText('My draft survives Google reauthentication.');
    expect(googleRequests).toBe(1);
    await page.reload();
    await page.getByRole('button', { name: 'Open Project notes', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'View note', exact: true })).toContainText('My draft survives Google reauthentication.');
  });
}
