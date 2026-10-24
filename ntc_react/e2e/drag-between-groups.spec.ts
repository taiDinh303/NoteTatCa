import { test, expect } from "@playwright/test";

for (const pinnedSource of [true, false]) {
  test(`holds card across groups until release pinned=${pinnedSource}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const groups = page.locator(".notes-section");
    await expect(groups).toHaveCount(2);
    const cards = page.locator(".note-card");
    const ids = await cards.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-testid")),
    );
    const bounds = await cards.evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y };
      }),
    );
    const source = groups
      .nth(pinnedSource ? 0 : 1)
      .locator("article")
      .first();
    const sourceId = await source.getAttribute("data-testid");
    const original = (await source.boundingBox())!;
    const start = (await source.locator(".note-open").boundingBox())!;
    const target = (await groups
      .nth(pinnedSource ? 1 : 0)
      .locator("article")
      .first()
      .boundingBox())!;
    let writes = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/notes/reorder") && r.method() === "POST") writes++;
    });
    const sx = start.x + 30,
      sy = start.y + 15;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 12, sy, { steps: 3 });
    await expect(source).toHaveClass(/dragging/);
    const tx = target.x + 80,
      ty = target.y + 60;
    await page.mouse.move(tx, ty, { steps: 15 });
    // Hold over the forbidden group longer than the settle animation, then
    // move again: neither collision nor a completed transition may steal it.
    await page.waitForTimeout(350);
    await expect(source).toHaveClass(/dragging/);
    let held = (await source.boundingBox())!;
    expect(held.x).toBeCloseTo(original.x + tx - sx, 0);
    expect(held.y).toBeCloseTo(original.y + ty - sy, 0);
    await page.mouse.move(tx + 25, ty + 12, { steps: 4 });
    held = (await source.boundingBox())!;
    expect(held.x).toBeCloseTo(original.x + tx + 25 - sx, 0);
    expect(held.y).toBeCloseTo(original.y + ty + 12 - sy, 0);
    const notice = page.getByText("Move notes within the same pinned group.", {
      exact: true,
    });
    await expect(notice).toHaveCount(0);
    const positions = await cards.evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { id: n.getAttribute("data-testid"), x: r.x, y: r.y };
      }),
    );
    positions.forEach((r, i) => {
      if (r.id === sourceId) return;
      expect(r.x).toBeCloseTo(bounds[i].x, 0);
      expect(r.y).toBeCloseTo(bounds[i].y, 0);
    });
    await page.mouse.up();
    await expect(notice).toBeVisible();
    await expect(source).not.toHaveClass(/dragging/);
    await expect
      .poll(async () => Math.abs((await source.boundingBox())!.y - original.y))
      .toBeLessThan(1);
    expect(
      await cards.evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-testid")),
      ),
    ).toEqual(ids);
    expect(writes).toBe(0);
    await page.reload();
    await expect(cards).toHaveCount(ids.length);
    expect(
      await cards.evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-testid")),
      ),
    ).toEqual(ids);
  });
}
