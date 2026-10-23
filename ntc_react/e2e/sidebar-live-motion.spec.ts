import { test, expect } from "@playwright/test";

for (const reduced of [false, true]) {
  for (const width of [393, 1440]) {
    test(`sidebar reveals in real frames ${width} reduced=${reduced}`, async ({
      page,
      request,
    }) => {
      await request.post("http://127.0.0.1:5199/__fixture/reset");
      await page.setViewportSize({ width, height: 852 });
      await page.emulateMedia({
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      await page.goto("/login");
      await page
        .getByLabel("Email address", { exact: true })
        .fill("a@example.test");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Synthetic-password-123!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.locator(".note-card").first().waitFor();
      const selector =
        width < 800 ? ".navigation-drawer" : "#workspace-navigation";
      const capture = () =>
        page.evaluate(
          (target) =>
            new Promise<{ right: number; x: number; opacity: number }[]>(
              (resolve) => {
                const frames: { right: number; x: number; opacity: number }[] =
                  [];
                const start = performance.now();
                const sample = () => {
                  const element = document.querySelector(target);
                  if (
                    element &&
                    getComputedStyle(element).visibility !== "hidden"
                  ) {
                    const css = getComputedStyle(element);
                    const edges = css.clipPath.slice(6, -1).split(/\s+/);
                    frames.push({
                      right: parseFloat(edges[1] ?? edges[0]),
                      x: element.getBoundingClientRect().x,
                      opacity: Number(css.opacity),
                    });
                  }
                  if (performance.now() - start < 700)
                    requestAnimationFrame(sample);
                  else resolve(frames);
                };
                requestAnimationFrame(sample);
              },
            ),
          selector,
        );
      const assertReveal = (
        frames: { right: number; x: number; opacity: number }[],
      ) => {
        const intermediate = frames.filter(
          (frame) => frame.right > 1 && frame.right < 99,
        );
        expect(
          new Set(intermediate.map((frame) => Math.round(frame.right))).size,
        ).toBeGreaterThan(2);
        intermediate.forEach((frame) => {
          expect(Math.abs(frame.x)).toBeLessThan(0.5);
          expect(frame.opacity).toBe(1);
        });
      };
      const [opening] = await Promise.all([
        capture(),
        page
          .getByRole("button", {
            name: width < 800 ? "Open navigation" : "Hide sidebar",
            exact: true,
          })
          .click(),
      ]);
      assertReveal(opening);
      if (width < 800) {
        for (const frame of opening.slice(-5)) {
          expect(frame.right).toBe(0);
          expect(frame.x).toBe(0);
          expect(frame.opacity).toBe(1);
        }
        const [closing] = await Promise.all([
          capture(),
          page.keyboard.press("Escape"),
        ]);
        assertReveal(closing);
        await expect(page.locator(selector)).toHaveCount(0);
        for (let repeat = 0; repeat < 2; repeat++) {
          const [reopened] = await Promise.all([
            capture(),
            page
              .getByRole("button", { name: "Open navigation", exact: true })
              .click(),
          ]);
          assertReveal(reopened);
          for (const frame of reopened.slice(-5)) {
            expect(frame.right).toBe(0);
            expect(frame.x).toBe(0);
            expect(frame.opacity).toBe(1);
          }
          await page.keyboard.press("Escape");
          await expect(page.locator(selector)).toHaveCount(0);
        }
      } else {
        for (const frame of opening.slice(-5)) {
          expect(frame.right).toBe(100);
          expect(frame.x).toBe(0);
        }
        await expect(page.locator(selector)).toHaveAttribute("inert", "");
        await expect(page.locator(selector)).toHaveCSS(
          "pointer-events",
          "none",
        );
        const [showing] = await Promise.all([
          capture(),
          page
            .getByRole("button", { name: "Show sidebar", exact: true })
            .click(),
        ]);
        assertReveal(showing);
        for (const frame of showing.slice(-5)) {
          expect(frame.right).toBe(0);
          expect(frame.x).toBe(0);
          expect(frame.opacity).toBe(1);
        }
        await expect(page.locator(selector)).toBeVisible();
      }
    });
  }
}
