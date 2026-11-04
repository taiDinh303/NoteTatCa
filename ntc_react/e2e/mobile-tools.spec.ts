import { test, expect } from "@playwright/test";
for (const width of [393, 768]) test(`mobile note and tool sheets ${width}`, async ({page,request}) => {
 await request.post('http://127.0.0.1:5199/__fixture/reset');
 if(width===393){
  const login=await request.post('http://127.0.0.1:5199/api/v1/auth/login',{data:{email:'a@example.test',password:'Synthetic-password-123!'}});
  const session=(await login.json()).data;
  for(let i=0;i<40;i++) expect((await request.post('http://127.0.0.1:5199/api/v1/tags',{headers:{Authorization:'Bearer '+session.token},data:{name:'Mobile label '+String(i).padStart(2,'0'),color:'#336699'}})).ok()).toBeTruthy();
 }
 await page.setViewportSize({width,height:852});
 await page.goto('/login');
 await page.getByLabel('Email address',{exact:true}).fill('a@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Synthetic-password-123!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Open Project notes',exact:true}).click();
 const view=page.getByRole('dialog',{name:'View note',exact:true});
 await expect(view).toBeVisible();
 expect(await view.boundingBox()).toMatchObject({x:0,y:0,width,height:852});
 await view.getByRole('button',{name:'Edit',exact:true}).click();
 const edit=page.getByRole('dialog',{name:'Edit note',exact:true});
 await expect(edit).toBeVisible();
 expect(await edit.boundingBox()).toMatchObject({x:0,y:0,width,height:852});
 for(const name of ['Note background color','Note labels','Note reminders']) {
  await edit.getByRole('button',{name,exact:true}).click();
  const sheet=page.locator('.note-tool-sheet');
  await expect(sheet).toBeVisible();
  const r=(await sheet.boundingBox())!;
  expect(r.x).toBe(0); expect(r.width).toBe(width); expect(Math.abs(r.y+r.height-852)).toBeLessThan(1);
  expect(r.height).toBeLessThanOrEqual(852*.85+1);
  expect(await sheet.locator('.modal-body').evaluate(e=>getComputedStyle(e).overflowY)).toBe('auto');
  if(name==='Note reminders'){
   await sheet.getByRole('button',{name:'Add reminder',exact:true}).click();
   await expect(page.locator('.note-tool-sheet')).toHaveCount(1);
   await sheet.getByRole('button',{name:'Cancel',exact:true}).click();
   await expect(sheet.getByRole('button',{name:'Add reminder',exact:true})).toBeVisible();
  }
  if(name==='Note labels' && width===393){
   const body=sheet.locator('.modal-body');
   await body.evaluate(e=>{e.scrollTop=e.scrollHeight;});
   expect(await body.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
   await expect(sheet.getByRole('button',{name:'Mobile label 39',exact:true})).toBeInViewport();
   await page.screenshot({path:'test-results/mobile-labels-bottom.png'});
  }
  await sheet.getByRole('button',{name:'Close dialog',exact:true}).click();
  await expect(sheet).toHaveCount(0);
 }
 await page.setViewportSize({width,height:560});
 await expect.poll(async()=>Math.round((await edit.boundingBox())!.height)).toBe(560);
 await expect(edit.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
 await page.setViewportSize({width,height:852});
 await page.screenshot({path:`test-results/mobile-tools-${width}.png`});
});
