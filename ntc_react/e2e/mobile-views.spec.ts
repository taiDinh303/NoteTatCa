import { test, expect } from '@playwright/test';
test.use({hasTouch:true,isMobile:true});
for(const width of [320,393,430]) test(`mobile views and double tap ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:852});await page.goto('/guest');
 const cards=page.getByRole('article');await expect(cards).toHaveCount(3);
 const grid=page.getByRole('button',{name:'grid view',exact:true});const list=page.getByRole('button',{name:'list view',exact:true});
 await grid.click();const bounds=await cards.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
 expect(bounds[1].width).toBeLessThan(width/2);expect(Math.abs(bounds[1].y-bounds[2].y)).toBeLessThan(2);
 await list.click();await expect(page.locator('.notes-mobile-layer')).toHaveAttribute('data-layout','list');
 await expect(cards.first().locator('.label-chip').filter({visible:true}).first()).toBeVisible();
 expect((await cards.first().boundingBox())!.height).toBeLessThan(160);
 await page.reload();await expect(page.locator('.notes-mobile-layer')).toHaveAttribute('data-layout','list');
 await page.screenshot({path:info.outputPath('list.png')});
 await cards.first().getByRole('button',{name:/^Open /}).click();
 const region=page.getByRole('region',{name:'Note content',exact:true});const box=(await region.boundingBox())!;
 await page.touchscreen.tap(box.x+50,box.y+40);await page.touchscreen.tap(box.x+50,box.y+40);
 await expect(page.getByRole('dialog',{name:'Edit note',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
