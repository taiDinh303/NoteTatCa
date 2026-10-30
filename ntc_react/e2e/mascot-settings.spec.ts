import { expect, test } from "@playwright/test";

test("retired mascot preferences fall back while preserving enabled state", async ({
  page,
}) => {
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  for (const name of ["wizard", "knight", "gearbot", "sheep", "dino"]) {
    for (const enabled of ["on", "off"]) {
      await page.evaluate(
        ({ name, enabled }) => {
          localStorage.setItem("ntc.mascot.v1", `${enabled}:${name}`);
          window.dispatchEvent(new Event("ntc:mascot-change"));
        },
        { name, enabled },
      );
      if (enabled === "off")
        await expect(page.locator(".note-mascot")).toHaveCount(0);
      else
        await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
          "background-image",
          /bunny-directions.webp/,
        );
    }
  }
});

test("appearance remembers presets and provides no second custom-upload slot", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await page.goto("/settings/appearance");
  const toggle = page.getByRole("switch", { name: "Show mascot" });
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("radio")).toHaveCount(50);
  for (const name of ["Wizard", "Knight", "Gear bot", "Sheep", "Dino"])
    await expect(page.getByRole("radio", { name, exact: true })).toHaveCount(0);
  const foxLayer = page
    .getByRole("radio", { name: "Fox", exact: true })
    .locator("..")
    .locator(".mascot-directions");
  await page
    .getByRole("radio", { name: "Fox", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(foxLayer).toBeVisible();
  const foxBox = (await page
    .getByRole("radio", { name: "Fox", exact: true })
    .locator("..")
    .locator(".mascot-choice-page")
    .boundingBox())!;
  await page.mouse.move(foxBox.x - 200, foxBox.y + foxBox.height / 2);
  await expect(foxLayer).toHaveCSS("background-position", "0% 50%");
  await page.mouse.move(
    foxBox.x + foxBox.width + 200,
    foxBox.y + foxBox.height / 2,
  );
  await expect(foxLayer).toHaveCSS("background-position", "100% 50%");
  await expect(page.getByText("Animals", { exact: true })).toBeVisible();
  for (const name of [
    "Cat",
    "Fox",
    "Owl",
    "Bear",
    "Bunny",
    "Otter",
    "Notebook robot",
    "Paper pal",
    "Koala",
    "Grandpa",
    "TV",
  ]) {
    await page.getByRole("radio", { name, exact: true }).check();
    await expect(page.getByRole("radio", { name, exact: true })).toBeChecked();
  }
  await page.getByRole("radio", { name: "Fox", exact: true }).check();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Fox", exact: true }),
  ).toBeChecked();
  await page.goto("/notes");
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /fox-directions.webp/,
  );
  await page.goto("/settings/appearance");
  await toggle.click();
  await page.goto("/notes");
  await expect(page.locator(".note-card").first()).toBeVisible();
  await expect(page.locator(".note-mascot")).toHaveCount(0);
  await page.goto("/settings/appearance");
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(
    page.getByRole("radio", { name: "Fox", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Upload image", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "test-results/mascot-appearance-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator(".mascot-settings")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/mascot-appearance-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("radio", { name: "Fox", exact: true })).toBeChecked();
  const dark = page.getByRole("switch", { name: "Dark mode", exact: true });
  await dark.click();
  await expect(dark).toBeChecked();
  await page.screenshot({
    path: "test-results/mascot-appearance-dark.png",
    fullPage: true,
  });
});

test("legacy presets retain their choice and disabled state; unknown presets fall back", async ({
  page,
}) => {
  await page.goto("/Home");
  await page.evaluate(() => localStorage.setItem("ntc.mascot.v1", "off:koala"));
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await expect(page.locator(".note-mascot")).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem("ntc.mascot.v1", "on:koala");
    window.dispatchEvent(new Event("ntc:mascot-change"));
  });
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /ntc-v6\/koala-directions.webp/,
  );
  await page.evaluate(() => {
    localStorage.setItem("ntc.mascot.v1", "on:retired-example");
    window.dispatchEvent(new Event("ntc:mascot-change"));
  });
  await expect(page.locator(".note-mascot .mascot-directions")).toHaveCSS(
    "background-image",
    /ntc-v6\/bunny-directions.webp/,
  );
});
