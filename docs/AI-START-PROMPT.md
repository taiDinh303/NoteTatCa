# Prompt tiếp tục NoteTatCa

> DRAFT | 2026-10-16 | Áp dụng: YES

Khối dưới dùng khi chủ dự án giao nhiệm vụ API tiếp theo. Đọc prompt này không tự cấp quyền thực hiện code.

```text
Tiếp tục NoteTatCa trong D:\My Project\NTC.
Đọc docs/AGENTS.md, docs/00-README.md, docs/PROJECT-INTAKE.md,
docs/01-plan.md, docs/15-api-contract.md, docs/16-security-privacy.md,
docs/06-testing.md và docs/worklog.md; kiểm tra hướng dẫn repo mới nếu có.

Backend Git repo hiện ở D:\My Project\NTC\NoteTatCa.
Frontend sẽ chuyển sang React trong workspace NTC; giữ nguyên NTC.VIEW.
Docs soạn thảo ở NTC/docs, bản đồng bộ GitHub ở NoteTatCa/docs.
Đồng bộ hai bản khi cập nhật trong workspace này. Không tự di chuyển .git.

Quyết định đã chốt: React TS/Vite ở frontend, UI tiếng Anh, public nhỏ;
Supabase chỉ PostgreSQL, giữ .NET Identity; API Render, React Vercel;
giữ account/note cũ; editor unified rich/checklist/Markdown shortcuts,
màu chữ/emoji/emoji đại diện; autosave+Save; trash 7 ngày; nhắc in-app/email
có lặp, timezone user mặc định Việt Nam, catch-up một lần trong 24h;
admin quản lý/khóa user và thống kê, không đọc nội dung note người khác.
Kế hoạch gom Git root NTC khi bắt đầu React đã được chọn nhưng chưa làm.

Hãy dùng câu trả lời đã ghi trong hồ sơ làm yêu cầu; câu chưa trả lời vẫn
là PROPOSED. Hỏi Yes/No hoặc A/B/C/D cho phần chặn công việc được giao.
Khảo sát lại source và git status, bảo toàn cấu hình/thay đổi local.

Nếu tôi giao hoàn thiện API: chốt phạm vi đợt API, contract và acceptance
criteria trước khi sửa; ưu tiên auth/ownership đồng nhất, validation,
transaction, migration an toàn và API phù hợp React. Kiểm thử hai tài khoản
với mọi đường truy cập note/tag/reminder/profile và thao tác bulk/reorder.
Không coi việc ẩn menu hoặc có JWT là đã bảo đảm quyền dữ liệu.

Hoàn thành phần đã giao, chạy kiểm tra phù hợp, ghi lệnh/môi trường/kết quả
vào docs/worklog.md và cập nhật tài liệu liên quan. Không tự deploy, reset
database hoặc thêm các tính năng ngoài phạm vi từ backlog.
```
