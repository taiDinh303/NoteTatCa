import { expect, test } from "@playwright/test";
for (const width of [320, 393, 800])
  test(`mobile stays full width at 100 percent: ${width}`, async ({
    page,
    request,
  }, info) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("ntc.interface.zoom.v1", "50");
      localStorage.setItem("ntc.view.v1", "list");
    });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await expect(
      page.getByLabel("Filter pinned notes", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Notes view", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".offline-toolbar")).toHaveCount(0);
    const geometry = () =>
      page.evaluate(() => {
        const layer = document.querySelector(".notes-zoom-layer")!;
        const cards = Array.from(document.querySelectorAll(".note-card"));
        return {
          transform: getComputedStyle(layer).transform,
          width: layer.getBoundingClientRect().width,
          cards: cards.map((c) => ({
            x: c.getBoundingClientRect().x,
            width: c.getBoundingClientRect().width,
          })),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
    const initial = await geometry();
    expect(initial.transform).toBe("none");
    expect(initial.overflow).toBe(false);
    for (const card of initial.cards) {
      expect(Math.abs(card.width - initial.width)).toBeLessThan(1);
      expect(Math.abs(card.x - initial.cards[0].x)).toBeLessThan(1);
    }
    await page
      .locator(".notes-zoom-viewport")
      .dispatchEvent("wheel", { ctrlKey: true, deltaY: -800 });
    await page.locator(".notes-zoom-viewport").evaluate((el) => {
      const touches = (x: number) => [
        new Touch({ identifier: 1, target: el, clientX: 40, clientY: 100 }),
        new Touch({ identifier: 2, target: el, clientX: x, clientY: 100 }),
      ];
      el.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: touches(100),
        }),
      );
      el.dispatchEvent(
        new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
          touches: touches(250),
        }),
      );
      el.dispatchEvent(
        new TouchEvent("touchend", { bubbles: true, touches: [] }),
      );
    });
    await expect.poll(async () => (await geometry()).width).toBe(initial.width);
    expect((await geometry()).transform).toBe("none");
    await page.screenshot({ path: info.outputPath("mobile-notes.png") });
    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await expect(
      page.getByRole("spinbutton", { name: "Zoom percentage", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("menuitem", { name: "Review sync", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Note synchronization", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page
      .locator(".note-card")
      .first()
      .getByRole("button", { name: /^Open / })
      .click();
    await expect(
      page.getByRole("dialog", { name: "View note", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Content zoom", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".content-zoom-layer")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
      page.getByRole("group", { name: "Notes view", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".notes-zoom-layer")).toHaveAttribute(
      "data-layout",
      "list",
    );
    await expect
      .poll(() =>
        page
          .locator(".notes-zoom-layer")
          .evaluate((el) => getComputedStyle(el).transform),
      )
      .toBe("matrix(0.5, 0, 0, 0.5, 0, 0)");
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".notes-mobile-layer")).toBeVisible();
    await page.reload();
    await expect(page.locator(".notes-mobile-layer")).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("ntc.interface.zoom.v1")),
    ).toBe("50");
  });
