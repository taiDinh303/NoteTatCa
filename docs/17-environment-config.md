# 17 — Cấu hình và biến môi trường

> 2026-10-17 | CURRENT keys; không có giá trị bí mật.

WebApplication.CreateBuilder dùng cấu hình .NET mặc định: JSON → JSON theo environment → user secrets ở Development nếu cấu hình → environment → command line. .NET key lồng dùng `__`; `.env.example` là registry, ASP.NET không tự đọc .env. Không in toàn bộ environment khi debug.

| Environment key | Ý nghĩa / default / secret |
| --- | --- |
| Database__Provider | SqlServer mặc định hoặc PostgreSQL; không chỉ thay connection string |
| ConnectionStrings__MyCnn | DB connection string đúng provider; secret chỉ backend |
| Jwtsettings__Key | HMAC secret≥32 bytes; bắt buộc |
| Jwtsettings__Issuer / Audience | JWT issuer/audience bắt buộc |
| Jwtsettings__ExpirationMinutes | Access TTL mặc định15, clamp1–60; RememberMe không kéo dài access |
| Authentication__Google__Enabled | false trong env mẫu để tắt; bỏ flag vẫn cho Google nếu có ClientId (legacy compatibility) |
| Authentication__Google__ClientId | Audience Google ID token; public identifier; API không cần ClientSecret |
| Cors__AllowedOrigins__0... | Origin cụ thể; local mặc định https://localhost:5037 và http://localhost:5173 |
| SmtpSettings__Host / Port / FromEmail / Password / EnableSsl | SMTP OTP/recovery/reminder; password secret, port587/SSLtrue mẫu |
| AppSettings__ClientUrl | Base URL link frontend email; phải trỏ trang auth/notes thật trước release |
| BackgroundJobs__Enabled | false mặc định; bật mới dispatch/email/purge/prune mỗi30 giây |
| Swagger__Enabled | false mẫu; Development/Testing vẫn bật |
| RateLimiting__AuthRequestsPerMinute | 20/IP/phút default, clamp1–1000 |
| RateLimiting__ApiRequestsPerMinute | 600/user hoặc IP/phút default, clamp1–10000 |
| DataProtection__KeysDirectory | Persist Identity token keyring; thư mục bảo vệ, chung qua replica/restart |
| Bootstrap__AdminEmail | Chỉ dùng explicit --grant-admin với user verified; không seed password |
| ASPNETCORE_ENVIRONMENT | Development local, Production cloud |
| PORT | Hosting port; Docker bind qua entrypoint |
| ApiSettings__BaseUrl | Legacy Razor API URL, chỉ khi chạy NTC.VIEW |

OTP10phút/5lần/60s, refresh7/30 ngày tuyệt đối, trash7 ngày, catch-up24 giờ và quota là policy hiện trong code; không có biến giả `Trash:RetentionDays`/`Reminder:CatchUpHours`. Đổi policy phải cập nhật test/docs.

Frontend ở ntc_react; `VITE_API_BASE_URL` mặc định /api/v1, `VITE_GOOGLE_CLIENT_ID` tùy chọn; `NTC_API_PROXY_TARGET` server-only mặc định http://localhost:5032, không đưa DB password/JWT key/SMTP secret vào đó. API/client Google OAuth configuration phải đồng bộ audience khi làm React.

JWT validate-on-start; Google thiếu ClientId hoặc Enabled=false trả503 GOOGLE_DISABLED khi gọi; không làm API startup thất bại. DB readiness chỉ CanConnect, không xác nhận migration. Connection target staging/prod và migration credential tách riêng; preview không dùng prod DB. Data Protection persist vẫn cần operator cấu hình trước production, không mặc định filesystem container bền vững.

Rotate: cấp credential mới → cập nhật secret store consumer → smoke → thu hồi cũ; JWT key đổi làm access/OTP hash cũ mất hiệu lực. Hai appsettings local đã modified trước phiên, không đổi/commit trong đợt code. Docker loại tất cả appsettings và env thật khỏi build context; cấp config bằng host env.

## Vị trí file sau khi gom root

.env.example ở NTC root; API settings vẫn ntc_aspnet/NTC.API/appsettings.json và appsettings.Development.json, Razor settings vẫn ntc_aspnet/NTC.VIEW. Không đổi nội dung connection string/secret khi chuyển Git root. Docker context root tiếp tục loại tất cả appsettings. Các biến environment vẫn ghi đè JSON theo thứ tự .NET mặc định.
