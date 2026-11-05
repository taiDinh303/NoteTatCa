import { test, expect } from "@playwright/test";

for (const width of [1440, 393]) {
  test(`alternating notes never paint the previous document or color ${width}`, async ({ page, request }, info) => {
    const fixture = "http://127.0.0.1:5199";
    await request.post(fixture + "/__fixture/reset");
    const login = await request.post(fixture + "/api/v1/auth/login", { data: { email: "a@example.test", password: "Synthetic-password-123!" } });
    const session = (await login.json()).data;
    for (const [title, backgroundColor] of [["FLASH_A", "#2255aa"], ["FLASH_B", "#fff4cc"]]) {
      const result = await request.post(fixture + "/api/v1/notes", { headers: { Authorization: `Bearer ${session.token}` }, data: {
        title, backgroundColor, documentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: title + "_CONTENT" }] }] }),
      } });
      expect(result.ok()).toBe(true);
    }
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open FLASH_A", exact: true })).toBeVisible();
    await page.route("**/api/v1/notes/*", route => route.abort());
    for (const [index, name] of ["FLASH_A", "FLASH_B", "FLASH_A", "FLASH_B"].entries()) {
      await page.evaluate(() => {
        const state = window as unknown as { noteSamples: Array<{ text: string; color: string; same: boolean }>; noteSamplingDone: boolean };
        state.noteSamples = []; state.noteSamplingDone = false;
        document.addEventListener("click", () => {
          const start = performance.now();
          let firstDocument: Element | null = null;
          const sample = () => {
            const frame = document.querySelector<HTMLElement>(".note-surface-ready");
            if (frame && !frame.hidden) {
              const document = frame.querySelector(".ProseMirror");
              firstDocument ??= document;
              state.noteSamples.push({ text: frame.textContent ?? "", color: getComputedStyle(frame).backgroundColor, same: document === firstDocument });
            }
            if (performance.now() - start < 350) requestAnimationFrame(sample);
            else state.noteSamplingDone = true;
          };
          requestAnimationFrame(sample);
        }, { once: true, capture: true });
      });
      await page.getByRole("button", { name: `Open ${name}`, exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { noteSamplingDone: boolean }).noteSamplingDone)).toBe(true);
      const samples = await page.evaluate(() => (window as unknown as { noteSamples: Array<{ text: string; color: string; same: boolean }> }).noteSamples);
      expect(samples.length).toBeGreaterThan(2);
      for (const sample of samples) {
        expect(sample.text).toContain(name + "_CONTENT");
        expect(sample.text).not.toContain((name === "FLASH_A" ? "FLASH_B" : "FLASH_A") + "_CONTENT");
        expect(sample.color).toBe(name === "FLASH_A" ? "rgb(34, 85, 170)" : "rgb(255, 244, 204)");
        expect(sample.same).toBe(true);
      }
      const viewer = page.getByRole("dialog", { name: "View note", exact: true });
      if (index === 0) {
        await viewer.getByRole("button", { name: "Edit", exact: true }).click();
        const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
        await expect(editor.getByRole("textbox", { name: "Note content", exact: true })).toContainText(name + "_CONTENT");
        await editor.getByRole("button", { name: "View", exact: true }).click();
      }
      await viewer.getByRole("button", { name: "Close", exact: true }).click();
      await expect(page.locator(".note-surface-slot")).toBeEmpty();
    }
    await info.attach("alternating-note-sampling", { body: "Four alternating opens sampled every frame for 350ms: correct document/color, stable View DOM.", contentType: "text/plain" });
  });
}
