import { test, expect } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { Note, Page as DataPage } from "../src/domain/models";
const fixture = "http://127.0.0.1:5199";
const password = "Synthetic-password-123!";
async function submitLogin(page: Page, email = "a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function login(page: Page, email = "a@example.test") {
  await submitLogin(page, email);
  await expect(
    page.getByRole("heading", {
      name: email === "admin@example.test" ? "System overview" : "Notes",
      exact: true,
    }),
  ).toBeVisible();
}
async function createNote(
  page: Page,
  title: string,
  content = "A private thought worth keeping.",
) {
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByRole("button", { name: "Add title", exact: true }).click();
  await editor.getByLabel("Note title").fill(title);
  await editor.getByRole("textbox", { name: "Note content" }).fill(content);
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  return editor;
}
async function apiSession(request: APIRequestContext) {
  const response = await request.post(fixture + "/api/v1/auth/login", {
    data: { email: "a@example.test", password },
  });
  return (await response.json()).data as { token: string };
}
test.beforeEach(async ({ request }) => {
  const response = await request.post(fixture + "/__fixture/reset");
  expect(response.ok()).toBeTruthy();
});

test("waits for a waking server before sending credentials and shows connection animation", async ({
  page,
}) => {
  let healthRequests = 0;
  let signIns = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/login")) signIns++;
  });
  await page.route("**/health/live", async (route) => {
    healthRequests++;
    if (healthRequests < 3)
      await route.fulfill({
        status: healthRequests === 1 ? 503 : 200,
        contentType: "text/html",
        body: "Starting up",
      });
    else await route.continue();
  });
  await submitLogin(page);
  await expect(
    page.getByRole("complementary", { name: "Connection status" }),
  ).toBeVisible();
  expect(signIns).toBe(0);
  await page.screenshot({
    path: "../artifacts/frontend/connecting-server.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
  expect(healthRequests).toBe(3);
  expect(signIns).toBe(1);
});

test("preloads all note pages and switches cached workspace collections without loading again", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let releaseRevalidation!: () => void;
  const revalidationGate = new Promise<void>((resolve) => {
    releaseRevalidation = resolve;
  });
  let source: { data: DataPage<Note> } | undefined;
  const pages: number[] = [];
  await page.route("**/api/v1/notes?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("trash") === "true") {
      await route.continue();
      return;
    }
    const number = Number(url.searchParams.get("pageNumber"));
    pages.push(number);
    if (!source) {
      source = await (await route.fetch()).json();
      await wait;
    }
    const all = source!.data.items;
    await route.fulfill({
      json: {
        ...source,
        data: {
          ...source!.data,
          items: all.slice((number - 1) * 2, number * 2),
          pageSize: 2,
          currentPage: number,
          totalPages: Math.ceil(all.length / 2),
          hasNextPage: number * 2 < all.length,
          hasPreviousPage: number > 1,
        },
      },
    });
  });
  try {
    await submitLogin(page);
    await expect(
      page.getByRole("heading", {
        name: "Preparing your workspace",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Workspace loading" }),
    ).toBeVisible();
    await page.screenshot({
      path: "../artifacts/frontend/preparing-workspace.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("progressbar", { name: "Workspace loading" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "../artifacts/frontend/preparing-workspace-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    release();
    await expect(
      page.getByRole("heading", { name: "Notes", exact: true }),
    ).toBeVisible();
    expect(pages).toEqual([1, 2, 3]);
    await page.route(
      /\/api\/v1\/(reminders|notifications)\?/,
      async (route) => {
        await revalidationGate;
        await route.continue().catch(() => {});
      },
    );
    let laterReads = 0;
    page.on("request", (request) => {
      if (
        request.method() === "GET" &&
        /\/api\/v1\/(notes|tags)(?:\?|$)/.test(request.url())
      )
        laterReads++;
    });
    await page
      .getByRole("navigation", { name: "Labels", exact: true })
      .getByRole("link")
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Take a note", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Reminders", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Reminders", exact: true }),
    ).toHaveClass("sr-only");
    await expect(
      page.getByRole("heading", {
        name: "Nothing to remember just yet",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Inbox", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Unread", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your inbox", exact: true }),
    ).toHaveClass("sr-only");
    await expect(
      page.getByRole("heading", { name: "You’re all caught up", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Trash", exact: true })
      .first()
      .click();
    await expect(
      page.getByText(
        "Deleted notes are permanently removed after the seven-day retention period.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "All notes", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Open Project notes", exact: true }),
    ).toBeVisible();
    expect(laterReads).toBe(0);
  } finally {
    release();
    releaseRevalidation();
  }
});

test("keeps the saved session when offline during restore and reconnects on request", async ({
  page,
}) => {
  await login(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Unable to restore your session yet",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => !!sessionStorage.getItem("ntc.session.v1")),
  ).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });
  await page
    .getByRole("button", { name: "Retry connection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
});

test("retries a failed initial collection without signing in a second time", async ({
  page,
}) => {
  let fail = true;
  let signIns = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/login")) signIns++;
  });
  await page.route("**/api/v1/tags?**", async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        json: { message: "Temporarily unavailable" },
      });
    else await route.continue();
  });
  await submitLogin(page);
  await expect(
    page.getByRole("heading", {
      name: "Your workspace couldn’t finish loading",
      exact: true,
    }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
  expect(signIns).toBe(1);
});

test("renders responsive workspace without console errors or navigation reloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(
    page.getByRole("button", {
      name: "Open Little things, lately",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as Window & { fixtureMarker?: string }).fixtureMarker = "kept";
  });
  await page
    .getByRole("link", { name: "Reminders", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Reminders", exact: true }),
  ).toHaveClass("sr-only");
  await expect(page.getByText("RIGHT ON TIME", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("A gentle nudge for the things you don’t want to forget.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Inbox", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your inbox", exact: true }),
  ).toHaveClass("sr-only");
  await expect(page.getByText("A GENTLE NUDGE", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Small reminders for the things that matter.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mark all as read", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Labels", exact: true })
    .getByRole("link")
    .first()
    .click();
  await expect(page.locator("#workspace-main h1")).toHaveClass("sr-only");
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All notes", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open Little things, lately",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { fixtureMarker?: string }).fixtureMarker,
    ),
  ).toBe("kept");
  await mkdir("../artifacts/frontend", { recursive: true });
  await page.screenshot({
    path: "../artifacts/frontend/workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Your workspace" })
    .getByRole("link", { name: "Trash", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trash", exact: true }),
  ).toHaveClass("sr-only");
  await expect(
    page.getByText(
      "Deleted notes are permanently removed after the seven-day retention period.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A clean slate", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../artifacts/frontend/workspace-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("offers a compact workspace with persistent sidebar control and one labels entry", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByText("YOUR PERSONAL SPACE", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your notes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "New note", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Create a label", exact: true }),
  ).toHaveCount(0);
  const manageLabels = page.getByRole("button", {
    name: "Manage labels",
    exact: true,
  });
  await expect(manageLabels).toHaveText("YOUR LABELS");
  await expect(manageLabels).toHaveCSS("cursor", "pointer");
  await manageLabels.getByText("YOUR LABELS", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Your labels", exact: true })
    .getByRole("button", { name: "Done", exact: true })
    .click();
  await page.evaluate(() => {
    (window as Window & { fixtureMarker?: string }).fixtureMarker =
      "sidebar-kept";
  });
  const before = (await page.locator("#workspace-main").boundingBox())!.width;
  await expect(
    page
      .getByRole("button", { name: "Hide sidebar", exact: true })
      .locator("svg"),
  ).toHaveClass(/lucide-menu/);
  await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
  await expect(page.locator("#workspace-navigation")).not.toBeVisible();
  expect(
    (await page.locator("#workspace-main").boundingBox())!.width,
  ).toBeGreaterThan(before);
  expect(
    await page.evaluate(
      () => (window as Window & { fixtureMarker?: string }).fixtureMarker,
    ),
  ).toBe("sidebar-kept");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show sidebar", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Show sidebar", exact: true })
      .locator("svg"),
  ).toHaveClass(/lucide-menu/);
  await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
  await expect(page.locator("#workspace-navigation")).toBeVisible();
  const pinned = page.waitForResponse(
    (response) =>
      /\/notes\/[^/]+\/pin$/.test(response.url()) &&
      response.request().method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Pin Project notes", exact: true })
    .click();
  expect((await pinned).ok()).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Unpin Project notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toHaveCount(0);
  await page.screenshot({
    path: "../artifacts/frontend/notes-content-first.png",
    fullPage: true,
  });
});

test("edits content in a full viewport with an optional title and fixed character count", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await expect(editor.getByLabel("Note title", { exact: true })).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Close note", exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(1);
  const bounds = (await editor.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeCloseTo(0);
  expect(bounds.y).toBeCloseTo(0);
  expect(bounds.width).toBeCloseTo(viewport.width);
  expect(bounds.height).toBeCloseTo(viewport.height);
  const content = editor.getByRole("textbox", {
    name: "Note content",
    exact: true,
  });
  await content.fill("contentonly");
  await editor
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  const compact = (await editor.boundingBox())!;
  expect(compact.width).toBeLessThan(viewport.width);
  expect(compact.height).toBeLessThan(viewport.height);
  expect(compact.x).toBeCloseTo((viewport.width - compact.width) / 2);
  expect(compact.y).toBeCloseTo((viewport.height - compact.height) / 2);
  await expect(content).toContainText("contentonly");
  await expect(
    editor.getByRole("button", { name: "Enter full screen", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await editor
    .getByRole("button", { name: "Enter full screen", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    editor.getByRole("button", { name: "Exit full screen", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect((await editor.boundingBox())!.width).toBeCloseTo(viewport.width);
  await expect(
    editor.getByLabel("Character count", { exact: true }),
  ).toHaveText("11 / 100,000 characters");
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Add title", exact: true }).click();
  const title = editor.getByLabel("Note title", { exact: true });
  await expect(title).toBeFocused();
  await title.fill("Optional title");
  await title.fill("");
  await content.click();
  await expect(title).toHaveCount(0);
  await expect(content).toContainText("contentonly");
  const counter = (await editor
    .getByLabel("Character count", { exact: true })
    .boundingBox())!;
  expect(counter.y).toBeGreaterThan(viewport.height - 85);
  await page.screenshot({
    path: "../artifacts/frontend/editor-content-first-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await editor
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  const compactMobile = (await editor.boundingBox())!;
  expect(compactMobile.width).toBeLessThan(390);
  expect(compactMobile.height).toBeLessThan(844);
  await expect(content).toContainText("contentonly");
  await expect(
    editor.getByRole("button", { name: "Close", exact: true }),
  ).toBeInViewport();
  await editor
    .getByRole("button", { name: "Enter full screen", exact: true })
    .click();
  const mobile = (await editor.boundingBox())!;
  expect(mobile.width).toBeCloseTo(390);
  expect(mobile.height).toBeCloseTo(844);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(
    editor.getByRole("button", { name: "Close", exact: true }),
  ).toBeInViewport();
  await expect(
    editor.getByLabel("Character count", { exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "../artifacts/frontend/editor-content-first-mobile.png",
    fullPage: false,
  });
  await content.fill("Long content line.\n".repeat(150));
  await editor.locator(".editor-scroll").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    editor.getByLabel("Character count", { exact: true }),
  ).toBeInViewport();
  await expect(
    editor.getByRole("button", { name: "Close", exact: true }),
  ).toBeInViewport();
  await content.fill("Final content");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Keep your changes?", exact: true }),
  ).toHaveCount(0);
  const card = page.getByRole("article").filter({
    has: page.getByRole("button", { name: "Open Untitled", exact: true }),
  });
  await expect(card.getByRole("heading")).toHaveCount(0);
  await card
    .getByRole("button", { name: "Open Untitled", exact: true })
    .click();
  const reopened = page.getByRole("dialog", { name: "Edit note", exact: true });
  await expect(reopened.getByLabel("Note title", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    reopened.getByRole("textbox", { name: "Note content", exact: true }),
  ).toContainText("Final content");
});

test("keeps the optional title focused when the rich editor loads slowly", async ({
  page,
}) => {
  let releaseEditor!: () => void;
  const editorGate = new Promise<void>((resolve) => {
    releaseEditor = resolve;
  });
  await page.route("**/src/features/editor/RichEditor.tsx*", async (route) => {
    await editorGate;
    await route.continue();
  });
  try {
    await login(page);
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await expect(
      dialog.getByText("Loading editor…", { exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Add title", exact: true })
      .click();
    const title = dialog.getByLabel("Note title");
    await expect(title).toBeFocused();
    releaseEditor();
    await expect(
      dialog.getByRole("textbox", { name: "Note content" }),
    ).toBeVisible();
    await expect(title).toBeFocused();
    await title.fill("Title survives lazy startup");
    await dialog
      .getByRole("textbox", { name: "Note content" })
      .fill("Content stays editable.");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Open Title survives lazy startup",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Open Title survives lazy startup",
        exact: true,
      })
      .click();
    const reopened = page.getByRole("dialog", {
      name: "Edit note",
      exact: true,
    });
    await reopened.getByLabel("Note title").fill("");
    await reopened.getByRole("textbox", { name: "Note content" }).click();
    await reopened
      .getByRole("button", { name: "Add title", exact: true })
      .click();
    await expect(reopened.getByLabel("Note title")).toBeFocused();
    await reopened.getByLabel("Note title").fill("A title added again");
    await reopened.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Open A title added again",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    releaseEditor();
  }
});

test("creates rich notes, autosaves updates, assigns labels and restores from trash", async ({
  page,
}) => {
  await login(page);
  const editor = await createNote(
    page,
    "Browser note",
    "A useful first thought",
  );
  await editor.getByRole("button", { name: "Bold", exact: true }).click();
  await editor.getByRole("textbox", { name: "Note content" }).press("End");
  await page.keyboard.type(" and a bold idea");
  await editor.getByLabel("Note color 3", { exact: true }).click();
  await editor
    .getByRole("button", { name: "Note labels", exact: true })
    .click();
  await editor.getByRole("checkbox", { name: "Work", exact: true }).check();
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Browser note", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for Browser note", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to trash", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Move to trash?", exact: true })
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Browser note", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Browser note", exact: true })
    .click();
  const viewer = page.getByRole("dialog", {
    name: "Browser note",
    exact: true,
  });
  await expect(viewer.getByText(/bold idea/)).toBeVisible();
  await viewer
    .getByRole("button", { name: "Restore note", exact: true })
    .click();
  await page.getByRole("link", { name: "All notes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Browser note", exact: true }),
  ).toBeVisible();
});

test("keeps a local draft when another session changes the note", async ({
  page,
  request,
}) => {
  await login(page);
  const editor = await createNote(page, "Concurrent note", "My original draft");
  const card = page.locator("article.note-card").filter({
    has: page.getByRole("button", {
      name: "Open Concurrent note",
      exact: true,
      includeHidden: true,
    }),
  });
  const id = (await card.getAttribute("data-testid"))!.slice(5);
  const session = await apiSession(request);
  const remote = await request.get(fixture + "/api/v1/notes/" + id, {
    headers: { Authorization: "Bearer " + session.token },
  });
  const note = (await remote.json()).data;
  const changed = await request.patch(fixture + "/api/v1/notes/" + id, {
    headers: { Authorization: "Bearer " + session.token },
    data: { version: note.version, title: "Remote version" },
  });
  expect(changed.ok()).toBeTruthy();
  await editor.getByLabel("Note title").fill("My local version");
  await expect(editor.getByText("Your draft is safe here.")).toBeVisible();
  await expect(editor.getByLabel("Note title")).toHaveValue("My local version");
  await editor
    .getByRole("button", { name: "Save as new note", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open My local version", exact: true }),
  ).toBeVisible();
});

test("manages labels and reorders notes through keyboard-friendly controls", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Manage labels", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Your labels", exact: true });
  await dialog.getByLabel("New label", { exact: true }).fill("Research");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.getByText("Research", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Research", exact: true }),
  ).toBeVisible();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/notes/reorder") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Actions for Project notes", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move earlier", exact: true })
    .click();
  expect((await response).ok()).toBeTruthy();
  await expect(page.getByText("Note moved", { exact: true })).toHaveCount(0);
});

test("creates reminders and reads the resulting inbox notification", async ({
  page,
  request,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Open Project notes", exact: true })
    .click();
  let editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await editor
    .getByRole("button", { name: "Note reminders", exact: true })
    .click();
  const reminders = page.getByRole("dialog", {
    name: "Reminders",
    exact: true,
  });
  await reminders
    .getByRole("button", { name: "Add reminder", exact: true })
    .click();
  const at = new Date(Date.now() + 60000);
  const local = new Date(at.getTime() - at.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await reminders.getByLabel(/Date & time/).fill(local);
  await reminders
    .getByRole("button", { name: "Set reminder", exact: true })
    .click();
  await expect(reminders.getByText(/Does not repeat · Active/)).toBeVisible();
  await reminders
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  editor = page.getByRole("dialog", { name: "Edit note", exact: true });
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await request.post(fixture + "/__fixture/advance?minutes=3");
  expect(
    (await request.post(fixture + "/__fixture/dispatch")).ok(),
  ).toBeTruthy();
  await page.getByRole("link", { name: "Inbox", exact: true }).click();
  await expect(
    page.getByText("A note is waiting for you", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You’re all caught up", exact: true }),
  ).toBeVisible();
});

test("updates profile and revokes another session", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Browser");
  await page.getByLabel("Last name", { exact: true }).fill("Tester");
  await page.getByLabel("Timezone", { exact: true }).fill("UTC");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toContainText("Browser");
  await page
    .getByRole("link", { name: "Active sessions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign out this session", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revoke session", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Revoke this session?", exact: true })
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    page.getByText("Another session", { exact: true }),
  ).not.toBeVisible();
});

test("registers using the emailed fixture code and supports password recovery", async ({
  page,
  request,
}) => {
  const email = "browser-new@example.test";
  await page.goto("/register");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await expect(page.getByText("Code sent", { exact: true })).toBeVisible();
  const messages = await (
    await request.get(
      fixture + "/__fixture/mail?email=" + encodeURIComponent(email),
    )
  ).json();
  const code = messages.at(-1).body.match(/\b[0-9]{6}\b/)[0];
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create my space", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Your next idea starts here",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create your first note", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Take a note", exact: true }),
  ).toHaveCount(1);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send recovery link", exact: true })
    .click();
  await expect(page.getByText(/recovery link is on its way/)).toBeVisible();
  const recovery = await (
    await request.get(
      fixture + "/__fixture/mail?email=" + encodeURIComponent(email),
    )
  ).json();
  const link = recovery
    .at(-1)
    .body.match(/href='([^']+)'/)[1]
    .replaceAll("&amp;", "&");
  const url = new URL(link);
  await page.goto(url.pathname + url.search);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Changed-synthetic-password-123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Changed-synthetic-password-123!");
  await page.getByRole("button", { name: "Set password", exact: true }).click();
  await expect(page.getByText(/Your password has been updated/)).toBeVisible();
});

test("admin can manage accounts and roles without note content access", async ({
  page,
}) => {
  await login(page, "admin@example.test");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByText("Total accounts", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Little things, lately", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage a@example.test", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Lock account", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Lock this account?", exact: true })
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Roles", exact: true }).first().click();
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  const role = page.getByRole("dialog", { name: "Create role", exact: true });
  await role.getByLabel("Role name", { exact: true }).fill("BrowserReviewer");
  await role
    .getByLabel("Description", { exact: true })
    .fill("Synthetic reviewer");
  await role.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "BrowserReviewer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Audit trail", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("cell", { name: "Account locked", exact: true }),
  ).toBeVisible();
});

test("administrator has a separate responsive area with no personal workspace requests", async ({
  page,
}) => {
  const personalRequests: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /\/api\/v1\/(notes|tags|reminders|notifications)(?:[/?]|$)/.test(
        request.url(),
      )
    )
      personalRequests.push(request.url());
  });
  // The isolated fixture administrator deliberately has both Admin and User.
  await login(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin\/overview$/);
  await expect(
    page.getByRole("navigation", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New note", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Search your notes", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Labels", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    (window as Window & { fixtureMarker?: string }).fixtureMarker = "admin-spa";
  });
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as Window & { fixtureMarker?: string }).fixtureMarker,
    ),
  ).toBe("admin-spa");
  for (const path of [
    "/notes",
    "/trash",
    "/reminders",
    "/notifications",
    "/labels/synthetic",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await expect(
      page.getByRole("heading", { name: "System overview", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/settings/account?edit=password");
  await expect(page).toHaveURL(/\/admin\/settings\/account\?edit=password$/);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin\/overview$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "System overview", exact: true }),
  ).toBeVisible();
  await mkdir("../artifacts/frontend", { recursive: true });
  await page.screenshot({
    path: "../artifacts/frontend/admin-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "../artifacts/frontend/admin-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Administration navigation",
    exact: true,
  });
  await drawer.getByRole("link", { name: "Accounts", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Accounts", exact: true }),
  ).toBeVisible();
  expect(personalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("admin completes account lifecycle, details, memberships and custom role maintenance", async ({
  page,
}) => {
  await login(page, "admin@example.test");
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  for (const [email, roleName] of [
    ["new-user@example.test", "User"],
    ["new-admin@example.test", "Admin"],
  ]) {
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    const modal = page.getByRole("dialog", {
      name: "Create account",
      exact: true,
    });
    await modal.getByLabel("Email", { exact: true }).fill(email);
    await modal
      .getByLabel("Temporary password", { exact: true })
      .fill(password);
    await modal
      .getByLabel("Initial role", { exact: true })
      .selectOption(roleName);
    await modal
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(modal).not.toBeVisible();
  }
  await page
    .getByRole("button", { name: "Manage new-admin@example.test", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "View account details", exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Account details",
    exact: true,
  });
  await expect(
    details.getByText("Administration only", { exact: true }),
  ).toBeVisible();
  await details
    .getByRole("link", { name: "View account activity", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Account created", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  for (const [action, title] of [
    ["Lock account", "Lock this account?"],
    ["Unlock account", "Unlock this account?"],
    ["Deactivate account", "Deactivate this account?"],
  ]) {
    await page
      .getByRole("button", {
        name: "Manage new-user@example.test",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: action, exact: true }).click();
    const confirm = page.getByRole("dialog", { name: title, exact: true });
    await confirm.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(confirm).not.toBeVisible();
  }
  await expect(
    page.getByRole("button", {
      name: "Manage new-user@example.test",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel("Include deactivated", { exact: true }).check();
  await page
    .getByRole("button", { name: "Manage new-user@example.test", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Restore account", exact: true })
    .click();
  const restore = page.getByRole("dialog", {
    name: "Restore this account?",
    exact: true,
  });
  await restore.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(restore).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Roles", exact: true })
    .click();
  await page.getByRole("button", { name: "Create role", exact: true }).click();
  const role = page.getByRole("dialog", { name: "Create role", exact: true });
  await role.getByLabel("Role name", { exact: true }).fill("AccountReviewer");
  await role.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(role).not.toBeVisible();
  const roleCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "AccountReviewer", exact: true }),
  });
  await roleCard.getByRole("button", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit role", exact: true });
  await edit
    .getByLabel("Description", { exact: true })
    .fill("Review account metadata");
  await edit.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage new-user@example.test", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Manage roles", exact: true })
    .click();
  const memberships = page.getByRole("dialog", {
    name: "Account roles",
    exact: true,
  });
  const checkbox = memberships.getByRole("checkbox", {
    name: /AccountReviewer/,
  });
  await checkbox.click();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).toBeChecked();
  await checkbox.click();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).not.toBeChecked();
  await memberships.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Administration", exact: true })
    .getByRole("link", { name: "Roles", exact: true })
    .click();
  await roleCard.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Delete this role?", exact: true })
    .getByRole("button", { name: "Delete role", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "AccountReviewer", exact: true }),
  ).toHaveCount(0);
});

test("ordinary accounts cannot open the administration area", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("navigation", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/notes$/);
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
});

test("reorders the pinned group with pointer and keyboard dragging", async ({
  page,
}) => {
  await login(page);
  const first = page.getByRole("button", {
    name: "Move An idea worth exploring",
    exact: true,
  });
  const second = page.getByRole("button", {
    name: "Move Little things, lately",
    exact: true,
  });
  await first.hover();
  const a = (await first.boundingBox())!;
  const b = (await second.boundingBox())!;
  const moved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/notes/reorder") && r.request().method() === "POST",
  );
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, {
    steps: 3,
  });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  expect((await moved).ok()).toBeTruthy();
  await expect(page.getByText("Note moved", { exact: true })).toHaveCount(0);
  const pinned = page.locator(".notes-section").first();
  await expect(pinned.locator("h3").first()).toHaveText(
    "Little things, lately",
  );
  const keyboard = page.waitForResponse(
    (r) =>
      r.url().endsWith("/notes/reorder") && r.request().method() === "POST",
  );
  const targetId = (await pinned
    .locator("article")
    .nth(1)
    .getAttribute("data-testid"))!.slice("note-".length);
  await second.focus();
  await page.keyboard.press("Space");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("status").filter({ hasText: "was moved over" }),
  ).toContainText(targetId);
  await page.keyboard.press("Space");
  expect((await keyboard).ok()).toBeTruthy();
  await expect(pinned.locator("h3").first()).toHaveText(
    "An idea worth exploring",
  );
});

test("imports safe Markdown with checklists and exports it without a page reload", async ({
  page,
}) => {
  await login(page);
  const editor = await createNote(page, "Markdown note");
  await editor
    .getByRole("button", { name: "Note options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Import Markdown", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Import Markdown",
    exact: true,
  });
  await modal
    .getByLabel("Markdown content", { exact: true })
    .fill(
      "# A plan\n\n- [ ] Read a book\n- [x] Make some tea\n\n**A bold thought**",
    );
  await modal
    .getByRole("button", { name: "Replace content", exact: true })
    .click();
  await expect(editor.getByRole("checkbox")).toHaveCount(2);
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Note options", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Export Markdown", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Export as Markdown?", exact: true })
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("note.md");
});

test("keeps an unsaved draft after a network failure and retries without duplicates", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/v1/notes", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByRole("button", { name: "Add title", exact: true }).click();
  await editor.getByLabel("Note title").fill("Kept after a network error");
  await editor
    .getByRole("textbox", { name: "Note content" })
    .fill("My words are still here.");
  await expect(editor.getByRole("alert")).toContainText("Unable to reach");
  await expect(
    editor.getByRole("textbox", { name: "Note content" }),
  ).toContainText("My words are still here.");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  const prompt = page.getByRole("dialog", {
    name: "Keep your changes?",
    exact: true,
  });
  await prompt
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await page.unroute("**/api/v1/notes");
  await editor.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open Kept after a network error",
      exact: true,
    }),
  ).toHaveCount(1);
});

test("supports search, pinning, theme and an empty private workspace for another account", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("textbox", { name: "Search your notes", exact: true })
    .fill("Project");
  await expect(
    page.getByRole("button", { name: "Open Project notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Little things, lately",
      exact: true,
    }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page
    .getByRole("button", { name: "Pin Project notes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unpin Project notes", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await mkdir("../artifacts/frontend", { recursive: true });
  await page.screenshot({
    path: "../artifacts/frontend/workspace-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back.", exact: true }),
  ).toBeVisible();
  await login(page, "b@example.test");
  await expect(
    page.getByRole("heading", {
      name: "Your next idea starts here",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Project notes", { exact: true }),
  ).not.toBeVisible();
});
