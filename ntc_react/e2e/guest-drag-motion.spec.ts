import { expect, test } from "@playwright/test";

for (const [from, to] of [
  [2, 1],
  [1, 2],
]) {
  test(`guest release ${from + 1} to ${to + 1} has no second flight or left-neighbour flicker`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await expect(page.locator(".note-card")).toHaveCount(3);
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("ntc.guest.v1", 1);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("workspace", "readwrite");
        const store = tx.objectStore("workspace");
        const get = store.get("guest");
        get.onsuccess = () => {
          const data = get.result;
          data.notes = [
            ...data.notes,
            { ...data.notes[2], id: crypto.randomUUID() },
          ].map((note, i) => ({
            ...note,
            title: `Card ${i + 1}`,
            isPinned: false,
            pinnedAt: null,
            sortOrder: i * 1000,
          }));
          data.revision++;
          store.put(data, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    const cards = page.locator(".note-card");
    await expect(cards).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page
      .getByRole("button", { name: `Open Card ${from + 1}`, exact: true })
      .hover();
    const ids = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid")!),
    );
    const source = page.getByTestId(ids[from]);
    const target = page.getByTestId(ids[to]);
    const a = (await source.boundingBox())!,
      b = (await target.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + 75);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + 75, { steps: 3 });
    await expect(source).toHaveClass(/dragging/);
    await page.mouse.move(b.x + b.width / 2, b.y + 75, { steps: 16 });
    await page.waitForTimeout(260);
    const left = (await page.getByTestId(ids[0]).boundingBox())!;
    const recording = page.evaluate(
      async ({ active, neighbour }) => {
        const samples: { active: number; left: number; top: number }[] = [];
        const start = performance.now();
        while (performance.now() - start < 450) {
          const a = document
            .querySelector<HTMLElement>(`[data-testid="${active}"]`)!
            .getBoundingClientRect();
          const n = document
            .querySelector<HTMLElement>(`[data-testid="${neighbour}"]`)!
            .getBoundingClientRect();
          samples.push({ active: a.x, left: n.x, top: n.y });
          await new Promise(requestAnimationFrame);
        }
        return samples;
      },
      { active: ids[from], neighbour: ids[0] },
    );
    await page.mouse.up();
    const samples = await recording;
    expect(samples.length).toBeGreaterThan(5);
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.active - b.x))),
    ).toBeLessThan(24);
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.left - left.x))),
    ).toBeLessThan(1.1);
    expect(
      Math.max(...samples.map((sample) => Math.abs(sample.top - left.y))),
    ).toBeLessThan(1.1);
    const wanted = [...ids];
    const [moved] = wanted.splice(from, 1);
    wanted.splice(to, 0, moved);
    await expect
      .poll(() =>
        cards.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-testid")),
        ),
      )
      .toEqual(wanted);
    await expect
      .poll(() =>
        cards.evaluateAll((nodes) =>
          nodes.some((node) =>
            node.getAnimations().some((a) => a.playState === "running"),
          ),
        ),
      )
      .toBe(false);
  });
}
