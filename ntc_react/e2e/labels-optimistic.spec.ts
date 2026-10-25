import { test, expect } from "@playwright/test";
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
}
for (const width of [320, 1280])
  test(`labels create/delete appear immediately and roll back safely ${width}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
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
      .waitFor();
    const notesBefore = await page.locator(".note-card").count();
    async function open() {
      await page
        .getByRole("button", { name: "Take a note", exact: true })
        .waitFor();
      const nav = page.getByRole("button", {
        name: "Open navigation",
        exact: true,
      });
      if (await nav.isVisible()) await nav.click();
      await page
        .getByRole("button", { name: "Manage labels", exact: true })
        .click();
      return page.getByRole("dialog", { name: "Your labels", exact: true });
    }
    let manager = await open();
    const createGate = gate(),
      createFailure = gate(),
      deleteGate = gate(),
      deleteFailure = gate();
    let createSeen = false,
      createFailSeen = false,
      deleteSeen = false,
      deleteFailSeen = false;
    await page.route("**/api/v1/tags", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postDataJSON();
      if (body.name === "Instant A") {
        createSeen = true;
        await createGate.promise;
        return route.continue();
      }
      if (body.name === "Failed create") {
        createFailSeen = true;
        await createFailure.promise;
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic create failure" }),
        });
      }
      return route.continue();
    });
    async function add(name: string) {
      await manager.getByLabel("New label", { exact: true }).fill(name);
      await manager.getByRole("button", { name: "Add", exact: true }).click();
    }
    const row = (name: string) =>
      manager
        .locator(".label-row")
        .filter({ has: page.getByText(name, { exact: true }) });
    await add("Instant A");
    await expect.poll(() => createSeen).toBe(true);
    await expect(row("Instant A")).toBeVisible();
    await expect(
      manager.getByRole("button", { name: "Add", exact: true }),
    ).toBeEnabled();
    await expect(
      row("Instant A").getByRole("button", {
        name: "Edit label Instant A",
        exact: true,
      }),
    ).toBeDisabled();
    await manager.getByRole("button", { name: "Close", exact: true }).click();
    manager = await open();
    await expect(row("Instant A")).toBeVisible();
    await add("Instant B");
    await expect(
      row("Instant B").getByRole("button", {
        name: "Edit label Instant B",
        exact: true,
      }),
    ).toBeEnabled();
    createGate.release();
    await expect(
      row("Instant A").getByRole("button", {
        name: "Edit label Instant A",
        exact: true,
      }),
    ).toBeEnabled();
    await page.route("**/api/v1/tags/*", async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      if (!deleteSeen) {
        deleteSeen = true;
        await deleteGate.promise;
        return route.continue();
      }
      deleteFailSeen = true;
      await deleteFailure.promise;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Synthetic delete failure" }),
      });
    });
    async function remove(name: string) {
      await row(name)
        .getByRole("button", { name: `Delete label ${name}`, exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Delete this label?", exact: true })
        .getByRole("button", { name: "Delete label", exact: true })
        .click();
    }
    await remove("Instant A");
    await expect.poll(() => deleteSeen).toBe(true);
    await expect(
      page.getByRole("dialog", { name: "Delete this label?", exact: true }),
    ).toHaveCount(0);
    await expect(row("Instant A")).toHaveCount(0);
    await manager.getByRole("button", { name: "Close", exact: true }).click();
    manager = await open();
    await expect(row("Instant A")).toHaveCount(0);
    const deleted = page.waitForResponse(
      (r) => r.request().method() === "DELETE" && r.ok(),
    );
    deleteGate.release();
    await deleted;
    await remove("Instant B");
    await expect.poll(() => deleteFailSeen).toBe(true);
    await expect(row("Instant B")).toHaveCount(0);
    deleteFailure.release();
    await expect(row("Instant B")).toBeVisible();
    await expect(
      page.getByText("Could not delete label Instant B.", { exact: true }),
    ).toBeVisible();
    await add("Failed create");
    await expect.poll(() => createFailSeen).toBe(true);
    await expect(row("Failed create")).toBeVisible();
    createFailure.release();
    await expect(row("Failed create")).toHaveCount(0);
    await expect(row("Instant B")).toBeVisible();
    await expect(
      page.getByText("Could not create label Failed create.", { exact: true }),
    ).toBeVisible();
    await manager.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    manager = await open();
    await expect(row("Instant A")).toHaveCount(0);
    await expect(row("Instant B")).toBeVisible();
    await expect(row("Failed create")).toHaveCount(0);
    expect(await page.locator(".note-card").count()).toBe(notesBefore);
  });
