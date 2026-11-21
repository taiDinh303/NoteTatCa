import { test, expect } from '@playwright/test';
test.use({hasTouch:true,isMobile:true});
for(const width of [320,393,430]) test(`mobile views and double tap ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:852});await page.goto('/guest');
 const cards=page.getByRole('article');await expect(cards).toHaveCount(3);
 const grid=page.getByRole('button',{name:'grid view',exact:true});const list=page.getByRole('button',{name:'list view',exact:true});
 await grid.click();const bounds=await cards.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
 expect(bounds[1].width).toBeLessThan(width/2);expect(Math.abs(bounds[1].y-bounds[2].y)).toBeLessThan(2);
 // Grid and list must share one left inset AND one title->content top gap: text starts
 // at the same x/y in both views, so the FLIP toggle moves cards vertically only
 // ("nhảy chữ" regression check).
 const padLeft = (sel: string) =>
   cards.first().locator(sel).evaluate(el => getComputedStyle(el).paddingLeft);
 const padTop = (sel: string) =>
   cards.first().locator(sel).evaluate(el => getComputedStyle(el).paddingTop);
 const fontSize = (sel: string) =>
   cards.first().locator(sel).evaluate(el => getComputedStyle(el).fontSize);
 const gridPads: Record<string, string> = {};
 for (const sel of [".note-card-top", ".note-open", ".note-card-footer"])
   gridPads[sel + "L"] = await padLeft(sel);
 gridPads.openT = await padTop(".note-open");
 // Text must not be re-sized by the toggle: title and preview font sizes are
 // identical in grid and list ("chữ to nhỏ khác nhau giữa list và grid").
 const gridFonts: Record<string, string> = {
   title: await fontSize(".note-card-identity h3"),
   preview: await fontSize(".note-preview"),
 };
 await list.click();await expect(page.locator('.notes-mobile-layer')).toHaveAttribute('data-layout','list');
 await expect(cards.first().locator('.label-chip').filter({visible:true}).first()).toBeVisible();
 // The grid<->list toggle runs a 240ms FLIP width/height animation; wait for it to
 // settle so the height assertion measures the final layout, not a mid-animation frame.
 await page.waitForFunction(() => ![...document.querySelectorAll<HTMLElement>('.note-card')].some(node => node.getAnimations().some(a => a.id === 'note-drop' && a.playState === 'running')));
 expect((await cards.first().boundingBox())!.height).toBeLessThan(160);
 for (const sel of [".note-card-top", ".note-open", ".note-card-footer"])
   expect(await padLeft(sel), `${sel} left inset must be identical in list and grid`).toBe(gridPads[sel + "L"]);
 expect(await padTop(".note-open"), ".note-open top gap must be identical in list and grid").toBe(gridPads.openT);
 expect(await fontSize(".note-card-identity h3"), "title font must be identical in list and grid").toBe(gridFonts.title);
 expect(await fontSize(".note-preview"), "preview font must be identical in list and grid").toBe(gridFonts.preview);
 await page.reload();await expect(page.locator('.notes-mobile-layer')).toHaveAttribute('data-layout','list');
 await page.screenshot({path:info.outputPath('list.png')});
 await cards.first().getByRole('button',{name:/^Open /}).click();
 const region=page.getByRole('region',{name:'Note content',exact:true});const box=(await region.boundingBox())!;
 await page.touchscreen.tap(box.x+50,box.y+40);await page.touchscreen.tap(box.x+50,box.y+40);
 await expect(page.getByRole('dialog',{name:'Edit note',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
