# 06 — Kiểm thử và bằng chứng

> 2026-10-19 | CURRENT backend:114 PASS,0 FAIL,1 SKIP trong115tests. Các mốc80/81 bên dưới là lịch sử; không thay thế production verification.

## Nút ghim editor — 2026-10-21

Focused Chromium **2/2 PASS (1.2phút gồm startup)**: light/dark, Pin/PinOff và aria-pressed, nền nút trong suốt, màu theo heading vàng/tối/đỏ custom, lưu ghim/bỏ ghim qua close/reload/reopen. Custom color input được đặt bằng native value setter+DOM events, không kiểm OS color picker. Đã xem hai ảnh header đỏ ở artifacts/frontend/editor-pin-light.png và editor-pin-dark.png.

Lint max-warnings0/typecheck/Production build và .NET Release tuần tự0warning/0error PASS. Không unit/fullbrowser/backend suite rerun cho thay đổi icon/CSS này; chỉ fixture riêng, không xác minh production/thiết bị thật. Chi tiết ở worklog.

## Zoom trong menu tài khoản — 2026-10-21

Focused Chromium **4/4 PASS (1.6phút gồm startup)**: menu Zoom (x%) mở dialog, nhập/Enter/blur/empty/clamp, nút−/+ bước10% và disabled ở biên, blur90 rồi+ ra100, reset, persistence67%/reload, focus Done/Escape và viewport mobile; Ctrl-wheel/HUD, pinch/tap trong bảng và admin không personal requests. Đã xem ảnh dark/mobile150%. Không full27browser/backend rerun.

29Vitest+4configuration, lint/typecheck/Production build PASS. Build .NET song song ban đầu lỗi MSB4166 worker; rerun tuần tự -m:1 -nodeReuse:false PASS0warning/0error, nguyên nhân worker chưa xác định. Chỉ fixture SQLite/captured email; chưa cloud/điện thoại vật lý/Safari/Firefox. Chi tiết ở worklog. Quyết định hiện hành bổ sung mục menu và dialog, vẫn không có nút zoom riêng trên topbar; gesture giữ nguyên.

## Gesture zoom50–150% và bỏ sidebar tip — 2026-10-21

Focused Chromium **4/4 PASS (1.9phút gồm startup)**: Ctrl-wheel50–150%, wheel thường không zoom, deltaMode lines, legacy preference42→50/reload, HUD giữa dưới/auto-hide, DPR không đổi; mobile hai ngón không nhân đôi native zoom (visualViewport.scale1), một ngón vẫn cuộn và editor giữ nội dung; admin isolation, responsive và không còn nút/dialog/sidebar-tip.

Bổ sung pinch bắt đầu ở drag handle: không request reorder hoặc mở note ngoài ý muốn. Rerun pinch + pointer/keyboard reorder + autosave network retry **3/3 PASS (47.3giây gồm startup)**; không cộng ca pinch lặp thành ca mới. 29Vitest+4configuration, lint/typecheck/Production build và backend Release0warning/0error PASS; chưa full26browser/backend rerun. Đã xem ảnh HUD trên mobile editor; chỉ fixture riêng, chưa thiết bị vật lý/Safari/Firefox/production. Những mốc slider25–150% bên dưới đã được thay thế bởi gesture50–150%.

## Thanh kéo và nhập zoom25–150% — 2026-10-21

Focused Chromium **3/3 PASS (1.6phút gồm startup)**: range kéo chuột, keyboard Home/ArrowRight, nhập73% và commit Enter/blur, clamp ngoài biên/ô trống/reset, persistence/layout25–150% và admin isolation. Ca mobile isMobile/hasTouch dùng CDP touch events **1/1 PASS (25.6giây gồm startup)**: vuốt150%, nhập42%, reload vẫn42 và hai control đồng bộ. Đã xem ảnh bảng zoom ở25%/42% trong viewport390×844; trigger/dialog vẫn đọc và bấm được.

29Vitest+4configuration, lint/typecheck/Production build và .NET Release0warning/0error PASS. Không full26browser/backend rerun trong tác vụ control này; các mốc full24/focused3 bên dưới là lịch sử trước thay đổi control. Fixture SQLite/captured email riêng, chưa điện thoại vật lý/Safari/Firefox hoặc production rollout; xem worklog.

## Thu phóng và scrollbar — 2026-10-21

Full Chromium **24/24 PASS (3.3phút gồm startup)** sau sửa menu ngoài viewport khi zoom; kiểm preset75–150%, persistence/reload, SPA không reload, sidebar copy removal, Ctrl+K, scrollbar light/dark, drawer/editor và admin isolation. Sau rà ảnh, bổ sung CSS xuống hàng dải màu/thao tác footer ở mobile150%; focused **3/3 PASS (55.9giây gồm startup)** sau thay đổi cuối, thêm bounds từng nút ở320/390px, Close trong viewport và giữ nội dung. Không cộng rerun thành ca mới; full24 là mốc ngay trước CSS footer, focused3 là mốc cuối.

**29 Vitest + 4 configuration PASS**, lint max-warnings0/typecheck/Production Vite build PASS (lint/build lại sau CSS cuối); backend solution Release0warning/0error, không backend-suite rerun trong tác vụ UI này. Đã xem ảnh desktop/mobile zoom. Chỉ fixture SQLite/captured email; chưa Safari/Firefox, điện thoại vật lý hoặc production rollout. Chi tiết tại worklog; dùng CSS zoom/container queries trên trình duyệt hiện đại.

## Chi tiết tiến trình và animation — 2026-10-20

**29 Vitest + 4 configuration PASS**, lint max-warnings0/typecheck/Production build PASS. Focused browser **5/5 PASS**: kết nối, multi-page preload/task labels/progress/cache/mobile/reduced-motion, offline restore, retry collection và admin. Kiểm Loading notes/labels khi request bị giữ, Account details ready khi API xong, progress6/7 khi chỉ notes còn chờ; indeterminate server progress không aria-valuenow giả. CSS transform spinner phải đổi theo thời gian; reduced-motion duration được giảm. Unit kiểm task waiting/loading/ready, failed/cancel/retry/reset và admin chỉ có me/stats.

Sau chỉnh banner login không che heading, rerun ca kết nối **1/1 PASS** và lint/unit/build lại PASS. Không cộng ca rerun hoặc coi đây là full browser/backend rerun; full22ca ở phần dưới là mốc trước UI bổ sung. Đã xem ảnh desktop/mobile; chưa kiểm cloud rollout/cold start Render thật trong lượt này.

## Preparation/cache/kết nối — 2026-10-20

**22/22 Playwright Chromium PASS trong một lượt**, **27 Vitest + 4 configuration PASS**, ESLint max-warnings0/TypeScript/Production Vite build PASS; backend Release strict0warnings/0errors. Không chạy lại full backend suite vì không đổi backend runtime/schema; browser fixture bridge bổ sung health forwarding và serialization cho connection SQLite dùng chung. Lượt full trước21PASS/1FAIL phát hiện Inbox giữ snapshot rỗng; đã sửa revalidate nền khi mount và xác nhận thông báo dispatch mới xuất hiện.

Ca mới: health503/HTML→JSONlive trước một login POST, tải đủ3pages note và tái dùng notes/label cache khi điều hướng, giữ GET Inbox/Reminders đang chờ mà UI cached vẫn hiển thị, progress desktop/mobile390, lỗi collection retry không login lại, offline bootstrap giữ refresh session rồi restore. Unit kiểm đủ pages, admin không personal calls, bỏ kết quả sau account/reset, nguồn partial/invalidated không suy diễn cache, shared/bounded health probes, không idle keep-alive hoặc replay write, refresh outage không expire và bootstrap cũ không xóa phiên mới. Các luồng editor/draft/network retry/role/admin cũ cùng đạt.

Đã xem ảnh connecting/preparing desktop/mobile trong artifacts. Mọi API/DB/mail là fixture loopback/synthetic; không đo cold start Render thật, account lớn, SQLServer/PostgreSQL concurrency mới hoặc cloud deployment. Test bridge serialize SQLite, production requests vẫn song song. Chi tiết phạm vi/giới hạn ở worklog; các mốc frontend17/18 và backend cũ dưới đây được giữ làm lịch sử.

## Tối giản workspace/editor — 2026-10-20

Bổ sung bỏ heading/mô tả đầu trang Reminders/Inbox và heading nhìn thấy của Trash/label, icon Menu chung desktop/mobile: focused browser **3/3 PASS (50.1 giây)**. Kiểm semantic heading sr-only, không copy cũ, action Mark all as read/cảnh báo Trash còn hiển thị, navigation SPA/label, sidebar hai trạng thái/persistence và reminder→inbox. Không thêm hoặc chạy lại toàn bộ suite cho chỉnh sửa trình bày này.

Bổ sung theo yêu cầu khôi phục nút thu/phóng: mặc định fullscreen, chuyển sang modal căn giữa rồi trở lại bằng click/bàn phím, giữ content và kiểm mobile390. Focused browser **3/3 PASS** gồm toggle/layout, lazy title focus và network retry; lint/typecheck/Production build PASS, backend Release0warnings/0errors. Không chạy lại full suites trong lượt bổ sung; evidence 18/18 dưới là lượt trước khi thêm lại toggle.

Frontend: **4 configuration + 17 Vitest PASS**, lint max-warnings0, TypeScript/Production build PASS. Browser Chromium **18/18 PASS trong một lượt** sau sửa lỗi fullscreen animation và lazy editor giành focus từ title. Thêm kiểm tra xóa/thêm lại title ở note đã lưu; chạy lại đúng regression này **1/1 PASS** sau chỉnh autofocus theo draft hiện tại, lint/build chạy lại PASS. Backend Release0warnings/0errors; không chạy lại full backend suite vì không đổi backend.

Các ca kiểm: editor phủ viewport desktop/mobile, title tùy chọn, counter/Close cố định khi cuộn nội dung dài, Close chờ autosave, lỗi mạng/retry không tạo trùng, conflict giữ draft, Markdown, sidebar ẩn/hiện nhớ lựa chọn và không reload, một điểm tạo note/labels, không toast thành công thường. Ca tải editor chậm giữ request module để mở title trước khi editor sẵn sàng và xác nhận focus được giữ. Luồng account/admin cũ cùng đạt. Đã xem ảnh desktop1280/mobile390; dùng fixture SQLite/captured email biệt lập, không DB/email/cloud thật. Chi tiết lượt thất bại trước khi sửa và giới hạn ở [worklog](worklog.md); chưa push/deploy.

## Tách admin — 2026-10-19

Release strict0warnings/0errors; fullbackend114PASS/1PGfixtureSKIP. Tests xác thực admin-only và Admin+User đều bị403 tại workspace v1/legacy nhưng dùng được admin/self-account; DB role mới ưu tiên JWT cũ, non-admin owner404 và account/note được giữ. Seeder mới không cấp User/tạo content admin. Auth frontend có regression cache/response isolation khi cùng account chuyển nhóm quyền.

Frontend4config+17VitestPASS, lint/typecheck/Production buildPASS. Browser15ca được kiểm qua hai lượt: run toàn bộ14PASS/1FAIL assertion checkbox đợi ACK, sửa test và rerun đúng ca1PASS. Admin flows: login/refresh/deep link, SPA/mobile390/no workspace requests, create/detail/lock/unlock/deactivate/restore account, role edit/delete/membership, audit và non-admin denied. Customer note/drag/editor/settings/auth các ca cũ vẫnPASS. Ảnh desktop/mobile đã xem; fixture SQLite/email captured, không dùng owner DB/SMTP/cloud. TRX/screenshots/giới hạn tại [worklog](worklog.md).

## Kết quả và môi trường

Release build `NTC.Backend.slnf -warnaserror`:0 warnings/0 errors. Suite NTC.Tests:80 passed,1skipped(PostgreSQL runtime vì chưa có server fixture loopback). Publish API PASS. TRX/OpenAPI ở artifacts, lệnh và evidence [worklog](worklog.md), cách chạy [10](10-setup-local.md).

HTTP dùng WebApplicationFactory + SQLite in-memory, fake clock/email/Google; không đọc owner connection string hoặc gửi email thật. SQLServer LocalDB tests tạo/drop DB riêng NTC_Test_<guid>: apply baseline → insert account/hash/note cũ → additive → kiểm preserve và version nonempty; duplicate email dừng trước DDL; hai DbContext stale write conflict. PostgreSQL model/DDL/history/no-pending-model checks PASS; runtime fixture test chưa chạy local. CI đã cấu hình PostgreSQL 17, chưa có GitHub run.

| Nhóm source trong NTC.Tests | Coverage đã chạy |
| --- | --- |
| AuthorizationTests / HardeningTests | Anonymous, owner A/B, legacy/v1, parent/link sai owner, profile/admin no-content, lock/rate limit/untrusted forwarded IP |
| SessionTests | OTP/register/email verification, login/Google proof, refresh rotation/reuse/family expiry, logout/revoke/lock, reset raw/encoded token |
| NoteTests | CRUD/PATCH/limits/rich whitelist, malformed input, idempotency, version conflict, duplicate tags/link version, reorder/trash/restore |
| MaintenanceTests | Recurrence dispatch/dedup/catch-up, email retry, restore future, cutoff purge, expired identity state prune |
| Unit recurrence/document tests | Month-end/leap/DST/timezone/ending bounds và nội dung an toàn |
| ProviderTests / MigrationSafetyTests | Hai provider models/history, SQL additive preserve/duplicate preflight/stale concurrency |
| ContractTests | Swagger/body schemas/access metadata/export, CORS/health/envelope/trace; request logs không lộ recovery query token khi framework Information bật |
| ServiceControllerTests |13 cases HTTP: PATCH/version/null/owner, reminder cursor/limits, profile missing/create/overpost, session family, admin lifecycle/roles, inbox bulk, password bounds, email escaping/timeout, DI/Swagger/legacy trace |
| PostgresTests | SKIP local; runtime migrate/round-trip Unicode/Identity/UTC trên DB riêng nếu cấp NTC_TEST_POSTGRES |

React browser/unit có evidence riêng tại FRONTEND-IMPLEMENTATION. Không chạy: real Google/SMTP, load, backup restore, SQL→PG data transfer, Docker, remote CI/cloud. Các hàng TC dưới là acceptance matrix đầy đủ; coverage nhiều biên đã có backend tests nhưng không đồng nghĩa toàn bộ tổ hợp E2E đã PASS. Khi code đổi chạy focused suite phù hợp rồi cập nhật evidence.

## Ma trận nghiệm thu

| ID | REQ/WF | Thiết lập / thao tác | Kết quả mong đợi | Mức |
| --- | --- | --- | --- | --- |
| TC-001 | REQ-001/WF-001 | OTP đúng/sai/hết hạn/tái sử dụng; đăng ký trùng email | Xác minh đúng, mã dùng một lần, duplicate được xử lý | Integration |
| TC-002 | REQ-001 | Login email/password; Google token sai audience; token hết hạn | Phiên đúng; token sai bị từ chối; lỗi ổn định | Integration |
| TC-003 | REQ-002 | A gọi mọi list/detail/mutation với ID note/tag/reminder của B | Không dữ liệu hoặc tác động của B; anonymous 401 | Security integration |
| TC-004 | REQ-003 | Tạo/sửa note, title 150/151; rỗng/null; màu không hợp lệ | Lưu đúng hoặc 400 theo rule đã chốt; không 500 do schema lệch | Integration |
| TC-005 | REQ-004 | Gán lại nhãn, gán tag B, xóa nhãn đang dùng | Không trùng; từ chối chéo owner; note còn nguyên | Integration |
| TC-006 | REQ-005 | Pin/unpin rồi tải lại | Nhóm/thứ tự/PinnedAt đúng, server quản lý audit | Integration/E2E |
| TC-007 | REQ-005 | Reorder neighbor khác owner/nhóm/self; hai request đồng thời | Không sửa dữ liệu khác; thứ tự ổn định hoặc conflict rõ | Integration |
| TC-008 | REQ-006 | Soft delete→trash→restore→hard delete | Active/trash nhất quán; graph được xử lý nguyên tử | Integration/E2E |
| TC-009 | REQ-006 | Trash 6d23h59m và đúng 7 ngày, job chạy lặp, race restore | Chỉ purge đủ 7 ngày; không xóa note active; retry an toàn | Integration với clock giả |
| TC-010 | REQ-008/WF-005 | Tới hạn/lặp/timezone; restart; gửi trùng; note trash; SMTP lỗi | Không mất lịch/nhắc note xóa; dedup; retry và tín hiệu lỗi | Worker integration |
| TC-011 | REQ-009/012 | User sửa profile B; user gọi admin; admin mở note A; khóa A khi còn token | Từ chối; admin không đọc nội dung; khóa có hiệu lực theo policy phiên | Security integration |
| TC-012 | REQ-011 | Plain/checklist/rich/Markdown; màu chữ/emoji/icon; HTML script/link nguy hiểm | Round-trip đúng format hỗ trợ; không XSS; conversion không âm thầm mất dữ liệu | Contract/E2E |
| TC-013 | REQ-007 | Search title/content, dấu tiếng Việt, pagination, lọc tag, note trash/B | Chỉ kết quả đúng scope và thứ tự ổn định | Integration |
| TC-014 | REQ-010 | React login→tạo/sửa→search→trash→restore; mobile/keyboard | Luồng đầy đủ, focus đúng, lỗi lưu giữ dữ liệu nhập | E2E |
| TC-015 | REQ-003 | Ghi thành công mất ACK; autosave hai tab | Không tạo trùng vô ý; conflict rõ, giữ bản nhập | Integration/E2E, Q-013 |
| TC-016 | File 23 | Dry run SQL Server→Postgres; owner/ID/audit/format | Count/quan hệ/instant đúng; account login đúng theo phương án auth | Migration |
| TC-017 | File 22 | Restore backup vào DB biệt lập | Đăng nhập/đọc note/owner/reminder đúng, đo RPO/RTO | Recovery |
| TC-018 | File 16 | Nếu bật Supabase Data API: thử anon/user A/user B và grants/RLS | Không có đường vòng đọc/sửa note hoặc Identity | Security integration |

## Quy tắc fixture và nghiệm thu

Không chạy integration bằng DB chứa dữ liệu thật. PostgreSQL fixture chỉ nhận loopback/admin database postgres, tạo/drop tên ntc_test_<guid>; SQL LocalDB chỉ drop tên đã validate. Không reset database ngoài fixture. Fake Google kiểm luồng service/proof, không chứng minh Google SDK/network hoặc credential production.

Lỗi quyền/mất note/purge sai là cổng dừng phát hành. Build xanh không thay kiểm runtime provider và restore. Chỉ ghi test PASS khi có kết quả, ghi rõ SKIP/NOT RUN theo môi trường.

## Evidence rà entities

Full suite sau thay đổi: **67 PASS,0 FAIL,1 SKIP,total 68**; TRX `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_19_36_05.trx`. Build Release strict: 0 warnings/0 errors; publishAPI/scriptSQL PASS. EntityIntegrityTests + EntityMigrationTests bổ sung17 case executions so với suite 51 test trước, gồm4 trường hợp owner/parent, invalid scalar/session/lease, Identity audit/canonical email, audit admin/no-content/append-only/custom-role delete, crash cuối email và SQL migration preflight/backfill.

Test dữ liệu cũ SQLServer giữ hash/note/nhãn/instant rồi backfill NoteTag.UserId. SQL preflight với label/notification/delivery sai dừng50002 trước DDL, không merge/xóa. PostgreSQL fixture đã thêm baseline→upgrade/backfill nhưng vẫn SKIP local; model/history/DDL/no-pending-model checks PASS. Không thay thế PostgreSQL runtime hoặc live database migration.

## Evidence services/controllers hiện hành

Full suite cuối **80 PASS,0 FAIL,1 SKIP,total81**,59 giây, TRX `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_07_36.trx`. Release strict0warning/0error; publish API; SQL idempotent hai provider; model/history4SQL/3PG/no-pending-model PASS. PostgreSQL runtime còn SKIP local.13 tests mới chạy qua API/service với A/B/admin/anonymous và dữ liệu riêng; không gửi email thật.

Các fixture mới còn xác nhận restore account không unlock/reverify/hồi token cũ, role changes revoke phiên target, không overpost email/lock/role qua me/account, session output chỉ4metadata fields. Swagger mọi controller action có success schema, common errors và quyền; legacy response có correlation traceId.

## Kiểm lại sau chuyển root

PowerShell cwd NTC root: restore/tool restore PASS; build ntc_aspnet/NTC.Backend.slnf Release -warnaserror0warnings/0errors; fullsuite80PASS/0FAIL/1PGskip,total81,26s. TRX root artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_31_22.trx. Publish ntc_aspnet/NTC.API từ root và EF SQL exports hai provider PASS. Không sửa source .NET trong task cấu trúc.

verify_docs root duy nhất43Markdown/123links/0errors; HEAD/branch/refs/remote và384backend/config hashes giữ nguyên;287 baseline renames thuần stage; git fsck/bundle verify PASS. CI/Docker paths đã cập nhật nhưng chưa chạy remote/image build. Các evidence trước ở cwd backend và docs hai bản là lịch sử.

## Kiểm lại sau đổi folder thành ntc_aspnet

PowerShell cwd NTC: dotnet restore/build ntc_aspnet/NTC.Backend.slnf PASS, Release strict0warnings/0errors. Fullsuite80PASS/0FAIL/1PostgreSQLruntimeSKIP,total81,40s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_54_42.trx. Publish API và EF context discovery theo đường dẫn mới PASS; không apply migration hoặc đổi database.43Markdown/123links/0errors;384source/config hashes nguyên byte và Git history/refs/remote/staged blob contents giữ nguyên. Docker/remoteCI/cloud chưa chạy.

## React local — 2026-10-18

14unit và12Chromium E2E PASS; focused conflict chạy lại sau copy/save fix PASS. Scope từng luồng/giới hạn tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md). Không coi SQLite E2E là Supabase/SQL Server deployment proof. Backend được chạy lại80PASS/1PostgreSQLskip,total81; TRX mới trong worklog.

## Supabase provisioning và mẫu — 2026-10-18

Explicit yêu cầu người dùng apply migrations và seed data: cloud project ntc đã apply3histories PostgreSQL, pending0;5Identity accounts,25notes/15labels/25owner links. Read-only transaction kiểm roles/password hashes/verified state/rich projection/counts/anon-authenticated grants PASS. HTTP thật local API→Supabase:5login, mỗi account4active notes/1trash/3labels, admin đọc note user01 trả404; thu hồi các phiên verification và dừng server kiểm tra. Đây là operator acceptance trên dữ liệu mẫu mới, không chạy regression tests vào owner DB.

Regression riêng SQLite/synthetic:7DemoAccountTests PASS gồm content validation/owner graph/idempotence sau chỉnh sửa hoặc xóa mẫu, no email và account collisions. Fullsuite95PASS/0FAIL/1SKIP,total96,33s; PostgreSQL fixture test vẫn SKIP vì không cấu hình test DB biệt lập, không đổi thành owner connection. TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_58_37.trx. Build backend Release -warnaserror0warnings/0errors PASS. Browser React→Supabase, SMTP/Google thật, deploy, restore/SQL→PG transfer NOT RUN.

## Editor alignment — 2026-10-21

Focused Chromium6/6: optional title/fullscreen/counter gọn, ghim light/dark/persist, Markdown, căn giữa rồi autosave/reload/bỏ căn giữa ở desktop/mobile. Frontend30Vitest+4config; backend121PASS/1SKIP PostgreSQL opt-in, gồm7 regression allowlist alignment. Lint/typecheck/Production build và .NET Release0warning/0error PASS. Fixture loopback, không DB thật/email thật; không coi là fullbrowser/production evidence. Chi tiết publication scope ở worklog.

## Menu căn lề4 lựa chọn — 2026-10-21

Hồi quy desktop/mobile chọn trái/giữa/phải/đều từ một menu, lưu và reload từng giá trị. API allowlist nhận4 giá trị trên paragraph/heading, vẫn reject unsafe/null/wrong node. Các kết quả thực tế và phạm vi publication ghi ở worklog.
