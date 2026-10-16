# 08 — Runbook triển khai dự thảo

> 2026-10-16 | DRAFT | Áp dụng: YES | NOT RUN; chưa có release, project cloud, URL hoặc artifact

## Đầu vào bắt buộc

Commit release, môi trường, chủ vận hành, domain, Render service, Vercel project, Supabase project/DB, chiến lược auth, backup ID và migration đã dry run. Chưa có các đầu vào này nên runbook mô tả trình tự, không có lệnh deploy giả định chạy được.

| Bước | Nơi thực hiện | Thao tác / kết quả cần có | Điều kiện dừng |
| --- | --- | --- | --- |
| Precheck | Workspace + cloud đích đã xác định | Test 06; xác nhận runtime/provider/config/commit | Auth/owner fail hoặc nhầm môi trường |
| Backup | SQL nguồn / Supabase đích | Backup, restore sample và count | Chưa có backup hoặc Q-010 chưa rõ |
| Migration | Job riêng bằng DB credential hạn chế | Review SQL provider đúng; migration history và dữ liệu đúng | Drift/schema không tương thích |
| API | Render staging | Docker build .NET, bind PORT của service, health/readiness | Startup/config/SQL/TLS fail |
| Worker | Môi trường job đã chọn | Lease/dedup, reminder và purge hoạt động | Gửi trùng hoặc purge sai tuổi |
| Frontend | Vercel staging | Root frontend, lockfile, API base URL, SPA fallback | Lộ secret vào bundle hoặc refresh route 404 |
| Smoke | Browser + API + DB staging | Auth/email, note, search, trash, owner/admin | Bất kỳ dữ liệu chéo owner hoặc mất note |
| Release | Production được giao | Áp dụng thứ tự tương thích; ghi commit/URL/người làm | Không có phương án quay lại |
| Theo dõi | Log/metrics | 401/403/500/SQL/job/email và dữ liệu | Trigger rollback đã định |

Tham khảo: [Render Docker](https://render.com/docs/docker), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Supabase kết nối Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres), kiểm tra 2026-10-16. Lệnh Docker/hosting chính xác sẽ điền sau khi có Dockerfile, project và plan; hiện chưa tạo chúng.

## Rollback

PROPOSED trigger: lỗi quyền, mất dữ liệu, login hỏng hoặc tỷ lệ 5xx tăng vượt ngưỡng đã chốt. Dừng worker có tác động; chọn artifact trước tương thích schema; phục hồi luồng đọc/ghi; xác minh hai user và admin. Rollback frontend/API không đảo ngược migration hoặc trả lại dữ liệu purge. Nếu restore DB, phải quyết định xử lý các ghi mới sau backup và freeze write khi cần.

## Troubleshooting

| Triệu chứng | Kiểm tra | Xử lý / xác nhận |
| --- | --- | --- |
| API không start | Google/JWT config, runtime, PORT | Sửa config bằng secret store; restart; health |
| Browser CORS fail | React origin, API scheme, allowlist | Origin cụ thể; preflight và request thật |
| SQL connect fail | Provider, SSL, network/pooler/credentials | Kiểm kết nối an toàn không in chuỗi; query test |
| Email không đến | SMTP/log delivery/rate limit | Retry có kiểm soát; không gửi trùng OTP/reminder |
| SPA route refresh 404 | Vercel routing cấu hình | Fallback phù hợp; không rewrite API sang index |
| Job chậm/mất lịch | Worker uptime, lease, cursor, timezone | Replay theo policy; kiểm dedup trước gửi |
