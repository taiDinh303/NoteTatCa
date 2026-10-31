import { test, expect } from "@playwright/test";

const fixture = "http://127.0.0.1:5199";
test.skip(process.env.NTC_PERF !== "1", "Explicit synthetic performance run only");

for (const scenario of [
  { name: "desktop-1000", width: 1440, height: 900, count: 1000, mobile: false },
  { name: "mobile-1000", width: 393, height: 852, count: 1000, mobile: true },
]) {
  test(scenario.name, async ({ browser, request }) => {
    expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
    expect((await request.post(fixture + `/__fixture/seed-notes?count=${scenario.count}`)).ok()).toBeTruthy();
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, isMobile: scenario.mobile, hasTouch: scenario.mobile });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/notes$/);
    let requests = 0, bodyBytes = 0;
    const apiLatency: number[] = [];
    const starts = new Map<object, number>();
    const endpoints: Record<string, { requests: number; bodyBytes: number }> = {};
    page.on("request", req => { if (req.url().includes("/api/v1/")) starts.set(req, performance.now()); });
    page.on("response", async response => {
      if (!response.url().includes("/api/v1/")) return;
      requests++;
      const start = starts.get(response.request());
      if (start !== undefined) apiLatency.push(performance.now() - start);
      const path = new URL(response.url()).pathname;
      endpoints[path] ??= { requests: 0, bodyBytes: 0 };
      endpoints[path].requests++;
      try { const bytes = (await response.body()).byteLength; bodyBytes += bytes; endpoints[path].bodyBytes += bytes; } catch { /* aborted request */ }
    });
    await page.evaluate(() => performance.clearResourceTimings());
    const navigationStart = Date.now();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Synthetic scale note 7", exact: true })).toBeVisible();
    const readyMs = Date.now() - navigationStart;
    const frameGaps = await page.evaluate(async () => {
      const gaps: number[] = []; let last = 0;
      const scroller = document.scrollingElement ?? document.documentElement;
      for (let frame = 0; frame < 120; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(now => {
          if (last) gaps.push(now - last);
          last = now;
          scroller.scrollTop += 8;
          resolve();
        }));
      }
      return gaps;
    });
    frameGaps.sort((a, b) => a - b);
    const p95 = frameGaps[Math.floor(frameGaps.length * .95)];
    const result = { scenario: scenario.name, readyMs, apiRequests: requests, apiBodyBytes: bodyBytes,
      apiLatencyP95Ms: apiLatency.sort((a,b) => a-b)[Math.floor(apiLatency.length * .95)] ?? 0,
      scrollFrameP95Ms: Math.round(p95 * 10) / 10, framesOver32Ms: frameGaps.filter(x => x > 32).length, endpoints };
    console.log("NTC_PERF " + JSON.stringify(result));
    await context.close();
  });
}
