import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.NTC_INTERACTION_AUDIT !== "1", "Opt-in synthetic interaction audit");
const fixture = "http://127.0.0.1:5199";

// Measures from the actual click event to the first animation frame containing
// the expected DOM. These are local rendering observations, not production INP.
async function mark(page: Page, selector: string) {
  await page.evaluate((selector) => {
    const state = window as unknown as { audit: { ms?: number } };
    state.audit = {};
    document.addEventListener("click", () => {
      const start = performance.now();
      const tick = () => {
        if (document.querySelector(selector)) state.audit.ms = performance.now() - start;
        else if (performance.now() - start < 10000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { once: true, capture: true });
  }, selector);
}
async function elapsed(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { audit: { ms?: number } }).audit.ms)).toBeDefined();
  return page.evaluate(() => Math.round((window as unknown as { audit: { ms: number } }).audit.ms));
}

test("a cold editor shows progress while its module is held and opens after release", async ({ page, request }, info) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  await page.route(/\/assets\/NoteEditor-[^/]+\.js$/, async route => {
    held = true;
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".note-card").first()).toBeVisible();
    await expect.poll(() => held).toBe(true);
    await page.getByRole("button", { name: "Open Project notes", exact: true }).click();
    await expect(page.locator(".note-open-loading")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    release();
    await expect(page.getByRole("region", { name: "Note content" })).toBeVisible();
    await expect(page.locator(".note-open-loading")).toHaveCount(0);
    await info.attach("cold-module", { body: "Workspace usable while editor JS was held. Opening showed progress and displayed cached content after release.", contentType: "text/plain" });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test.describe("direct cached view", () => {
// Hold the actual editor import, rather than an asset already precached by the
// offline worker. Offline functionality is covered by the separate regressions.
test.use({ serviceWorkers: "block" });
test("cached View opens without the editing bundle and fresh reopens do not GET the note again", async ({ page, request }, info) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let editorRequested = false;
  let detailGets = 0;
  await page.route(/\/assets\/RichEditor-[^/]+\.js$/, async route => {
    editorRequested = true;
    await gate;
    await route.continue();
  });
  await page.route("**/api/v1/notes/*", async route => {
    if (route.request().method() === "GET" && /\/notes\/[^/]+$/.test(new URL(route.request().url()).pathname)) detailGets++;
    await route.continue();
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const open = page.getByRole("button", { name: "Open Project notes", exact: true });
    await expect(open).toBeVisible();
    const getsBefore = detailGets;
    for (let index = 0; index < 3; index++) {
      await open.click();
      const viewer = page.getByRole("dialog", { name: "View note", exact: true });
      await expect(viewer.getByRole("region", { name: "Note content" })).toBeVisible();
      expect(detailGets).toBe(getsBefore);
      await viewer.getByRole("button", { name: "Close", exact: true }).click();
    }
    await page.route("**/api/v1/notes?*", async route => {
      const response = await route.fetch();
      const body = await response.json();
      for (const note of body.data.items) {
        if (note.title === "Project notes") {
          note.content = "Updated in the list cache";
          note.documentJson = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: note.content }] }] });
        }
      }
      await route.fulfill({ response, json: body });
    });
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sync now", exact: true }).click();
    await expect(open).toContainText("Updated in the list cache");
    await open.click();
    await expect(page.getByRole("region", { name: "Note content" })).toHaveText("Updated in the list cache");
    expect(detailGets).toBe(getsBefore);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.unroute("**/api/v1/notes?*");
    await page.clock.install();
    await page.clock.fastForward(31_000);
    await open.click();
    await expect(page.getByRole("region", { name: "Note content" })).toBeVisible();
    await expect.poll(() => detailGets).toBe(getsBefore + 1);
    await page.getByRole("dialog", { name: "View note", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    await expect.poll(() => editorRequested).toBe(true);
    await expect(page.getByText("Loading editor…", { exact: true })).toBeVisible();
    release();
    const textbox = page.getByRole("textbox", { name: "Note content", exact: true });
    await expect(textbox).toBeVisible();
    await textbox.fill("The shared cached document remains editable.");
    await page.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByRole("region", { name: "Note content" })).toHaveText("The shared cached document remains editable.");
    await info.attach("direct-cache-view", { body: JSON.stringify({ freshOpens: 3, freshExtraDetailGets: 0, staleDetailGets: detailGets - getsBefore, viewReadyWhileEditingBundleHeld: true }), contentType: "application/json" });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
});

for (const width of [1440, 393]) {
  test(`audit cached opening, switching, saving and pinning ${width}`, async ({ page, request }, info) => {
    expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const open = page.getByRole("button", { name: "Open Project notes", exact: true });
    await expect(open).toBeVisible();
    const results: Record<string, number | boolean> = {};
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let held = false;
    await page.route("**/api/v1/notes/*", async route => {
      if (route.request().method() === "GET" && !held && !new URL(route.request().url()).pathname.endsWith("/revisions")) {
        held = true;
        await gate;
      }
      await route.continue();
    });
    await mark(page, '[role="region"][aria-label="Note content"]');
    await open.click();
    results.firstCachedOpenMs = await elapsed(page);
    results.detailGetStarted = held;
    results.cachedOpenBeforeGetReleased = true;
    release();
    await page.unrouteAll({ behavior: "wait" });
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await mark(page, '[role="textbox"][aria-label="Note content"]');
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    results.viewToEditMs = await elapsed(page);
    await mark(page, '[role="region"][aria-label="Note content"]');
    await editor.getByRole("button", { name: "View", exact: true }).click();
    results.cleanEditToViewMs = await elapsed(page);
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    // Long, structured content also lets us observe remount/scroll behaviour.
    await editor.getByRole("textbox", { name: "Note content" }).fill(Array.from({ length: 180 }, (_, i) => `Line ${i}: synthetic content for interaction review.`).join("\n"));
    await page.route("**/api/v1/notes/*", async route => {
      if (route.request().method() === "PATCH") await new Promise(resolve => setTimeout(resolve, 1200));
      await route.continue();
    });
    await mark(page, '[role="region"][aria-label="Note content"]');
    await editor.getByRole("button", { name: "View", exact: true }).click();
    results.dirtyEditToViewWith1200msPatchMs = await elapsed(page);
    await page.unrouteAll({ behavior: "wait" });
    const scroller = viewer.locator(".content-zoom-viewport");
    await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(600);
    await scroller.evaluate(element => { element.scrollTop = 600; });
    results.scrollBeforePin = await scroller.evaluate(element => element.scrollTop);
    expect(results.scrollBeforePin).toBeGreaterThan(0);
    const content = viewer.getByRole("region", { name: "Note content" });
    const node = await content.elementHandle();
    const pinResponse = page.waitForResponse(response => /\/notes\/[^/]+\/pin$/.test(response.url()) && response.request().method() === "PATCH");
    const pin = viewer.locator(".editor-pin");
    const before = await pin.getAttribute("aria-pressed");
    await pin.click();
    await expect(pin).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
    expect((await pinResponse).ok()).toBeTruthy();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    results.viewerContentRemountedOnPin = !(await node!.evaluate(element => element.isConnected));
    results.scrollAfterPin = await scroller.evaluate(element => element.scrollTop);
    expect(results.viewerContentRemountedOnPin).toBe(false);
    expect(results.scrollAfterPin).toBe(results.scrollBeforePin);
    const unpinResponse = page.waitForResponse(response => /\/notes\/[^/]+\/pin$/.test(response.url()) && response.request().method() === "PATCH");
    await pin.click();
    expect((await unpinResponse).ok()).toBeTruthy();
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(600);
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    await expect.poll(() => editor.locator(".content-zoom-viewport").evaluate(element => element.scrollTop)).toBe(600);
    await editor.getByRole("button", { name: "View", exact: true }).click();
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(600);
    await mark(page, 'body:not(:has([role="dialog"]))');
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    results.cleanCloseMs = await elapsed(page);
    await mark(page, '[role="region"][aria-label="Note content"]');
    await open.click();
    results.reopenMs = await elapsed(page);
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    await editor.getByLabel("Note title").fill("Synthetic dirty close");
    await page.route("**/api/v1/notes/*", async route => {
      if (route.request().method() === "PATCH") await new Promise(resolve => setTimeout(resolve, 1200));
      await route.continue();
    });
    await mark(page, 'body:not(:has([role="dialog"]))');
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    results.dirtyCloseWith1200msPatchMs = await elapsed(page);
    await expect(viewer).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });
    console.log("NTC_INTERACTION " + JSON.stringify({ width, ...results }));
    await info.attach("interaction-results", { body: JSON.stringify({ width, ...results }, null, 2), contentType: "application/json" });
  });
}

test("a note loaded on a later page opens before its detail GET resolves", async ({ page, request }, info) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  expect((await request.post(fixture + "/__fixture/seed-notes?count=110")).ok()).toBeTruthy();
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Load more notes", exact: true }).click();
  await expect.poll(() => page.locator(".note-card").count()).toBeGreaterThan(100);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/notes/*", async route => {
    if (route.request().method() === "GET") await gate;
    await route.continue();
  });
  await page.locator(".note-open").last().click();
  await expect(page.getByRole("region", { name: "Note content" })).toBeVisible();
  await expect(page.getByText("Opening your note…", { exact: true })).toHaveCount(0);
  release();
  await page.unrouteAll({ behavior: "wait" });
  await info.attach("later-page", { body: "Confirmed: the loaded note displays before the background detail GET resolves.", contentType: "text/plain" });
});

for (const width of [1440, 393]) {
  test(`large document interaction observation ${width}`, async ({ page, request }, info) => {
    expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
    const login = await request.post(fixture + "/api/v1/auth/login", { data: { email: "a@example.test", password: "Synthetic-password-123!" } });
    const session = (await login.json()).data;
    const created = await request.post(fixture + "/api/v1/notes", {
      headers: { Authorization: `Bearer ${session.token}` },
      data: { title: "Large synthetic note", documentJson: JSON.stringify({ type: "doc", content: Array.from({ length: 450 }, () => ({ type: "paragraph", content: [{ type: "text", text: "a".repeat(200) }] })) }) },
    });
    expect(created.ok()).toBeTruthy();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await mark(page, '[role="region"][aria-label="Note content"]');
    await page.getByRole("button", { name: "Open Large synthetic note", exact: true }).click();
    const firstOpenMs = await elapsed(page);
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await mark(page, '[role="textbox"][aria-label="Note content"]');
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    const editMs = await elapsed(page);
    const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    const textbox = editor.getByRole("textbox", { name: "Note content" });
    await textbox.press("Control+End");
    await page.evaluate(() => {
      const state = window as unknown as { inputSamples: number[] };
      state.inputSamples = [];
      document.addEventListener("beforeinput", () => {
        const start = performance.now();
        requestAnimationFrame(() => state.inputSamples.push(performance.now() - start));
      });
    });
    await page.keyboard.type(" typed safely", { delay: 30 });
    await expect(textbox).toContainText("typed safely");
    await mark(page, '[role="region"][aria-label="Note content"]');
    await editor.getByRole("button", { name: "View", exact: true }).click();
    const viewMs = await elapsed(page);
    await expect(viewer.getByRole("region", { name: "Note content" })).toContainText("typed safely");
    const inputSamples = await page.evaluate(() => (window as unknown as { inputSamples: number[] }).inputSamples);
    expect(inputSamples.length).toBeGreaterThan(0);
    const result = { width, textCharacters: 90000, paragraphs: 450, firstOpenMs, editMs, viewMs, inputSamples: inputSamples.map(value => Math.round(value)), maxInputToRafMs: Math.round(Math.max(...inputSamples)) };
    console.log("NTC_LARGE_DOCUMENT " + JSON.stringify(result));
    await info.attach("large-document", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath("large-document-view.png") });
  });
}

test("drag frame observation with about 200 loaded cards", async ({ page, request }, info) => {
  expect((await request.post(fixture + "/__fixture/reset")).ok()).toBeTruthy();
  expect((await request.post(fixture + "/__fixture/seed-notes?count=194")).ok()).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const cards = page.locator(".note-card");
  await expect(cards.first()).toBeVisible();
  const load = page.getByRole("button", { name: "Load more notes", exact: true });
  while (await load.count()) {
    const before = await cards.count();
    await load.click();
    await expect.poll(() => cards.count()).toBeGreaterThan(before);
  }
  expect(await cards.count()).toBeGreaterThan(190);
  const group = page.locator(".notes-section").first();
  const source = group.locator(".note-card").first();
  const target = group.locator(".note-card").nth(1);
  const a = (await source.locator(".note-open").boundingBox())!;
  const b = (await target.locator(".note-open").boundingBox())!;
  const recording = page.evaluate(async () => {
    const times: number[] = [];
    for (let i = 0; i < 90; i++) await new Promise<void>(resolve => requestAnimationFrame(time => { times.push(time); resolve(); }));
    return times.slice(1).map((time, index) => time - times[index]);
  });
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, { steps: 3 });
  await expect(source).toHaveClass(/dragging/);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 45 });
  await page.mouse.up();
  await expect(page.locator(".note-card.dragging")).toHaveCount(0);
  const frames = (await recording).sort((a, b) => a - b);
  const result = { cards: await cards.count(), samples: frames.length, frameP95Ms: Math.round(frames[Math.floor(frames.length * .95)] * 10) / 10, framesOver32ms: frames.filter(value => value > 32).length };
  console.log("NTC_DRAG_FRAMES " + JSON.stringify(result));
  await info.attach("drag-frames", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});
