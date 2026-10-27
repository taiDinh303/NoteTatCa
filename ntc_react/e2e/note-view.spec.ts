import { test, expect } from "@playwright/test";

for (const width of [393, 1280]) {
  test(`saved note is read only until Edit and card shortcuts work ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("a@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Take a note", exact: true })
      .click();
    let editor = page.getByRole("dialog", { name: "New note", exact: true });
    await editor.getByLabel("Note title").fill("Read first note");
    const content = editor.getByRole("textbox", { name: "Note content" });
    await content.fill("Keep this checklist unchanged");
    await editor
      .getByRole("button", { name: "Checklist", exact: true })
      .click();
    await expect(content.locator("input[type=checkbox]")).toHaveCount(1);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await expect(page.locator(".note-card .note-date")).toHaveCount(0);
    let writes = 0;
    page.on("request", (request) => {
      if (
        /\/api\/v1\/notes(?:[/?]|$)/.test(request.url()) &&
        ["POST", "PATCH", "PUT", "DELETE"].includes(request.method())
      )
        writes++;
    });
    await page
      .getByRole("button", { name: "Open Read first note", exact: true })
      .click();
    let viewer = page.getByRole("dialog", { name: "View note", exact: true });
    const timestamp = viewer.getByRole("button", {
      name: "Note information",
      exact: true,
    });
    await expect(timestamp).toContainText("Edited");
    const stampBounds = (await timestamp.boundingBox())!;
    const editBounds = (await viewer
      .getByRole("button", { name: "Edit", exact: true })
      .boundingBox())!;
    expect(stampBounds.x).toBeLessThan(editBounds.x);
    if (width > 800) {
      expect(
        Math.abs(
          stampBounds.y +
            stampBounds.height / 2 -
            editBounds.y -
            editBounds.height / 2,
        ),
      ).toBeLessThan(3);
    } else {
      expect(editBounds.y).toBeGreaterThan(stampBounds.y + stampBounds.height / 2);
    }
    await timestamp.click();
    const information = page.locator(".note-information");
    await expect(information).toContainText("Created");
    await expect(information).toContainText("Last edited");
    await expect(information.locator("time")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(information).toHaveCount(0);
    await expect(viewer).toBeVisible();
    const readContent = viewer.getByRole("region", { name: "Note content" });
    await expect(readContent).toContainText("Keep this checklist unchanged");
    await expect(readContent).toHaveAttribute("contenteditable", "false");
    await expect(
      viewer.locator(
        '[contenteditable=true], input:not([type=checkbox]):not([aria-label="Content zoom percentage"]), .editor-toolbar, .editor-tools, .editor-labels',
      ),
    ).toHaveCount(0);
    await expect(
      viewer.locator('input[aria-label="Content zoom percentage"]'),
    ).toHaveCount(0);
    await expect(
      viewer.getByRole("button", { name: "Content zoom", exact: true }),
    ).toBeVisible();
    await expect(viewer.getByLabel("Character count")).toHaveCount(0);
    if (width <= 800) {
      const bounds = (await viewer.boundingBox())!;
      expect(bounds.width).toBeCloseTo(width);
      expect(bounds.height).toBeCloseTo(852);
    }
    await readContent.click();
    await page.keyboard.type("must not be added");
    await readContent.locator("input[type=checkbox]").click({ force: true });
    await expect(readContent).not.toContainText("must not be added");
    await expect(readContent.locator("input[type=checkbox]")).not.toBeChecked();
    await expect(
      viewer.getByRole("button", { name: "Edit", exact: true }),
    ).toBeVisible();
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    expect(writes).toBe(0);
    await page
      .getByRole("button", { name: "Open Read first note", exact: true })
      .click();
    viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await viewer.getByRole("button", { name: "Edit", exact: true }).click();
    editor = page.getByRole("dialog", { name: "Edit note", exact: true });
    await expect(editor.locator(".note-view-timestamp")).toHaveCount(0);
    const fontSize = editor.getByRole("spinbutton", {
      name: "Font size",
      exact: true,
    });
    const decrease = editor.getByRole("button", {
      name: "Decrease font size",
      exact: true,
    });
    const bold = editor.getByRole("button", { name: "Bold", exact: true });
    expect((await fontSize.boundingBox())!.height).toBeCloseTo(
      (await bold.boundingBox())!.height,
      0,
    );
    expect((await decrease.boundingBox())!.height).toBeCloseTo(
      (await bold.boundingBox())!.height,
      0,
    );
    await expect(fontSize).toHaveCSS("border-top-width", "0px");
    await editor
      .getByRole("textbox", { name: "Note content" })
      .fill("Edited explicitly");
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    const card = page.getByRole("article").filter({
      has: page.getByRole("button", {
        name: "Open Read first note",
        exact: true,
      }),
    });
    await expect(card).toContainText("Edited explicitly");
    await card
      .getByRole("button", { name: "Actions for Read first note", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: /^(Open note|Unpin note|Pin note)$/ }),
    ).toHaveCount(0);
    await page
      .getByRole("menuitem", { name: "Add label", exact: true })
      .click();
    const labels = page.getByRole("dialog", {
      name: "Note labels",
      exact: true,
    });
    await expect(
      page.getByRole("dialog", { name: "Edit note", exact: true }),
    ).toHaveCount(0);
    await labels.getByRole("button", { name: "Work", exact: true }).click();
    let rejectLabelSave = true;
    await page.route("**/api/v1/notes/*", async (route) => {
      if (route.request().method() === "PATCH" && rejectLabelSave) {
        rejectLabelSave = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic label save failure" }),
        });
      } else await route.continue();
    });
    await labels.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      labels.getByRole("button", { name: "Work", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(labels.getByRole("alert")).toBeVisible();
    await labels.getByRole("button", { name: "Save", exact: true }).click();
    await expect(card.locator(".note-tags")).toContainText("Work");
    await card
      .getByRole("button", { name: "Actions for Read first note", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Add reminder", exact: true })
      .click();
    const reminders = page.getByRole("dialog", {
      name: "Reminders",
      exact: true,
    });
    await expect(reminders).toBeVisible();
    await reminders
      .getByRole("button", { name: "Add reminder", exact: true })
      .click();
    await reminders
      .getByRole("button", { name: "Set reminder", exact: true })
      .click();
    await expect(reminders.getByText(/Does not repeat · Active/)).toBeVisible();
    await reminders
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    viewer = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(
      viewer.getByRole("region", { name: "Note content" }),
    ).toContainText("Edited explicitly");
    await expect(viewer.locator(".editor-toolbar")).toHaveCount(0);
    await expect(
      viewer.getByRole("region", { name: "Note content" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/note-view-${width}.png`,
      animations: "disabled",
    });
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await expect(card.locator(".note-tags")).toContainText("Work");
    const id = (await card.getAttribute("data-testid"))!.slice(5);
    await page.goto(`/notes?note=${id}`);
    await expect(
      page
        .getByRole("dialog", { name: "View note", exact: true })
        .getByRole("region", { name: "Note content" }),
    ).toContainText("Edited explicitly");
  });
}
