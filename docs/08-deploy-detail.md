# 08 — Runbook triển khai dự thảo

> Quyết định mới 2026-10-18: job Production mặc định true theo chủ dự án, Storage NTC dự phòng; các đoạn jobs-off bên dưới là quy trình cũ trước quyết định này. Trạng thái/source/rollout xem [chuẩn cấu hình](CONFIGURATION-STANDARD.md).

> Chuẩn cấu hình hiện hành: [CONFIGURATION-STANDARD](CONFIGURATION-STANDARD.md) — JSON Production sạch, sáu biến triển khai cơ bản, kiểm cấu hình không chạm DB và script chung cho NTC/Marixa.

> Hosting2026-10-18: đã lưu cấu hình dashboard Render/Vercel NTC, chưa rollout source mới. Xem [runbook cụ thể](RENDER-VERCEL-SETUP.md) vàworklog; Save only không phải deployment thành công. Các bước bên dưới vẫn là checklist cho rollout sau.

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

CURRENT release runbook: chạy strict build/test/publish theo10 → Docker build trong CI/máy có Docker → backup/preflight/review DDL theo23 → schema/private role ntc → cấp env17 và persist DataProtection → bootstrap roles explicit → Google/SMTP/CORS/proxy smoke → triển khai API jobs off → review purge/uptime rồi bật. Docker/Render chưa chạy trong phiên; không dùng free demo để hứa uptime reminder. Trình tự dưới là runbook chưa thực thi trên cloud.

## Đầu vào bắt buộc

Commit release, môi trường, chủ vận hành, domain, Render service, Vercel project, Supabase project/DB, chiến lược auth, backup ID và migration đã dry run. Chưa có các đầu vào này nên runbook mô tả trình tự, không có lệnh deploy giả định chạy được.

| Bước | Nơi thực hiện | Thao tác / kết quả cần có | Điều kiện dừng |
| --- | --- | --- | --- |
| Precheck | Workspace + cloud đích đã xác định | Test 06; xác nhận runtime/provider/config/commit | Auth/owner fail hoặc nhầm môi trường |
| Backup | SQL nguồn / Supabase đích | Backup, restore sample và count | Chưa backup/restore hoặc dữ liệu chưa đối soát |
| Migration | Job riêng bằng DB credential hạn chế | Review SQL provider đúng; migration history và dữ liệu đúng | Drift/schema không tương thích |
| API | Render staging | Docker build .NET, bind PORT của service, health/readiness | Startup/config/SQL/TLS fail |
| Worker | Môi trường job đã chọn | Lease/dedup, reminder và purge hoạt động | Gửi trùng hoặc purge sai tuổi |
| Frontend | Vercel staging | Root frontend, lockfile, API base URL, SPA fallback | Lộ secret vào bundle hoặc refresh route 404 |
| Smoke | Browser + API + DB staging | Auth/email, note, search, trash, owner/admin | Bất kỳ dữ liệu chéo owner hoặc mất note |
| Release | Production được giao | Áp dụng thứ tự tương thích; ghi commit/URL/người làm | Không có phương án quay lại |
| Theo dõi | Log/metrics | 401/403/500/SQL/job/email và dữ liệu | Trigger rollback đã định |

Tham khảo: [Render Docker](https://render.com/docs/docker), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Supabase kết nối Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres), kiểm tra 2026-10-16. Dockerfile và render.yaml đã có; Docker build/hosting apply chưa chạy. Lệnh local build/test/publish và export SQL tại file10.

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
