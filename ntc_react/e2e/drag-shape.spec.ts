import { test, expect } from '@playwright/test';
import type { Note } from '../src/domain/models';
for (const width of [1440, 393]) {
  test(`unequal note cards keep their shape during drag ${width}`, async ({ page, request }) => {
    const fixture = 'http://127.0.0.1:5199';
    await request.post(fixture + '/__fixture/reset');
    const credentials = { email: 'a@example.test', password: 'Synthetic-password-123!' };
    const response = await request.post(fixture + '/api/v1/auth/login', { data: credentials });
    const session = (await response.json()).data;
    const headers = { Authorization: `Bearer ${session.token}` };
    const list = await request.get(fixture + '/api/v1/notes?pageSize=100', { headers });
    const pinned: Note[] = (await list.json()).data.items.filter((n: Note) => n.isPinned).sort((a: Note, b: Note) => a.sortOrder - b.sortOrder);
    for (const [index, note] of pinned.entries()) {
      const patched = await request.patch(fixture + '/api/v1/notes/' + note.id, { headers, data: {
        version: note.version, title: index === 0 ? 'Short card' : 'Tall card',
        documentJson: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: index === 0 ? 'Small thought.' : 'A longer thought with several details to remember. '.repeat(12) }] }] }),
        iconEmoji: null, backgroundColor: index === 0 ? '#326348' : null, isPinned: true, tagIds: note.tags.map(t => t.id),
      } });
      expect(patched.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const group = page.locator('.notes-section').first();
    const short = group.locator('article').filter({ has: page.getByRole('heading', { name: 'Short card', exact: true }) });
    const tall = group.locator('article').filter({ has: page.getByRole('heading', { name: 'Tall card', exact: true }) });
    await expect(tall).toBeVisible();
    const before = [ (await short.boundingBox())!, (await tall.boundingBox())! ];
    expect(before[1].height - before[0].height).toBeGreaterThan(20);
    const source = (await tall.getByRole('button', { name: 'Move Tall card', exact: true }).boundingBox())!;
    const target = (await short.getByRole('button', { name: 'Move Short card', exact: true }).boundingBox())!;
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(source.x + source.width / 2 + 12, source.y + source.height / 2, { steps: 3 });
    await expect(tall).toHaveClass(/dragging/);
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 });
    for (const [index, card] of [short, tall].entries()) {
      const during = (await card.boundingBox())!;
      expect(during.width).toBeCloseTo(before[index].width, 0);
      expect(during.height).toBeCloseTo(before[index].height, 0);
      const scale = await card.evaluate(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return [m.a, m.d]; });
      expect(scale).toEqual([1, 1]);
    }
    await expect(tall).toHaveCSS('opacity', '0.95');
    await page.screenshot({ path: `../artifacts/frontend/drag-unequal-${width}.png`, fullPage: false });
    const reordered = page.waitForResponse(r => r.url().endsWith('/notes/reorder') && r.request().method() === 'POST');
    await page.mouse.up();
    expect((await reordered).ok()).toBeTruthy();
    await expect(group.locator('h3').first()).toHaveText('Tall card');
    await page.reload();
    await expect(page.locator('.notes-section').first().locator('h3').first()).toHaveText('Tall card');
  });
}
