import { expect, test } from "@playwright/test";
import metadata from "../src/features/mascot/mascotAnchors.generated.json" with { type: "json" };

for (const [width, zoom, mode] of [
  [1440, 50, "grid"], [1440, 100, "grid"], [1440, 150, "grid"],
  [1440, 100, "list"], [393, 100, "grid"],
] as const) {
  test(`the entire Chef hat fits above the first pinned row ${width}/${zoom}/${mode}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(({ zoom, mode }) => {
      localStorage.setItem("ntc.mascot.v1", "on:chef");
      localStorage.setItem("ntc.interface.zoom.v1", String(zoom));
      localStorage.setItem("ntc.view.v1", mode);
    }, { zoom, mode });
    await page.goto("/Home");
    await page.getByRole("main").getByRole("link", { name: "Try guest mode", exact: true }).click();
    await expect(page.locator(".note-card")).toHaveCount(3);
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("ntc.guest.v1", 1);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("workspace", "readwrite"), store = tx.objectStore("workspace"), get = store.get("guest");
        get.onsuccess = () => {
          const data = get.result;
          data.notes = [{ ...data.notes[0], isPinned: true, title: "Pinned Chef", content: "Hat stays visible above the first row." }];
          data.revision++;
          store.put(data, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    const mascot = page.locator(".note-card .note-mascot");
    await expect(mascot).toBeVisible();
    await expect(page.locator(".notes-section").first().getByRole("heading", { level: 2 })).toContainText("Pinned");
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".notes-zoom-viewport").evaluate(view => { view.scrollTop = 0; });
    const measured = await mascot.evaluate(async (element, anchors) => {
      const viewport = element.closest(".notes-zoom-viewport")!.getBoundingClientRect();
      const cardElement = element.closest<HTMLElement>(".note-card")!;
      const card = cardElement.getBoundingClientRect();
      const scale = card.width / cardElement.offsetWidth;
      const result: number[] = [];
      for (const kind of ["directions", "reactions"] as const) {
        const layer = element.querySelector<HTMLElement>(`.mascot-${kind}`)!;
        const style = getComputedStyle(layer), box = layer.getBoundingClientRect();
        const image = new Image();
        image.src = style.backgroundImage.slice(5, -2);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const w = image.width / 3, h = image.height / 3;
        const position = style.backgroundPosition.split(" ").map(parseFloat);
        const current = Math.round(position[1] / 50) * 3 + Math.round(position[0] / 50);
        for (let cell = 0; cell < 9; cell++) {
          const pixels = context.getImageData(cell % 3 * w, Math.floor(cell / 3) * h, w, h).data;
          let top = h;
          for (let p = 3; p < pixels.length; p += 4) if (pixels[p] > 16) { top = Math.floor((p - 3) / 4 / w); break; }
          const paintedTop = box.top + (anchors[kind][current] - anchors[kind][cell] + top / h) * box.height;
          result.push(paintedTop - viewport.top);
        }
      }
      return { margins: result, floorGap: (card.top - element.getBoundingClientRect().bottom) / scale, cardWidth: card.width };
    }, { directions: metadata.atlases["chef-directions"].floors, reactions: metadata.atlases["chef-reactions"].floors });
    expect(Math.min(...measured.margins), JSON.stringify(measured)).toBeGreaterThanOrEqual(2);
    expect(Math.abs(measured.floorGap)).toBeLessThanOrEqual(1.1);
    await page.screenshot({ path: info.outputPath("pinned-chef.png") });
  });
}
