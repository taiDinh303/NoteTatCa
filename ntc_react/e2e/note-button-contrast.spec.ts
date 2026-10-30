import { expect, test, type Locator } from "@playwright/test";

async function contrast(button: Locator, outline = false) {
  return button.evaluate((element, outline) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].map((value, index) => index === 3 ? value / 255 : value);
    };
    let background = [255, 255, 255];
    const ancestors: Element[] = [];
    for (let node: Element | null = outline ? element.closest(".note-editor-modal") : element; node; node = node.parentElement) ancestors.push(node);
    for (const node of ancestors.reverse()) {
      const color = rgba(getComputedStyle(node).backgroundColor);
      background = background.map((value, index) => color[index] * color[3] + value * (1 - color[3]));
    }
    const style = getComputedStyle(element);
    const foreground = rgba(outline ? style.outlineColor : style.color);
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, outline);
}

async function hoverAndSettle(button: Locator) {
  await button.hover();
  await button.evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
  });
}

for (const theme of ["light", "dark"]) {
  test(`note actions remain readable on light, black and default backgrounds in ${theme} theme`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(theme => localStorage.setItem("ntc.theme.v1", theme), theme);
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
          const data = get.result, base = data.notes[0];
          data.notes = ["#ffd7b3", "#000000", "#ffffff", null].map((backgroundColor, index) => ({ ...base, id: `${base.id}-${index}`, title: `Contrast ${index}`, backgroundColor, isPinned: false, sortOrder: index }));
          data.revision++;
          store.put(data, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (let index = 0; index < 4; index++) {
      await page.getByRole("button", { name: `Open Contrast ${index}`, exact: true }).click();
      const viewer = page.getByRole("dialog", { name: "View note", exact: true });
      const edit = viewer.getByRole("button", { name: "Edit", exact: true });
      expect(await contrast(edit)).toBeGreaterThanOrEqual(4.5);
      await hoverAndSettle(edit);
      expect(await contrast(edit)).toBeGreaterThanOrEqual(4.5);
      if (index < 2) await page.screenshot({ path: info.outputPath(`view-hover-${index}.png`) });
      await edit.focus();
      await page.keyboard.press("Tab");
      const close = viewer.getByRole("button", { name: "Close", exact: true });
      await expect(close).toBeFocused();
      await expect(close).toHaveCSS("outline-style", "solid");
      expect(await contrast(close, true)).toBeGreaterThanOrEqual(3);
      await edit.click();
      const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
      for (const name of ["View", "Close"]) {
        const action = editor.getByRole("button", { name, exact: true });
        expect(await contrast(action)).toBeGreaterThanOrEqual(4.5);
        await hoverAndSettle(action);
        expect(await contrast(action)).toBeGreaterThanOrEqual(4.5);
      }
      const textbox = editor.getByRole("textbox", { name: "Note content" });
      await textbox.fill("Readable buttons");
      await textbox.press("Control+a");
      const bold = editor.getByRole("button", { name: "Bold", exact: true });
      await bold.click();
      await expect(bold).toHaveClass(/active/);
      expect(await contrast(bold)).toBeGreaterThanOrEqual(3);
      await hoverAndSettle(bold);
      expect(await contrast(bold)).toBeGreaterThanOrEqual(3);
      await editor.getByRole("button", { name: "Close", exact: true }).click();
      await expect(editor).toHaveCount(0);
    }
  });
}
