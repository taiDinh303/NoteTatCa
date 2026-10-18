# 34 — Rủi ro và quản lý thay đổi

> 2026-10-17 | Đánh giá từ source/tests, chưa audit độc lập/live account.

| ID | Rủi ro / trạng thái | Xử lý tiếp theo |
| --- | --- | --- |
| RISK-001 | Ownership baseline FIXED trong source, regression A/B/admin | Giữ guard mọi route mới; không bypass admin content; production smoke |
| RISK-002 | FIXED cấu trúc root: docs/frontend nằm trong NTC Git root | Một root docs, history/config giữ nguyên; dùng prefix backend trong CI/Docker/scripts |
| RISK-003 | SQL→PG cần giữ account/note/hash | SQL fixture PASS; runtime PG/dry run/restore thật còn mở, xem23 |
| RISK-004 | Editor format/Markdown/XSS | Backend whitelist/schema 1 có tests; React renderer/paste/conversion warning/E2E còn mở |
| RISK-005 | Reminder/email ACK, contention/uptime | DB worker/lease/dedup đã có; SMTP at-least-once, in-flight race; test replica/cloud và chọn always-on |
| RISK-006 | Purge dữ liệu cũ hoặc restore race | Cutoff/recheck transaction có tests; jobs off cho đến candidate/backup review |
| RISK-007 | Phiên cũ sau revoke/lock | FIXED DB session/stamp/role check; React refresh coordination và client storage/XSS cần kiểm |
| RISK-008 | Secrets local/history/token keyring | Config local giữ nguyên; không audit lịch sử/rotate thật; persist keys trước production |
| RISK-009 | Cloud sleep/quota/network chưa chọn | Blueprintfree chỉ demo; plan/region/budget/backup/uptime cần chủ dự án chốt |
| RISK-010 | Legacy Razor/new contract và provider collation | Giữ routes, re-login JWT cũ, proof linking mới; Razor E2E và Unicode search semantics chưa kiểm thật |
| RISK-011 | Admin aggregate/log lộ note | No-content projection và tests; không đưa payload vào telemetry mới |

Chủ dự án quyết định phạm vi/chi phí/deadline; người triển khai cập nhật risk theo evidence, không tự đóng risk cloud từ test fixture.

## Thay đổi yêu cầu

CR-001,2026-10-16: editor đầy đủ/màu/icon, admin no-content, trash7 ngày, Supabase/Render/Vercel. CR-002,cùng ngày: DB-only/Identity, unified editor/emoji, giữ dữ liệu, autosave+Save, timezone/catch-up24 giờ, UI English và kế hoạch Git root. CR-003,2026-10-17: tham khảo Marixa, docs trước/backend sau; untitled/duplicate labels,month-end clamp,latestcatch-up/restorefuture,100.000 ký tự/1MiB/20 nhãn/5 active reminders. CR-001–003 đã phản ánh backend/docs trong phạm vi hiện tại; frontend/cloud còn riêng.

Thay đổi tiếp theo ghi nguồn/ngày, REQ/RULE/ADR liên quan, ảnh hưởng schema/API/UI/security/test/chi phí. Giữ quyết định cũ đánh dấu SUPERSEDED khi thay; không tự mở sharing/archive/attachments/AI từ yêu cầu editor. Xem [hồ sơ](PROJECT-INTAKE.md), [plan](01-plan.md), [contract](BACKEND-IMPLEMENTATION.md).

CR-004,2026-10-17: theo yêu cầu chủ dự án chuyển .git và repository files lên NTC, dùng một docs ở NTC/docs, giữ backend NoteTatCa. Đã cập nhật ADR/plan/intake/README/AI instructions/CI/Docker/scripts. Lịch sử/remote/working changes giữ nguyên,287 rename baseline stage; không commit/push hoặc thay dữ liệu/config thật. Bản docs dư archive vào Git backup thay vì xóa khi automatic command review chặn thao tác xóa thư mục.
