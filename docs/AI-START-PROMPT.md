# Prompt tiếp tục NoteTatCa

> 2026-10-17 | Hướng dẫn tiếp quản theo nhiệm vụ người dùng mới giao.

```text
Workspace và Git root D:\My Project\NTC; backend ở ntc_aspnet/.
Đọc root AGENTS.md/ARCHITECTURE.md, docs/AGENTS.md, 00-README,
PROJECT-INTAKE, BACKEND-IMPLEMENTATION, API, testing và worklog mới nhất.
Backend .NET8 đã triển khai legacy adapters + /api/v1, owner/self/admin scope,
rich JSON, autosave/version, reminders/inbox/SMTP lease, refresh/session,
SQL additive migration và PostgreSQL baseline. Kiểm source/status lại trước sửa.
Đừng coi snapshot docs-only 2026-10-16 là hiện trạng mới.

NTC.VIEW đã gỡ theo DEC-020; không tạo lại. React TS/Vite hiện ở NTC/ntc_react; đọc FRONTEND-IMPLEMENTATION, UI English.
Supabase chỉ PostgreSQL; Identity .NET; API Render; React Vercel.
Giữ account/hash/ID/note/audit; không apply/migrate/reset database thật tự động.
Note private; admin không đọc content; untitled và duplicate label hợp lệ.
Text100k/title150/tag50/rich1MiB/20tag/5active reminder mỗi note.
Editor rich/checklist/Markdown shortcuts/màu/emoji, autosave+Save.
Trash7ngày; reminder timezone user Việt Nam, catch-up1lần gần nhất/24h,
month clamp giữ anchor, restore tương lai. Worker mặc định tắt.

Docs duy nhất NTC/docs; không tạo lại ntc_aspnet/docs hoặc nested .git.
.config/.github/scripts/Dockerfile/render.yaml/AGENTS/README ở root.
Chạy lệnh từ root, dùng ntc_aspnet/ prefix cho .NET project/solution.
Bảo toàn appsettings local pre-existing; không stage secret; giữ root NTC đã chọn.
Hỏi yes/no hoặc ABCD chỉ cho nghiệp vụ còn mở cần cho việc được giao.
Tiếp tục hoàn thành công việc đã giao, chạy focused checks, ghi evidence thực tế.
Không tuyên bố PostgreSQL/cloud/Docker/Google/SMTP/browser đã pass nếu chưa chạy.
```
