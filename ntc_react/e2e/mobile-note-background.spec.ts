import { test, expect, webkit } from "@playwright/test";

// Default CI installs Chromium; opt in locally when WebKit is installed.
const engines: Array<"chromium" | "webkit"> = process.env.NTC_NOTE_BACKGROUND_WEBKIT === "1"
  ? ["chromium", "webkit"] : ["chromium"];
for (const engine of engines) {
  test.describe(engine, () => {
    for (const width of [320, 393, 430, 1440]) {
      test(`note modal preserves scrolled background at ${width}px`, async ({ browser }, info) => {
        const activeBrowser = engine === "webkit" ? await webkit.launch() : browser;
        const context = await activeBrowser.newContext({ viewport: { width, height: 860 }, isMobile: width < 800, hasTouch: width < 800 });
        try {
          const page = await context.newPage();
          await page.goto("http://127.0.0.1:5173/Home");
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
                const data = get.result, base = data.notes[0];
                data.notes = Array.from({ length: 20 }, (_, index) => ({ ...base, id: `${base.id}-${index}`, title: `Background ${index}`, isPinned: true, sortOrder: index }));
                data.revision++;
                store.put(data, "guest");
              };
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
            db.close();
          });
          await page.reload();
          await expect(page.locator(".note-card")).toHaveCount(20);
          await page.evaluate(async () => { await document.fonts.ready; });
          const scroller = page.locator(".notes-zoom-viewport");
          await scroller.evaluate(element => { element.scrollTop = 150; });
          await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(150);
          const index = await page.locator(".note-card").evaluateAll(elements => {
            const viewport = document.querySelector(".notes-zoom-viewport")!.getBoundingClientRect();
            return elements.findIndex(element => {
              const box = element.getBoundingClientRect();
              return box.top >= viewport.top && box.bottom <= viewport.bottom;
            });
          });
          expect(index).toBeGreaterThanOrEqual(0);
          const geometry = () => page.evaluate(() => ({
            boxes: [...document.querySelectorAll(".topbar, .workspace-main, .notes-zoom-viewport, .notes-zoom-layer, .note-card")].map(element => {
              const { x, y, width, height } = element.getBoundingClientRect();
              return { x, y, width, height };
            }),
            root: { width: document.documentElement.clientWidth, scrollX, scrollY },
            scrollTop: document.querySelector(".notes-zoom-viewport")!.scrollTop,
          }));
          const before = await geometry();
          const unchanged = async () => {
            const after = await geometry();
            expect(after.root).toEqual(before.root);
            expect(after.scrollTop).toBe(before.scrollTop);
            expect(after.boxes).toHaveLength(before.boxes.length);
            after.boxes.forEach((box, i) => {
              for (const key of ["x", "y", "width", "height"] as const)
                expect(Math.abs(box[key] - before.boxes[i][key]), `box ${i} ${key}`).toBeLessThan(1);
            });
          };
          const opener = page.locator(".note-card").nth(index).getByRole("button", { name: /^Open / });
          if (width < 800) await opener.tap(); else await opener.click();
          const viewer = page.getByRole("dialog", { name: "View note", exact: true });
          await expect(viewer).toBeVisible();
          await unchanged();
          const overlay = page.locator(".modal-overlay");
          await expect(overlay).toHaveCSS("backdrop-filter", width < 800 ? "none" : "blur(3px)");
          expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width, height: 860 });
          if (engine === "webkit" && width < 800) {
            // Mobile WebKit does not support Playwright mouse.wheel.
            await page.touchscreen.tap(2, 20);
          } else {
            await page.mouse.move(2, 20);
            await page.mouse.wheel(0, 300);
          }
          await unchanged();
          await page.screenshot({ path: info.outputPath("open.png") });
          await viewer.getByRole("button", { name: "Edit", exact: true }).click();
          const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
          await expect(editor.getByRole("textbox", { name: "Note content" })).toBeVisible();
          await unchanged();
          await editor.getByRole("button", { name: "View", exact: true }).click();
          await expect(viewer).toBeVisible();
          await unchanged();
          await viewer.getByRole("button", { name: "Close", exact: true }).click();
          await expect(viewer).toHaveCount(0);
          await expect(page.locator("body")).not.toHaveAttribute("data-scroll-locked");
          await unchanged();
          await scroller.evaluate(element => { element.scrollTop += 100; });
          await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(250);
        } finally {
          await context.close();
          if (engine === "webkit") await activeBrowser.close();
        }
      });
    }
  });
}
