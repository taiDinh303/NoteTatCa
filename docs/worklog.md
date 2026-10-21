# WORKLOG — NoteTatCa

> 2026-10-21 Asia/Bangkok | CURRENT React và backend local; khảo sát cũ được giữ ở cuối file.

## Xóa footer “Keep what matters.” và “Privacy & data” — 2026-10-21 (đã mở rộng phạm vi)

- Theo yêu cầu mới nhất (2026-10-21): xóa 2 dòng chữ “Keep what matters.” và link “Privacy & data” ở trang /notes (và các trang workspace dùng chung AppShell). Thay đổi 1 file: ntc_react/src/app/AppShell.tsx (gỡ `<footer class="workspace-footer">`); import Link vẫn dùng cho sidebar brand. Không đụng AdminShell (/admin), AuthPage, PublicPages; không đổi CSS, auth, cache, API, schema hay dữ liệu. Chưa tự deploy; hosting/CI tự triển khai khi push.
- Validation: `npm run typecheck` PASS (tsc -b, 0 error), `npm run lint` PASS (eslint ., 0 issue) chạy từ ntc_react/. Chưa chạy HTTP/Chromium suite vì thay đổi thuần view.

## Công bố gesture zoom50–150% và sidebar gọn lên main — 2026-10-21

- Theo yêu cầu “push lên giúp tôi”, phạm vi11file React/docs/test: Ctrl/Cmd+wheel và pinch hai ngón50–150%, HUD phần trăm giữa dưới tự ẩn, bỏ nút/bảng zoom và sidebar tip, cập nhật hồi quy/tài liệu. Không commit hai appsettings API local, credentials hoặc artifacts.
- Fetch trước publication: main/HEAD và origin/main cùnge76767b, divergence0/0. Dùng evidence đã hoàn tất ở entry dưới: focused4/4 và focused3/3 (pinch lặp một ca),29Vitest+4configuration, lint/typecheck/Production build và .NET Release0warning/0error PASS. Không chạy lại suites cho lượt chỉ publication; docs48Markdown/178local links/0errors và staged diff được kiểm.
- Giữ cấu hình local theo hash baseline; chỉ commit/push source lên main rồi đối chiếu HEAD với refs/heads/main trên remote. Không manual deploy/migration hoặc thay dashboard/cloud data; hosting/CI có thể tự triển khai từ push. Chưa xác minh production rollout trong lượt này.

## Zoom bằng Ctrl+wheel/pinch50–150%, HUD tạm và bỏ sidebar tip — 2026-10-21

- Theo yêu cầu mới nhất, DEC-021 đổi giới hạn thành50–150%; bỏ toàn bộ nút/menu/dialog/slider/ô nhập zoom. Ctrl (hoặc Cmd)+wheel và trackpad ctrl-wheel đổi app zoom; hai ngón tính tỷ lệ khoảng cách để pinch. HUD phần trăm portal ở body, giữa cạnh dưới, inverse zoom giữ kích thước đọc được, z-index trên editor và pointer-events:none; tự ẩn sau1.2giây. Giữ preference cùng key; mức cũ25–49 được nâng lên50. Theo ảnh bổ sung, bỏ khối Big ideas often start with a little note và CSS/sidebar-tip liên quan.
- Listener capture passive:false chỉ preventDefault gesture zoom để không nhân đôi native browser pinch, không chặn wheel thường hoặc một ngón. Chuẩn hóa wheel deltaMode; RAF gộp update theo frame, ref giữ delta lẻ, cleanup đầy đủ listener/RAF/timer ở StrictMode. Có fallback gesture events Safari nhưng runtime Safari chưa kiểm. Chặn chuyển tiếp pointermove touch khi pinch để tránh kích hoạt drag sensor cùng lúc. Không remount editor/workspace, không đổi auth/cache/API/schema hoặc nội dung note; browser keyboard zoom vẫn riêng.
- Focused Chromium **4/4 PASS (1.9phút gồm startup)**: viewport/SPA/note và sidebar copy removal; Ctrl-wheel bounds/pulse/HUD center-bottom/auto-hide, deltaMode lines, DPR không đổi, preference cũ42→50 và reload; mobile hai ngón có isMobile/hasTouch/CDP touch events, visualViewport.scale vẫn1, cuộn một ngón và editor giữ nội dung; admin không personal requests. Đã xem ảnh zoom-pinch-indicator.png:150% giữa dưới, editor/Close còn dùng được.
- Để kiểm tương tác drag sensor, bổ sung pinch bắt đầu từ drag handle rồi thêm ngón thứ hai, xác nhận không POST reorder hoặc mở editor ngoài ý muốn. Rerun pinch cùng pointer/keyboard reorder và network autosave retry: **3/3 PASS (47.3giây gồm startup)**. Một ca pinch lặp lại, không cộng thành7ca khác nhau. Source runtime không đổi sau lượt focused4; chỉ thêm assertion hồi quy. Chưa full26browser/backend rerun; các mốc full suite ở entries trước là lịch sử.
- **29 Vitest + 4 configuration PASS**, ESLint max-warnings0/TypeScript/Production Vite build PASS; solution .NET Release strict **0warning/0error**. Chỉ fixture SQLite/captured email, không owner DB/SMTP/cloud thật; chưa Safari/Firefox hoặc điện thoại vật lý. Cập nhật plan/UI/frontend/user-guide/testing/worklog; docs48Markdown/178local links/0errors, git diff --check PASS (thông báo LF/CRLF). Hai appsettings API local giữ đúng hash baseline. Chưa commit/push/deploy.

## Công bố thanh kéo và nhập zoom25–150% lên main — 2026-10-21

- Theo yêu cầu “push luôn”, phạm vi9file React/docs/test: thay preset bằng slider25–150% và ô nhập phần trăm, reset/persistence, dialog/trigger dễ đọc ở25%, các regression chuột/keyboard/touch và tài liệu tương ứng. Không commit hai appsettings API local, credentials hoặc artifacts.
- Fetch trước publication: main/HEAD và origin/main cùng5bc3e52, divergence0/0. Dùng evidence đã hoàn tất ở entry dưới: focused3/3 và mobile touch1/1,29Vitest+4configuration, lint/typecheck/Production build và .NET Release0warning/0error PASS. Docs48Markdown/178local links/0errors; lượt này chỉ publication, không sửa runtime/chạy lại suites.
- Kiểm staged diff và hash cấu hình local trước commit; push source lên main rồi đối chiếu HEAD với refs/heads/main trên remote. Không manual deploy/migration hoặc thay dashboard/dữ liệu cloud; hosting/CI có thể tự triển khai từ push. Chưa xác minh production rollout trong lượt này.

## Thanh kéo và nhập phần trăm thu phóng25–150% — 2026-10-21

- Theo yêu cầu bổ sung, cập nhật DEC-021: thay preset menu bằng dialog có native range25–150%, bước1%, đổi ngay khi kéo/nhấn phím; thêm ô number giữ bản đang nhập đến Enter/blur. Số vượt biên được clamp, số thập phân được làm tròn; rỗng/không hữu hạn giữ mức đang dùng. Reset to 100% đồng bộ slider/input. Preference vẫn cùng localStorage key, chấp nhận mọi số nguyên25–150 thay whitelist preset; giữ tương thích các mức cũ và nhớ sau reload.
- Dialog chỉnh zoom dùng inverse scale để vẫn đọc/bấm được ở25%; trigger giữ chữ/kích thước chạm và topbar có min-height vật lý để nút không bị cắt khi thu nhỏ. Reuse Modal/Button, không thêm dependency hoặc đặt input tương tác trong dropdown menu. Giữ auth/cache/draft/API/database/config, không replay request/reload khi chỉnh zoom. Rà React Best Practices/Verification: state input riêng, context không remount workspace/editor, native slider/number có label, dialog focus/Escape/Done và không ghi dữ liệu tài khoản vào preference.
- Focused Chromium **3/3 PASS (1.6phút gồm startup)**: numeric Enter/blur, kéo chuột thực từ25đến150, Home/ArrowRight, clamp999→150 và1→25, ô trống, reset, resize320/390/768/1024, admin isolation và cùng các layout/note checks hiện có. Thêm một ca mobile có isMobile/hasTouch và CDP touchStart/touchMove/touchEnd: **1/1 PASS (25.6giây gồm startup)**; vuốt đến150 và nhập42 rồi Done/blur, reload vẫn42, slider/input đồng bộ. Không cộng rerun; tổng4ca khác nhau cho thay đổi này. Đã xem ảnh zoom-slider-mobile.png ở25% và zoom-slider-touch.png ở42%: bảng chỉnh vẫn đủ đọc, trong viewport390×844.
- **29 Vitest + 4 configuration PASS**, ESLint max-warnings0/TypeScript/Production Vite build PASS; solution .NET Release strict **0warning/0error**. Không chạy lại full26browser/backend suite vì phạm vi đổi control/preference/CSS tối thiểu; full24ca và focused footer ở entry trước vẫn là mốc trước thay đổi control. Fixture SQLite/captured email riêng, không owner DB/mail/cloud thật. Chưa kiểm Safari/Firefox hoặc điện thoại vật lý; touch ở đây là Chromium giả lập.
- Cập nhật plan/UI/frontend/user-guide/testing/worklog; docs48Markdown/178local links/0errors, git diff --check PASS (thông báo LF/CRLF). Hai appsettings API local đúng hash baseline; không tạo lại Razor, không commit/push/deploy trong lượt này.

## Công bố loading, thu phóng và gỡ Razor lên main — 2026-10-21

- Theo yêu cầu “push luôn”, gom các thay đổi đã hoàn tất đang chờ: tiến trình/task loading và vòng xoay; sidebar gọn/scrollbar/Interface zoom75–150% cho customer/admin và responsive; gỡ166file Razor, project NTC.Razor/solution folder RAZOR; cập nhật docs/AGENTS/README/Docker ignore và regression tests. Không commit hai appsettings API local sửa sẵn, credentials, bản khôi phục Razor hoặc artifacts.
- Fetch trước publication: main/HEAD và origin/main cùng daa23f9, divergence0/0. Dùng bằng chứng đã hoàn tất ngay trước đó: full24/24 browser trước CSS footer, focused3/3 sau CSS cuối;29Vitest+4configuration, lint/typecheck/Production build và backend Release0warning/0error đều PASS. Backend114PASS/1SKIP ở tác vụ gỡ Razor; không chạy lại suite cho lượt chỉ publication. Docs48Markdown/178local links/0errors; kiểm staged diff và giữ cấu hình local theo hash baseline trước commit.
- Chỉ commit/push source lên main, nghiệm thu bằng đối chiếu HEAD với refs/heads/main trên remote sau push. Không manual deploy/migration hoặc thay dashboard/cloud data; hosting/CI có thể tự triển khai từ push. Production rollout chưa được xác minh trong lượt này.

## Sidebar gọn, thanh cuộn và thu phóng giao diện — 2026-10-21

- Theo yêu cầu/ảnh của chủ dự án, DEC-021: bỏ badge ⌘ K khỏi search và thẻ Personal workspace/Just for you của sidebar khách; giữ Ctrl/Cmd+K focus tìm kiếm. Scrollbar mảnh, thumb bo tròn và màu theo light/dark, track trong suốt, sidebar giữ gutter ổn định. Không đổi nội dung auth/landing không thuộc yêu cầu.
- DisplayPreferences tại root và InterfaceZoom dùng chung customer/admin:75/90/100/110/125/150%,100% · Default để reset. Lưu preference localStorage riêng trình duyệt; fallback100% khi giá trị không hợp lệ hoặc storage bị chặn. Không reload/refetch khi đổi scale, không sửa nội dung/định dạng note hoặc chặn pinch/browser zoom. Named viewport container dùng chiều rộng khả dụng sau scale; viewport units bù scale để editor/drawer vẫn vừa màn hình. Menu có radio/checked/focus theo Radix; vùng chọn zoom giữ kích thước chạm tối thiểu khi thu nhỏ. Không dependency/API/backend/schema mới.
- Kiểm ban đầu phát hiện menu percentage có thể ra ngoài viewport ở150% khi resize. Đã giữ wrapper định vị popup ở tọa độ screen pixels và scale riêng nội dung, áp dụng chung menu hiện có. Một assertion drawer ban đầu đo giữa animation đã chuyển sang đợi bounds ổn định. Focused2/2 PASS sau sửa; sau đó full **24/24 Playwright Chromium PASS (3.3phút gồm startup)**, gồm notes/autosave/conflict/Markdown/drag/reminder/inbox/auth/settings/admin, preload/outage và zoom mới. Ca zoom kiểm đủ presets, nhớ sau reload, SPA không reload, màu scrollbar, viewport320/390/768/1024 và admin không query nội dung cá nhân.
- Rà ảnh sau full suite phát hiện dải màu/thao tác editor ở150% trên mobile hơi tràn ngang. Đã cho palette/editor-tools xuống hàng theo không gian; thêm assertion mọi nút footer ở320/390px nằm trong viewport, Close vẫn trong chiều cao844px và nội dung giữ nguyên. Sau thay đổi cuối, focused **3/3 PASS (55.9giây gồm startup)**: zoom/layout, fullscreen editor và autosave network retry. Không cộng ca rerun thành27ca khác nhau; full24 là mốc ngay trước bổ sung CSS footer, focused3 là kiểm sau cùng.
- **29 Vitest + 4 configuration PASS**, ESLint max-warnings0/TypeScript/Production Vite build PASS; lint/build chạy lại sau CSS footer cuối. Backend solution Release strict **0warning/0error**; không chạy lại backend test suite vì không sửa runtime backend, mốc114PASS/1SKIP từ tác vụ gỡ Razor ngay trước còn nguyên. Kiểm theo React Best Practices và Verification: hooks/context ổn định, không remount editor/cache, semantic menu và API/SQLite fixture ownership riêng. Đã xem ảnh desktop dark125% và mobile editor150% (artifacts/frontend/zoom-*.png); không dùng DB/mail/cloud thật. Chưa kiểm Safari/Firefox hoặc thiết bị điện thoại vật lý; CSS zoom/container queries cần trình duyệt hiện đại.
- Cập nhật plan/UI/frontend/user-guide/testing và worklog; docs48Markdown/178local links/0errors, git diff --check PASS (thông báo LF/CRLF). Giữ cấu hình API đúng hash baseline, toàn bộ thay đổi tải/preparation và gỡ Razor đang chờ từ các lượt trước. Chưa commit/push/deploy hoặc đổi dashboard.

## Gỡ frontend Razor NTC.VIEW — 2026-10-21

- Theo yêu cầu trực tiếp của chủ dự án, DEC-020 thay DEC-003 giữ tạm: gỡ toàn bộ ntc_aspnet/NTC.VIEW, project NTC.Razor và solution folder RAZOR khỏi NTC.sln. Gỡ exclusion Docker thừa; cập nhật README/AGENTS và tài liệu hiện hành để không hướng dẫn giữ/chạy/tạo lại Razor. Các mốc worklog/evidence trước đây giữ nguyên tính lịch sử. Không xóa adapter API legacy, migrations hoặc dữ liệu.
- Cấu hình Razor có thay đổi local chưa commit. Đã đưa toàn bộ thư mục ra ngoài repo tại `D:\My Project\NTC-backups\NTC.VIEW-20261021-144625`, đối chiếu SHA256 đủ **1.077 file**; repo không còn thư mục cũ và Git ghi nhận **166 file tracked bị xóa**. Hai cấu hình API giữ nguyên byte; hai cấu hình Razor trong bản khôi phục đúng hash baseline. Giữ toàn bộ thay đổi React/loading/docs đang làm trước tác vụ này.
- Kiểm thực tế từ root: `dotnet build ntc_aspnet/NTC.sln -c Release -warnaserror` PASS, **0 warning / 0 error**; `dotnet test ntc_aspnet/NTC.Tests/NTC.Tests.csproj -c Release --no-build --logger trx --results-directory artifacts/razor-removal-tests` đạt **114 PASS / 0 FAIL / 1 SKIP** trong 115 tests. PostgreSQL fixture bỏ qua vì không cấu hình NTC_TEST_POSTGRES; không dùng DB của chủ dự án hoặc SMTP thật. Solution còn đủ tám project backend/tests; không có tham chiếu source/build còn hoạt động đến Razor trong backend/scripts/tools/CI.
- Docs **48 Markdown / 178 local links / 0 errors**, git diff --check PASS (Git thông báo LF/CRLF cho các file React có sẵn). Không chạy lại frontend E2E vì không sửa React trong tác vụ gỡ Razor; bằng chứng UI bổ sung ở entry trước vẫn giữ nguyên. Chưa commit/push/deploy hoặc thay dashboard/cloud data.

## Chi tiết tác vụ tải, thanh tiến trình và vòng xoay — 2026-10-20

- Theo ảnh/yêu cầu bổ sung, PreparationSnapshot có tasks theo resource với waiting/loading/ready/error; UI hiện Loading notes/labels/account details/... và dấu tick khi hoàn tất. Trash là task riêng, Admin chỉ me/statistics. Tiến trình dữ liệu hiện completed/total và phần trăm collection thực; không lấy thời gian hoặc byte giả. Khi lỗi/hủy/retry/reset, task không tiếp tục xoay hoặc giữ trạng thái của account cũ.
- Thêm ConnectionProgress indeterminate cho banner/server, session restore và application/module loading; không aria-valuenow giả. ConnectionSpinner animate wrapper 0.9giây/vòng, dùng cho từng task, logo preparation, connecting và reconnecting kể cả problem cũ chưa được xóa. Offline/error không có request thì dùng icon tĩnh. Giữ CSS reduced-motion. Banner public/login đặt ở top16px để phần progress thêm mới không đè heading Welcome back; workspace vẫn dưới topbar.
- Giữ nguyên request count, parallelism, health timeout/backoff, cache/ownership/generation và autosave safeguards; không dependency mới, không sửa backend/API/config hoặc dữ liệu. Rà React checklist: hooks ổn định, subscriptions cleanup, semantic list/progress/nhãn trạng thái, animation wrapper và không in thông tin cá nhân trong task text.
- Kiểm cuối: **29 Vitest + 4 configuration PASS**, TypeScript/Production build và ESLint max-warnings0 PASS (chạy lại sau chỉnh vị trí banner). Focused Chromium **5/5 PASS (1.4phút gồm startup)**: health wake-up, task labels/progress/cache/mobile/reduced-motion, offline restore, failed collection retry và admin isolation. Test kiểm CSS transform đổi theo thời gian để xác nhận thật sự xoay, không chỉ kiểm class. Sau chỉnh top banner, chạy lại ca kết nối **1/1 PASS (1.2phút gồm startup)** có assertion bounds không che heading; không cộng rerun thành ca mới. Không chạy lại full browser/backend suite cho bổ sung metadata/UI này; backend Release gần nhất ở entry preparation trước vẫn là mốc của backend không đổi.
- Đã xem ảnh connecting-server.png/preparing-workspace-mobile.png trong artifacts; toàn bộ dùng SQLite/captured-email/synthetic fixture, không cloud/SMTP/Google/DB của chủ dự án. Cập nhật plan/UI/frontend/user-guide/testing; docs **48 Markdown / 178 local links / 0 errors**, git diff --check PASS (thông báo LF/CRLF). Bốn appsettings local đúng hash baseline; chưa commit/push/deploy.

## Công bố preparation/cache/kết nối lên main — 2026-10-20

- Theo yêu cầu “push lên main luôn”, phạm vi commit gồm 28 file React/docs/test bridge: preload đủ workspace pages, cache/filter/detail, startup và connection UI, auth restore/generation safeguards, Inbox/Reminders background revalidation, health proxy/fixture và regressions/DEC-019. Không commit ba appsettings local đang sửa sẵn, credentials, ảnh hoặc artifacts; bốn cấu hình local đúng hash baseline.
- Fetch trước publication: main/HEAD và origin/main cùng 4114017, divergence0/0. Dùng lại bằng chứng kiểm cuối của entry dưới: **22/22 browser**, **27 Vitest + 4 configuration**, lint/typecheck/Production build và backend Release đều PASS. Docs **48 Markdown / 178 local links / 0 errors**; không chạy lại suite vì lượt này chỉ publication, không sửa runtime.
- Chỉ commit/push source lên main và đối chiếu SHA remote sau push; không manual deploy/migration hoặc thay dashboard/data cloud. CI/hosting integration có thể tự triển khai từ push; production và cold start Render thật chưa được xác minh trong lượt này.

## Tải trước workspace và trạng thái API khởi động/kết nối — 2026-10-20

- Theo yêu cầu tải hết dữ liệu sau mỗi login, chốt DEC-019: WorkspacePreparation tải tất cả pages notes active/trash, labels, reminders, inbox; kèm unread/me. Bốn luồng, tuần tự pages; cache InfiniteData đúng shape, seed detail/reminders, filtered notes lấy từ master hoàn chỉnh thay N request/labels. WorkspaceReady chờ dữ liệu/modules chính, warm editor/labels background, progress dựa collection/trang thật; admin chỉ me/stats/modules quản trị, không personal-content requests.
- ServerConnection dùng GET health tại API origin trước login/Google/refresh, dedup một flight, timeout15giây/probe và tổng120giây, backoff1/2/4/8. Không nhận HTML wake-up như JSON health live, không gửi token/cookie trong probe, không replay auth/mutation và không thêm keep-alive định kỳ. ConnectionNotice theo request thật sau1.5giây/offline, có retry; cached workspace/editor không unmount khi outage. Bootstrap giữ refresh session khi mất mạng; generation guard bỏ bootstrap cũ sau login mới,401/403/400 auth không hợp lệ vẫn bị xử lý. Lưu note lỗi tiếp tục Retry save/idempotency/version/draft protections cũ.
- Cache chỉ memory đến logout/account/nhóm quyền đổi, stale defaults5phút; invalidate/refetch nền vẫn hoạt động. Inbox/Reminders revalidate nền mỗi lần mở để nhận thông báo/lịch mới; không thay cached content bằng skeleton trong lúc đợi. Không durable offline cache, không snapshot transaction hoặc realtime/multi-tab mới. Account nhiều note/nội dung lớn sẽ tốn RAM/băng thông/thời gian preparation; cloud cold start vẫn cần thời gian dịch vụ.
- Kiểm bằng skill React Best Practices và verification: UI→API→fixture DB→response→cache/navigation, query/owner/generation/cancel, module lazy/warm và reduced-motion; không dependency mới hoặc đổi backend runtime/schema/API contract. Lượt browser đầu dừng ở health404 vì bridge chỉ nhận /api; đã cho forward /health thật. Lượt focused sau có lỗi500 khi SQLite dùng chung một connection đọc song song; thêm SemaphoreSlim chỉ ở bridge synthetic/reset/dispatch. Không serialize production requests hoặc sửa ApiFactory chung. Focused preload/restore2/2PASS sau sửa fixture.
- Lượt full22ca đầu sau sửa fixture: **21PASS/1FAIL**, phát hiện Inbox cache rỗng không nhận notification vừa dispatch khi mount; đã thêm background revalidation Inbox/Reminders và test giữ GET revalidation chờ để chứng minh cached UI vẫn dùng được. Regression mới phủ health503/HTML→live trước đúng một login POST, load3pages notes/no extra notes-label reads khi điều hướng, startup retry không login lại, offline restore giữ refresh, mobile loading layout, role isolation/logout và auth bootstrap race.
- Kiểm cuối: **22/22 Playwright Chromium PASS trong một lượt (3.5 phút gồm startup)**, sau sửa background revalidation; bao gồm các luồng auth/settings/admin/notes/drag/Markdown/autosave/conflict cũ. **27 Vitest + 4 configuration PASS**, ESLint max-warnings0/TypeScript và Production Vite build PASS; lint/build được chạy lại sau thay đổi revalidation cuối. Backend Release strict **0warning/0error**; không chạy lại full backend suite vì chỉ sửa frontend/test bridge. Không cộng rerun vào số test khác nhau.
- Đã xem ảnh artifacts/frontend/connecting-server.png, preparing-workspace.png và preparing-workspace-mobile.png: banner kết nối trên form login, tiến trình collection/trang ở desktop1280 và mobile390 không overflow. Browser đi qua API thật của fixture/captured-email/SQLite, health cũng được forward thật; chỉ mô phỏng503/HTML/offline để tái hiện lỗi. Chưa kiểm latency/bộ nhớ với account lớn, cold start Render thật hoặc PostgreSQL/SQLServer runtime mới; bridge serialize SQLite không chứng minh hiệu năng/concurrency production.
- Cập nhật intake/plan/workflow/UI/security/frontend/user-guide/testing; docs **48 Markdown / 178 local links / 0 errors**, git diff --check PASS (Git có thông báo LF/CRLF). Giữ Razor và bốn appsettings local đúng hash baseline, không owner DB/SMTP/Google/Supabase thật. Chưa commit/push/deploy hoặc thay dashboard/data cloud.

## Công bố nút thu/phóng và giao diện gọn lên main — 2026-10-20

- Theo yêu cầu “push lên luôn để tôi xem”, phạm vi commit gồm 14 file React/docs: khôi phục nút thu/phóng editor, bỏ heading/mô tả đầu trang Reminders/Inbox/Trash/label, icon Menu sidebar chung desktop/mobile, regressions và các quyết định/tài liệu liên quan. Không đưa ba appsettings local sửa sẵn, credentials hoặc artifacts vào Git; bốn cấu hình local đúng hash baseline.
- Fetch trước publication: main/HEAD và origin/main cùng 73d45a6, divergence 0/0. Docs 48 Markdown / 178 local links / 0 errors. Dùng lại evidence hai lượt triển khai bên dưới: focused browser 3/3 cho editor/toggle/focus/network và 3/3 cho header/sidebar/reminder→inbox; lint/typecheck/Production build PASS sau thay đổi cuối, backend Release0warnings/0errors ở lượt thu/phóng. Không chạy lại suite vì lượt này chỉ publication.
- Chỉ commit/push source lên main, đối chiếu SHA remote sau push; không manual deploy hoặc thay dữ liệu cloud. Hosting/CI integration có thể tự chạy từ push; chưa xác minh bản production đã cập nhật.

## Bỏ heading lặp và thống nhất icon sidebar — 2026-10-20

- Theo yêu cầu bổ sung, bỏ phần nhìn thấy của RIGHT ON TIME/Reminders/mô tả, A GENTLE NUDGE/Your inbox/mô tả và heading Trash/từng label. Giữ h1 dạng sr-only cho screen reader; không xóa tiêu đề note hoặc reminder item. Inbox giữ Mark all as read trong hàng actions riêng, Trash giữ cảnh báo bảy ngày, Reminders giữ banner hướng dẫn hiện có. Không mở rộng sang nội dung/empty states hoặc admin.
- Sidebar desktop dùng cùng icon Menu ba gạch ngang với mobile; giữ tên Hide/Show sidebar, aria-expanded/controls, preference và mobile drawer. React review: hooks/cache/requests không đổi, không thêm dependency hoặc sửa dữ liệu/backend/config; nút và heading giữ accessibility.
- Mở rộng các browser regression hiện có để kiểm heading sr-only/các copy đã bỏ, action/cảnh báo còn dùng được, label navigation, icon Menu ở cả hai trạng thái desktop. Focused Chromium **3/3 PASS (50.1 giây gồm startup)**: responsive/SPA/navigation, sidebar persistence/labels, reminder→inbox. ESLint max-warnings0, TypeScript/Production Vite build PASS; docs **48 Markdown / 178 local links / 0 errors**, git diff --check PASS. Không chạy lại backend/unit/full browser suite vì chỉ đổi trình bày; backend Release gần nhất đạt ở entry khôi phục nút thu/phóng bên dưới. Dùng SQLite/captured-email fixture riêng, không owner DB/SMTP/cloud; bốn cấu hình local nguyên byte theo baseline.
- Giữ thay đổi nút phóng to/thu nhỏ từ lượt trước; chưa commit/push/deploy các thay đổi bổ sung. Không sửa ba appsettings local đang có thay đổi sẵn.

## Khôi phục nút phóng to/thu nhỏ editor — 2026-10-20

- Theo yêu cầu bổ sung của chủ dự án, cập nhật DEC-018: editor vẫn mặc định toàn màn hình nhưng có nút Enter full screen/Exit full screen ở góc trên. Dùng state trong cùng EditorSession và đổi CSS class, không remount rich editor/coordinator, không reload hay bỏ draft khi đổi kích thước. Modal thu nhỏ có chiều cao 90dvh, content cuộn riêng và footer vẫn cố định.
- Giữ việc bỏ Save thường và dấu×, chỉ Close để đóng; Retry save/error/conflict và bảo vệ draft giữ nguyên. Nút có tên truy cập được, tooltip, aria-pressed, hỗ trợ bàn phím. Không thêm dependency hoặc sửa backend/data/config.
- Mở rộng regression editor hiện có để kiểm modal căn giữa nhỏ hơn viewport, đổi lại fullscreen bằng Enter, giữ content/counter và kiểm cả mobile390. Focused Playwright **3/3 PASS (3.0 phút gồm startup)**: editor/layout/toggle, lazy title focus và network failure/retry không tạo trùng. ESLint max-warnings0, TypeScript/Production Vite build PASS; backend Release **0 warning/0 error**. Không chạy lại toàn bộ browser/backend/unit suites cho thay đổi state/CSS này. Các ca browser dùng fixture SQLite/captured email riêng, không owner DB/SMTP/cloud.
- Cập nhật intake/plan/UI/frontend/user-guide/testing; docs **48 Markdown / 178 local links / 0 errors**, git diff --check PASS (thông báo chuẩn hóa LF/CRLF). Bốn appsettings local đúng hash baseline. Chưa commit/push/deploy trong lượt bổ sung này.

## Công bố giao diện tập trung nội dung lên main — 2026-10-20

- Theo yêu cầu “push lên main luôn đi”, phạm vi commit gồm 19 file React/docs: workspace/sidebar, notes/editor/labels/reminders, browser regressions và tài liệu DEC-018/testing/worklog. Không đưa ba appsettings local đang sửa sẵn, secret, ảnh hoặc artifacts vào commit; bốn cấu hình local API/Razor vẫn đúng hash baseline.
- Fetch trước publication: main/HEAD và origin/main cùng 6e382bd, divergence 0/0. Docs 48 Markdown / 178 local links / 0 errors. Dùng lại bằng chứng kiểm thử của entry triển khai dưới: 18/18 browser trong một lượt, regression title rerun 1/1 sau chỉnh autofocus cuối; frontend 4 configuration + 17 Vitest, lint/typecheck/Production build và backend Release đều PASS. Không chạy lại suite vì lượt này chỉ chuẩn bị publication, không sửa runtime.
- Chỉ commit/push source lên main và đối chiếu SHA remote sau push; không manual deploy, migration hoặc thay dữ liệu cloud. Push có thể kích hoạt CI/hosting integration sẵn có; trạng thái production cần kiểm riêng.

## Tối giản workspace/editor theo năm ảnh — 2026-10-20

- Theo yêu cầu và ảnh user, chốt DEC-018 thay Save thường của Q-023. Editor luôn phủ viewport desktop/mobile, bỏ nút phóng/thu và×đóng trùng; chỉ Close. Counter lấy text editor thực tế, nằm footer cố định dù content dài/cuộn. Title rỗng không có Untitled/input; Add title mở/focus input, clear rồi blur thu lại, không xóa content. Card title rỗng không in heading Untitled nhưng giữ accessible label.
- Bỏ header Your personal space/Your notes/mô tả và nút New note; giữ heading Notes dạng screen-reader-only, title ngữ cảnh Trash/search/label gọn. Chỉ Take a note để tạo, kể cả empty state: user xác nhận riêng bỏ Create your first note. Bỏ Create a label sidebar, gộp YOUR LABELS/icon thành một button/cursor. Desktop Hide/Show sidebar nhớ preference versioned; mobile drawer vẫn dùng được, thao tác không reload.
- Bỏ success toast routine note/editor/labels/reminders (pin/reorder/trash/restore/delete/create/update); không tắt errors/info hoặc acknowledgements bảo mật/admin. Autosave/status/409/idempotency và stale account cache guards giữ nguyên. Khi Close còn dirty/saving, chờ flush rồi mới đóng; nếu lỗi/conflict mở prompt giữ draft, chỉ hiện Retry save ở trạng thái error. Recovery Save as new note/Save and continue trong prompt vẫn có vì giải quyết lỗi, không phải nút Save trùng bình thường.
- Rà React checklist: các hooks ổn định, event handlers không dùng state stale khi đợi ACK, sidebar preference không chứa nội dung/token, Modal có accessible title, button labels/keyboard/mobile được giữ. Dùng skill react-best-practices đã áp dụng trong cuộc hội thoại; không thêm dependencies, không sửa backend/API/DB/Razor/config local hoặc admin flow.
- Các lỗi phát hiện khi kiểm browser đã xử lý: fullscreen bị animation modal-in dịch -50% → đổi sang fade không dịch; keyboard drag test gửi drop trước khi trạng thái over cập nhật → đợi aria-pressed/announcement thật trước drop. Lượt toàn bộ 17 ca tiếp theo đạt 15, lỗi hai ca Markdown/network do rich editor lazy load giành focus rồi làm title rỗng thu lại; sửa focus đồng bộ, không giành focus từ input đang nhập. Thêm regression giữ module editor chưa tải, mở Add title rồi mới cho tải tiếp để tái hiện xác định.
- Kết quả sau sửa: **18/18 Playwright Chromium PASS trong một lượt (2.2 phút)**, gồm fullscreen/counter/content scroll desktop1280/mobile390, sidebar persistence/SPA, một điểm tạo note/labels, quiet success, autosave/Close, Markdown, lỗi mạng/retry không tạo trùng, conflict, auth/account và admin riêng. Bổ sung biên mở lại note có title, xóa title rồi Add title lại phải focus đúng theo draft hiện tại; ca regression này chạy lại **1/1 PASS (24.1 giây gồm startup)** sau chỉnh một dòng autofocus. Không cộng lần rerun thành test mới.
- Frontend **4 configuration + 17 Vitest PASS**, ESLint max-warnings0, TypeScript/Production Vite build PASS; lint/build được chạy lại sau thay đổi focus cuối. Backend Release **0 warning/0 error**; không chạy lại toàn bộ backend tests vì không đổi backend. Đã xem ảnh artifacts/frontend/notes-content-first.png, editor-content-first-desktop.png và editor-content-first-mobile.png: editor phủ viewport, không overflow trang mobile, Close/counter vẫn ở footer. Không có kết quả production/cloud mới.
- Cập nhật docs index/intake/plan/business/workflow/UI/frontend/user-guide/testing/worklog; giữ rõ supersession của autosave+Save và Untitled cũ. Kiểm docs: **48 Markdown / 178 local links / 0 errors**; git diff --check PASS (Git có thông báo chuẩn hóa LF/CRLF). Tất cả browser tests chạy fixture loopback SQLite/captured mail, không owner DB/SMTP/Google thật, migration/seed/deploy hoặc commit/push trong tác vụ UI. Bốn appsettings local API/Razor so hash baseline nguyên byte; ba local modifications trước phiên không bị sửa. Chưa push/deploy; thay đổi nằm trong working tree để chủ dự án kiểm tra.

## Công bố khu quản trị độc lập lên main — 2026-10-19

- Theo yêu cầu “push lên main luôn”, phạm vi commit gồm45file NTC: AdminShell/router/auth/cache/settings/admin UX, policy API workspace v1/legacy, seeder mới/manifest label, regression tests/fixture, OpenAPI inventory và docs/worklog; kèm runbook xác nhận sửa TLS Render từ lượt trước. Không đưa appsettings local, credential exports, ảnh/TRX hoặc thay đổi Marixa vào Git.
- Fetch trước publication: HEAD/main và origin/main cùng1e427ba, divergence0/0. Rà45file không thấy credential-pattern; bốn appsettings local API/Razor nguyên byte so baseline, ba file đang sửa sẵn được loại khỏi commit. Docs48Markdown/177links/0errors. Kết quả build/backend114PASS+1SKIP/frontend17Vitest+4config/browser15luồng qua hai lượt giữ đúng evidence của entry implementation dưới; không chạy lại các suite đã đạt vì chỉ chuẩn bị publication.
- Chỉ commit/push source lên main và đối chiếu SHA remote sau push; không manual deploy, migration, seed hoặc thay dữ liệu cloud. Git push có thể kích hoạt CI/hosting integration hiện có; kết quả rollout cần kiểm riêng, không suy ra từ push thành công.

## Tách admin khỏi tài khoản dùng note — 2026-10-19

- Chủ dự án yêu cầu admin chỉ quản trị, dùng chung login nhưng có trang riêng, đầy đủ chức năng admin; chốt DEC-017 ở intake/plan/contract. Không hiểu “toàn quyền” là được đọc nội dung note người khác hoặc xóa audit; privacy, bảo toàn account/note và self-lock/deactivate/self-demotion protections giữ nguyên.
- React thêm AdminShell độc lập: overview, accounts, roles, audit; profile/account/security/sessions dưới /admin/settings. Sidebar admin không note/search/labels/reminders/inbox. Một login/email/Google và bootstrap/refresh chọn home theo role; Admin ưu tiên với Admin+User cũ. Admin direct-link workspace chuyển overview, user direct-link admin chuyển notes; admin /settings aliases giữ query khi chuyển sang admin/settings. Có mobile drawer, theme/account menu/reauth dùng thành phần chung; AppShell chỉ dành khách.
- Hoàn thiện UX admin theo toàn bộ v1 API sẵn có: account search/paging/create(User hoặc Admin)/detail metadata/lock-unlock/deactivate-restore; role create/edit/delete và membership add/remove; filtered audit và link activity từ account details; statistics/quick links/refresh. Admin tự sửa profile/bảo mật/phiên tại khu riêng. Không thêm màn hình đọc nội dung note, password người khác hoặc nút xóa nhật ký.
- API thêm policy CustomerWorkspace (authenticated non-Admin) trên tám controller workspace v1/legacy. Admin nhận403 kể cả role User còn trong DB, không thể gọi API tạo/đọc/sửa/xóa note/tag/reminder/inbox; user khác owner tiếp tục404, anonymous401. Role DB hiện tại thay JWT role cũ trước policy. ApiAccessOperationFilter/inventory131operations phản ánh quyền mới. Không migration hoặc rewrite dữ liệu thật.
- AuthService xóa private cache khi cùng account đổi nhóm Admin/non-Admin, request identity có nhóm quyền để loại response cũ đang bay. Regression kiểm cả promotion/demotion. Seed demo mới chỉ role Admin và không personal content cho admin (bốnUser:20notes/12labels); rerun giữ nguyên role/note admin lịch sử, không tự migrate/cloud seed. Manifest script sửa nhãn role cho tài khoản seed mới.
- Kiểm chứng: strict Release backend **0 warning/0 error**; focused auth/separation/demo **14 PASS**; full suite **114 PASS / 0 FAIL / 1 SKIP / 115 total** (PG fixture không cấu hình), TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-19_18_42_56.trx. Swagger/health/CORS export riêng **1 PASS**, TRX18_47_00, inventory131operations; chỉ SQLite/captured-email/synthetic identities.
- Frontend **4 config + 17 Vitest PASS**, ESLint max-warnings0 và TypeScript/Production Vite build PASS, dùng đúng NTC API URL/VERCEL=1. Browser run đầu **14 PASS / 1 FAIL**: ca quản trị mới dùng check/uncheck yêu cầu trạng thái checkbox đổi đồng bộ trong khi membership đợi ACK API. Sửa assertion thành click + đợi checked/enabled; chạy lại đúng ca này **1 PASS (19.8s; tổng42.8s gồm startup)**, không sửa runtime để chiều test. Như vậy cả15luồng browser đã đạt qua hai lượt; không báo là một lượt15/15. Ca mới phủ Admin+User/no workspace requests, deep links/reload/SPA, account lifecycle/details/audit, role edit/delete/membership, user denied admin; các luồng note/customer cũ vẫn đạt.
- Đã xem screenshots desktop1280/mobile390: artifacts/frontend/admin-desktop.png, admin-mobile.png; không overflow mobile, menu admin riêng. React checklist: lazy modules/guards trước mount, hooks ổn định, theme/menu/session shared, named controls/drawer/skip link, cache/request isolation và không dùng generic CRUD inheritance. Không thêm dependency hoặc đổi package lock.
- Cập nhật docs intake/plan/backend/frontend/API/security/Supabase/README/inventory/testing/worklog. Mọi kiểm thử dùng fixture biệt lập; không owner DB, SMTP/Google thật, migration/seed/deploy hoặc commit/push. Ba appsettings local và Razor nguyên trạng; các thay đổi runbook TLS từ lượt trước được giữ. Cloud cần triển khai cả API lẫn React khi chủ dự án giao; bản online chưa có phân tách mới này.
- Kiểm cuối:48Markdown/177local links/0errors; git diff --check PASS (cảnh báo normalization LF/CRLF ở file cũ). Bốn appsettings local API/Razor đối chiếu hash với baseline: nguyên byte. Artifacts/screenshots/TRX/private exports bị ignore; không stage file nào.

## Sửa TLS Render NTC và xác minh Live — 2026-10-18

- Sau khi user chuyển về tài khoản NTC, mở đúng service NoteTatCa/srv-dba6j3nbtjjs73e08dm0. MyCnn thực tế là URI sslmode=require, chưa có Root Certificate; đây là nguyên nhân validator Production chặn startup của commit 1e427ba. Chỉ đọc secret trong browser để chuyển đổi, không in hoặc đưa password vào repo.
- Sửa riêng CONNECTIONSTRINGS__MYCNN hiện có thành keyword Npgsql: đúng aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres, username postgres.nxqupzwqawujtgeuvvcj, giữ nguyên password cloud (decode URI một lần, quote theo keyword syntax); SSL Mode=VerifyFull, Root Certificate=/app/certificates/supabase-prod-ca-2021.crt, max pool10/min0, timeout15/command60. Không đổi JWT, Supabase service key, tài khoản DB hoặc biến của Marixa/Vercel; không hạ xác minh TLS.
- Save, rebuild, and deploy đã lưu biến và khởi tạo dep-dbafergm7kps738lf0h0 trên commit **1e427ba4d0e9d64bfd26dc17a2a33eaa58f7d1bd**. Render báo **Deploy succeeded | Live**, duration33.1s, lúc23:45:03 GMT+7. Screenshot không chứa secrets: artifacts/deployment/ntc-tls-deploy-live.png (ignored).
- HTTP sau deployment mới: GET /health/live **200 {status:live}**, GET /health/ready **200 {status:ready}**; OPTIONS /api/v1/notes từ https://note-tat-ca.vercel.app **204**, Access-Control-Allow-Origin đúng frontend. Readiness chứng minh DB connectivity của instance mới, không nghiệm thu toàn bộ chức năng/auth/UI/SMTP/Google.
- Chỉ sửa cấu hình cloud và runbook/worklog; không thay source validator hoặc local appsettings, không chạy operator migration/seed hoặc thao tác nội dung note. Jobs=true giữ theo lựa chọn đã chốt; worker khi instance chạy có thể xử lý lịch/purge theo nghiệp vụ. Log còn cảnh báo DataProtection__KeysDirectory chưa bền qua container replacement; cần durable protected key storage trước khi nghiệm thu recovery tokens, chưa đổi plan/storage trong lượt này.
- Regression startup16PASS là lần chạy chẩn đoán ở entry dưới, không cộng lại thành lượt test mới. Docs/link/whitespace được kiểm lại sau cập nhật; không commit/push thêm để tránh tạo rollout không cần thiết chỉ cho docs.

## Chẩn đoán Render startup TLS — 2026-10-18

- User gửi log Render commit 1e427ba: Docker build/image push thành công; startup 16:30:42Z/16:30:44Z bị StartupConfiguration chặn vì CONNECTIONSTRINGS__MYCNN chưa dùng SSL Mode=VerifyFull cho Supabase Production. Không kết luận nguyên nhân là database password, migrations hoặc Vercel; log không chứa giá trị MyCnn thực tế.
- Đối chiếu source validator/URI normalizer, public CA trong Docker và exporter: chính sách VerifyFull đã đúng; không hạ TLS để vượt validation. Bổ sung troubleshooting trong RENDER-VERCEL-SETUP, cập nhật trạng thái source đã push; các snapshot dashboard cũ không đại diện cấu hình đang chạy.
- Mở đúng NTC service srv-dba6j3nbtjjs73e08dm0/env: phiên hiện tại vẫn thuộc tài khoản Marixa và hiển thị Access denied. Đã yêu cầu user chuyển tài khoản NTC; chưa đọc/sửa cloud connection, chưa lưu env hoặc deploy. Bước còn lại: giữ cloud credential hiện có, sửa SSL/CA đúng Linux path, xác nhận giá trị đã lưu và kiểm rollout khi có quyền.
- Regression Release StartupConfigurationTests **16 PASS / 0 FAIL / 0 SKIP**, TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_23_36_18.trx. Docs 48 Markdown/176 local links/0 errors, diff --check PASS. Chỉ dùng synthetic fixture; không owner DB/email/migration/seed, không sửa local appsettings hoặc commit/push trong lượt chẩn đoán này. Chưa coi sự cố cloud là đã sửa xong.

## Công bố cấu hình NTC lên main — 2026-10-18

- Theo yêu cầu “push ntc lên đi”, chuẩn bị commit toàn bộ thay đổi NTC đã hoàn thiện từ mốc 1fc2cda: operator Supabase/demo, kiểm tra cấu hình startup, Production JSON sạch, CA public, Docker/Render/Vercel, manifest/exporter, frontend environment validation, regression tests và tài liệu. Không đưa thay đổi Marixa vào publication này.
- Loại khỏi commit ba appsettings local đang sửa sẵn của API/Razor; đối chiếu cả bốn file local với backup: giữ nguyên byte. Private exports/password manifests/logs/screenshots trong artifacts bị ignore. Rà 55 file dự kiến commit không phát hiện mẫu private key/access token/OAuth secret/JWT thật; CA được đưa vào repo là certificate public. Không stage User Secrets hoặc dữ liệu tài khoản mẫu thật.
- Kiểm tra lại trước commit: Release build **0 warning/0 error**; backend **111 PASS / 0 FAIL / 1 SKIP / 112 total** (PostgreSQL fixture không cấu hình; không dùng owner DB). TRX: artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_23_01_08.trx. Frontend **4 config tests + 14 Vitest PASS**, lint max-warnings0 và Production typecheck/Vite build PASS với API URL NTC/VERCEL=1.
- Synthetic cloud exporter PowerShell5.1 PASS; clean Production publish và static checks SQL Server/PostgreSQL/invalid sanitized config PASS. Docs **48 Markdown / 176 local links / 0 errors**; diff --check PASS, chỉ có cảnh báo line ending hai file cũ. Không lặp lại E2E/Docker image build/cloud DB checks đã ghi ở các mốc trước.
- Fetch origin/main trước publication: local/remote cùng 1fc2cda, không divergence. Sau push phải đối chiếu SHA main trên remote. Không chạy migration/seed/email thật hoặc bấm deploy; Git push có thể kích hoạt CI/hosting integration đang cấu hình, chưa xác minh rollout cloud trong tác vụ này.
- Publication hoàn tất: commit **3ea2b8db17f287de0390977cbad0a221147c2e5f** (55 files) đã push bằng fast-forward lên origin/main; git ls-remote xác nhận main trên GitHub trùng SHA local. Entry xác nhận này được lưu bằng commit tài liệu tiếp theo; ba appsettings local vẫn ngoài commit.

## Tiếp cấu hình Marixa sau đổi tài khoản — 2026-10-18

User đăng nhập Render/Vercel Marixa; dashboard đã Save only job=true và MyCnn VerifyFull/CA Linux đúng project, giữ password cloud (khác local), JWT/Storage key. Vercel giữ API URL Config/Production /api, root/Node24, đổi Other→Vite và bỏ dashboard Build/Output overrides. Chưa deploy source/CA mới hoặc kiểm DB thật; chi tiết và bằng chứng trong worklog Marixa. Không thao tác thêm dashboard NTC vì user đã chuyển tài khoản. Exporter warning chung sửa đúng manifest reserve, synthetic export tests hai repo PASS; common standard bổ sung khác biệt credential local/cloud. Không sửa runtime/API/business/data hoặc commit/push/deploy NTC trong lượt này.

## Bổ sung Storage dự phòng và chốt nguồn cấu hình — 2026-10-18

- Chủ dự án yêu cầu giữ SUPABASE__URL/SUPABASE__SERVICE_KEY cho NTC để sau này upload ảnh note; Swagger bỏ khỏi Render, JWT issuer/audience/TTL và cờ tạo dữ liệu mẫu dùng chung cách lấy từ Production JSON. Chốt BackgroundJobs=true cho cả hai. Giữ giá trị JWT riêng từng app; NTC DemoAccounts=false, Marixa Seed/DatabaseInitialization=false, không thêm cờ demo giả cho Marixa.
- NTC Production JSON thêm section Supabase rỗng an toàn và đổi BackgroundJobs=true. Manifest đánh dấu reserveSupabaseStorage=true nhưng supabaseStorage=false: mới dự phòng credential, chưa tạo bucket/adapter/endpoint/frontend upload. Ảnh note tương lai phải private theo owner, không copy ảnh attendance public Marixa. Không có migration hoặc thay đổi tài khoản/note trong lượt này.
- Mẫu Render/blueprint và exporter hai repo dùng tên SUPABASE__SERVICE_KEY, job=true; cùng chín key khi đã có credential Storage. NTC chưa có key local thì exporter bỏ secret chưa cấu hình, không ghi env rỗng hoặc key giả. JWT issuer/audience/TTL/demo/Swagger không được export lặp. Giữ tương thích ServiceKey/Service_Key trong code và stable export JWT profile; không xoay key hoặc lấy key từ app khác.
- Render NTC srv-dba6j3nbtjjs73e08dm0: dùng phiên đăng nhập hiện hữu, cập nhật BACKGROUNDJOBS__ENABLED=true và thêm SUPABASE__URL=https://nxqupzwqawujtgeuvvcj.supabase.co; bấm Save only, xác nhận quay lại bảng đã lưu và đọc lại hai giá trị public đúng. Không deploy, đổi credentials hoặc xóa JWT/demo/Swagger env. Secret Storage có sẵn giữ nguyên, chưa xác minh quyền/project của key. Most recent deploy vẫn Failed trên commit cũ; Save only không nghiệm thu runtime. Bằng chứng private screenshots artifacts/deployment/ntc-jobs-storage-saved.png và ntc-background-jobs-saved.png, các secret đều masked.
- Marixa dashboard trong phiên hiện tại báo Access denied (khác tài khoản); user sẽ đăng nhập sau khi xong NTC. Source/template/docs Marixa đã cập nhật theo cùng quyết định, không sửa dashboard Marixa trong lượt này. Không coi Access denied là thiếu quyền source hoặc kết nối Supabase.
- Kiểm chứng: strict Release NTC.Backend.slnf và M.BE.sln **0 warning/0 error**; focused NTC StartupConfiguration+Maintenance **22 PASS / 0 FAIL / 0 SKIP**, Marixa StartupConfiguration+Storage+JWT **33 PASS / 0 FAIL / 0 SKIP**. Export smoke PowerShell5.1 hai repo PASS, gồm chín key với secret giả, không export JSON-owned policies, key NTC chưa có bị bỏ qua, stable signing key và quoting fallback. Production publish/static CLI valid SQL Server/PostgreSQL + invalid sanitized configuration PASS cả hai, chỉ fake closed-loopback credentials, job/test host không chạy thật.
- Kiểm cuối: NTC 48 Markdown/176 local links/0 lỗi; Marixa 47 files/370 links/10 anchors/0 lỗi; diff --check PASS (chỉ warning LF/CRLF file cũ). Exporter/test/common standard hai repo byte-identical; screenshots bằng chứng Gitignored.
- Hash local appsettings API/Razor giữ nguyên so baseline trước chuẩn hóa; production JSON là file được chủ dự án giao sửa. Không owner DB/bucket/email, full suite/frontend/E2E hoặc Docker image/remote rollout trong lượt này. NTC job bật ở source sẽ dispatch/email/purge trash bảy ngày/prune khi triển khai; SMTP/uptime Free cần kiểm ở rollout riêng. Docs CONFIGURATION-STANDARD/17/01-plan/hosting và worklog được cập nhật, không stage/commit/push.

## Chuẩn hóa cấu hình/phong cách cùng Marixa — 2026-10-18 (CURRENT source)

- Theo yêu cầu chủ dự án, chọn JSON Production sạch + User Secrets Development + env theo deployment. Thêm CONFIGURATION-STANDARD.md giống nhau trong hai repo; root .editorconfig UTF-8/LF/C#4space/JS-TS-JSON2space, manifest deploy/project.json lưu đường dẫn/URL public và target đúng từng app. Giữ .NET8/Identity, routes, data, Razor và policy token/nghiệp vụ riêng; không reformat toàn codebase.
- NTC có appsettings.Production.json chỉ giữ defaults an toàn: NoteTatCa/NoteTatCa.Web/15 phút, jobs/Swagger/Google/demo false. csproj publish chỉ nhận Production JSON, loại base/Development/local env/keyring/App_Data/uploads; Docker exception chỉ cho Production JSON. CA public Linux path giữ nguyên. Sáu env Render cơ bản, NTC không cần Supabase service key; blueprint không generate/rotate JWT hoặc tự deploy. Chưa cleanup 14 biến đã lưu ở dashboard trong lượt trước.
- StartupConfiguration aggregate lỗi provider/connection/JWT/Production HTTPS/CORS/TLS/Storage/flags theo tên key, không echo credential; --check-config và options validator chạy trước operator handlers/host, không DB/worker/migrate/seed/email. Thiếu durable Data Protection keyring có warning rõ. Thêm Test-Configuration.ps1 và Test-ProductionConfiguration.ps1 dùng cùng lệnh với Marixa; Production wrapper dùng publish sạch thay vì nạp nhầm base local.
- Export-CloudEnvironment.ps1 đọc manifest riêng, output sáu keys (Marixa thêm Storage), giữ stable private export key profile và Linux CA path, quoting khó thì JSON thay .env; không đổi cloud/local secret thật. Test exporter dùng APPDATA/credential giả. API_PROXY_TARGET thống nhất dev frontend, giữ aliases cũ; shared Vite validator báo key sai, chặn Vercel relative/HTTP API, giữ /api/v1 NTC và /api Marixa. Browser suite ép API/proxy fixture riêng. Node24 engines/lock/CI, Vercel SPA/API/assets fallback và security headers theo cùng quy ước.
- Verification cuối: strict Release backend **0 warning/0 error**; full NTC suite **110 PASS / 0 FAIL / 1 SKIP / 111 total**, PostgreSQL fixture không có nên skip, không dùng owner connection. Frontend **4 config tests + 14 Vitest PASS**, lint max-warnings0/typecheck/build PASS; **12 Playwright Chromium PASS** qua fixture DB/email cô lập. Production build dùng manifest API URL với VERCEL=1 PASS. Các suite trước chỉ là mốc, không cộng trùng vào kết quả này.
- Production publish mới đúng một appsettings.Production.json, static CLI checks cả SQL Server/PostgreSQL và invalid config sanitized PASS. Process HTTP Production từ publish với DB loopback giả: live200, ready503 đúng dự kiến, CORS exact/blocked origin và correlation header PASS, process đã dừng. Không kiểm password/cloud DB thật. Export smoke PowerShell5.1/7 PASS: key count/Storage alias, special characters, Linux CA, stable key và stale .env fallback. Workflow thêm hai script kiểm config/export; GitHub CI remote và Docker image build/run chưa chạy (máy không có Docker CLI).
- Hash bốn appsettings local/API/Razor giữ nguyên so backup đầu phiên; Marixa cũng giữ appsettings local. Artifacts/backups/private exports Gitignored, không stage/commit/push/deploy hoặc migration/seed/email thật. SMTP/Google/keyring/uptime production vẫn theo release checklist; chuẩn hóa source không nghiệm thu hosting. Marixa còn cảnh báo bundle lớn, không đổi dependencies/định dạng project ngoài phạm vi cấu hình.
- Bằng chứng: artifacts/test-results/*.trx, artifacts/configuration-test-*/publish và http-smoke.log; backup config cục bộ trong artifacts/configuration-standard-backup (private, ignored). Cập nhật docs 17/setup/deploy/index/README và AGENTS với nguồn chủ quản mới. Kiểm cuối docs: 48 Markdown / 173 local links / 0 errors; diff --check PASS (Git có warning LF/CRLF ở file cũ).

## Render/Vercel NTC theo Marixa — 2026-10-18 (CURRENT)

Đọc render.txt/vercel.txt tại D:/zsecret dưới dạng dữ liệu, không in secrets. Tham khảo read-only Docker/blueprint/SPA/deploy/env của Marixa, không sửa hoặc dùng credentials dự án khác. User chọn sửa dashboard trực tiếp, đăng nhập Render/Vercel trong IAB. Connector Vercel get_project scope kunheo-team trả403; không retry quyền, dùng phiên browser được user xác nhận. Giữ thay đổi runbook chung được phiên Marixa thêm song song trong entry tiếp theo, không ghi đè.

Render thực tế: NoteTatCa/srv-dba6j3nbtjjs73e08dm0, NoteTatCa/main, Free/Singapore; Dockerfile ./Dockerfile/context . vàroot trống đã đúng, khác file render.txt cũ. Đặt Health Check Path=/health/ready; Save tự kích hoạt dep-dbabr149v7es73ftvigg trên1fc2cda, khi quay lại hủy thì đãFAILED16.1s/exit139, log thiếu JWT key≥32bytes/issuer/audience. Đã thông báo side effect, không bấm Manual Deploy hoặc báo rollout thành công. Sau đó env chỉ Save only.

Render đã lưu13keys NTC: Production/provider/DB connection/JWT key+issuer+audience+TTL/CORS/clientURL/jobs/Swagger/Google/demo flags. DB connection từ User Secrets đúngNTC, giữ password/VerifyFull vàđổi bản export Root Certificate sang /app/certificates/supabase-prod-ca-2021.crt/pool10. JWT ô cũ trống (Copy empty/UI Generate), bổ sung32random bytes Base64 riêng, không lấy key Marixa/development. Import tạo3dòng trùng; đã giữ key gốc/cập nhật value/bỏ dòng trùng trong form rồi Save thành công. Legacy SUPABASE__SERVICE_KEY cósẵn giữ nguyên, NTC không dùng; tổng14keys sauSave. Không print password/JWT hoặc xóa account/resource.

Vercel kunheo-team/note-tat-ca/prj_kKCnrbpC1hjW05gzXGOPqSQNW1J5: biến cũVITE_API_BASE_URL /api làSecret Production+Preview, UI chặn sửa public-prefix Secret/đổi loại. User xác nhận riêng bước xóa vĩnh viễn; đã xóa đúng biến rồi tạo lại ngay Config Production=https://notetatca.onrender.com/api/v1. UI xác nhậnAdded successfully/cần deployment mới, public value đã thấy. Không redeploy hoặc nốiPreview vàoDB production. Vite/rootntc_react/Node24.x cósẵn đúng; giữ mặc định framework.

Source Docker copy7API projects/cache restore, UseAppHost=false/nonroot/Production/PORT; bổ sung CA public Supabase2021 vào Linuxpath. DER SHA256807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA; PEMfile SHA256700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7. Không nhầm filehash/certfingerprint, không đưa localappsettings vàoimage. render.yaml khớpname/Free/Singapore/rootpaths/health/env, generateValue choJWT chưa có, autodeployoff; không syncBlueprint/tạo resource/đổi plan. vercel.json cóschema/framework/npmci/build/dist, fallback loạiAPI/assets/favicon; package/lockNode24.x nhấtquán.

Thêm Export-CloudEnvironment.ps1: validate UserSecrets target, xuấtprivate .env/JSON vàoignored artifacts/deployment, stable exportJWTprofile vàLinux CApath; quotingkhó thì giữJSON/xóa.envcũ, khôngxuấtsai. Synthetic Test-CloudEnvironmentExport.ps1 chạystoreAPPDATA biệt lập, không ownerDB. Theo câu hỏi4biến, giải thích Marixa đọcJSON cònDockerNTC loạiJSON; phương án3biến+safeproductionJSON là PROPOSED, chưa tự đổi thêm hoặc xóa env dashboard. File chủ quản RENDER-VERCEL-SETUP và07/08/11/17/README/index cập nhật.

Validation: exportsmoke PowerShell5.1/7 PASS(specialcharacters/LinuxTLSpath/stablekey/disabledjobs-seed/staleenvfallback); actual private.env↔JSON NodeparseEnv PASSkhônginvalues. SemanticRender/build/env vàSPA API/assets exclusion PASS; engineslockconsistency PASS. Officialschema2020 khôngvalidate bằngAJV6 cài sẵn, khôngcài package thêm chỉđể báoPASS. Frontendproductionbuild đúngAPIURL PASS. Strictpublish7projects sanitizedkhôngappsettings PASS; Productionstartup/live200/ready503expectedDBsynthetic/exactVercelCORS204 PASS, server5299 đãdừng. DockerCLI khôngcó:imagebuild/runNOTRUN. Fullsuite95PASS/1SKIP làmốc trước, không giả rerun hoặc testownerDB.

Screenshots masked/private artifacts/deployment/render-environment-saved.png vàvercel-production-config-saved.png; giữhai tabdashboard. Khôngcommit/push/rolloutsource mới; imagecũ chưa cóLinuxCA nên cầnpublish trướcdeploy. SMTP/Googleproduction/durableDataProtection/jobsuptime/restore chưaverify, khôngmua/đổiplan. Giữnguyên appsettingslocal/Razor/SQLServer/Supabase data; chỉ lưu hosting config đã giao.

Kiểm cuối47Markdown/160local links/0errors; git diff --check PASS(chỉwarningLF/CRLF). Hashes appsettings API/Razor giữ nguyên; private env/JSON/export key profile xác nhận Gitignored. Haiảnh bằng chứng đã xem, chỉchứa configpublic hoặc secretmasked.

## Dùng chung một runbook Supabase với Marixa — 2026-10-18

Theo yêu cầu chủ dự án từ phiên Marixa, cập nhật SUPABASE-DOTNET-COMMANDS.md thành một khối PowerShell có lựa chọn NTC/Marixa, bảng target đúng source hiện tại, nhập password ẩn, CA/VerifyFull/pool 10 và Marixa tắt auto initialize/seed khi dùng cloud. Giữ nội dung phân biệt provider/Data API/Storage, thứ tự override, migration riêng từng repo và giới hạn local/hosting. Không dùng lại lệnh Node của project/ref cũ.

Chỉ sửa runbook chung và entry worklog này trong NTC; giữ code/config/secrets cùng toàn bộ thay đổi đang có, không stage/commit/push NTC. Cấu hình Marixa local đã được chuẩn hóa và kiểm Npgsql read-only thành công ở repo Marixa; không sửa secret hoặc truy cập DB NTC trong lượt này (chỉ đọc đường dẫn CA local đã kiểm ở lượt trước). Validator NTC trước/sau sửa: 46 Markdown/149 links/0 errors. Khối PowerShell parse 0 lỗi, builder round-trip password giả có ký tự đặc biệt/Unicode và JSON stdin PASS; không chạy nhập password thật qua toàn khối tương tác. Marixa chạy FoundationTests 10 PASS bằng dữ liệu giả, không test fixture cloud. Migrations/tài khoản/rollout vẫn theo các entry và runbook riêng, không suy từ kết nối.

## Apply Supabase migrations và tạo dữ liệu mẫu — 2026-10-18 (CURRENT)

Người dùng trực tiếp yêu cầu kết nối Supabase, áp dụng migrations và tạo5accounts/note mẫu. Yêu cầu này cho phép provisioning cloud cụ thể; không phải chuyển dữ liệu SQLServer hoặc deploy app. Đọc AGENTS/docs/skill Supabase, dùng User Secrets hiện có và CA VerifyFull; target được kiểm đúng ref nxqupzwqawujtgeuvvcj/session host5432/user/database. Không yêu cầu lại password và không in secret. Lưu metadata project/session host và password demo ngẫu nhiên riêng trong User Secrets, giữ nguyên database password.

Explicit CLI --initialize-supabase --seed-test-accounts thành công:3EF histories PostgreSQL cũ đã apply trong schema ntc, pending0; không sửa migrations lịch sử. Guard schema trống trước apply, giữ schema public/auth; thu hồi PUBLIC/anon/authenticated quyền schema/table. Tạo5Identity accounts đã xác minh:admin@ntc.example.test(Admin+User),user01..04@ntc.example.test(User). Không dùng Supabase Auth; không gửi email hoặc bật worker. Giữ nguyên hashes mọi appsettings API/Razor trước/sau; không truy cập/chuyển SQLServer data.

Mở rộng DemoAccountSeeder/DemoNotes để seed5notes+3labels cho từng account trong cùng transaction/advisory lock. Mẫu English gồm rich text có màu chữ/ghim, checklist, plain ideas, untitled vàtrash. Tổng25notes(20active/5trash),15tags và25NoteTag owner links. Dùng ContentRules hiện hành tạo plain projection/validate emoji/color; clock qua TimeProvider. Identity content marker chỉ đánh dấu hoàn thành một lần, không tạo lại/ghi đè mẫu đã sửa hoặc xóa. Collisions tài khoản thật/password/state không phù hợp vẫn dừng, không reset/unlock/promote.

Credentials đã lưu artifacts/supabase/test-accounts.local.json bị Git ignore, đồng thời DemoAccounts:Password trong User Secrets; không đưa password vào docs/Git/chat. File artifacts/supabase/provision.local.log chỉ giữ local. Không cần cấu hình profile appsettings.Supabase.Local.json để chạy API vì User Secrets đã sẵn. Hướng dẫn/commands/data inventory đã cập nhật tại SUPABASE-SETUP và SUPABASE-DOTNET-COMMANDS.

Verification thực tế: Npgsql read-only transaction kiểm3applied/0pending, password hashes/roles/verified/active của5users,5notes(4active+1trash)/3labels mỗiuser, canonical projection vàsame-owner links PASS; anon/authenticated không có schema/table grants PASS. HTTP loopback API port5188→Supabase:5login vàlist note/trash/tag PASS, admin đọc note user01 trả404. Cleanup script đầu thiếu Bearer ở logout nên401; đã sửa dùng authenticated revoke-all cho5demo accounts vừa tạo và chạy lại toàn bộ HTTP thành công, thu hồi cả các phiên verification trước. Server verification được dừng; không để app test chạy nền hoặc gửi SMTP.

Evidence: focused7DemoAccountTests PASS; thêmcase sample/private/valid/rerun sau edit/hard-delete giữ nguyên thay đổi vàkhông gửi mail. Strict Release build0warnings/0errors PASS. Fullsuite95PASS/0FAIL/1SKIP,total96,33s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_58_37.trx. SKIP vẫn là PostgreSQL regression fixture thiếu connection test biệt lập, không dùng owner DB thay vào. Cloud kiểm riêng chỉ dữ liệu mẫu có chủ đích. Chưa chạy React browser→Supabase, SMTP/Google thật, deployment, backup/restore hoặc SQL→PG transfer. Source/docs chưa commit/push.

Kiểm cuối:46Markdown/149local links/0errors; git diff --check PASS (chỉ thông báo normalization LF/CRLF file config source), credentials/scripts/evidence artifacts bị ignore. Đối chiếu hashes appsettings giữ nguyên; manifest có đủ5password entries, không in ra; port5188 đã ngừng. HTTP đọc notes phát cảnh báo EF MultipleCollectionIncludeWarning, chưa chỉnh query splitting trong task seed; không có lỗi đọc/count/ownership, tối ưu query là việc riêng khi đo tải.

## Kiểm tra kết nối Supabase thực tế — 2026-10-18 (CURRENT)

Theo yêu cầu người dùng kiểm tra vào được chưa, đọc config User Secrets nhưng không in connection/password: provider PostgreSQL, đúng session host aws-0-ap-northeast-1.pooler.supabase.com, VerifyFull, password không còn placeholder. Chỉ chạy explicit --check-supabase; không --initialize-supabase/--seed-test-accounts, không migrate, không ghi SQL hoặc gửi mail.

Lần đầu TLS handshake FAIL. Probe PostgreSQL SSLRequest/TLS không gửi password, callback luôn từ chối kết nối để chỉ đọc certificate metadata: hostname hợp lệ, RemoteCertificateChainErrors/UntrustedRoot; leaf *.pooler.supabase.com, chain Supabase Intermediate2021→Supabase Root2021. Tải CA public qua HTTPS từ Supabase certificate distribution, kiểm subject/root và hạn2031-04-26, SHA256807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA. Bổ sung Root Certificate, giữ VerifyFull; không Trust Server Certificate hoặc tắt xác minh.

CA lưu bền ở %LOCALAPPDATA%/NoteTatCa/certificates/supabase-prod-ca-2021.crt, không cài vào trust store toàn máy. Chỉ cập nhật ConnectionStrings:MyCnn trong User Secrets để trỏ CA; giữ nguyên host/user/database/password/SSL mode. Kiểm lại bằng cấu hình đã lưu, không override connection ở process: PASS, thông báo Supabase connected with TLS. Pending EF migrations:3. Xác nhận network/TLS/database authentication của Npgsql trên project ntc hoạt động; schema NTC và5test accounts chưa được tạo bởi lần kiểm tra này. Không coi đó là full API/browser/cloud deployment verification.

Logs lỗi chẩn đoán trước sửa ở artifacts/supabase/*.local.log bị Git ignore; không publish logs hoặc secrets. Cập nhật trạng thái Supabase docs từ chưa kết nối sang kết nối read-only PASS/migrations pending. Không commit/push, deploy hoặc thay đổi database/schema/data trong tác vụ check.

## Chuẩn hóa lệnh chung .NET/Supabase theo Marixa — 2026-10-18 (CURRENT)

Người dùng muốn dùng lại các lệnh dotnet user-secrets như Marixa và tài liệu cho project mới, thay vì mặc định script riêng NTC. Đã đọc M.API.csproj, DatabaseConfig/PostgresConnectionString của repo marixa_aspnet_react: có UserSecretsId và keys Database:Provider/ConnectionStrings:MyCnn. Chỉ đọc repo Marixa, không sửa secrets/schema/Storage hoặc code của nó. Dòng node run-migrations thuộc Marixa_Workforce/ref lasdnfytejntonjfkspv, khác ntc vàmarixa001; ghi rõ không phải lệnh migration chung.

Chạy dotnet user-secrets init cho NTC.API để thêm UserSecretsId5fd8c2b4-3a1b-4d28-950f-aad3848a849b vào csproj; không lưu database password thật hoặc đổi4appsettings local. WebApplication.CreateBuilder tự đọc User Secrets trong Development; tài liệu nêu thứ tự ưu tiên, production dùng host env, remove đúng2keys khi quay về SQLServer. Keyword Npgsql connection string là mẫu chung không phụ thuộc URI adapter; NTC bổ sung normalize sslmode verify-full/verify-ca theo URI chuẩn và reject invalid enum không echo secret.

Tạo [lệnh chung](SUPABASE-DOTNET-COMMANDS.md) với ví dụ NTC/Marixa, variant nhập password ẩn/JSON stdin và boundary migration/seed. Lưu mẫu generic riêng D:\My Project\docs_mau\SUPABASE-DOTNET-COMMANDS.md; cập nhật danh mục/worklog thư viện mẫu, không chép project refs/keys/password thật vào template. SUPABASE-SETUP/10/17 cập nhật User Secrets là chuẩn chính; script riêng vẫn tùy chọn. NTC initialization/5demo accounts giữ explicit CLI của backend, không giả Node runner dùng chung hoặc Supabase Auth.

Evidence: strict Release build0warnings/0errors PASS;4normalize connection/TLS/password tests mới PASS. Full suite94PASS/0FAIL/1SKIP PostgreSQL,total95,30s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_33_00.trx. CLI user-secrets JSON stdin/set/list read-back PASS bằng temporary ID synthetic riêng và clear sau kiểm, không đọc store/secrets của user hoặc Marixa. Đối chiếu4API/Razor local config hashes nguyên byte. Docs NTC46Markdown/146links/0errors trước entry này; thư viện mẫu40Markdown/162links/0errors. Kiểm lại links/whitespace trước bàn giao. Chưa kết nối Supabase cloud, chưa tạo5cloud accounts, chưa migrate/deploy/commit/push trong tác vụ này; user cần nhập password và chạy các lệnh đã cung cấp.

## Supabase project ntc và explicit test accounts — 2026-10-18 (CURRENT)

Người dùng cung cấp organization kunheo/project ntc/reference nxqupzwqawujtgeuvvcj, URL/publishable key/direct/session endpoints; yêu cầu cấu hình Supabase và5account có sẵn, sau đó chọn nhập database password ẩn ở máy và yêu cầu lệnh copy chạy. Giữ .NET Identity, PostgreSQL schema ntc; publishable key không dùng làm DB password và không đưa vào React vì API truy cập DB trực tiếp. Supabase connector get_project trả permission error; không có cloud access hoặc password ở phiên này, chưa kết nối/migrate/seed cloud và không báo5account thật đã tạo.

Thêm scripts/Use-Supabase.ps1: -Configure đọc SecureString, lưu profile appsettings.Supabase.Local.json bị Git ignore; Npgsql session host5432 do user cấp, VerifyFull TLS, pool10, connection builder xử lý ký tự đặc biệt. Môi trường chỉ override trong child process và restore cả PowerShell5.1/7; SQLServer/Razor config4hash đối chiếu nguyên byte. -Check chỉ đọc; -Initialize explicit apply EF PostgreSQL histories vào schema mới, dừng schema có bảng/pending cần review; thu hồi PUBLIC/anon/authenticated grants schema ntc. Không chuyển dữ liệu SQLServer, không bật worker hoặc gửi email.

Thêm explicit operator CLI --seed-test-accounts qua DemoAccountSeeder:1Admin+User và4User, email .test, password random private được giữ khi configure lại. UserManager hash/role/profile/audit trong transaction, PostgreSQL advisory lock, Identity claim marker; rerun idempotent, không reset/unlock/adopt account có sẵn. Guard nonproduction+enabled, no startup/HTTP seed. Schema/target CLI kiểm project host/user/port/postgres database/VerifyFull trước thao tác. Password manifest chỉ ghi sau dotnet success. Runbook/copy commands tại [SUPABASE-SETUP](SUPABASE-SETUP.md).

Evidence: strict Release build0warnings/0errors PASS.6DemoAccountTests PASS, gồm actual HTTP login của5users, admin không đọc note user khác, no email, rerun không đổi hash/stamp/audit, collision/flag/production/password guards. Full suite sau6case mới86PASS/0FAIL/1SKIP PostgreSQL,total87; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_03_19.trx.4target guard tests thêm sau đó PASS riêng, TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_04_54.trx; không giả đã rerun full91. Script smoke với fake dotnet/password tại artifacts subfolder riêng PASS trên WindowsPowerShell5.1 vàPowerShell7, test quoting/config/CLI flags/5manifest/env restore, không gọi DB/network. EF idempotent PostgreSQL export PASS artifacts/supabase-schema-review.sql; không apply. Docs/link/whitespace kiểm lại trước bàn giao. Source changes chưa commit/push.

Đã đọc Supabase skills/changelog/current docs; TLS HTTP breaking-change10/11/2026 không tác động kết nối Npgsql/PostgreSQL này; không cài Supabase Auth/SDK chỉ vì project có publishable key. Sau khi user chạy setup với password local: kiểm log success +5Identity accounts, schema/ownership, đọc private manifest để login; cloud PostgreSQL runtime vẫn NOT VERIFIED trong phiên này. Local/appsettings config không đổi, schema/migration histories cũ không sửa.

## Publish main theo yêu cầu người dùng — 2026-10-18 (CURRENT)

Người dùng yêu cầu push main sau khi hoàn thành React/backend/docs. Remote origin/main đã kiểm ở176a968, trùng HEAD trước commit; không cần force push. Đưa toàn bộ phạm vi đã giao lên cùng cấu trúc root NTC: ntc_aspnet, ntc_react, docs, scripts, CI và deploy assets. Các evidence14unit/12Chromium/80backend+1PGskip của đợt triển khai được giữ ở entry dưới; kiểm docs44Markdown/136links/0errors và staged whitespace PASS trước publish.

Giữ nguyên byte4appsettings local qua đối chiếu SHA256; chỉ stage bản cấu hình sạch trong Git index, bỏ JWT/Google/SMTP secret, email SMTP riêng và connection string local. Ba file config có giá trị riêng sẽ còn modified ngoài commit; không reset hoặc ghi đè chúng. Snapshot index/status/worktree patch và config hashes trước stage ở .git/push-backup-20261018, không publish thư mục backup. Kiểm484indexed files:0credential-pattern findings, không có node_modules/bin/obj/artifacts/test reports/keyring trong index. Publish code PASS: commit c2f4fe178f737d8abf167868e6d5d42dc842372e đã push origin/main; git ls-remote xác nhận SHA remote trùng HEAD local. Đối chiếu4config hashes sau push PASS; chỉ3appsettings riêng còn modified local. Entry kết quả này được commit tài liệu nối tiếp; không amend/force-push lịch sử đã publish.

Theo câu hỏi về việc nhớ cập nhật worklog, bổ sung quy tắc kết thúc task/commit rõ trong root AGENTS.md, bên cạnh quy tắc đã có ở docs/AGENTS.md. Phiên sau đọc AGENTS và latest worklog từ repo; không chỉ dựa vào lịch sử chat. Không deploy, chạy migration hoặc sửa dữ liệu thật trong nhiệm vụ publish.

## React frontend tại ntc_react — 2026-10-18

Hoàn thành phạm vi frontend được user giao: đọc43docs và toàn bộ inventory Razor; tạo React19/TS/Vite trong ntc_react, phân tầng domain/repository/application/features, class/OOP cho session/API/cache/autosave; UI English với responsive sidebar/drawer, light/dark, modals, lazy rich editor và SPA cache theo owner. Các module auth/OTP/Google/recovery, notes/rich/checklist/Markdown/màu/emoji/labels/search/pin/drag,trash,reminders,inbox,profile/account/sessions,admin users/roles/audit/statistics có UI/API wiring. Route mapping và giới hạn tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md), runbook [React README](../ntc_react/README.md). Giữ Razor và toàn bộ backend/config hiện có.

Đã sửa các lỗi tìm thấy khi chạy browser: trash detail dùng API danh sách đã xóa, private cache evict đúng; autosave giữ oversized draft/error thay vì báo Saved sai; serialize version/idempotency khi mất ACK; rollback/revalidate partial pages; refresh single flight, response guard theo identity và tránh pending refresh hồi sinh phiên đã logout; form labels có association/help đúng; Markdown checklist canonical đúng schema API; custom background có foreground theo luminance. Conflict save-as-new dùng cùng coordinator có idempotency/guard busy.

Evidence local: typecheck/lint0warnings/build PASS; Vitest14PASS/4files. Chromium12PASS trong1.5phút, gồm actual pointer+keyboard drag,409 preserve draft/copy, lost-network retry/no duplicate, owner switch, auth code/recovery, reminder→API job→DB→inbox, profile/session và admin metadata. Sau chỉnh copy/save chạy focused conflict1PASS (8.3s), type/lint/unit14/build lại PASS. Screenshots desktop1280/mobile390/dark đã xem tại artifacts/frontend. npm runtime audit0 vulnerabilities. Backend strict Release0warning/0error; fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81,36s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_09_48_48.trx. Docs44Markdown/130links/0errors trước cập nhật worklog cuối.

Đối chiếu riêng384backend/source/Razor/config hashes vẫn nguyên byte; index đúng287baseline R100, HEAD/main/remotes giữ nguyên. Script rename cũ có assertion all refs lỗi vì app tự đổi refs/codex/turn-diffs; không sửa app refs hoặc reset index. Thêm .github/workflows/frontend.yml dùng Node24/.NET8/Chromium synthetic API, secret-free; chưa chạy remote CI. Không commit/push, apply owner DB, SMTP/Google thật, cloud deploy hoặc SQL→PG transfer. External config/jobs/uptime/backup/privacy operator notice còn theo cổng phát hành. Docs bên dưới là lịch sử theo thời điểm, không dùng số tests/frontend-path cũ làm hiện trạng.

## Đổi tên backend thành ntc_aspnet — 2026-10-17 (CURRENT)

Theo yêu cầu trực tiếp chủ dự án đổi folder NoteTatCa → ntc_aspnet. Git root vẫn NTC, docs duy nhất root docs. Đổi tên thư mục và path references trong README/AGENTS/architecture/docs/scripts/CI/Docker; không đổi tên sản phẩm, namespaces/project/assembly, Identity Data Protection application name hoặc GitHub remote. Thư mục frontend ntc_react hiện có được giữ nguyên.

Backup index/status/hash trước đổi tại .git/backend-rename-backup/20261017-235240.384source/config hashes đối chiếu nguyên byte, index chỉ remap prefix cũ sang ntc_aspnet để giữ staging hiện có; không stage nội dung code/config đang sửa. HEAD/branch/refs/remote giữ nguyên, không commit/push hoặc thao tác DB thật. Kiểm cuối từ root PASS: restore; Release strict build0warnings/0errors (17,94s); fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81 (40s); TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_54_42.trx. PublishAPI và dotnet-ef dbcontext list theo path ntc_aspnet PASS, nhận đúng SQLServer/PostgreSQL contexts, không truy cập DB thật. verify_docs43Markdown/123links/0errors. Verify rename xác nhận384source/config hashes nguyên byte, HEAD/branch/refs/remote và staged blob contents giữ nguyên,287rename100%; root links/CI targets hợp lệ. Docker/remoteCI/cloud không chạy trong tác vụ rename.

Các entries bên dưới giữ nguyên đường dẫn cũ như lịch sử. Lệnh hiện hành dùng root NTC với ntc_aspnet/ prefix, xem README và10.

## Chuyển Git root lên NTC và hợp nhất docs — 2026-10-17 (trước khi đổi tên backend)

Theo yêu cầu trực tiếp chủ dự án, Git root chuyển từ NTC/NoteTatCa lên NTC; docs duy nhất NTC/docs. Hai bản43Markdown trước thao tác byte-identical. .git/.config/.github/.gitignore/.dockerignore/.env.example/AGENTS/ARCHITECTURE/README/Dockerfile/render.yaml/scripts chuyển lên root, backend projects/solutions vẫn NoteTatCa và thư mục react trống giữ nguyên.

Recovery backup tại .git/root-relocation-backup/20261017-232836: Git bundle --all, index/config/status/working diff trước chuyển,441filehash và docs zip/archive. HEAD176a968/main/refs/remote giữ nguyên, không rewrite history. Index chỉ stage287 baseline rename100%; nội dung backend/appsettings trước đó vẫn unstaged, không commit/push. Tất cả441filehash được đối chiếu ngay sau move trước sửa docs/tool paths. Bản docs dư archive vào backup khi automatic command review chặn recursive delete; không còn NoteTatCa/docs trong cây dự án.

Đã cập nhật root AGENTS/README/architecture, docs/intake/plan/ADR/handover/AI prompt, scripts/verify_docs.py, Dockerfile/.dockerignore, CI trigger/build paths và frontend ignore rules. Không sửa .NET/Razor/config/migrations/database thật. Tool restore và restore filter từ root PASS. Strict Release build0warnings/0errors (16,46s), fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81 (26s), TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_31_22.trx tại root. PublishAPI root PASS; EF exportSQL idempotent2provider từ root PASS, không apply DB. OpenAPI inventory regenerate trực tiếp root docs:131operations. verify_docs:43Markdown/123local links/0errors; preservation check384backend/local-config/source hashes giữ nguyên sau sửa root files,287baseline rename100% index không đổi nội dung. Git fsck --full và bundle verify PASS, bundle gồm toàn bộ lịch sử. Root README links và CI/Docker/tool target paths kiểm tồn tại PASS. Không có Docker CLI nên Docker image build/remote GitHub CI/deploy chưa chạy.

Entries phía dưới là lịch sử có cwd/cấu trúc và test counts tại thời điểm cũ. Tác vụ mới dùng root README và10, không sync hoặc tạo lại NoteTatCa/docs.

## Hoàn thiện services/controllers — 2026-10-17 (trước khi chuyển root)

Theo yêu cầu chủ dự án và lời nhắc tiếp tục, đã hoàn thiện [contract](SERVICE-CONTROLLER-REVIEW.md) trước triển khai, rà tất cả business interfaces/services/DI/legacy/v1. Thêm presence-aware PATCH tag/reminder/profile, version response/guard; profile nullable-clear/missing-create, self phone; session metadata/revoke family; admin role/membership/search/deactivate/restore và audit12; inbox unread/bulk; password/mailbox bounds, HTML/link encoding và SMTP timeout retry. Không tạo public CRUD cho internal OTP/hash/delivery/audit writes. Giữ legacy routes/binding/envelope; linked-login exception bảo mật bỏ raw entity/provider keys.

SQL20261017160312 / PG20261017160333_SupportAccountReactivation chỉ mở CHECK action12, không sửa migration trước. Release strict `dotnet build NTC.Backend.slnf -c Release --no-restore -warnaserror -v minimal`:0warnings/0errors. Full suite **80PASS/0FAIL/1SKIP,total81**,59s, TRX `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_07_36.trx`.13 cases mới HTTP A/B/admin/anonymous; SQLLocalDB isolated migration fixtures PASS,4SQL/3PG histories/model/no-pending PASS. PostgreSQL runtime SKIP local vì chưa cóserver; không thay cloud verification.

Publish `dotnet publish NTC.API/NTC.API.csproj -c Release --no-build --no-restore -o artifacts/publish` PASS. ExportSQL idempotent2provider PASS, sequential EF CLI `--configuration Release --no-build`; chỉ generate scripts. Swagger export131controlleroperations (health riêng), mọi success schema/commonerror/access metadata kiểm qua test; legacy traceId có correlation regression.Kiểm cuối PASS:43Markdown/123local links/0errors, hai bản sync byte; verify_final xác nhận config hashes/Razor/migration lịch sử giữ nguyên, không staged và223changed/new text files UTF-8/common token patterns; git diff --check sạch.

Trong lượt focused test đầu có2assertion sai: role description trả chuỗi rỗng theo DTO cũ dù DB null, và login tạo sau tăng fake clock làm token future với validator real clock. Đã sửa assertion/fixture và fullsuite0fail; không bỏ test. Lệnh exportSQL dùng nhầm short -c được sửa thành --configuration (short -c thuộc context); export cuối PASS.

Không apply DB chủ dự án, email thật, Docker/GitHubCI/cloud/React E2E/backup restore hoặc SQL→PG transfer. Local appsettings hashes/Razor/source giữ nguyên, HEAD176a968 cộng working changes chưa commit/push. Các entries dưới là lịch sử theo thời điểm; dùng entry này cho test/migration/API/docs totals hiện hành.

## Rà entities theo yêu cầu tiếp theo —2026-10-17

Chủ dự án cho quyền bổ sung entities còn thiếu. Đã rà17 classes, model/migrations/service/DTO và viết [ENTITY-REVIEW](ENTITY-REVIEW.md). Thêm NoteTag.UserId/compositeFK, Notification/Delivery owner+parentFK, immutable occurrence/session identity, shared IAuditableEntity cho Identity, AdministrativeAuditEvent metadata + transactional writes/admin API, LastAttemptAt/AbandonedAt và retry crash cap, CHECK/expiry indexes. Title non-null/rỗng; profile trả canonical Identity email/locale, create validate gender/birthdate.

New migrations SQLServer20261017122802_EnforceEntityIntegrity, PostgreSQL20261017122809_EnforceEntityIntegrity. Không sửa các migration trước của hai history; user data không apply. Preflight invalid links dừng trước DDL; hợp lệ backfill owner. Report chỉ đọc scripts/preflight-entity-integrity-sqlserver.sql.

Lệnh PowerShell cwd backend repo: Release strict build0warning0error; dotnet test NTC.Tests -c Release --no-build --logger trx --results-directory artifacts/test-results đạt **67 PASS/0 FAIL/1 SKIP,total 68**,32 giây. TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_19_36_05.trx.17 case executions thêm so với fullsuite51 trước. SQLite owner/check/audit tests và SQLLocalDB migration/direct-SQL tests PASS; PostgreSQL runtime SKIP(local chưa cóserver), model/history/DDL/no-pending-model PASS. OpenAPI export116 operations,42 docs sync. Publish API và exportSQL idempotent cả2 provider PASS; git diff --check/config preservation kiểm cuối. Chưa Docker/CI/cloud/Google/SMTP/E2E hoặc migrationDB thật.

Trong vòng test đã sửa assertion profile lấy đúng data.profile thay data root; không đổi shape GET me. Audit chỉ append qua app, không chống privileged SQL. Retention audit chưa chốt Q-030, không tự purge; account hard delete vẫn chưa bật. Kết quả baseline bên dưới là mốc cũ; dùng lượt này cho CURRENT entities/test count.

## Bàn giao đợt backend

Git repo `D:\My Project\NTC\NoteTatCa`, branch main, HEAD `176a968e0debde118f09293b99222da3ee317b4b` cộng các thay đổi mới chưa commit/push. Hai appsettings API/VIEW đã modified trước phiên; SHA256 cuối khớp bản đầu. Không sửa source NTC.VIEW khác, không đổi migration lịch sử, không chuyển Git root và không apply/reset database thật.

Theo yêu cầu chủ dự án, đã đọc Marixa/docs/architecture/source, hoàn thiện contract docs trước code và chốt DEC-013–015: untitled, nhãn trùng, month-end/catch-up/restore và quota100.000 ký tự. Marixa chỉ làm nguồn phong cách phân tầng .NET, không nhập nghiệp vụ HR hoặc chỉnh repo tham chiếu.

Đã triển khai Core/contracts boundaries, actor/clock/base classes/UoW; auth/owner/self/admin; Identity email/Google proof/OTP DB/refresh rotation/reuse/revoke; rich schema/plain projection/icon/quota; autosave version/create key; nhãn/pin/reorder/search/trash; recurrence/inbox/email lease/purge/prune; admin metadata/statistics/lock; UTC/audit/immutable owner/concurrency; SQL additive và PostgreSQL baseline; telemetry/errors/health/CORS/rate limit; Docker/env/Render/CI và regression tests.

## Evidence đã chạy

PowerShell cwd backend repo trên Windows, target net8.0. Test dùng A/B/admin giả, fake Google/email/clock; SQLLocalDB fixture tạo/drop database tên riêng. Không đọc connection string chủ dự án hoặc gửi email thật từ tests.

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `dotnet build NTC.Backend.slnf -c Release --no-restore -warnaserror -v quiet` | PASS,0 warnings/0 errors | Filter loại Razor khỏi strict build; NTC.sln vẫn giữ Razor với6 warnings legacy |
| `dotnet test NTC.Tests/NTC.Tests.csproj -c Release --no-build --logger trx --results-directory artifacts/test-results -v minimal` | **50 PASS,0 FAIL,1 SKIP,total51**,17 giây | PostgreSQL runtime skip vì thiếu fixture local; Google/SMTP giả |
| TRX lần cuối | `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_17_25_51.trx` | Artifact local ignored, không dữ liệu thật |
| SQL legacy migration fixture | Giữ hash/account/note/UTC instant và version nonempty; duplicate email dừng trước DDL; stale version conflict | Chỉ database LocalDB biệt lập |
| Hai provider models/history/DDL/HasPendingModelChanges | PASS | Không thay PostgreSQL runtime |
| `dotnet publish NTC.API/NTC.API.csproj -c Release --no-build -o artifacts/publish` | PASS | Publish local, chưa Docker/deploy |
| Export SQL theo file10 bằng dotnet-ef Release/no-build/idempotent | PASS `artifacts/sqlserver-migrations.sql` và `artifacts/postgresql-migrations.sql` | Chỉ xuất script; PostgreSQL schema/history ntc trước tables |
| Swagger export + update_api_inventory.py |115 controller operations; v1 typed schemas/access metadata | Health ngoài inventory; ownership còn kiểm ở service |
| `python scripts/verify_docs.py` |41 Markdown,98 local links,0 errors; hai bản docs đồng nhất | Có kiểm UTF-8/H1/placeholder và JSON examples, không thay runtime |
| `git diff --check` và preserve checks | PASS; config hashes/migration lịch sử giữ nguyên | Không audit toàn lịch sử secret |

Lỗi đã phát hiện và sửa qua kiểm thử gồm reset token raw/outer encoding, label mutation/version, account/session state, rich PATCH omission/conversion, version ban đầu cho record cũ. Bổ sung regression không lộ recovery token trong log request, kể cả bật framework Information khi không mang appsettings vào Docker.

Full solution strict build gặp6 warnings Razor cũ; tạo backend filter, không sửa Razor. EF CLI xuất script đồng thời bị khóa chung obj; chạy lần lượt đã thành công. Totals ở trên là lần test cuối sau mọi thay đổi code.

## Chưa chạy và bước tiếp theo

NOT RUN: PostgreSQL runtime/SQL→PG data transfer; backup restore thật; Docker build (máy chưa có CLI); GitHub CI remote; Google/SMTP thật; cloud deploy; React/browser E2E/load. CI đã cấp PostgreSQL17 fixture cho kiểm tiếp theo. Render blueprint free chỉ demo, autoDeploy off/jobs off; chưa bảo đảm uptime nhắc lịch.

Trước production cần persistent Data Protection keyring, trusted proxy/CORS/TLS/private DB grants, backup/restore, uptime và purge candidates review. Worker mặc định tắt. React cần editor/Markdown UX, token storage/refresh coordination, autosave409 và E2E. Export/hard delete account,offline,budget/region/deadline còn mở trong hồ sơ; không hỏi lại các lựa chọn đã chốt.

Source backend hoàn tất phạm vi đợt hiện tại; không tự commit secret,push,deploy hoặc chạy jobs lên dữ liệu cũ.

## Lịch sử khảo sát và docs 2026-10-16

Các đoạn bên dưới là bằng chứng theo thời điểm cũ, không dùng làm hiện trạng source2026-10-17.

## Snapshot bàn giao

- Workspace `D:\My Project\NTC`; source Git repo `D:\My Project\NTC\NoteTatCa`, branch main, mốc khảo sát `d8f854b245c29bfb84bbf8f541822a6718fe4b2c`.
- Scope phiên: đọc docs_mau/source, phỏng vấn lựa chọn, tạo docs cá nhân hóa; không sửa API/React/Razor/DB hoặc deploy.
- Trước phiên docs: `NTC.API/appsettings.json`, `NTC.VIEW/appsettings.json` có thay đổi local để giữ secret, không được ghi đè.
- Bản soạn thảo docs ở NTC/docs. Theo yêu cầu push tiếp theo, thêm bản đồng bộ ở NoteTatCa/docs để commit vào Git repo hiện tại. Kế hoạch gom Git root lên NTC khi bắt đầu React đã được chọn, chưa thực hiện.
- Người dùng chốt các lựa chọn ở PROJECT-INTAKE. Một số chi tiết kỹ thuật như auth session, rich schema, scheduler và quota vẫn PROPOSED.
- Bước sau: người dùng giao hoàn thiện API; đọc 15/16/06/23 và quyết định hiện hành trước làm. Giữ NTC.VIEW.

## Khảo sát source

| Nguồn dưới NoteTatCa | Kết luận CURRENT |
| --- | --- |
| NTC.API/NTC.API.csproj và các project | Target net8.0, ASP.NET/EF/Identity/SQL Server |
| NTC.API/Program.cs, DependencyInjection.cs | Swagger/JWT/Google/CORS AllowRazor, SMTP/OTP/service DI |
| NTC.API/Controllers/*.cs | Route inventory, auth attribute không đồng nhất |
| NTC.Services/Service/NoteService.cs | List owner; detail/update/trash mutation thiếu owner; pin/reorder |
| TagService, NoteTagService, ReminderService | Nhãn/quan hệ/lịch; owner/scope/SaveAsync cần rà |
| AuthService và Infrastructure/OtpService.cs | Username login, OTP email/cache, Google JWT, chưa refresh/revoke rõ |
| NTC.Contract.Repositories/Entities và NTC.Repositories/Context/DatabaseContext.cs | Note/Tag/NoteTag/Reminder/Identity/profile, FK và constraints |
| NTC.ModelViews và NTC.Core/Base | DTO, response/page, nullable title/DB mismatch, audit |
| NTC.Core/Utils/CoreHelper.cs | Audit time dùng UTC+7 helper |
| NTC.VIEW/Program.cs, Pages, wwwroot | Razor consumer/session/Google; nguồn tham khảo, giữ nguyên |
| NTC.API/Properties/launchSettings.json | API HTTPS 5033, HTTP 5032 trong source |

Đây là khảo sát sơ bộ, không audit mọi dòng hoặc DB live. Không trích giá trị secret từ appsettings vào docs.

## Ma trận truy vết

| REQ | WF/RULE | Source / API / UI đích | TASK | Runtime |
| --- | --- | --- | --- | --- |
| REQ-001/009 | WF-001, RULE-009 | Auth/User/UserInfo/UserLogin; API-001/002/009 | TASK-003 | NOT RUN |
| REQ-002 | RULE-001 | Toàn bộ controller/service, file 16 | TASK-003 | NOT RUN |
| REQ-003/011 | WF-002 | Note/DTO/editor tương lai; API-004 | TASK-004/005 | NOT RUN |
| REQ-004/005 | WF-003 | Tag/NoteTag/NoteService; API-005/006 | TASK-004 | NOT RUN |
| REQ-006 | WF-004 | Note trash; API-007; purge chưa có | TASK-004/006 | NOT RUN |
| REQ-007 | WF-002 | Search chưa thấy trong API | TASK-005 | NOT RUN |
| REQ-008 | WF-005 | Reminder CRUD; dispatcher/inbox chưa có | TASK-006 | NOT RUN |
| REQ-010/012 | UI-001–009 | React chưa có; admin role API có nhưng chưa đủ scope đích | TASK-007/010 | NOT RUN |

## Nhật ký lệnh và kết quả

PowerShell, cwd `D:\My Project\NTC` trừ nơi ghi khác. Ngày 2026-10-16 theo múi giờ người dùng.

| Kiểm tra / lệnh | Kết quả / evidence | Giới hạn |
| --- | --- | --- |
| `rg --files 'D:\My Project\docs_mau'`; đọc AGENTS/README/intake và các mẫu | 39 file mẫu Markdown | Nguồn mẫu không phải yêu cầu sản phẩm |
| `rg --files -g AGENTS.md 'D:\My Project'` | Không thấy AGENTS áp dụng workspace NTC trước tạo docs | AGENTS dự án khác không áp dụng |
| `rg --files NoteTatCa` với filter source; Get-Content source có chọn lọc | Các nguồn bảng trên được khảo sát | Không phải runtime test |
| `git -C NoteTatCa status --short` | Chỉ hai appsettings local đã có thay đổi | Không sửa chúng trong phiên docs |
| `dotnet --list-sdks` | SDK 9.0.317 | Chưa kiểm .NET 8 runtime/SQL |
| `rg --files --hidden NoteTatCa` filter Test/YAML/package | Không tìm thấy suite test/CI/React package trong scope | Không suy ra PASS |
| Đọc docs chính thức Supabase/Render/Vercel, Supabase changelog | Source link tại 07/11/24; changelog lấy qua HTTP do web parser không hỗ trợ markdown | Chưa kiểm account/plan/tài nguyên |
| Phỏng vấn 2 vòng lựa chọn | TARGET được ghi với nguồn/ngày trong hồ sơ | Còn các chi tiết chưa duyệt |
| Tạo và kiểm docs | Kết quả kiểm cuối bổ sung bên dưới | Chỉ tài liệu |

Build, API HTTP, DB query/migration/seed, E2E, load, security runtime, worker email, deploy và restore: NOT RUN vì phiên này chỉ làm docs, không có thay đổi implementation.

## Vấn đề cần giải quyết khi làm API

| ID | Bằng chứng / mục tiêu | Đề xuất / trạng thái |
| --- | --- | --- |
| ISSUE-001 | Note/Tag/Reminder/NoteTag/UserInfo scope chưa đồng nhất | Auth/owner mọi entrypoint, P0 OPEN |
| ISSUE-002 | JWT/Google/OTP/account state cần rà | Token proof/unique email/rate limit/revoke, P0 OPEN |
| ISSUE-003 | Reminder mới có data, chưa dispatcher/inbox; purge chưa thấy | DB-backed jobs, OPEN |
| ISSUE-004 | Current DTO/route/validation không đồng nhất cho SPA | Version/adapter/envelope/OpenAPI, OPEN |
| ISSUE-005 | Title nullable ở entity/DTO nhưng DB required; DueDate DTO không thấy entity | Chốt rule/editor rồi migration additive, OPEN |
| ISSUE-006 | Git root cũ không bao bản soạn thảo docs/frontend | Docs đã có bản đồng bộ trong repo; bảo toàn history trước gom root NTC, OPEN cho giai đoạn React |
| ISSUE-007 | Migration baseline khác lịch sử, DB live chưa khảo sát | Inventory/backup/dry run, không reset, OPEN |

## Kết quả kiểm tài liệu cuối

2026-10-16, PowerShell cwd NTC: đối chiếu tên file bằng Get-ChildItem; đọc UTF-8 và regex kiểm local Markdown links, placeholder mẫu, ký tự thay thế và một số định dạng credential phổ biến. Kết quả: 39/39 file trùng tên bộ mẫu, không file thiếu/thừa; 67 link local có đích tồn tại; không placeholder mẫu, ký tự lỗi encoding hoặc pattern secret được phát hiện. Đây là kiểm tra mẫu secret phổ biến, không chứng nhận scan bí mật toàn diện hoặc audit lịch sử Git.

Rà consistency câu trả lời: Q-001–008 và Q-019–025 đã được lưu; UI tiếng Anh, trash 7 ngày, Identity giữ nguyên và editor unified được cập nhật ở nguồn chủ quản. Các chi tiết còn mở được giữ PROPOSED trong hồ sơ, không hỏi lại quyết định đã xác nhận.

`git -C NoteTatCa diff --name-only` cuối khảo sát vẫn chỉ hai file appsettings đã khác từ trước; HEAD vẫn d8f854b. Không có thay đổi code/Razor được thực hiện bởi nhiệm vụ docs. Bộ docs chưa nằm trong Git repo backend và chưa push. Kiểm tra docs PASS trong phạm vi trên; mọi test runtime vẫn NOT RUN.

## Lượt tiếp theo — đồng bộ GitHub theo yêu cầu người dùng

Người dùng yêu cầu push bộ docs. Giữ Git root hiện tại, cập nhật mô tả bản soạn thảo NTC/docs và bản đồng bộ NoteTatCa/docs; sao chép đủ 39 file rồi kiểm nội dung giống nhau, link và placeholder. Commit chỉ docs/, không stage hai appsettings local. Sau push, kiểm remote main trùng HEAD; kết quả commit/push được báo trong cuộc trò chuyện, không dự đoán SHA trong chính commit. Không sửa code, chuyển Git root, xóa Razor hoặc thay cấu hình local trong lượt này.

## Rà soát và triển khai 2026-10-17

Bắt đầu 2026-10-17: Git HEAD 176a968, chỉ hai appsettings có thay đổi pre-existing. Baseline API build PASS, 4 warnings; runtime .NET 8.0.30. Đã đọc reference Marixa/docs/source, chốt 3 câu nghiệp vụ và viết BACKEND-IMPLEMENTATION trước code. Chưa chạy test/migration/provider/cloud ở thời điểm ghi entry này.

## Mở rộng: xóa thêm footer “Keep what matters.” và “Privacy & data” ở admin/auth/public — 2026-10-21

- Theo yêu cầu “xóa luôn ở chỗ khác luôn để mở rộng diện tích”: xóa thêm 3 footer còn lại. Thay đổi thêm 3 file: ntc_react/src/app/AdminShell.tsx (gỡ footer workspace-footer admin), ntc_react/src/features/public/PublicPages.tsx (gỡ footer Landing), ntc_react/src/features/auth/AuthPage.tsx (gỡ footer auth section, giữ </section>). import Link/Logo vẫn dùng; không đổi CSS/auth/API/schema/dữ liệu.
- Validation: `npm run typecheck` PASS (0 error), `npm run lint` PASS (0 issue) từ ntc_react/. Chưa commit/push/deploy.
