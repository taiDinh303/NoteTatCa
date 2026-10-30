import { test, expect } from '@playwright/test';
test('list width settles smoothly after zoom', async ({page})=>{
 await page.addInitScript(()=>localStorage.setItem('ntc.view.v1','list'));
 await page.goto('/Home'); await page.getByRole('main').getByRole('link',{name:'Try guest mode',exact:true}).click();
 await expect(page.locator('.note-card')).toHaveCount(3);
 const view=page.locator('[data-notes-zoom]');
 await view.evaluate(e=>e.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-10000})));
 const widths=await page.locator('.notes-zoom-layer').evaluate(e=>new Promise<number[]>(resolve=>{
 const samples:number[]=[];const start=performance.now();function sample(){samples.push((e as HTMLElement).offsetWidth);if(performance.now()-start<600)requestAnimationFrame(sample);else resolve(samples);}requestAnimationFrame(sample);
 }));
 expect(new Set(widths).size).toBeGreaterThan(3);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('ntc.interface.zoom.v1'))).toBe('110');
 await expect.poll(()=>view.evaluate(e=>{const layer=e.querySelector('.notes-zoom-layer')!;return Math.abs(layer.getBoundingClientRect().width-(e.getBoundingClientRect().width-parseFloat(getComputedStyle(e).paddingRight)));})).toBeLessThan(2);
 await expect(page.locator('.notes-zoom-layer')).toHaveCSS('transition-duration','0.18s');
});
