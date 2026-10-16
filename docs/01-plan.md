# 01 — Kế hoạch NoteTatCa

> 2026-10-16 | DRAFT | Áp dụng: YES

## Quyết định hiện hành

| ID | Nội dung | Trạng thái / nguồn | Ảnh hưởng |
| --- | --- | --- | --- |
| DEC-001 | Tạo docs theo đủ file docs_mau cho app ghi chú | TARGET, người dùng 2026-10-16 | Bộ tài liệu này |
| DEC-002 | Chuyển frontend sang React trong workspace NTC | TARGET, người dùng 2026-10-16 | Tách consumer API khỏi Razor |
| DEC-003 | Tạm giữ NTC.VIEW | TARGET, người dùng 2026-10-16 | Không xóa Razor trong phiên này |
| DEC-004 | Chỉ làm docs trước; API được giao sau | TARGET, người dùng 2026-10-16 | Không sửa implementation |
| DEC-005 | React TS/Vite ở frontend; .NET API Render, DB Supabase PostgreSQL tương lai, React Vercel; giữ Identity | TARGET Q-008/019 | ADR-002/003; SQL Server hiện tại chưa đổi |
| DEC-006 | Note riêng từng tài khoản; admin quản lý/khóa user và thống kê, không đọc nội dung note | TARGET Q-001/007 | Ownership, không chia sẻ/team |
| DEC-007 | Gom Git root lên NTC khi bắt đầu React sau khi lập kế hoạch bảo toàn | TARGET Q-025 | Chưa di chuyển Git trong phiên docs |
| DEC-008 | Unified rich editor: plain/checklist/rich/Markdown shortcuts, màu chữ/emoji/emoji đại diện; conversion cảnh báo | TARGET Q-003/020/021 | Schema version/renderer; không upload ảnh |
| DEC-009 | Autosave + Save, trạng thái lưu rõ | TARGET Q-023 | Version/conflict/idempotency |
| DEC-010 | Trash 7 ngày, restore/xóa hẳn sớm; reminder in-app/email có lặp, timezone user, catch-up 24h | TARGET Q-005/006/024 | Jobs/retention/notifications |
| DEC-011 | Giữ tài khoản/note cũ; UI tiếng Anh; hướng public nhỏ | TARGET Q-022/025 | Migration an toàn, nội dung UI và vận hành |

## Backlog theo thứ tự

| ID | Ưu tiên | Kết quả | REQ / phụ thuộc | Tiêu chí chấp nhận | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| TASK-001 | P0 | Khảo sát, cá nhân hóa đủ docs | DEC-001 | 39 file, không còn placeholder, link đúng, câu hỏi rõ | DONE: kiểm tra tại worklog |
| TASK-002 | P0 | Chốt hai vòng phỏng vấn chính | Q-001–008, Q-019–025 | Lưu câu trả lời, cập nhật yêu cầu/schema/API | DONE, câu trả lời chủ dự án 2026-10-16 |
| TASK-003 | P0 | Auth + ownership API | REQ-001/002/009, TASK-002 | 401 đúng; A không đọc/sửa/xóa dữ liệu B ở mọi endpoint | TODO, chờ giao API |
| TASK-004 | P0 | Chuẩn hóa note/tag/trash contract | REQ-003–006, Q-003/004/006/013/016 | Validation, DTO thống nhất, transaction, test âm | TODO |
| TASK-005 | P1 | Search và loại nội dung đã chọn | REQ-007/011, Q-003/004 | Tìm đúng trong phạm vi user; editor round-trip | TODO |
| TASK-006 | P1 | Reminder/inbox/email và worker purge 7 ngày | REQ-008, Q-005/006/024 | Gửi đúng, không trùng, restart không mất lịch; purge không xóa note đã restore | TODO |
| TASK-007 | P1 | React nền tảng + luồng auth/note | DEC-002, Q-008/012/013/017 | Luồng React→API→SQL→UI có test; giữ Razor | TODO, giai đoạn sau |
| TASK-008 | P1 | Migration/bảo toàn dữ liệu | Q-010, TASK-004/005/006 | Dry run, backup và kiểm tra owner/count | TODO |
| TASK-009 | P2 | Hosting/CI/backup/observability | Q-009/011 | Staging smoke và restore có evidence | TODO |
| TASK-010 | P1 | Admin quản lý/khóa user và thống kê không nội dung | REQ-012, Q-007 | Không đọc/sửa note người khác; lock có hiệu lực với phiên hiện tại | TODO |

Chủ dự án ưu tiên và giao nhiệm vụ; AI thực hiện theo phạm vi từng phiên. Hạn từng task CHƯA XÁC ĐỊNH (Q-011). Thứ tự API ưu tiên bảo vệ note trước khi mở thêm consumer React.

## Ready / Done

Ready của một hạng mục: biết actor, dữ liệu, quyền, request/response, lỗi, acceptance và câu hỏi chặn đã được giải quyết. Không cần chốt toàn bộ tính năng tương lai mới làm phần độc lập.

Done API: test nghiệp vụ/ownership trên DB test, contract tương thích consumer, cấu hình và migration rõ; cập nhật docs. Done React: chạy được luồng đã giao và giữ nhập liệu khi lỗi. Done docs không đồng nghĩa API/React hoàn thiện.
