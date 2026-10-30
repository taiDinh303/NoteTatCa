import {test,expect} from '@playwright/test';
for(const width of [393,1440,1920])test(`workspace toolbar baseline ${width}`,async({page,request})=>{
 await request.post('http://127.0.0.1:5199/__fixture/reset');await page.setViewportSize({width,height:900});
 await page.goto('/login');await page.getByLabel('Email address',{exact:true}).fill('a@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-password-123!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('.note-card').first()).toBeVisible();
 const values:number[]=[];
 for(const route of ['/notes','/notifications','/trash']){
 await page.goto(route);const toolbar=page.locator(route==='/notifications'?'.inbox-header':'.workspace-toolbar');await expect(toolbar).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const result=await page.evaluate((route)=>{
 const t=document.querySelector(route==='/notifications'?'.inbox-header':'.workspace-toolbar')!;
 const r=t.getBoundingClientRect();return{y:r.top,headerRight:document.querySelector('.topbar')!.getBoundingClientRect().right,root:document.documentElement.clientWidth};
 },route);console.log(width,route,result);values.push(result.y);expect(Math.abs(result.headerRight-width)).toBeLessThan(1);expect(result.root).toBe(width);
 }
 expect(Math.max(...values)-Math.min(...values)).toBeLessThanOrEqual(1);
 await page.goto('/reminders');await expect(page.getByRole('link',{name:'Go to notes',exact:true})).toHaveCount(0);await expect(page.locator('.workspace-toolbar')).toHaveCount(0);await expect(page.locator('.feature-banner')).toBeVisible();
 await page.route('**/api/v1/notifications?*',r=>r.fulfill({json:{data:{items:Array.from({length:30},(_,i)=>({id:String(i),noteId:'synthetic',occurrenceAt:'2026-10-30T10:00:00Z',readAt:null})),totalItems:30,hasNextPage:false}}}));
 await page.goto('/notifications');await expect(page.locator('.inbox-row')).toHaveCount(30);
 await page.locator('.inbox-scroll').evaluate(e=>{e.scrollTop=300});await expect.poll(()=>page.locator('.inbox-scroll').evaluate(e=>e.scrollTop)).toBe(300);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
});
