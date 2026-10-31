import { test, expect } from "@playwright/test";

const scenarios = [
  {
    code: "vi",
    name: "Tiếng Việt",
    language: "Ngôn ngữ",
    settings: "Cài đặt",
    privacy: "Quyền riêng tư",
    appearance: "Giao diện",
    notes: "Tất cả ghi chú",
    search: "Tìm trong ghi chú",
    privacyTitle: "Ghi chú của bạn",
    account: "Tài khoản & bảo mật",
    sessions: "Phiên đăng nhập",
    dark: "Chế độ tối",
    menu: "Menu tài khoản",
    accountMenu: "Cài đặt tài khoản",
    profile: "Hồ sơ",
    edit: "Sửa",
    content: "Nội dung ghi chú",
    open: "Mở Project notes",
    overview: "Tổng quan hệ thống",
    signIn: "Đăng nhập",
    email: "Địa chỉ email",
    password: "Mật khẩu",
  },
  {
    code: "zh",
    name: "中文",
    language: "语言",
    settings: "设置",
    privacy: "隐私",
    appearance: "外观",
    notes: "所有笔记",
    search: "搜索笔记",
    privacyTitle: "你的笔记",
    account: "账户与安全",
    sessions: "登录会话",
    dark: "深色模式",
    menu: "账户菜单",
    accountMenu: "账户设置",
    profile: "个人资料",
    edit: "编辑",
    content: "笔记内容",
    open: "打开 Project notes",
    overview: "系统概览",
    signIn: "登录",
    email: "电子邮箱地址",
    password: "密码",
  },
  {
    code: "ja",
    name: "日本語",
    language: "言語",
    settings: "設定",
    privacy: "プライバシー",
    appearance: "外観",
    notes: "すべてのノート",
    search: "ノートを検索",
    privacyTitle: "あなたのノート",
    account: "アカウントとセキュリティ",
    sessions: "ログイン中のセッション",
    dark: "ダークモード",
    menu: "アカウントメニュー",
    accountMenu: "アカウント設定",
    profile: "プロフィール",
    edit: "編集",
    content: "ノートの内容",
    open: "Project notes を開く",
    overview: "システム概要",
    signIn: "ログイン",
    email: "メールアドレス",
    password: "パスワード",
  },
] as const;

for (const width of [393, 1440]) {
  for (const language of scenarios) {
    test(`app language ${language.code} ${width}`, async ({
      page,
      request,
    }) => {
      await request.post("http://127.0.0.1:5199/__fixture/reset");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await page
        .getByLabel("Email address", { exact: true })
        .fill("a@example.test");
      await page
        .getByLabel("Password", { exact: true })
        .fill("Synthetic-password-123!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/notes$/);
      await page.goto("/settings/language");
      await page
        .getByRole("radio", { name: language.name, exact: true })
        .check();
      await expect(page.locator("html")).toHaveAttribute("lang", language.code);
      await expect(
        page.getByRole("heading", { name: language.language, exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("radio", { name: language.name, exact: true }),
      ).toBeChecked();
      if (width < 800) await page.locator(".preferences-mobile-header a").click();
      await page
        .getByRole("link", { name: language.privacy, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: language.privacyTitle, exact: true }),
      ).toBeVisible();
      if (width <= 800)
        await expect(page.locator(".preferences-back")).toBeHidden();
      await expect(
        page
          .locator(".privacy-actions")
          .getByRole("link", { name: language.account, exact: true }),
      ).toHaveAttribute("href", "/settings/account");
      await expect(
        page
          .locator(".privacy-actions")
          .getByRole("link", { name: language.sessions, exact: true }),
      ).toHaveAttribute("href", "/settings/sessions");
      await expect(
        page.locator(".privacy-sections").getByRole("switch"),
      ).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(await page.evaluate(() => document.body.clientWidth));
      await page.screenshot({
        path: `test-results/privacy-${language.code}-${width}.png`,
        fullPage: true,
      });
      if (width < 800) await page.locator(".preferences-mobile-header a").click();
      await page
        .getByRole("link", { name: language.appearance, exact: true })
        .click();
      await expect(
        page.getByRole("switch", { name: language.dark, exact: true }),
      ).toBeVisible();
      if (width <= 800) {
        await expect(page.getByRole("search")).toBeHidden();
        await expect(
          page.getByRole("button", { name: "Open navigation", exact: true }),
        ).toHaveCount(0);
        await page.locator(".preferences-mobile-header a").click();
        await page.locator(".preferences-mobile-header a").click();
      } else {
        await expect(page.getByRole("search")).toBeVisible();
        await page
          .locator("#workspace-navigation")
          .getByRole("link", { name: language.notes, exact: true })
          .click();
      }
      await expect(page).toHaveURL(/\/notes$/);
      await expect(
        page.getByRole("textbox", { name: language.search, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: language.open, exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: language.menu, exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: language.accountMenu, exact: true })
        .click();
      await expect(
        width < 800 ? page.getByRole("heading", { name: language.profile, exact: true }) : page.getByRole("link", { name: language.profile, exact: true }),
      ).toBeVisible();
      await page.goto("/notes");
      await page
        .getByRole("button", { name: language.open, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Project notes", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: language.edit, exact: true })
        .click();
      await expect(
        page.getByRole("textbox", { name: language.content, exact: true }),
      ).toBeVisible();
      await expect(page.locator(".editor-toolbar")).toBeVisible();
    });
  }
}

for (const language of scenarios) {
  test(`administration language ${language.code}`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:5199/__fixture/reset");
    if (language.code === "ja")
      await page.setViewportSize({ width: 393, height: 900 });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("admin@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Synthetic-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await page.goto("/settings/language");
    await expect(page).toHaveURL(/\/admin\/preferences\/language$/);
    await page.getByRole("radio", { name: language.name, exact: true }).check();
    await expect(
      page.getByRole("heading", { name: language.language, exact: true }),
    ).toBeVisible();
    await page.goto("/admin/preferences/privacy");
    await expect(
      page
        .locator(".privacy-actions")
        .getByRole("link", { name: language.sessions, exact: true }),
    ).toHaveAttribute("href", "/admin/settings/sessions");
    await expect(
      page.locator(".privacy-sections a[href='/trash']"),
    ).toHaveCount(0);
    await page.goto("/admin/overview");
    await expect(
      page.getByRole("heading", { name: language.overview, exact: true }),
    ).toBeVisible();
    await page.goto("/logout");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByLabel(language.email, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: language.signIn, exact: true }),
    ).toBeVisible();
  });
}

test("language change preserves the open editor draft", async ({
  page,
  context,
  request,
}) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Project notes", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.route("**/api/v1/notes/*", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic save failure" }),
        })
      : route.continue(),
  );
  const content = page.getByRole("textbox", {
    name: "Note content",
    exact: true,
  });
  await content.fill("Settings Privacy 中文 日本語 — unsaved draft");
  await content.evaluate((element) =>
    element.setAttribute("data-editor-instance", "original"),
  );
  await expect(page.getByText("Saved on this device; waiting to sync", { exact: true })).toBeVisible();
  const otherTab = await context.newPage();
  await otherTab.goto("/settings/language");
  await otherTab
    .getByRole("radio", { name: "Tiếng Việt", exact: true })
    .check();
  const translatedContent = page.getByRole("textbox", {
    name: "Nội dung ghi chú",
    exact: true,
  });
  await expect(translatedContent).toContainText(
    "Settings Privacy 中文 日本語 — unsaved draft",
  );
  await expect(translatedContent).toHaveAttribute(
    "data-editor-instance",
    "original",
  );
  await expect(
    page.getByRole("button", { name: "Tiếp tục sửa", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("button", { name: "Đậm", exact: true })).toBeVisible();
});

test("language menu can switch repeatedly after reload", async ({ page, request }) => {
  await request.post("http://127.0.0.1:5199/__fixture/reset");
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill("a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.goto("/settings/language");
  await page.getByRole("radio", { name: "Tiếng Việt", exact: true }).check();
  await page.reload();
  for (const language of scenarios) {
    await page.getByRole("radio", { name: language.name, exact: true }).check();
    await expect(page.getByRole("link", { name: language.privacy, exact: true })).toBeVisible();
    await page.getByRole("link", { name: language.language, exact: true }).click();
  }
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(page.getByRole("heading", { name: "Language", exact: true })).toBeVisible();
});
