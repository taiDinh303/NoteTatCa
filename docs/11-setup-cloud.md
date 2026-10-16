# 11 — Thiết lập cloud tương lai

> 2026-10-16 | DRAFT | Áp dụng: YES | Nhà cung cấp đã chọn; tài nguyên/plan/quota chưa xác minh

## Tài nguyên mục tiêu

| Tài nguyên | Vai trò | Quyền/cấu hình cần thiết | Còn thiếu |
| --- | --- | --- | --- |
| Supabase project | Chỉ PostgreSQL, giữ Identity tại .NET | DB role riêng cho app; migrations role riêng; SSL; backup | Project/region/plan/quota |
| Render web service | .NET API bằng Docker đề xuất | Build context đúng repo, PORT, secret env, health path | Service/Dockerfile/domain/plan |
| Render worker hoặc scheduler đã chọn | Reminder, email delivery, purge trash 7 ngày | DB lease/dedup; lịch/timeout/monitor | Chọn worker/cron, uptime/budget |
| Vercel project | React TS/Vite | Root frontend, lockfile, public API base URL, routing SPA | Project/URL/domain/team |
| Google OAuth + SMTP | Login và gửi email | Redirect/origin đúng môi trường; secret server | Credential production/quota |

Chưa có giá/plan/region cụ thể; không lấy ngân sách của dự án khác. Chủ dự án xác định trước provision. Không tự mua hoặc tạo tài nguyên trong nhiệm vụ docs.

## Trình tự đề xuất

1. Theo quyết định giữ .NET Identity, bảo toàn dữ liệu và kế hoạch Git root NTC đã chốt; xác định thời điểm chuyển root, project/plan/region và budget trước provision.
2. Tạo môi trường test riêng; chuyển EF SQL Server sang PostgreSQL có migration/dry run, không chỉ đổi connection string.
3. Chọn direct connection/session pooler theo network thực tế của API dài hạn; kiểm SSL/pool size và prepared statements. [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Nếu chỉ API .NET truy cập dữ liệu, đề xuất tắt Data API; nếu expose schema, kiểm grants và RLS cho mọi bảng liên quan. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
5. Cấu hình Render Docker/API/job và environment; React Vercel dùng URL API công khai, không DB password hoặc service key.
6. CORS allowlist origin staging/production chính xác; không cho wildcard credential. Đăng ký OAuth và reset-password callback đúng URL React.
7. Setup logs/health/backup/cảnh báo; smoke hai user/admin và restore drill trước production.

Nguồn kiểm tra 2026-10-16: [Render Docker](https://render.com/docs/docker), [Background workers](https://render.com/docs/background-workers), [Cron jobs](https://render.com/docs/cronjobs), [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite). Uptime/sleep, quota, cron accuracy, pricing và backup retention phải kiểm ở plan thực tế lúc triển khai; chưa có evidence live account.
