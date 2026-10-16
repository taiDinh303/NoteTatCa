# 34 — Rủi ro và quản lý thay đổi

> 2026-10-16 | DRAFT | Áp dụng: YES

| ID | Rủi ro / bằng chứng | Mức / tác động | Xử lý / chủ phụ trách |
| --- | --- | --- | --- |
| RISK-001 | Ownership không đồng nhất trong note/tag/reminder/profile | Cao, rò/sửa dữ liệu | API implementer, SEC-001–003, TC-003 |
| RISK-002 | Bản soạn thảo docs ngoài Git root; frontend tương lai cũng ngoài root | Trung bình, lệch bản hoặc thiếu source trên GitHub | Đồng bộ docs vào NoteTatCa/docs khi commit; lập kế hoạch root NTC trước React |
| RISK-003 | SQL Server→Postgres nhưng phải giữ account/note | Cao, mất dữ liệu/login hỏng | Backup/dry run/count/owner/password test, file 23 |
| RISK-004 | Nhiều định dạng editor, Markdown không giữ mọi màu/mark | Cao, mất nội dung/XSS | Canonical versioned doc, conversion warning, sanitizer |
| RISK-005 | Reminder có data nhưng chưa worker | Cao, không nhắc/gửi trùng | Outbox/occurrence/lease/dedup và test restart |
| RISK-006 | Purge 7 ngày chạy trên data cũ hoặc race restore | Cao, xóa nhầm note | UTC cutoff, inventory, recheck transaction, backup |
| RISK-007 | JWT chưa revoke, admin lock không đủ ngừng token | Cao, user khóa còn truy cập | ADR-003, account state và session invalidation |
| RISK-008 | Secrets local/history, Google error body | Cao, lộ credential | Giữ local, sanitize/log redaction, audit/rotation khi được giao |
| RISK-009 | Cloud plan/sleep/quota chưa xác định | Trung bình/cao, nhắc trễ/kết nối cạn | Chọn plan sau đo/budget, health/job metrics |
| RISK-010 | Cấu hình Razor/session/CORS không phù hợp React | Trung bình, auth/refresh fail | Contract SPA, origins/callback/cookie test |
| RISK-011 | Admin statistics lộ nội dung qua projection/log | Cao, trái quyết định người dùng | Aggregate-only, deny note content; TC-011 |

Các mức là đánh giá thiết kế từ source, chưa là kết luận khai thác runtime. Người quyết định phạm vi/chi phí là chủ dự án; người sửa API nhận hạng mục khi được giao. Deadline chưa chốt.

## Thay đổi yêu cầu

CR-001, 2026-10-16: chủ dự án chọn editor đầy đủ, màu chữ/icon, admin giới hạn nội dung, retention 7 ngày và lộ trình Supabase/Render/Vercel. Đã đưa vào hồ sơ/plan/ADR/API/test. CR-002, cùng ngày: Supabase DB-only + Identity, unified editor/emoji, giữ dữ liệu, autosave+Save, timezone/catch-up 24h, UI tiếng Anh và kế hoạch Git root NTC. Đã cập nhật tài liệu, chưa code.

Thay đổi tiếp theo phải ghi nguồn/ngày, REQ/RULE ảnh hưởng, schema/migration/API/UI/test/security/chi phí và người quyết định; không tự mở archive/share/attachments/AI từ một yêu cầu editor. Khi thay quyết định, giữ lịch sử và đánh dấu SUPERSEDED thay xóa nguồn cũ.
