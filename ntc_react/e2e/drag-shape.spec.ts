import { test, expect } from "@playwright/test";
import type { Note } from "../src/domain/models";
for (const [width, zoom, touch] of [
  [1440, 1, false],
  [1440, 0.75, false],
  [1440, 1.25, false],
  [393, 1, false],
  [393, 1, true],
] as const) {
  test(`unequal note cards keep their shape during drag ${width} zoom ${zoom} ${touch ? "touch" : "mouse"}`, async ({
    page,
    request,
  }) => {
    const fixture = "http://127.0.0.1:5199";
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await request.post(fixture + "/__fixture/reset");
    const credentials = {
      email: "a@example.test",
      password: "Synthetic-password-123!",
    };
    const response = await request.post(fixture + "/api/v1/auth/login", {
      data: credentials,
    });
    const session = (await response.json()).data;
    const headers = { Authorization: `Bearer ${session.token}` };
    const list = await request.get(fixture + "/api/v1/notes?pageSize=100", {
      headers,
    });
    const pinned: Note[] = (await list.json()).data.items
      .filter((n: Note) => n.isPinned)
      .sort((a: Note, b: Note) => a.sortOrder - b.sortOrder);
    for (const [index, note] of pinned.entries()) {
      const patched = await request.patch(
        fixture + "/api/v1/notes/" + note.id,
        {
          headers,
          data: {
            version: note.version,
            title: index === 0 ? "Short card" : "Tall card",
            documentJson: JSON.stringify({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text:
                        index === 0
                          ? "Small thought."
                          : "A longer thought with several details to remember. ".repeat(
                              12,
                            ),
                    },
                  ],
                },
              ],
            }),
            iconEmoji: null,
            backgroundColor: index === 0 ? "#326348" : null,
            isPinned: true,
            tagIds: note.tags.map((t) => t.id),
          },
        },
      );
      expect(patched.ok()).toBeTruthy();
    }
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(
      (value) => localStorage.setItem("ntc.interface.zoom.v1", String(value)),
      zoom * 100,
    );
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(credentials.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const group = page.locator(".notes-section").first();
    const short = group.locator("article").filter({
      has: page.getByRole("heading", { name: "Short card", exact: true }),
    });
    const tall = group.locator("article").filter({
      has: page.getByRole("heading", { name: "Tall card", exact: true }),
    });
    await expect(tall).toBeVisible();
    const before = [(await short.boundingBox())!, (await tall.boundingBox())!];
    expect(before[1].height - before[0].height).toBeGreaterThan(20);
    const source = (await tall
      .getByRole("button", { name: "Open Tall card", exact: true })
      .boundingBox())!;
    const target = (await short
      .getByRole("button", { name: "Open Short card", exact: true })
      .boundingBox())!;
    const cdp = touch ? await page.context().newCDPSession(page) : null;
    async function touchAt(
      type: "touchStart" | "touchMove" | "touchEnd",
      x = 0,
      y = 0,
    ) {
      await cdp!.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
      });
    }
    if (touch) {
      await touchAt(
        "touchStart",
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      // Exercise the actual long-press activation delay.
      await page.waitForTimeout(280);
      await touchAt(
        "touchMove",
        source.x + source.width / 2 + 12,
        source.y + source.height / 2,
      );
    } else {
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        source.x + source.width / 2 + 12,
        source.y + source.height / 2,
        { steps: 3 },
      );
    }
    await expect(tall).toHaveClass(/dragging/);
    if (touch) {
      await touchAt(
        "touchMove",
        target.x + target.width / 2,
        target.y + target.height / 2,
      );
    } else {
      await page.mouse.move(
        target.x + target.width / 2,
        target.y + target.height / 2,
        { steps: 15 },
      );
    }
    await expect
      .poll(async () => Math.abs((await short.boundingBox())!.x - before[1].x))
      .toBeLessThan(2);
    await expect
      .poll(async () => Math.abs((await short.boundingBox())!.y - before[1].y))
      .toBeLessThan(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const [index, card] of [short, tall].entries()) {
      const during = (await card.boundingBox())!;
      expect(during.width).toBeCloseTo(before[index].width, 0);
      expect(during.height).toBeCloseTo(before[index].height, 0);
      const scale = await card.evaluate((el) => {
        const m = new DOMMatrix(getComputedStyle(el).transform);
        return [m.a, m.d];
      });
      expect(scale).toEqual([1, 1]);
    }
    await expect(tall).toHaveCSS("opacity", "0.95");
    await expect(short).toHaveCSS("transition-duration", "0.22s");
    await page.screenshot({
      path: `../artifacts/frontend/drag-unequal-${width}-${zoom}.png`,
      fullPage: false,
    });
    const reordered = page.waitForResponse(
      (r) =>
        r.url().endsWith("/notes/reorder") && r.request().method() === "POST",
    );
    const inspectDrop = width === 1440 && zoom === 1 && !touch;
    if (inspectDrop) {
      await page.mouse.move(
        target.x + target.width / 2 + 28,
        target.y + target.height / 2 + 16,
        { steps: 3 },
      );
    }
    if (touch) await touchAt("touchEnd");
    else await page.mouse.up();
    if (inspectDrop) {
      await expect
        .poll(() =>
          tall.evaluate(
            (element) =>
              element
                .getAnimations()
                .find((animation) => animation.id === "note-drop")
                ?.effect?.getTiming().duration ?? null,
          ),
        )
        .toBe(220);
      await expect(tall).not.toHaveAttribute("data-dropping", "true");
    }
    expect((await reordered).ok()).toBeTruthy();
    await expect(group.locator("h3").first()).toHaveText("Tall card");
    await page.reload();
    await expect(
      page.locator(".notes-section").first().locator("h3").first(),
    ).toHaveText("Tall card");
    await short
      .getByRole("button", { name: "Actions for Short card", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Add label", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".note-card.dragging")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await short
      .getByRole("button", { name: "Open Short card", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "View note", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
  });
}
