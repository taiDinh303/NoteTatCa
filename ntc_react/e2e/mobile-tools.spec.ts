import { test, expect } from "@playwright/test";
for (const width of [393, 768, 1440]) test(`mobile note and tool sheets ${width}`, async ({page,request}) => {
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
 if(width<800) expect(await view.boundingBox()).toMatchObject({x:0,y:0,width,height:852});
 await view.getByRole('button',{name:'Edit',exact:true}).click();
 const edit=page.getByRole('dialog',{name:'Edit note',exact:true});
 await expect(edit).toBeVisible();
 if(width<800) expect(await edit.boundingBox()).toMatchObject({x:0,y:0,width,height:852});
 for(const name of ['Note background color','Note labels','Note reminders']) {
  await edit.getByRole('button',{name,exact:true}).click();
  const sheet=page.locator('.note-tool-popover');
  await expect(sheet).toBeVisible();
  const r=(await sheet.boundingBox())!;
  const bar=(await edit.locator('.editor-footer').boundingBox())!;
  expect(r.y+r.height).toBeLessThanOrEqual(bar.y);
  expect(r.width).toBeLessThanOrEqual(380);
  await expect(sheet.getByRole('button',{name:'Close dialog',exact:true})).toHaveCount(0);
  expect(r.height).toBeLessThanOrEqual(852*.85+1);
  expect(await sheet.locator('.note-tool-body').evaluate(e=>getComputedStyle(e).overflowY)).toBe('auto');
  if(name==='Note reminders'){
   await sheet.getByRole('button',{name:'Add reminder',exact:true}).click();
   await expect(page.locator('.note-tool-popover')).toHaveCount(1);
   await sheet.getByRole('button',{name:'Cancel',exact:true}).click();
   await expect(sheet.getByRole('button',{name:'Add reminder',exact:true})).toBeVisible();
   if(width===393){
    await sheet.getByRole('button',{name:'Add reminder',exact:true}).click();
    await sheet.getByRole('button',{name:'Set reminder',exact:true}).click();
    await expect(sheet.getByText(/Does not repeat · Active/)).toBeVisible();
    await sheet.getByRole('button',{name:'Delete reminder',exact:true}).click();
    let confirm=page.getByRole('dialog',{name:'Delete reminder?',exact:true});
    await confirm.getByRole('button',{name:'Cancel',exact:true}).click();
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button',{name:'Delete reminder',exact:true}).click();
    confirm=page.getByRole('dialog',{name:'Delete reminder?',exact:true});
    await confirm.getByRole('button',{name:'Delete reminder',exact:true}).click();
    await expect(confirm).toHaveCount(0);
    await expect(sheet).toBeVisible();
   }
  }
  if(name==='Note labels' && width===393){
   const body=sheet.locator('.note-tool-body');
   await body.evaluate(e=>{e.scrollTop=e.scrollHeight;});
   expect(await body.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
   await expect(sheet.getByRole('button',{name:'Mobile label 39',exact:true})).toBeInViewport();
   await page.screenshot({path:'test-results/mobile-labels-bottom.png'});
  }
  await edit.getByRole('button',{name,exact:true}).click();
  await expect(sheet).toHaveCount(0);
 }
 await edit.getByRole('button',{name:'Note labels',exact:true}).click();
 await edit.getByRole('button',{name:'Note background color',exact:true}).click();
 await expect(page.locator('.note-tool-popover')).toHaveCount(1);
 await expect(page.locator('.note-tool-popover')).toHaveAttribute('aria-label','Note colors');
 await edit.locator('.editor-heading').click({position:{x:100,y:20}});
 await expect(page.locator('.note-tool-popover')).toHaveCount(0);
 await expect(edit).toBeVisible();
 await page.setViewportSize({width,height:560});
 if(width<800) await expect.poll(async()=>Math.round((await edit.boundingBox())!.height)).toBe(560);
 await expect(edit.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
 await page.setViewportSize({width,height:852});
 await page.screenshot({path:`test-results/mobile-tools-${width}.png`});
});
