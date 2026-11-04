import { test, expect } from "@playwright/test";

for (const width of [1440, 393]) {
  test(`bullet styles persist and numbered markers align at ${width}`, async ({
    page,
    request,
  }) => {
    const fixture = "http://127.0.0.1:5199";
    await request.post(fixture + "/__fixture/reset");
    await page.setViewportSize({ width, height: 900 });
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
    let dialog = page.getByRole("dialog", { name: "New note", exact: true });
    await dialog.getByLabel("Note title").fill("List styles");
    let content = dialog.getByRole("textbox", { name: "Note content" });
    await content.fill(
      "First list item with enough text to wrap naturally on a narrow phone screen.",
    );
    for (const [style, name, css] of [
      ["disc", "Dot bullets", "disc"],
      ["circle", "Circle bullets", "circle"],
      ["square", "Square bullets", "square"],
      ["dash", "Dash bullets", '"-  "'],
    ]) {
      await dialog
        .getByRole("button", { name: "Bullet style", exact: true })
        .click();
      await page.getByRole("menuitemradio", { name, exact: true }).click();
      await expect(content.locator("ul")).toHaveAttribute(
        "data-bullet-style",
        style,
      );
      await expect(content.locator("ul")).toHaveCSS("list-style-type", css);
    }
    await content.press("End");
    await content.press("Enter");
    await page.keyboard.type("Second item");
    await expect(content.locator("ul > li")).toHaveCount(2);
    await expect(dialog.locator('[data-save-state="saved"]')).toBeAttached();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open List styles", exact: true })
      .click();
    const view = page.getByRole("dialog", { name: "View note", exact: true });
    await expect(
      view.locator('.rich-editor ul[data-bullet-style="dash"] > li'),
    ).toHaveCount(2);
    await view.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Edit note", exact: true });
    content = dialog.getByRole("textbox", { name: "Note content" });
    await expect(content.locator("ul")).toHaveAttribute(
      "data-bullet-style",
      "dash",
    );
    await content.locator("li").last().click();
    await content.press("End");
    await content.press("Enter");
    await content.press("Enter");
    await page.keyboard.type("Number item 1");
    await dialog
      .getByRole("button", { name: "Numbered list", exact: true })
      .click();
    for (let i = 2; i <= 11; i++) {
      await content.press("Enter");
      await page.keyboard.type(`Number item ${i}`);
    }
    const ordered = content.locator("ol").first();
    await expect(ordered.locator(":scope > li")).toHaveCount(11);
    const geometry = await ordered
      .locator(":scope > li > p")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          left: element.getBoundingClientRect().left,
          marker: getComputedStyle(element.parentElement!, "::before")
            .fontVariantNumeric,
          align: getComputedStyle(element.parentElement!, "::before").textAlign,
        })),
      );
    expect(
      Math.max(...geometry.map((x) => x.left)) -
        Math.min(...geometry.map((x) => x.left)),
    ).toBeLessThan(1);
    expect(geometry.every((x) => x.marker === "tabular-nums")).toBe(true);
    expect(geometry.every((x) => x.align === "start")).toBe(true);
    await expect(dialog.locator('[data-save-state="saved"]')).toBeAttached();
    await dialog.getByRole("button", { name: "View", exact: true }).click();
    await expect(view.locator("ol > li")).toHaveCount(11);
    expect(
      await view
        .locator("ol > li")
        .first()
        .evaluate(
          (element) => getComputedStyle(element, "::before").fontVariantNumeric,
        ),
    ).toBe("tabular-nums");
    await page.screenshot({
      path: `../artifacts/frontend/list-formatting-${width}.png`,
    });
    await view.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Open List styles", exact: true })
      .click();
    await expect(view.locator("ol > li")).toHaveCount(11);
    await expect(view.locator('ul[data-bullet-style="dash"] > li')).toHaveCount(
      2,
    );
  });
}

test("ordered marker columns preserve non-default starts and nested lists", async ({
  page,
  request,
}) => {
  const fixture = "http://127.0.0.1:5199";
  await request.post(fixture + "/__fixture/reset");
  const session = (
    await (
      await request.post(fixture + "/api/v1/auth/login", {
        data: { email: "a@example.test", password: "Synthetic-password-123!" },
      })
    ).json()
  ).data;
  const paragraph = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });
  const document = {
    type: "doc",
    content: [
      {
        type: "orderedList",
        attrs: { start: 9 },
        content: [
          {
            type: "listItem",
            content: [
              paragraph("Nine with nested numbering"),
              {
                type: "orderedList",
                attrs: { start: 3 },
                content: [
                  { type: "listItem", content: [paragraph("Nested three")] },
                  { type: "listItem", content: [paragraph("Nested four")] },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [paragraph("Ten wraps correctly. ".repeat(15))],
          },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 1000000 },
        content: [
          { type: "listItem", content: [paragraph("Large supported start")] },
        ],
      },
    ],
  };
  const created = await request.post(fixture + "/api/v1/notes", {
    headers: { Authorization: "Bearer " + session.token },
    data: { title: "Numbering starts", documentJson: JSON.stringify(document) },
  });
  expect(created.ok()).toBe(true);
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Numbering starts", exact: true })
    .click();
  const view = page.getByRole("dialog", { name: "View note", exact: true });
  await expect(view.locator("ol").nth(0)).toHaveAttribute("start", "9");
  await expect(view.locator("ol").nth(1)).toHaveAttribute("start", "3");
  await expect(view.locator("ol").nth(2)).toHaveAttribute("start", "1000000");
  expect(
    await view
      .locator("ol")
      .nth(2)
      .evaluate((element) =>
        parseFloat(getComputedStyle(element).paddingInlineStart),
      ),
  ).toBeGreaterThan(60);
  await page.screenshot({
    path: "../artifacts/frontend/list-formatting-nested.png",
  });
});
