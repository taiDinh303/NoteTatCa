import {test,expect} from '@playwright/test';
for(const width of [393,1440])test(`notification opens note in place ${width}`,async({page,request})=>{
 await request.post('http://127.0.0.1:5199/__fixture/reset');await page.setViewportSize({width,height:900});
 await page.goto('/login');await page.getByLabel('Email address',{exact:true}).fill('a@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-password-123!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('.note-card').first()).toBeVisible();
 const note=page.locator('.note-card').first();const id=(await note.getAttribute('data-testid'))!.slice(5);const title=await note.locator('h3').innerText();let reads=0;
 const read=new Set<string>();
 await page.route('**/api/v1/notifications?*',r=>r.fulfill({json:{data:{items:Array.from({length:20},(_,i)=>({id:`notification-${i}`,noteId:id,reminderId:'synthetic-reminder',occurrenceAt:'2026-10-30T10:00:00Z',readAt:read.has(`notification-${i}`)?'2026-10-30T10:10:00Z':null})),totalItems:20,hasNextPage:false}}}));
 await page.route('**/api/v1/notifications/*/read',r=>{reads++;read.add(r.request().url().split('/').at(-2)!);return r.fulfill({json:{data:true}})});
 await page.goto('/notifications');await expect(page.locator('.inbox-row')).toHaveCount(20);
 const scroll=page.locator('.inbox-scroll');await scroll.evaluate(e=>{e.scrollTop=300});
 await page.locator('.inbox-item-open').nth(6).click();
 const viewer=page.getByRole('dialog',{name:'View note',exact:true});await expect(viewer).toBeVisible();await expect(viewer.locator('.note-heading-title')).toHaveText(title);await expect(page).toHaveURL(/\/notifications$/);await expect.poll(()=>reads).toBe(1);
 await viewer.getByRole('button',{name:'Edit',exact:true}).click();const editor=page.getByRole('dialog',{name:'Edit note',exact:true});await expect(editor).toBeVisible();await editor.getByRole('button',{name:'View',exact:true}).click();await expect(viewer).toBeVisible();await viewer.getByRole('button',{name:'Close',exact:true}).click();await expect(viewer).toHaveCount(0);await expect(page).toHaveURL(/\/notifications$/);expect(await scroll.evaluate(e=>e.scrollTop)).toBe(300);
});
