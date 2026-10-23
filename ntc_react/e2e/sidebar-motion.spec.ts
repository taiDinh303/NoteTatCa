import { test, expect } from "@playwright/test";

test.use({ isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
for (const scale of [0.75, 1, 1.25]) {
  test(`mobile drawer preserves scrolled background and animates both ways ${scale}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width: 393, height: 740 });
    await page.addInitScript((zoom) => {
      localStorage.setItem("ntc.view.v1", "list");
      localStorage.setItem("ntc.interface.zoom.v1", String(zoom * 100));
    }, scale);
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.locator(".note-card").first().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 100);
    });
    const geometry = () =>
      page.evaluate(() => ({
        scroll: window.scrollY,
        cards: Array.from(document.querySelectorAll(".note-card")).map(
          (element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          },
        ),
      }));
    const before = await geometry();
    const unchanged = async () => {
      const after = await geometry();
      expect(after.scroll).toBe(before.scroll);
      expect(after.cards).toHaveLength(before.cards.length);
      after.cards.forEach((card, index) => {
        for (const key of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(card[key] - before.cards[index][key])).toBeLessThan(
            0.5,
          );
        }
      });
    };
    const finish = () =>
      page.evaluate(() =>
        document.getAnimations().forEach((animation) => animation.finish()),
      );
    const trigger = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    await trigger.click();
    const opening = await page
      .locator(".navigation-drawer")
      .evaluate((element) => {
        const animation = element.getAnimations()[0] as CSSAnimation;
        animation.pause();
        const samples = [0.25, 0.5, 0.75].map((progress) => {
          animation.currentTime = 400 * progress;
          const rect = element.getBoundingClientRect();
          return { progress, fraction: -rect.x / rect.width };
        });
        animation.currentTime = 200;
        const { x, width } = element.getBoundingClientRect();
        return {
          name: animation.animationName,
          duration: animation.effect!.getTiming().duration,
          delay: animation.effect!.getTiming().delay,
          samples,
          x,
          width,
        };
      });
    expect(opening.name).toBe("sidebar-slide-in");
    expect(opening.duration).toBe(400);
    expect(opening.delay).toBe(0);
    for (const sample of opening.samples) {
      expect(sample.fraction).toBeCloseTo(1 - sample.progress, 2);
    }
    expect(opening.x).toBeLessThan(-1);
    expect(opening.x).toBeGreaterThan(-opening.width);
    await unchanged();
    await expect(page.locator(".modal-overlay")).toHaveCSS(
      "backdrop-filter",
      "none",
    );
    await finish();
    await unchanged();
    await page.keyboard.press("Escape");
    const closing = await page
      .locator('.navigation-drawer[data-state="closed"]')
      .evaluate((element) => {
        const animation = element.getAnimations()[0] as CSSAnimation;
        animation.pause();
        const samples = [0.25, 0.5, 0.75].map((progress) => {
          animation.currentTime = 400 * progress;
          const rect = element.getBoundingClientRect();
          return { progress, fraction: -rect.x / rect.width };
        });
        animation.currentTime = 200;
        const { x, width } = element.getBoundingClientRect();
        return {
          name: animation.animationName,
          duration: animation.effect!.getTiming().duration,
          delay: animation.effect!.getTiming().delay,
          samples,
          fill: animation.effect!.getTiming().fill,
          x,
          width,
        };
      });
    expect(closing.name).toBe("sidebar-slide-out");
    expect(closing.duration).toBe(400);
    expect(closing.delay).toBe(0);
    for (const sample of closing.samples) {
      expect(sample.fraction).toBeCloseTo(sample.progress, 2);
    }
    expect(closing.fill).toBe("both");
    expect(closing.x).toBeLessThan(-1);
    expect(closing.x).toBeGreaterThan(-closing.width);
    await unchanged();
    await page.screenshot({ path: `test-results/sidebar-exit-${scale}.png` });
    await finish();
    await page.locator(".navigation-drawer").waitFor({ state: "detached" });
    await unchanged();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger.click();
    const duration = await page
      .locator(".navigation-drawer")
      .evaluate((element) =>
        parseFloat(getComputedStyle(element).animationDuration),
      );
    expect(duration).toBe(0.18);
    await expect(page.locator(".navigation-drawer")).toHaveCSS(
      "animation-name",
      "sidebar-overlay-in",
    );
    await page.keyboard.press("Escape");
    await page.locator(".navigation-drawer").waitFor({ state: "detached" });
    await unchanged();
  });
}
