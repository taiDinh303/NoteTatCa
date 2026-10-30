import { test, expect } from "@playwright/test";
for (const width of [393, 1440]) test(`compact notes and safe companion ${width}`, async ({page}) => {
 await page.setViewportSize({width,height:1000});
 await page.addInitScript(() => { localStorage.setItem("ntc.note-groups.v1", '{"pinned":true,"normal":true}'); localStorage.setItem("ntc.mascot.v1", "on:chef"); });
 await page.goto('/Home');
 await page.getByRole('main').getByRole('link',{name:'Try guest mode',exact:true}).click();
 await expect(page.locator('.note-card')).toHaveCount(3);
 await expect(page.locator('.note-group-toggle')).toHaveCount(0);
 const gap=await page.evaluate(()=>document.querySelector('.section-heading')!.getBoundingClientRect().top-document.querySelector('.workspace-toolbar')!.getBoundingClientRect().bottom);
 expect(gap).toBeLessThanOrEqual(22);
 if(width>800) {
 await expect(page.locator('.note-card .note-mascot')).toHaveCount(1);
 const safe=await page.locator('.note-card .note-mascot').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('[data-notes-zoom]')!.getBoundingClientRect().top);
 expect(safe).toBeTruthy();
 }
});
