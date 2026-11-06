import { test, expect } from "@playwright/test";
for (const width of [320, 393, 1440])
  test(`long labels retain first name and ellipsis ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/guest");
    await page.locator(".note-card").first().waitFor();
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("ntc.guest.v1", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("workspace", "readwrite");
        const s = tx.objectStore("workspace");
        const r = s.get("guest");
        r.onsuccess = () => {
          const d = r.result;
          const label = { ...d.labels[0], name: "W".repeat(50) };
          d.labels = [label];
          d.notes = [
            { ...d.notes[0], title: "Long label regression", tags: [label] },
          ];
          s.put(d, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = reject;
      });
    });
    await page.reload();
    const card = page.locator(".note-card").first();
    const chip = card.locator(".card-labels > .label-chip").first();
    await expect(chip).toContainText("W".repeat(50));
    await expect(card.locator(".card-labels > .label-overflow")).toHaveCount(0);
    const text = chip.locator(".label-chip-name");
    await expect(text).toHaveCSS("text-overflow", "ellipsis");
    expect(
      await text.evaluate((e) => e.scrollWidth > e.clientWidth),
    ).toBeTruthy();
    await card.click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.locator(".editor-labels .label-chip-name");
    await expect(editor).toHaveText("W".repeat(50));
    await expect(editor).toHaveCSS("white-space", "nowrap");
    expect(
      await editor.evaluate((e) => e.getBoundingClientRect().height < 25),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/long-labels/editor-${width}.png`,
    });
  });

test("initially open sidebar keeps five columns across reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem("ntc.sidebar.hidden.v1", "false");
    localStorage.setItem("ntc.interface.zoom.v1", "100");
  });
  await page.goto("/guest");
  await page.locator(".note-card").first().waitFor();
  for (const width of [1920, 1912, 1910]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    await expect(page.locator(".notes-zoom-layer")).toHaveCSS(
      "--notes-columns",
      "5",
    );
    await page
      .getByRole("button", { name: "Hide sidebar", exact: true })
      .click();
    await expect(page.locator(".notes-zoom-layer")).toHaveCSS(
      "--notes-columns",
      "6",
    );
    await page
      .getByRole("button", { name: "Show sidebar", exact: true })
      .click();
    await expect(page.locator(".notes-zoom-layer")).toHaveCSS(
      "--notes-columns",
      "5",
    );
  }
  await page.screenshot({ path: "artifacts/long-labels/sidebar-open.png" });
});
