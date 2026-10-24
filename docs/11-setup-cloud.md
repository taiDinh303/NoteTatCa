# 11 — Thiết lập cloud tương lai

> Quyết định mới 2026-10-18: job Production mặc định true theo chủ dự án, Storage NTC dự phòng; các đoạn jobs-off bên dưới là quy trình cũ trước quyết định này. Trạng thái/source/rollout xem [chuẩn cấu hình](CONFIGURATION-STANDARD.md).

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

Đã chuẩn bị source Docker/Render/CI, chưa tạo tài nguyên. PostgreSQL context/schema `ntc` không expose Data API; chỉ backend DB credential, Identity vẫn .NET. Chọn direct/session endpoint theo network và Npgsql/server workload trước release. Plan free trong blueprint chỉ demo, jobs off; persistent keys/uptime/backup/grants/region/budget cần operator chốt. Không chuyển dữ liệu bằng cách thay MyCnn; theo23.

## Tài nguyên mục tiêu

| Tài nguyên | Vai trò | Quyền/cấu hình cần thiết | Còn thiếu |
| --- | --- | --- | --- |
| Supabase project | Chỉ PostgreSQL, giữ Identity tại .NET | DB role riêng cho app; migrations role riêng; SSL; backup | Project/region/plan/quota |
| Render web service | .NET API bằng Docker đề xuất | Build context đúng repo, PORT, secret env, health path | Service/domain/plan production; Dockerfile đã có |
| Render worker hoặc scheduler đã chọn | Reminder, email delivery, purge trash 30 ngày | DB lease/dedup; lịch/timeout/monitor | Worker trong API đã có; cần uptime/plan trước bật |
| Vercel project | React TS/Vite | Root frontend, lockfile, public API base URL, routing SPA | Project/URL/domain/team |
| Google OAuth + SMTP | Login và gửi email | Redirect/origin đúng môi trường; secret server | Credential production/quota |

Chưa có giá/plan/region cụ thể; không lấy ngân sách của dự án khác. Chủ dự án xác định trước provision. Không tự mua hoặc tạo tài nguyên trong nhiệm vụ docs.

## Trình tự đề xuất

1. Theo quyết định giữ .NET Identity, bảo toàn dữ liệu và kế hoạch Git root NTC đã chốt; Git root NTC đã hoàn tất; xác định project/plan/region và budget trước provision.
2. Tạo môi trường test riêng; dùng PostgreSQL provider/baseline đã thêm, thực hiện data-transfer dry run, không chỉ đổi connection string.
3. Chọn direct connection/session pooler theo network thực tế của API dài hạn; kiểm SSL/pool size và prepared statements. [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Nếu chỉ API .NET truy cập dữ liệu, đề xuất tắt Data API; nếu expose schema, kiểm grants và RLS cho mọi bảng liên quan. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
5. Cấu hình Render Docker/API/job và environment; React Vercel dùng URL API công khai, không DB password hoặc service key.
6. CORS allowlist origin staging/production chính xác; không cho wildcard credential. Đăng ký OAuth và reset-password callback đúng URL React.
7. Setup logs/health/backup/cảnh báo; smoke hai user/admin và restore drill trước production.

Nguồn kiểm tra 2026-10-16: [Render Docker](https://render.com/docs/docker), [Background workers](https://render.com/docs/background-workers), [Cron jobs](https://render.com/docs/cronjobs), [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite). Uptime/sleep, quota, cron accuracy, pricing và backup retention phải kiểm ở plan thực tế lúc triển khai; chưa có evidence live account.

## Project ntc được người dùng cung cấp — 2026-10-18

Supabase project reference nxqupzwqawujtgeuvvcj đã kết nối trực tiếp Npgsql/VerifyFull, áp dụng3migrations/pending0 vàtạo5Identity accounts/25notes/15labels theo yêu cầu riêng. Xem [setup/giới hạn](SUPABASE-SETUP.md). Connector permission cũ không phủ định kết nối DB trực tiếp. Giữ .NET Identity, không dùng publishable key làm Npgsql password hoặc chuyển/xóa SQLServer data.

Render/Vercel đã có tài nguyên từ chủ dự án vàđã lưu dashboard2026-10-18: Render NoteTatCa Free/Singapore, Vercel kunheo-team/note-tat-ca. Source Docker/CA/SPA mới chưa publish/rollout; đọc [mapping/runbook](RENDER-VERCEL-SETUP.md), không áp nguyên cấu hình Marixa hoặc bật jobs trên Free chưa review uptime.
