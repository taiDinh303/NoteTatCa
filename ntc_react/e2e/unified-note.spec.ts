import { test, expect } from "@playwright/test";

for (const width of [1440, 393]) {
  test(`one note frame and editor survive View Edit View with undo and scrolling ${width}`, async ({ page, request }, info) => {
    const fixture = "http://127.0.0.1:5199";
    await request.post(fixture + "/__fixture/reset");
    const login = await request.post(fixture + "/api/v1/auth/login", { data: { email: "a@example.test", password: "Synthetic-password-123!" } });
    const session = (await login.json()).data;
    const documentJson = JSON.stringify({ type: "doc", content: Array.from({ length: 100 }, (_, index) => ({ type: "paragraph", content: [{ type: "text", text: `Line ${index}: private synthetic content for scrolling and mode changes.` }] })) });
    expect((await request.post(fixture + "/api/v1/notes", { headers: { Authorization: `Bearer ${session.token}` }, data: { title: "Unified frame", documentJson } })).ok()).toBeTruthy();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Open Unified frame", exact: true }).click();
    const viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(viewer.getByRole("region", { name: "Note content", exact: true })).toContainText("Line 99");
    const rich = page.locator(".editor-content .tiptap");
    await expect(rich).toHaveAttribute("contenteditable", "false");
    expect(await rich.getAttribute("aria-multiline")).toBeNull();
    await expect(viewer.getByRole("button", { name: "Bold", exact: true })).toHaveCount(0);
    await rich.evaluate(element => {
      const state = window as unknown as { noteFrame: Element | null; noteDocument: Element; noteViewport: Element | null };
      state.noteFrame = element.closest('[role="dialog"]');
      state.noteDocument = element;
      state.noteViewport = element.closest("[data-content-zoom]");
      state.noteViewport!.scrollTop = 400;
    });
    const assertIdentity = async () => {
      expect(await rich.evaluate(element => {
        const state = window as unknown as { noteFrame: Element; noteDocument: Element; noteViewport: Element };
        return element === state.noteDocument && element.closest('[role="dialog"]') === state.noteFrame && element.closest("[data-content-zoom]") === state.noteViewport;
      })).toBe(true);
    };
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(rich).toHaveAttribute("contenteditable", "true");
    await expect(rich).toHaveAttribute("aria-multiline", "true");
    await expect(rich).toBeFocused();
    await assertIdentity();
    await expect.poll(() => page.locator("[data-content-zoom]").evaluate(el => el.scrollTop)).toBe(400);
    await expect(editor.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
    await rich.press("Control+End");
    await page.keyboard.type(" retained-edit");
    await editor.getByRole("button", { name: "View", exact: true }).click();
    await expect(viewer).toBeVisible();
    await assertIdentity();
    await expect(rich).toHaveAttribute("contenteditable", "false");
    await expect(rich).toContainText("retained-edit");
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(rich).not.toContainText("retained-edit");
    await editor.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(rich).toContainText("retained-edit");
    await assertIdentity();
    await editor.getByRole("button", { name: "View", exact: true }).click();
    await page.screenshot({ path: info.outputPath("unified-note-view.png") });
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Open Unified frame", exact: true }).click();
    await expect(page.getByRole("region", { name: "Note content", exact: true })).toContainText("retained-edit");
  });
}

test("a newly created note retains its frame and undo when switching to View for the first time", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.goto("/guest");
  await page.getByRole("button", { name: "Take a note", exact: true }).click();
  await page.getByLabel("Note title", { exact: true }).fill("Created in one frame");
  const rich = page.getByRole("textbox", { name: "Note content", exact: true });
  await rich.fill("Before switching");
  await rich.evaluate(el => { (window as unknown as { originalNoteDocument: Element }).originalNoteDocument = el; });
  await page.getByRole("button", { name: "View", exact: true }).click();
  const readonly = page.getByRole("region", { name: "Note content", exact: true });
  await expect(readonly).toHaveText("Before switching");
  expect(await readonly.evaluate(el => el === (window as unknown as { originalNoteDocument: Element }).originalNoteDocument)).toBe(true);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(rich).not.toContainText("Before switching");
});
