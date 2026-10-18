# 01 — Kế hoạch NoteTatCa

> 2026-10-17 | WORKING PLAN | Áp dụng: YES

## Quyết định hiện hành

| ID | Nội dung | Trạng thái / nguồn | Ảnh hưởng |
| --- | --- | --- | --- |
| DEC-001 | Tạo docs theo đủ file docs_mau cho app ghi chú | TARGET, người dùng 2026-10-16 | Bộ tài liệu này |
| DEC-002 | Chuyển frontend sang React trong workspace NTC | TARGET, người dùng 2026-10-16 | Tách consumer API khỏi Razor |
| DEC-003 | Tạm giữ NTC.VIEW | TARGET, người dùng 2026-10-16 | Không xóa Razor trong phiên này |
| DEC-004 | Docs trước, rồi backend; nhiệm vụ backend được giao 2026-10-17 | TARGET, người dùng 2026-10-16 và 2026-10-17 | Đợt mới theo BACKEND-IMPLEMENTATION |
| DEC-005 | React TS/Vite ở frontend; .NET API Render, DB Supabase PostgreSQL tương lai, React Vercel; giữ Identity | TARGET Q-008/019 | ADR-002/003; SQL Server hiện tại chưa đổi |
| DEC-006 | Note riêng từng tài khoản; admin quản lý/khóa user và thống kê, không đọc nội dung note | TARGET Q-001/007 | Ownership, không chia sẻ/team |
| DEC-007 | Git root NTC, một docs tại root; backend giữ ntc_aspnet | IMPLEMENTED theo yêu cầu trực tiếp 2026-10-17, nối tiếp Q-025 | Giữ HEAD/history/remote và thay đổi đang làm; cập nhật CI/Docker/scripts |
| DEC-008 | Unified rich editor: plain/checklist/rich/Markdown shortcuts, màu chữ/emoji/emoji đại diện; conversion cảnh báo | TARGET Q-003/020/021 | Schema version/renderer; bản hiện tại chưa upload ảnh, xem DEC-016 |
| DEC-009 | Autosave + Save, trạng thái lưu rõ | TARGET Q-023 | Version/conflict/idempotency |
| DEC-010 | Trash 7 ngày, restore/xóa hẳn sớm; reminder in-app/email có lặp, timezone user, catch-up 24 giờ | TARGET Q-005/006/024 | Jobs/retention/notifications |
| DEC-011 | Giữ tài khoản/note cũ; UI tiếng Anh; hướng public nhỏ | TARGET Q-022/025 | Migration an toàn, nội dung UI và vận hành |

## Quyết định bổ sung 2026-10-18

DEC-016: chủ dự án yêu cầu chuẩn bị SUPABASE__URL/SUPABASE__SERVICE_KEY cho ảnh note tương lai; mới cấu hình dự phòng, chưa giao triển khai upload trong lượt này. Giữ private owner/bucket; không dùng ảnh public như attendance Marixa. JWT issuer/audience/TTL và Swagger/demo lấy JSON Production; BackgroundJobs true ở cả hai project. Source/template/docs cập nhật, dashboard/deploy chưa thao tác trong lượt này.

## Backlog theo thứ tự

| ID | Ưu tiên | Kết quả | REQ / phụ thuộc | Tiêu chí chấp nhận | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| TASK-001 | P0 | Khảo sát, cá nhân hóa đủ docs | DEC-001 | 39 file, không còn placeholder, link đúng, câu hỏi rõ | DONE: kiểm tra tại worklog |
| TASK-002 | P0 | Chốt hai vòng phỏng vấn chính | Q-001–008, Q-019–025 | Lưu câu trả lời, cập nhật yêu cầu/schema/API | DONE, câu trả lời chủ dự án 2026-10-16 |
| TASK-003 | P0 | Auth + ownership API | REQ-001/002/009, TASK-002 | 401 đúng; A không đọc/sửa/xóa dữ liệu B ở mọi endpoint | DONE backend; tests file 06, UI/cloud riêng |
| TASK-004 | P0 | Chuẩn hóa note/tag/trash contract | REQ-003–006, Q-003/004/006/013/016 | Validation, DTO thống nhất, transaction, test âm | DONE backend; tests file 06, UI/cloud riêng |
| TASK-005 | P1 | Search và loại nội dung đã chọn | REQ-007/011, Q-003/004 | Tìm đúng trong phạm vi user; editor round-trip | DONE backend; tests file 06, UI/cloud riêng |
| TASK-006 | P1 | Reminder/inbox/email và worker purge 7 ngày | REQ-008, Q-005/006/024 | Gửi đúng, không trùng, restart không mất lịch; purge không xóa note đã restore | DONE backend; tests file 06, UI/cloud riêng |
| TASK-007 | P1 | React nền tảng + luồng auth/note | DEC-002, Q-008/012/013/017 | Luồng React→API→SQL→UI có test; giữ Razor | Triển khai local; evidence FRONTEND-IMPLEMENTATION |
| TASK-008 | P1 | Migration/bảo toàn dữ liệu | Q-010 | SQL additive fixture PASS; PG baseline/model/script PASS | PARTIAL: live SQL→PG dry run/restore TODO |
| TASK-009 | P2 | Hosting/CI/backup/observability | Q-009/011 | Docker/CI/Render assets + telemetry/health | PARTIAL: GitHub/Docker/cloud/restore NOT RUN |
| TASK-010 | P1 | Admin quản lý/khóa user và thống kê không nội dung | REQ-012, Q-007 | Không đọc/sửa note người khác; lock có hiệu lực với phiên hiện tại | DONE backend; tests file 06, UI/cloud riêng |

Chủ dự án ưu tiên và giao nhiệm vụ; AI thực hiện theo phạm vi từng phiên. Hạn từng task CHƯA XÁC ĐỊNH (Q-011). Thứ tự API ưu tiên bảo vệ note trước khi mở thêm consumer React.

## Ready / Done

Ready của một hạng mục: biết actor, dữ liệu, quyền, request/response, lỗi, acceptance và câu hỏi chặn đã được giải quyết. Không cần chốt toàn bộ tính năng tương lai mới làm phần độc lập.

Done API: test nghiệp vụ/ownership trên DB test, contract tương thích consumer, cấu hình và migration rõ; cập nhật docs. Done React: chạy được luồng đã giao và giữ nhập liệu khi lỗi. Done docs không đồng nghĩa API/React hoàn thiện. Quyết định DEC-012–015 và acceptance đợt backend tại [BACKEND-IMPLEMENTATION](BACKEND-IMPLEMENTATION.md).

## Rà soát và triển khai 2026-10-17

Trình tự triển khai: foundation/auth/owner → editor/note/tag/trash → reminder/inbox/jobs → admin/provider/migration/ops → regression + cập nhật CURRENT. Frontend/cloud data cutover vẫn ngoài scope implementation đợt này.

## Quyết định đợt backend

DEC-012–015 tại [implementation](BACKEND-IMPLEMENTATION.md): scope backend, note untitled/label trùng, month clamp/catch-up/restore, quota100.000 ký tự. Backend DONE không bao gồm React, chuyển dữ liệu thật hoặc cloud release.

## TASK-011 — Rà và củng cố entities

DONE source + fixture tests, theo yêu cầu tiếp theo2026-10-17.17 entities, owner/parent composite FK, shared Identity audit, administrative audit metadata/API, delivery diagnostics/crash retry và provider migrations. Full suite67 PASS/1PostgreSQLruntimeSKIP; không apply data thật. [Phạm vi/evidence](ENTITY-REVIEW.md).

## TASK-012 — Hoàn thiện services/controllers

DONE backend local: PATCH presence/version; profile/account/session API; admin roles/deactivate/restore/search; inbox unread/bulk; input/email handling; typed Swagger và legacy trace.80PASS/1PGskip,total81, Release strict/publish/provider fixtures PASS;131 operations,43 docs sync. [Phạm vi/evidence](SERVICE-CONTROLLER-REVIEW.md). Production gates/React/data cutover vẫn riêng, không coi local tests là phát hành.

## TASK-013 — Gom Git root và docs

IMPLEMENTED theo yêu cầu chủ dự án: Git ở NTC/.git, một NTC/docs, metadata/tool/CI/deploy/scripts ở root, backend giữ ntc_aspnet. Hai bản43docs đã đối chiếu byte-identical; bản dư được archive trong .git/root-relocation-backup.287 baseline renames được stage để giữ tracking; các sửa backend/config trước đó vẫn unstaged, không commit/push. Build Release/root tool restore/restore/publish/SQL export PASS; fullsuite80PASS/1PGskip,total81 và Git preservation/fsck/bundle checks PASS. Evidence tại worklog. Các đề nghị sync hai bản trong entries cũ đã được thay thế bởi DEC-007 hiện hành.

## Đổi tên thư mục backend

Theo yêu cầu chủ dự án 2026-10-17: backend hiện là ntc_aspnet, Git root/docs root không đổi. Source/config/history giữ nguyên; CI/Docker/scripts và lệnh trong docs đã cập nhật. Bằng chứng kiểm sau đổi tên tại worklog. Không đổi tên sản phẩm/remote hoặc scaffold frontend trong tác vụ này.

## React 2026-10-18

Theo yêu cầu mới, frontend chính thức ở ntc_react; các module Razor có route/SPA thay thế và module mới theo API. Quyết định cache, editor, session và phạm vi xác minh tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md). Cloud/data cutover và giữ Razor là các ranh giới riêng.
