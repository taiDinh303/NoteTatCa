import { test, expect } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const fixture = "http://127.0.0.1:5199";
const password = "Synthetic-password-123!";
async function login(page: Page, email = "a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your notes", exact: true }),
  ).toBeVisible();
}
async function createNote(
  page: Page,
  title: string,
  content = "A private thought worth keeping.",
) {
  await page.getByRole("button", { name: "New note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
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
  await editor.getByRole("button", { name: "Close note", exact: true }).click();
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
  await expect(page.getByText("Note moved", { exact: true })).toBeVisible();
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
  await editor.getByRole("button", { name: "Close note", exact: true }).click();
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
    page.getByRole("heading", { name: "Your notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Your next idea starts here",
      exact: true,
    }),
  ).toBeVisible();
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
  await expect(page.getByText("Note moved", { exact: true })).toBeVisible();
  const pinned = page.locator(".notes-section").first();
  await expect(pinned.locator("h3").first()).toHaveText(
    "Little things, lately",
  );
  const keyboard = page.waitForResponse(
    (r) =>
      r.url().endsWith("/notes/reorder") && r.request().method() === "POST",
  );
  await second.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
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
  await page.getByRole("button", { name: "New note", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "New note", exact: true });
  await editor.getByLabel("Note title").fill("Kept after a network error");
  await editor
    .getByRole("textbox", { name: "Note content" })
    .fill("My words are still here.");
  await expect(editor.getByRole("alert")).toContainText("Unable to reach");
  await expect(
    editor.getByRole("textbox", { name: "Note content" }),
  ).toContainText("My words are still here.");
  await editor.getByRole("button", { name: "Close note", exact: true }).click();
  const prompt = page.getByRole("dialog", {
    name: "Keep your changes?",
    exact: true,
  });
  await prompt
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await page.unroute("**/api/v1/notes");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    editor.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close note", exact: true }).click();
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
