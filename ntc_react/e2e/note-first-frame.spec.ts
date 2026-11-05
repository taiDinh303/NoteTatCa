import { test, expect } from "@playwright/test";
for (const width of [393, 1440])
  for (const fullscreen of [true, false])
    for (const editing of [false, true]) {
      test(`note text has its final width on the first visible frame ${width} fullscreen=${fullscreen} editing=${editing}`, async ({
        page,
        request,
      }, info) => {
        const fixture = "http://127.0.0.1:5199";
        await request.post(fixture + "/__fixture/reset");
        const login = await request.post(fixture + "/api/v1/auth/login", {
          data: {
            email: "a@example.test",
            password: "Synthetic-password-123!",
          },
        });
        const token = (await login.json()).data.token;
        const title = "FIRST_FRAME";
        const result = await request.post(fixture + "/api/v1/notes", {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            title,
            documentJson: JSON.stringify({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "A normal sentence should stay on one line.",
                    },
                  ],
                },
              ],
            }),
          },
        });
        expect(result.ok()).toBe(true);
        await page.setViewportSize({ width, height: 852 });
        await page.addInitScript(
          ({ fullscreen, editing }) => {
            localStorage.setItem("ntc.note.fullscreen.v1", String(fullscreen));
            localStorage.setItem("ntc.note.edit-on-open.v1", String(editing));
          },
          { fullscreen, editing },
        );
        await page.goto("/login");
        await page
          .getByLabel("Email address", { exact: true })
          .fill("a@example.test");
        await page
          .getByLabel("Password", { exact: true })
          .fill("Synthetic-password-123!");
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        const card = page.getByRole("button", {
          name: "Open " + title,
          exact: true,
        });
        await expect(card).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (let attempt = 0; attempt < 2; attempt++) {
          await page.evaluate(() => {
            const state = window as unknown as {
              widths: number[][];
              samplingDone: boolean;
            };
            state.widths = [];
            state.samplingDone = false;
            document.addEventListener(
              "click",
              () => {
                const start = performance.now();
                const sample = () => {
                  const frame = document.querySelector<HTMLElement>(
                    ".note-surface-ready",
                  );
                  if (frame && !frame.hidden) {
                    const view = frame.querySelector<HTMLElement>(
                      "[data-content-zoom]",
                    );
                    const layer = frame.querySelector<HTMLElement>(
                      ".content-zoom-layer",
                    );
                    const p =
                      frame.querySelector<HTMLElement>(".rich-editor p");
                    if (view && layer && p) {
                      const range = document.createRange();
                      range.selectNodeContents(p);
                      state.widths.push([
                        view.clientWidth,
                        layer.offsetWidth,
                        p.offsetHeight,
                        range.getClientRects().length,
                      ]);
                    }
                  }
                  if (performance.now() - start < 350)
                    requestAnimationFrame(sample);
                  else state.samplingDone = true;
                };
                requestAnimationFrame(sample);
              },
              { once: true, capture: true },
            );
          });
          await card.click();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (window as unknown as { samplingDone: boolean }).samplingDone,
              ),
            )
            .toBe(true);
          const widths = await page.evaluate(
            () => (window as unknown as { widths: number[][] }).widths,
          );
          await info.attach(`open-${attempt}-geometry`, {
            body: JSON.stringify(widths),
            contentType: "application/json",
          });
          expect(widths.length).toBeGreaterThan(2);
          for (const [view, layer, height, lines] of widths) {
            expect(layer).toBeGreaterThan(250);
            expect(Math.abs(view - layer)).toBeLessThan(1);
            expect(height).toBe(widths.at(-1)![2]);
            expect(lines).toBe(widths.at(-1)![3]);
          }
          await page
            .getByRole("dialog", {
              name: editing ? "Edit note" : "View note",
              exact: true,
            })
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await expect(page.locator(".note-surface-slot")).toBeEmpty();
        }
        expect(errors).toEqual([]);
      });
    }
