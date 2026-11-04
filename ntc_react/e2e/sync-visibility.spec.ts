import { test, expect } from "@playwright/test";

test('sync controls appear only offline and disappear after automatic reconnection', async ({page,context,request}) => {
 await request.post('http://127.0.0.1:5199/__fixture/reset');
 await page.goto('/login');
 await page.getByLabel('Email address',{exact:true}).fill('a@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Synthetic-password-123!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open Project notes',exact:true})).toBeVisible();
 const account=page.getByRole('button',{name:'Account menu',exact:true});
 await account.click();
 await expect(page.getByRole('menuitem',{name:'Review sync',exact:true})).toHaveCount(0);
 await expect(page.getByRole('menuitem',{name:'Sync now',exact:true})).toHaveCount(0);
 await page.keyboard.press('Escape');
 await context.setOffline(true);
 await account.click();
 await page.getByRole('menuitem',{name:'Review sync',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Note synchronization',exact:true});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText('Offline notes on this device',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Sync now',exact:true})).toHaveCount(0);
 await context.setOffline(false);
 await expect(dialog.getByText('Notes synced',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await account.click();
 await expect(page.getByRole('menuitem',{name:'Review sync',exact:true})).toHaveCount(0);
 await expect(page.getByRole('menuitem',{name:'Sync now',exact:true})).toHaveCount(0);
});
