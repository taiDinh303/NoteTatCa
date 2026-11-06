import { test, expect } from "@playwright/test";
for (const width of [320, 393])
  test(`mobile Back closes note and keeps workspace ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/guest");
    const card = page.locator(".note-card").first();
    await card.click();
    await expect(
      page.getByRole("button", { name: "Close", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Close", exact: true }),
    ).toBeHidden();
    await expect(card).toBeVisible();
    await expect(page).toHaveURL(/\/notes/);
    await card.click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Note title", exact: true })
      .fill("Back retains this draft");
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "Close", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByText("Back retains this draft", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Back retains this draft", { exact: true }),
    ).toBeVisible();
  });

test("mobile Back keeps failed saves and allows retry", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.setViewportSize({ width: 393, height: 800 });
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator(".note-card").first().click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.route('**/api/v1/notes/*',async r=>{if(r.request().method()==='PATCH')await r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic save failure'})});else await r.continue();});
  await page.evaluate(()=>{
    sessionStorage.setItem('synthetic-quota-error','true');
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){
      if(this.transaction.db.name==='ntc.offline.v1'&&sessionStorage.getItem('synthetic-quota-error'))throw new DOMException('Synthetic quota exceeded','QuotaExceededError');
      return original.apply(this,args);
    };
  });
  await page
    .getByRole("textbox", { name: "Note title", exact: true })
    .fill("Keep on Back failure");
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Keep your changes?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Note title", exact: true }),
  ).toHaveValue("Keep on Back failure");
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Keep your changes?", exact: true }),
  ).toBeVisible();
  await page.evaluate(()=>sessionStorage.removeItem('synthetic-quota-error'));
  await page.unroute('**/api/v1/notes/*');
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByText("Keep on Back failure", { exact: true }),
  ).toBeVisible();
});

test('Back closes a new note without leaving the workspace',async({page})=>{await page.setViewportSize({width:393,height:800});await page.goto('/guest');await page.getByRole('button',{name:'Take a note',exact:true}).click();await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible();await page.goBack();await expect(page.getByRole('button',{name:'Close',exact:true})).toBeHidden();await expect(page).toHaveURL(/\/notes/);});
