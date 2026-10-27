import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function login(page: Page, email = "a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
}
async function fakeAi(page: Page, existing = false) {
  const directions = (
    await readFile("public/mascots/bunny-directions.webp")
  ).toString("base64");
  const reactions = (
    await readFile("public/mascots/bunny-reactions.webp")
  ).toString("base64");
  const old = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    next = "11111111-1111-4111-8111-111111111111";
  const server = {
    jobId: existing ? old : next,
    state: existing ? "applied" : "",
    used: false,
    slot: existing
      ? { id: old, state: "applied" }
      : (null as { id: string; state: string } | null),
    creates: [] as {
      description: string;
      replacesId?: string;
      consentToSendToOpenAi: boolean;
      referencePngBase64?: string;
    }[],
    saved: { directionsWebpBase64: directions, reactionsWebpBase64: reactions },
    ready() {
      this.state = "ready";
      if (this.slot?.id === this.jobId) this.slot.state = "ready";
    },
  };
  const json = (data: unknown) => ({ statusCode: 200, code: "SUCCESS", data });
  await page.route("**/api/v1/mascot-ai/**", async (route) => {
    const request = route.request(),
      url = request.url();
    if (request.method() === "DELETE") {
      server.slot = null;
      server.state = "expired";
      return route.fulfill({ json: json(true) });
    }
    if (request.method() === "POST" && url.endsWith("/apply")) {
      server.saved = request.postDataJSON();
      server.state = "applied";
      server.slot = { id: server.jobId, state: "applied" };
      return route.fulfill({ json: json(true) });
    }
    if (request.method() === "POST") {
      const input = request.postDataJSON();
      server.creates.push(input);
      server.jobId = next;
      server.state = "queued";
      server.used = true;
      server.slot ??= { id: next, state: "queued" };
      return route.fulfill({ json: json({ id: next, state: "queued" }) });
    }
    if (url.endsWith("/slot/result")) {
      if (server.slot?.state === "applied")
        return route.fulfill({
          json: json({ id: server.slot.id, ...server.saved }),
        });
      return route.fulfill({ status: 404, json: { code: "NOT_FOUND" } });
    }
    if (url.endsWith("/result"))
      return route.fulfill({
        json: json({
          directionsPngBase64: directions,
          reactionsPngBase64: reactions,
        }),
      });
    return route.fulfill({
      json: json({
        available: true,
        dailyLimit: 1,
        canCreate: !server.used && !server.slot,
        canEdit: !server.used && !!server.slot,
        resetsAt: "2026-10-28T00:00:00Z",
        latest: server.state ? { id: server.jobId, state: server.state } : null,
        slot: server.slot,
      }),
    });
  });
  return server;
}
test("one custom slot creates in background, persists per account and cannot be replaced by a second slot", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const server = await fakeAi(page);
  await login(page);
  await page.goto("/settings/appearance");
  await page
    .getByLabel("Describe your mascot", { exact: true })
    .fill("A blue owl wearing round glasses");
  await page
    .getByLabel("Reference photo (optional)", { exact: true })
    .setInputFiles("public/mascots/bunny-directions.webp");
  const generate = page.getByRole("button", {
    name: "Generate mascot",
    exact: true,
  });
  await expect(generate).toBeDisabled();
  await page.getByRole("checkbox", { name: /Send this description/ }).check();
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(
    page.getByRole("status").filter({ hasText: "background" }),
  ).toBeVisible();
  await expect(generate).toHaveCount(0);
  expect(server.creates[0].consentToSendToOpenAi).toBe(true);
  expect(
    Buffer.from(server.creates[0].referencePngBase64!, "base64").subarray(0, 8),
  ).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await page.goto("/notes");
  await expect(page.locator(".note-card").first()).toBeVisible();
  server.ready();
  await page.goto("/settings/appearance");
  await page
    .getByRole("button", { name: "Preview AI mascot", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply mascot", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Your custom mascot", exact: true }),
  ).toBeChecked();
  await expect(generate).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit mascot", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".mascot-ai-settings")
    .screenshot({ path: "test-results/mascot-ai-one-slot.png" });
  await page.setViewportSize({ width: 393, height: 852 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/notes");
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /data:image\/webp/,
  );
  await page.reload();
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /data:image\/webp/,
  );
  const preferences = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith("ntc.mascot"),
      ),
    ),
  );
  const context = await browser.newContext();
  await context.addInitScript((values) => {
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, value);
  }, preferences);
  const other = await context.newPage();
  await login(other, "b@example.test");
  await other.goto("/settings/appearance");
  await expect(
    other.getByRole("heading", { name: "Appearance", exact: true }),
  ).toBeVisible();
  await expect(
    other.getByRole("radio", { name: "Your custom mascot", exact: true }),
  ).toHaveCount(0);
  await context.close();
  await page.goto("/settings/appearance");
  await page
    .getByRole("button", { name: "Delete mascot", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm deletion", exact: true })
    .click();
  await expect(generate).toBeVisible();
  await expect(generate).toBeDisabled();
  await expect(
    page.getByRole("radio", { name: "Your custom mascot", exact: true }),
  ).toHaveCount(0);
  expect(server.creates).toHaveLength(1);
});
test("editing replaces the existing custom mascot only after preview is applied", async ({
  page,
}) => {
  const server = await fakeAi(page, true);
  const original = server.slot!.id;
  await login(page);
  await page.goto("/settings/appearance");
  await expect(
    page.getByRole("button", { name: "Generate mascot", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit mascot", exact: true }).click();
  await page
    .getByLabel("Describe your changes", { exact: true })
    .fill("Add blue glasses");
  await page.getByRole("checkbox", { name: /Send this description/ }).check();
  await page
    .getByRole("button", { name: "Generate changes", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "background" }),
  ).toBeVisible();
  expect(server.creates[0].replacesId).toBe(original);
  expect(server.slot!.id).toBe(original);
  server.ready();
  await page.reload();
  await page
    .getByRole("button", { name: "Preview AI mascot", exact: true })
    .click();
  expect(server.slot!.id).toBe(original);
  await page.getByRole("button", { name: "Apply mascot", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Your custom mascot", exact: true }),
  ).toBeChecked();
  expect(server.slot!.id).not.toBe(original);
  await expect(
    page.getByRole("radio", { name: "Your custom mascot", exact: true }),
  ).toHaveCount(1);
});
test("an unconfigured service keeps AI creation disabled while presets remain available", async ({
  page,
}) => {
  await page.route("**/api/v1/mascot-ai/status", (route) =>
    route.fulfill({
      json: {
        statusCode: 200,
        code: "SUCCESS",
        data: {
          available: false,
          canCreate: false,
          canEdit: false,
          dailyLimit: 1,
          resetsAt: "2026-10-28T00:00:00Z",
          latest: null,
          slot: null,
        },
      },
    }),
  );
  await login(page);
  await page.goto("/settings/appearance");
  await expect(page.getByText(/AI creation is not enabled yet/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate mascot", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("radio", { name: "Fox", exact: true }),
  ).toBeVisible();
});
test("invalid opaque AI artwork cannot replace the current mascot", async ({
  page,
}) => {
  const opaque = await page.evaluate(() => {
    const image = document.createElement("canvas");
    image.width = image.height = 1024;
    const ctx = image.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1024, 1024);
    return image.toDataURL("image/png").split(",")[1];
  });
  const id = "22222222-2222-4222-8222-222222222222";
  await page.route("**/api/v1/mascot-ai/**", (route) =>
    route.fulfill({
      json: {
        statusCode: 200,
        code: "SUCCESS",
        data: route.request().url().endsWith("/result")
          ? { directionsPngBase64: opaque, reactionsPngBase64: opaque }
          : {
              available: true,
              canCreate: false,
              canEdit: false,
              dailyLimit: 1,
              resetsAt: "2026-10-28T00:00:00Z",
              latest: { id, state: "ready" },
              slot: { id, state: "ready" },
            },
      },
    }),
  );
  await login(page);
  await page.goto("/settings/appearance");
  await page
    .getByRole("button", { name: "Preview AI mascot", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "could not be aligned" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply mascot", exact: true }),
  ).toHaveCount(0);
  await page.goto("/notes");
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /bunny-directions.webp/,
  );
});
