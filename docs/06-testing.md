# 06 — Kiểm thử và bằng chứng

> 2026-10-17 | CURRENT:80 PASS,0 FAIL,1 SKIP trong 81 tests. Không thay thế production verification.

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
