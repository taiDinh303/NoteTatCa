import { test, expect } from "@playwright/test";
const base = "http://127.0.0.1:5199";
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
}
for (const width of [320, 1440])
  test(`hidden PIN notes stay out of normal lists and survive lock ${width}`, async ({
    page,
    request,
  }) => {
    await request.post(base + "/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    const card = page.locator(".note-card").first();
    const originalTitle = await card.getByRole("heading").innerText();
    const originalWidth = (await card.boundingBox())!.width;
    const originalColor = await card.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await card.getByRole("button", { name: /^Actions for / }).click();
    await page
      .getByRole("menuitem", { name: "Hide note", exact: true })
      .click();
    await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
    await page
      .getByRole("button", { name: "Confirm lock", exact: true })
      .click();
    await page.getByRole("button", { name: "Hide note", exact: true }).click();
    await expect(page.locator(".vault-page .note-card")).toHaveCount(1);
    await expect(page.locator(".vault-page .note-card")).toHaveCSS(
      "background-color",
      originalColor,
    );
    expect(
      Math.abs(
        (await page.locator(".vault-page .note-card").boundingBox())!.width -
          originalWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".vault-page > h1")).toHaveClass("sr-only");
    await page.getByRole("button", { name: "list view", exact: true }).click();
    await expect(page.locator(".vault-page .notes-zoom-layer")).toHaveAttribute(
      "data-layout",
      "list",
    );
    if (width === 1440)
      expect(
        (await page.locator(".vault-page .note-card").boundingBox())!.width,
      ).toBeGreaterThan(originalWidth * 2);
    await page.getByRole("button", { name: "grid view", exact: true }).click();
    const pin = page
      .locator(".vault-page .note-card")
      .getByRole("button", { name: /^(Unpin|Pin) / });
    const oldPinLabel = await pin.getAttribute("aria-label");
    await pin.click();
    await expect(pin).not.toHaveAttribute("aria-label", oldPinLabel!);
    const localTitles = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("ntc.offline.v1", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
      });
      return await new Promise<string[]>((resolve, reject) => {
        const r = db.transaction("accounts").objectStore("accounts").getAll();
        r.onsuccess = () =>
          resolve(
            r.result.flatMap((x: { notes: { title: string }[] }) =>
              x.notes.map((n) => n.title),
            ),
          );
        r.onerror = reject;
      });
    });
    expect(localTitles).not.toContain(originalTitle);

    await page.locator(".vault-page .note-open").click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Note title", exact: true })
      .fill("Hidden fixture title");
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Lock now", exact: true }).click();
    await expect(
      page.getByText("Hidden fixture title", { exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Hidden fixture title", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.dispatchEvent(new Event("blur"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator(".vault-page .note-card")).toHaveCount(1);
    await page
      .getByRole("button", {
        name: "Actions for Hidden fixture title",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Unhide note", exact: true })
      .click();
    await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
    await page.goto("/notes");
    await expect(
      page.getByText("Hidden fixture title", { exact: true }),
    ).toBeVisible();
  });
test("pattern supports keyboard setup and unlock", async ({
  page,
  request,
}) => {
  await request.post(base + "/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 850 });
  await signIn(page);
  await page.goto("/hidden-notes");
  await page.getByRole("button", { name: "Lock type", exact: true }).click();
  await page
    .getByRole("option", { name: "3 by 3 pattern", exact: true })
    .click();
  const draw = async () => {
    for (const n of [1, 2, 3, 6]) {
      await page
        .getByRole("button", { name: `Point ${n}`, exact: true })
        .focus();
      await page.keyboard.press("Space");
    }
  };
  await draw();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await draw();
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock now", exact: true }).click();
  await draw();
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
});

test("hidden drafts resume after locking and never enter the offline cache", async ({
  page,
  request,
}) => {
  await request.post(base + "/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 850 });
  await signIn(page);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  await page
    .getByRole("button", { name: "New hidden note", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Note title", exact: true })
    .fill("Unsaved private fixture");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByText("Unsaved private fixture", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/notes/);
  await expect(
    page.getByText(
      "Unlock hidden notes and save or discard your unsent draft before signing out.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await page.locator(".vault-page .note-open").first().click();
  await expect(
    page.getByText("Unsaved private fixture", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("ntc.offline.v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    return await new Promise<string>((resolve, reject) => {
      const r = db.transaction("accounts").objectStore("accounts").getAll();
      r.onsuccess = () => resolve(JSON.stringify(r.result));
      r.onerror = reject;
    });
  });
  expect(stored).not.toContain("Unsaved private fixture");
  await page.clock.install();
  await page.mouse.move(1, 1);
  await page.clock.fastForward(900001);
  await expect(
    page.getByRole("button", { name: "Unlock", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
});

test.describe("touch hidden notes", () => {
  test.use({ hasTouch: true });
  test("pull gesture opens vault and touch pattern inserts crossed points", async ({
    page,
    request,
  }) => {
    await request.post(base + "/__fixture/reset");
    await page.setViewportSize({ width: 393, height: 850 });
    await signIn(page);
    const heading = page.getByRole("heading", { name: /^Pinned / }).first();
    const box = (await heading.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + 10,
      y = box.y + 5;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y + 140 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page).toHaveURL(/\/hidden-notes/);
    await page.getByRole("button", { name: "Lock type", exact: true }).click();
    await page
      .getByRole("option", { name: "3 by 3 pattern", exact: true })
      .click();
    const draw = async () => {
      for (const [i, n] of [1, 3, 6].entries()) {
        const b = (await page
          .getByRole("button", { name: `Point ${n}`, exact: true })
          .boundingBox())!;
        await cdp.send("Input.dispatchTouchEvent", {
          type: i === 0 ? "touchStart" : "touchMove",
          touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    await draw();
    await expect(
      page.getByRole("button", { name: "Point 2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await draw();
    await page.screenshot({ path: "artifacts/hidden-notes/pattern-393.png" });
    await page
      .getByRole("button", { name: "Confirm lock", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Lock now", exact: true }),
    ).toBeVisible();
  });
});

test("email reset keeps hidden notes and hidden trash restores privately", async ({
  page,
  request,
}) => {
  await request.post(base + "/__fixture/reset");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  await page
    .getByRole("button", { name: "New hidden note", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Note title", exact: true })
    .fill("Private reset fixture");
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Lock now", exact: true }).click();
  await page.getByRole("link", { name: "Forgot lock?", exact: true }).click();
  await expect(page).toHaveURL(/hidden-notes\/recover$/);
  await page
    .getByRole("button", { name: "Send reset code", exact: true })
    .click();
  await expect(
    page.getByLabel("Email reset code", { exact: true }),
  ).toBeVisible();
  const messages = await (
    await request.get(base + "/__fixture/mail?email=a%40example.test")
  ).json();
  const code = messages.at(-1).body.match(/\b\d{6}\b/)[0];
  await page.getByLabel("Email reset code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("654321");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("654321");
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("654321");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Private reset fixture", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/hidden-notes/vault-1440.png" });
  await page.locator(".vault-page .note-open").first().click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Note options", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hidden notes options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Trash", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Private reset fixture", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore Private reset fixture", exact: true })
    .click();
  await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hidden notes options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Private reset fixture", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Actions for Private reset fixture",
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hidden notes options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Trash", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Delete Private reset fixture permanently",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(page.locator(".vault-page .note-card")).toHaveCount(0);
});

test("ambiguous hide acknowledgement keeps offline content excluded and retries safely", async ({
  page,
  request,
}) => {
  await request.post(base + "/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 850 });
  await signIn(page);
  const card = page.locator(".note-card").first();
  const title = await card.getByRole("heading").innerText();
  await card.getByRole("button", { name: /^Actions for / }).click();
  await page.getByRole("menuitem", { name: "Hide note", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  let dropped = false;
  await page.route("**/api/v1/hidden-notes/*/visibility", async (route) => {
    if (!dropped) {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      dropped = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Hide note", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const titles = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("ntc.offline.v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    return await new Promise<string[]>((resolve, reject) => {
      const r = db.transaction("accounts").objectStore("accounts").getAll();
      r.onsuccess = () =>
        resolve(
          r.result.flatMap((x: { notes: { title: string }[] }) =>
            x.notes.map((n) => n.title),
          ),
        );
      r.onerror = reject;
    });
  });
  expect(titles).not.toContain(title);
  await page.getByRole("button", { name: "Hide note", exact: true }).click();
  await expect(page.locator(".vault-page .note-card")).toHaveCount(1);
  await expect(
    page.locator(".vault-page .note-card").getByRole("heading"),
  ).toHaveText(title);
});

test("unlock survives switching tabs and app routes, expires after fifteen idle minutes and resets on reload", async ({
  page,
  request,
  context,
}) => {
  await request.post(base + "/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 850 });
  await signIn(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Confirm lock", exact: true }).click();
  const other = await context.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page.bringToFront();
  await other.close();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "NoteTatCa.", exact: true })
    .getByRole("link", { name: /^All notes/ })
    .click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Hidden notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
  await page.mouse.move(2, 2);
  await page.clock.fastForward(14 * 60 * 1000);
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(60001);
  await expect(
    page.getByRole("button", { name: "Unlock", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Six-digit PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lock now", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unlock", exact: true }),
  ).toBeVisible();
});

for (const width of [320, 1440])
  test(`lock screen is controls-only and recovery is a separate screen ${width}`, async ({
    page,
    request,
  }) => {
    await request.post(base + "/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Hidden notes", exact: true })
      .click();
    await page.getByLabel("Lock type", { exact: true }).click();
    await page
      .getByRole("option", { name: "3 by 3 pattern", exact: true })
      .click();
    for (const point of [1, 2, 3, 6]) {
      await page
        .getByRole("button", { name: `Point ${point}`, exact: true })
        .focus();
      await page.keyboard.press("Space");
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    for (const point of [1, 2, 3, 6]) {
      await page
        .getByRole("button", { name: `Point ${point}`, exact: true })
        .focus();
      await page.keyboard.press("Space");
    }
    await page
      .getByRole("button", { name: "Confirm lock", exact: true })
      .click();
    await page.getByRole("button", { name: "Lock now", exact: true }).click();
    await expect(
      page.getByText("Hidden notes are online only.", { exact: false }),
    ).toHaveCount(0);
    await expect(page.locator(".vault-lock-form > strong")).toHaveClass(
      "sr-only",
    );
    await expect(page.locator(".vault-lock-form > p")).toHaveCount(0);
    await page.getByRole("link", { name: "Forgot lock?", exact: true }).click();
    await expect(page).toHaveURL(/hidden-notes\/recover$/);
    await expect(
      page.getByRole("button", { name: "Send reset code", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".vault-pattern")).toHaveCount(0);
    await expect(
      page.getByLabel("Email reset code", { exact: true }),
    ).toHaveCount(0);
    expect(
      await (
        await request.get(base + "/__fixture/mail?email=a%40example.test")
      ).json(),
    ).toHaveLength(0);
    await page
      .getByRole("link", { name: "Back to unlock", exact: true })
      .click();
    await expect(page).toHaveURL(/hidden-notes$/);
    await expect(
      page.getByRole("button", { name: "Unlock", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".vault-pattern")).toHaveCount(1);
    const positioning = await page.locator(".vault-lock-form").evaluate((form) => {
      const bounds = form.getBoundingClientRect();
      const area = form.closest(".vault-page")!.getBoundingClientRect();
      return {
        horizontalOffset: bounds.x + bounds.width / 2 - (area.x + area.width / 2),
        verticalOffset: bounds.y + bounds.height / 2 - (area.y + area.height / 2),
      };
    });
    expect(Math.abs(positioning.horizontalOffset)).toBeLessThan(2);
    if (width > 800) {
      expect(positioning.verticalOffset).toBeLessThan(-20);
      expect(positioning.verticalOffset).toBeGreaterThan(-40);
    } else {
      expect(Math.abs(positioning.verticalOffset)).toBeLessThan(2);
    }
    await page.screenshot({
      path: `artifacts/hidden-notes/clean-lock-${width}.png`,
    });
  });
