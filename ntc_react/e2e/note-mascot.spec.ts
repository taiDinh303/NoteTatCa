import { expect, test } from "@playwright/test";
import { mascotCharacters } from "../src/features/mascot/mascotPreference";

test("every preset keeps its full opaque body above the card on desktop and mobile", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  const mascot = page.locator(".note-mascot");
  for (const width of [1440, 393]) {
    await page.setViewportSize({ width, height: 900 });
    for (const character of mascotCharacters) {
      await page.evaluate((name) => {
        localStorage.setItem("ntc.mascot.v1", `on:${name}`);
        window.dispatchEvent(new Event("ntc:mascot-change"));
      }, character);
      await expect(mascot).toBeVisible();
      await expect(mascot.locator(".mascot-directions")).toHaveCSS(
        "background-image",
        new RegExp(`${character}-directions.webp`),
      );
      const geometry = await mascot.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const card = element.closest(".note-card")!.getBoundingClientRect();
        return {
          bottom: box.bottom,
          top: card.top,
          height: box.height,
          clip: getComputedStyle(element).clipPath,
        };
      });
      expect(geometry.bottom, `${character}/${width}`).toBeLessThanOrEqual(
        geometry.top + 1,
      );
      expect(geometry.height).toBeGreaterThan(25);
      expect(geometry.clip).not.toBe("none");
      for (let frame = 0; frame < 9; frame++) {
        await mascot.evaluate((el, frame) => {
          const r = el.getBoundingClientRect();
          window.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX: r.x + r.width / 2 + ((frame % 3) - 1) * 220,
              clientY: r.y + r.height / 2 + (Math.floor(frame / 3) - 1) * 220,
            }),
          );
        }, frame);
        await expect(mascot.locator(".mascot-directions")).toHaveCSS(
          "background-position",
          (frame % 3) * 50 + "% " + Math.floor(frame / 3) * 50 + "%",
        );
        // Check the character's main body, not detached atlas noise.
        const paintedGap = await mascot.evaluate(async (element) => {
          const layer =
            element.querySelector<HTMLElement>(".mascot-directions")!;
          const style = getComputedStyle(layer);
          const image = new Image();
          image.src = style.backgroundImage.slice(5, -2);
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);

          const w = image.width / 3,
            h = image.height / 3;
          const positions = style.backgroundPosition.split(" ").map(parseFloat);
          const col = Math.round(positions[0] / 50),
            row = Math.round(positions[1] / 50);
          const moduleUrl = "/src/features/mascot/mascotBodyFloor.ts";
          const { mascotBodyFloor } = await import(
            /* @vite-ignore */ moduleUrl
          );
          const floor = mascotBodyFloor(
            ctx.getImageData(col * w, row * h, w, h).data,
            w,
            h,
          );
          const box = layer.getBoundingClientRect();
          const edge = element
            .closest(".note-card")!
            .getBoundingClientRect().top;
          return edge - (box.top + floor * box.height);
        });
        expect(
          Math.abs(paintedGap),
          `${character}/${width} painted gap`,
        ).toBeLessThanOrEqual(1.1);
      }
      if (["raccoon", "cat"].includes(character)) {
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: `test-results/mascot-floor-${character}-${width}.png`,
        });
      }
    }
  }
});

test("bunny uses the aligned atlas without a neck cut and leaves card actions clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/Home");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Try guest mode", exact: true })
    .click();
  await expect(page.locator(".note-card").first()).toBeVisible();
  await expect(page.locator(".note-mascot")).toHaveAttribute(
    "data-mascot-anchor",
    "corner",
  );
  const cards = page.locator(".note-card");
  const targetId = await cards
    .filter({ hasNot: page.locator(".note-mascot") })
    .first()
    .getAttribute("data-testid");
  const target = page.locator(`[data-testid="${targetId}"]`);
  await target.locator(".note-open").click();
  await expect(target.locator(".note-mascot")).toHaveCount(0);
  const openedMascot = page
    .getByRole("dialog", { name: "View note" })
    .locator(".note-mascot");
  await expect(openedMascot).toBeVisible();
  await expect(openedMascot).toHaveAttribute("data-mascot-anchor", "corner");
  const head = openedMascot.locator(".mascot-directions");
  await expect(head).toHaveCSS("clip-path", "none");
  await expect(head).toHaveCSS("background-image", /bunny-directions.webp/);
  const before = await head.evaluate(
    (el) => getComputedStyle(el).backgroundPosition,
  );
  await page.mouse.move(0, 0);
  await expect
    .poll(() => head.evaluate((el) => getComputedStyle(el).backgroundPosition))
    .not.toBe(before);
  // The selected list-card perch changes after the existing 500 ms delay.
  await page.waitForTimeout(550);
  await page
    .getByRole("dialog", { name: "View note" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  const mascotBox = await target.locator(".note-mascot").boundingBox();
  const cardBox = await target.boundingBox();
  expect(
    cardBox!.x + cardBox!.width - mascotBox!.x - mascotBox!.width,
  ).toBeGreaterThan(45);
  const actions = cards.first().getByRole("button", { name: /^Actions for / });
  await actions.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "test-results/mascot-aligned.png" });
});
