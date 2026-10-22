import { test, expect } from "@playwright/test";
for (const width of [393, 1280]) {
  test(`truncates card title without changing saved text ${width}`, async ({
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
    const title = "Long title ".repeat(13).trim();
    const editor = page.getByRole("dialog", { name: "New note", exact: true });
    await editor.getByLabel("Note title").fill(title);
    await editor
      .getByRole("textbox", { name: "Note content" })
      .fill("Short content");
    await expect(editor.locator('[data-save-state="saved"]')).toBeAttached();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    const heading = page.getByRole("heading", { name: title, exact: true });
    await expect(heading).toHaveAttribute("title", title);
    await expect(heading).toHaveCSS("text-overflow", "ellipsis");
    await expect(heading).toHaveCSS("white-space", "nowrap");
    expect(
      await heading.evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    const box = (await heading.boundingBox())!;
    expect(box.height).toBeLessThan(25);
    await page
      .getByRole("button", { name: `View ${title}`, exact: true })
      .click();
    await page.getByRole("dialog", { name: "View note", exact: true }).getByRole("button", { name: "Edit", exact: true }).click();
    await expect(
      page
        .getByRole("dialog", { name: "Edit note", exact: true })
        .getByLabel("Note title"),
    ).toHaveValue(title);
  });
}
