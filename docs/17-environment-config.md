# 17 — Cấu hình và biến môi trường

> 2026-10-16 | DRAFT | Áp dụng: YES | Chỉ tên biến, không giá trị bí mật

## Registry CURRENT

| Key .NET / tên environment | Ý nghĩa | Bắt buộc | Secret / consumer |
| --- | --- | --- | --- |
| ConnectionStrings:MyCnn / ConnectionStrings__MyCnn | SQL Server hiện tại; Postgres sau đổi provider | DB | Có / API DbContext |
| Jwtsettings:Key / Jwtsettings__Key | Khóa ký JWT | Startup auth | Có / API/AuthService |
| Jwtsettings:Issuer / Jwtsettings__Issuer | Issuer | JWT validate/generate | Không / API |
| Jwtsettings:Audience / Jwtsettings__Audience | Audience | JWT validate/generate | Không / API |
| Jwtsettings:ExpirationMinutes / Jwtsettings__ExpirationMinutes | TTL bình thường, int >0 | Login | Không / AuthService |
| Jwtsettings:RememberMeExpirationMinutes / Jwtsettings__RememberMeExpirationMinutes | TTL RememberMe hiện tại | Password login | Không / AuthService |
| Authentication:Google:ClientId / Authentication__Google__ClientId | Google client ID | Source startup hiện bắt buộc | Public identifier, không in giá trị thật / API và Razor |
| Authentication:Google:ClientSecret / Authentication__Google__ClientSecret | Google client secret | Source startup hiện bắt buộc | Có / server API và Razor |
| SmtpSettings:Host/Port/FromEmail/Password/EnableSsl | Kết nối SMTP | Gửi OTP/recovery/email reminder | Password secret; server |
| Appsettings:BaseUrl / Appsettings:ClientUrl | URL API/client trong config hiện có | Rà EmailService/template trước đổi link | Không / backend |
| ApiSettings:BaseUrl / ApiSettings__BaseUrl | API URL cho Razor | Khi chạy NTC.VIEW | Không / Razor |
| ASPNETCORE_ENVIRONMENT | Chọn môi trường | Mọi deployment | Không / host |

.NET dùng `__` thay dấu `:` cho biến lồng nhau. Source Program nạp appsettings.json, appsettings theo Environment rồi environment variables; có mặc định builder trước đó, phải kiểm precedence thực tế nếu thêm provider. Không giả định user-secrets luôn thắng sau AddJsonFile tùy chỉnh. Chưa cấu hình UserSecretsId cho API được xác minh.

## Registry TARGET/PROPOSED

| Tên | Mục đích | Trạng thái / nơi lưu |
| --- | --- | --- |
| VITE_API_BASE_URL | API Render/local URL công khai | PROPOSED frontend; không chứa secret |
| VITE_GOOGLE_CLIENT_ID | Google identifier cho SPA nếu flow cần | PROPOSED, không client secret |
| Cors:AllowedOrigins / Cors__AllowedOrigins__0... | Allowlist React/Razor theo môi trường | PROPOSED; code hiện hardcode AllowRazor |
| Reminder:CatchUpHours | Policy gửi bù, đã chốt 24h | Cần code config; không có hiện tại |
| Trash:RetentionDays | 7 ngày đã chốt | Cần code config; không có hiện tại |
| PORT | Port do Render cung cấp | Bind trong Docker/entrypoint tương lai |
| DB migration credential | Credential DDL riêng | Secret store/release job, không app client |

Nếu chỉ dùng Supabase PostgreSQL, không cần đưa publishable/service key vào React. DB connection credential chỉ nằm Render/local backend. Cấu hình staging/production tách hoàn toàn; preview không dùng DB prod.

## Kiểm tra và rotation

Validate presence/type/range/URL tại startup mà không log giá trị. Thiếu Google hiện làm app throw trước chạy; cần test config fixture phù hợp. Khi đổi provider phải đổi cả EF/Npgsql config và migrations, không chỉ MyCnn. Cấp credential mới → cập nhật consumer → smoke → thu hồi cũ; không in environment toàn bộ. Appsettings local đang khác bản sanitize trên GitHub, phải bảo toàn khi sửa repo.
