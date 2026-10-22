# 17 — Cấu hình và biến môi trường

> Cloud2026-10-18: mapping env/dashboard tại [Render/Vercel](RENDER-VERCEL-SETUP.md), mẫu ở deploy/render.env.example vàdeploy/vercel.env.example; secrets export vào ignored artifacts/deployment. Source đã áp dụng [chuẩn cấu hình chung](CONFIGURATION-STANDARD.md): chỉ publish/copy appsettings.Production.json sạch, sáu biến triển khai cơ bản; dashboard cũ chưa cleanup/deploy trong đợt này.

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
| EMAIL__PROVIDER | Smtp mặc định để tương thích; Brevo dùng HTTPS API cho Render Free |
| EMAIL__FROMEMAIL / EMAIL__FROMNAME | Địa chỉ người gửi đã xác minh tại Brevo / tên hiển thị mặc định NoteTatCa |
| EMAIL__BREVO__APIKEY | API key Brevo, chỉ backend/Render secret store; không phải SMTP key |
| AppSettings__ClientUrl | Base URL link frontend email; phải trỏ trang auth/notes thật trước release |
| BackgroundJobs__Enabled | Production true theo quyết định mới; dispatch/email/purge/prune mỗi30 giây; fixture luôn tắt |
| Swagger__Enabled | false mẫu; Development/Testing vẫn bật |
| RateLimiting__AuthRequestsPerMinute | 20/IP/phút default, clamp1–1000 |
| RateLimiting__ApiRequestsPerMinute | 600/user hoặc IP/phút default, clamp1–10000 |
| DataProtection__KeysDirectory | Persist Identity token keyring; thư mục bảo vệ, chung qua replica/restart |
| Bootstrap__AdminEmail | Chỉ dùng explicit --grant-admin với user verified; không seed password |
| ASPNETCORE_ENVIRONMENT | Development local, Production cloud |
| PORT | Hosting port; Docker bind qua entrypoint |
| ApiSettings__BaseUrl | Cấu hình Razor lịch sử; không còn dùng sau DEC-020, không cần khai báo cho API/React |

OTP10phút/5lần/60s, refresh không hết hạn tự động (DEC-022; sentinel9999-12-31 UTC), trash7 ngày, catch-up24 giờ và quota là policy hiện trong code; không có biến giả `Trash:RetentionDays`/`Reminder:CatchUpHours`. Đổi policy phải cập nhật test/docs.

Frontend ở ntc_react; `VITE_API_BASE_URL` mặc định /api/v1, `VITE_GOOGLE_CLIENT_ID` tùy chọn; `API_PROXY_TARGET` server-only (NTC_API_PROXY_TARGET là alias cũ) mặc định http://localhost:5032, không đưa DB password/JWT key/SMTP secret vào đó. API/client Google OAuth configuration phải đồng bộ audience khi làm React.

JWT validate-on-start; Google thiếu ClientId hoặc Enabled=false trả503 GOOGLE_DISABLED khi gọi; không làm API startup thất bại. DB readiness chỉ CanConnect, không xác nhận migration. Connection target staging/prod và migration credential tách riêng; preview không dùng prod DB. Data Protection persist vẫn cần operator cấu hình trước production, không mặc định filesystem container bền vững.

Rotate: cấp credential mới → cập nhật secret store consumer → smoke → thu hồi cũ; JWT key đổi làm access/OTP hash cũ mất hiệu lực. Hai appsettings local đã modified trước phiên, không đổi/commit trong đợt code. Docker/publish chỉ nhận appsettings.Production.json sạch; local/base/Development JSON và env thật bị loại, secrets cấp qua hosting env.

## Vị trí file sau khi gom root

.env.example ở NTC root; API settings vẫn ntc_aspnet/NTC.API/appsettings.json và appsettings.Development.json, Razor NTC.VIEW và cấu hình của nó đã gỡ theo DEC-020; không còn là cấu hình chạy hiện hành. Không đổi nội dung connection string/secret khi chuyển Git root. Docker context root chỉ nhận production JSON sạch. Các biến environment vẫn ghi đè JSON theo thứ tự .NET mặc định.

## Supabase test profile

Profile local private appsettings.Supabase.Local.json do scripts/Use-Supabase.ps1 tạo; gitignore **/appsettings.*.Local.json. Script export Database__Provider/ConnectionStrings__MyCnn/Jwtsettings__Key và Supabase__ProjectRef/SessionPoolerHost cho child API, không set secret toàn máy. DemoAccounts__Enabled chỉ true cho explicit seed, password random riêng, production guard. Không publish key/private profile/manifest; xem [setup](SUPABASE-SETUP.md). API project URL/publishable key không thay DB password.

## Chuẩn cấu hình Supabase theo User Secrets — 2026-10-18

Ưu tiên [lệnh chung .NET/Supabase](SUPABASE-DOTNET-COMMANDS.md) theo yêu cầu đồng bộ với Marixa. API NTC đã có UserSecretsId; Development tự nạp secrets. Provider/connection ở User Secrets ưu tiên hơn appsettings local; remove hai key khi muốn trở về SQL Server. scripts/Use-Supabase.ps1 vẫn là tùy chọn riêng, environment của script ưu tiên hơn secrets; tránh dùng lẫn hai nguồn trong cùng lần chạy.

## Kiểm cấu hình trước khi chạy

Dùng scripts/Test-Configuration.ps1 hoặc --check-config; không mở DB/migration/worker/email. Lỗi CONFIGURATION_INVALID nêu key, không lộ giá trị. Production kiểm URL/CORS HTTPS, Supabase VerifyFull/CA và cấm auto provisioning. Quy trình mới và chuyển env dư ở [chuẩn cấu hình](CONFIGURATION-STANDARD.md).

## Quyết định nguồn cấu hình bổ sung — 2026-10-18

Issuer/audience/TTL và Swagger/seed chỉ khai báo trong Production JSON theo chuẩn bảo trì; Render không giữ bản lặp (chỉ bỏ JWT env sau khi image mới có JSON đã rollout). BackgroundJobs:Enabled=true trong JSON và BACKGROUNDJOBS__ENABLED=true trong mẫu env cho cả hai. Storage dùng tên Render SUPABASE__URL/SUPABASE__SERVICE_KEY, giữ tương thích ServiceKey nội bộ; NTC chuẩn bị credential cho ảnh note tương lai, chưa bật endpoint/adapter upload. Xem [chuẩn chung](CONFIGURATION-STANDARD.md) để phân biệt cấu hình dự phòng với tính năng đang có. Không tạo env rỗng.
