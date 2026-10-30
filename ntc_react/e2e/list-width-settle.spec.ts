import { test, expect } from '@playwright/test';
for (const reducedMotion of ['reduce','no-preference'] as const) {
 test(`list slides to full width at 50 percent ${reducedMotion}`, async ({page})=>{
 await page.emulateMedia({reducedMotion});
 await page.addInitScript(()=>localStorage.setItem('ntc.view.v1','list'));
 await page.goto('/Home'); await page.getByRole('main').getByRole('link',{name:'Try guest mode',exact:true}).click();
 await expect(page.locator('.note-card')).toHaveCount(3);
 const view=page.locator('[data-notes-zoom]');
 for(const [delta,target] of [[10000,"50"],[-10000,"150"]] as const) {
 await page.evaluate(()=>{const w=window as unknown as {widthSamples:number[];sampling:boolean};w.widthSamples=[];w.sampling=true;function sample(){w.widthSamples.push((document.querySelector(".notes-zoom-layer") as HTMLElement).offsetWidth);if(w.sampling)requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 for(let i=0;i<30;i++) { if(await page.evaluate(()=>localStorage.getItem('ntc.interface.zoom.v1'))===target) break; await view.evaluate((e,delta)=>e.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:delta})),delta); await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('ntc.interface.zoom.v1'))).toBe(target);
 const widths=await page.locator('.notes-zoom-layer').evaluate(e=>new Promise<number[]>(resolve=>{
 const samples:number[]=[];const start=performance.now();function sample(){samples.push((e as HTMLElement).offsetWidth);if(performance.now()-start<650)requestAnimationFrame(sample);else resolve(samples);}requestAnimationFrame(sample);
 }));
 const allWidths=await page.evaluate(()=>{const w=window as unknown as {widthSamples:number[];sampling:boolean};w.sampling=false;return w.widthSamples;}); widths.splice(0,widths.length,...allWidths);
 expect(new Set(widths).size).toBeGreaterThan(3);
 const total=Math.max(...widths)-Math.min(...widths);
 const jump=Math.max(...widths.slice(1).map((w,i)=>Math.abs(w-widths[i])));
 expect(jump).toBeLessThan(total*.65);
 await expect.poll(()=>view.evaluate(e=>{const layer=e.querySelector('.notes-zoom-layer')!;return Math.abs(layer.getBoundingClientRect().width-(e.getBoundingClientRect().width-parseFloat(getComputedStyle(e).paddingRight)));})).toBeLessThan(2);
 await expect(page.locator('.notes-zoom-layer')).toHaveCSS('transition-duration','0.18s');
 }
 });
}
