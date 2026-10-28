import { expect, test } from "@playwright/test";

for (const title of ["", "Plain title"]) {
  test(`header actions stay at the right without an icon, title=${title || "empty"}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/Home");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Try guest mode", exact: true })
      .click();
    await expect(page.locator(".note-card")).toHaveCount(3);
    await page.evaluate(async (title) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("ntc.guest.v1", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("workspace", "readwrite"),
          store = tx.objectStore("workspace"),
          get = store.get("guest");
        get.onsuccess = () => {
          const data = get.result;
          data.notes.forEach((note) => {
            note.iconEmoji = "";
            note.title = title;
          });
          data.revision++;
          store.put(data, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, title);
    await page.reload();
    await page.locator(".note-card .note-open").first().click();
    const view = page.getByRole("dialog", { name: "View note", exact: true });
    const viewPin = view.locator(".editor-pin");
    await expect(viewPin).toBeVisible();
    const before = await viewPin.getAttribute("aria-pressed");
    await viewPin.click();
    await expect(viewPin).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    const pin = (await viewPin.boundingBox())!,
      size = (await view
        .getByRole("button", { name: "Enter full screen", exact: true })
        .boundingBox())!,
      frame = (await view.boundingBox())!;
    expect(pin.x).toBeGreaterThan(frame.x + frame.width * 0.7);
    expect(size.x).toBeGreaterThan(pin.x);
    expect(Math.abs(pin.y - size.y)).toBeLessThan(1);
    await view.getByRole("button", { name: "Edit", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit note", exact: true });
    const editPin = edit.locator(".editor-pin");
    await expect(editPin).toHaveAttribute(
      "aria-pressed",
      before === "true" ? "false" : "true",
    );
    const editedPin = (await editPin.boundingBox())!,
      editedSize = (await edit
        .getByRole("button", { name: "Enter full screen", exact: true })
        .boundingBox())!;
    expect(Math.abs(editedPin.x - pin.x)).toBeLessThan(1);
    expect(Math.abs(editedSize.x - size.x)).toBeLessThan(1);
    const iconButton = edit.getByRole("button", {
      name: "Choose note icon",
      exact: true,
    });
    const emptyIcon = (await iconButton.boundingBox())!;
    const titleBefore = (await edit
      .getByRole("textbox", { name: "Note title", exact: true })
      .boundingBox())!;
    expect(emptyIcon.x).toBeLessThan(titleBefore.x);
    await iconButton.click();
    await page.locator(".note-icon-grid button").nth(1).click();
    const chosenIcon = (await iconButton.boundingBox())!;
    const titleAfter = (await edit
      .getByRole("textbox", { name: "Note title", exact: true })
      .boundingBox())!;
    expect(Math.abs(chosenIcon.x - emptyIcon.x)).toBeLessThan(1);
    expect(chosenIcon.width).toBe(emptyIcon.width);
    expect(Math.abs(titleAfter.x - titleBefore.x)).toBeLessThan(1);
    await editPin.click();
    await edit.getByRole("button", { name: "View", exact: true }).click();
    await expect(viewPin).toHaveAttribute("aria-pressed", before!);
  });
}
