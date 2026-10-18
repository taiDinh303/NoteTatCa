# 10 — Chạy local và kiểm tra backend

> 2026-10-17 | Lệnh đã kiểm ở [worklog](worklog.md); không apply DB của chủ dự án.

## Build/test biệt lập

PowerShell, cwd `D:\My Project\NTC`. Cần SDK tương thích net8.0 và Python3 cho kiểm docs. Package Microsoft ASP.NET/EF8.0.32, Npgsql EF8.0.11; local dotnet-ef8.0.32 tại .config/dotnet-tools.json.

```powershell
dotnet tool restore
dotnet restore ntc_aspnet/NTC.Backend.slnf
dotnet build ntc_aspnet/NTC.Backend.slnf -c Release --no-restore -warnaserror
dotnet test ntc_aspnet/NTC.Tests/NTC.Tests.csproj -c Release --no-build --logger trx --results-directory artifacts/test-results
python scripts/verify_docs.py
dotnet publish ntc_aspnet/NTC.API/NTC.API.csproj -c Release --no-build -o artifacts/publish
```

NTC.Backend.slnf không build Razor; NTC.sln vẫn giữ Razor với6warning legacy chưa sửa. Tests dùng SQLite và database SQLLocalDB `NTC_Test_<guid>` do fixture tạo/drop trên Windows. Không dùng owner connection string. PostgreSQL runtime test chỉ chạy khi NTC_TEST_POSTGRES trỏ loopback database quản trị postgres; fixture tạo/drop ntc_test_<guid>. Không trỏ biến test vào Supabase/DB thật.

## Chạy API bằng database riêng đã chuẩn bị

Xem [.env registry](17-environment-config.md), nhập credential qua shell/secret store; không copy secret vào docs. SQL Server default; PostgreSQL chọn Database__Provider=PostgreSQL. Startup không tự migrate/seed. Trước DB thật cần [preflight/backup](23-data-migration.md).

```powershell
# Export script để review; không apply. Chạy lần lượt vì EF CLI dùng chung file obj.
dotnet ef migrations script --context DatabaseContext --project ntc_aspnet/NTC.Repositories --startup-project ntc_aspnet/NTC.API --configuration Release --no-build --idempotent --output artifacts/sqlserver-migrations.sql
dotnet ef migrations script --context PostgreSqlDatabaseContext --project ntc_aspnet/NTC.Repositories --startup-project ntc_aspnet/NTC.API --configuration Release --no-build --idempotent --output artifacts/postgresql-migrations.sql
# Sau khi operator chuẩn bị schema riêng và cấu hình an toàn:
dotnet run --project ntc_aspnet/NTC.API -- --bootstrap-roles
dotnet run --project ntc_aspnet/NTC.API --launch-profile https
```

API HTTPS5033/HTTP5032 theo launch profile; trust dev certificate nếu cần `dotnet dev-certs https --trust`. Kiểm /health/live,/health/ready và /swagger trong Development. Register/verify user rồi explicit --grant-admin khi cần, Bootstrap__AdminEmail qua secret env. Không có admin password mặc định.

Google/SMTP thật cần credential riêng và callback/client route đúng; suite chỉ fake provider. BackgroundJobs mặc định false; chỉ bật sau review lịch/purge candidates/backups/uptime. NTC.VIEW vẫn giữ, React dùng API v1; evidence browser riêng ở FRONTEND-IMPLEMENTATION.

## Cấu trúc root hiện hành

Mở workspace/Git tại NTC. Solution đầy đủ ntc_aspnet/NTC.sln và filter ntc_aspnet/NTC.Backend.slnf; local settings vẫn ntc_aspnet/NTC.API/appsettings.Development.json. .config/dotnet-tools.json, scripts/, .github/, Dockerfile/render.yaml và docs/ nằm ở root. ASP.NET không tự đổi provider từ vị trí thư mục; cấu hình SQLServer/PostgreSQL giữ nguyên. Không còn ntc_aspnet/docs hoặc nested .git. Các lệnh worklog trước khi chuyển root là lịch sử có cwd riêng.

## React SPA

Từ root chạy `npm --prefix ntc_react ci`, copy ntc_react/.env.example thành .env.local nếu cần, rồi `npm --prefix ntc_react run dev`. Mở http://127.0.0.1:5173. API chạy terminal riêng HTTP5032 trên DB local đã chuẩn bị; React không tự migrate/seed. Proxy /api tránh cấu hình CORS riêng ở dev. Email-link client origin phải trỏ frontend.

Kiểm `npm --prefix ntc_react run typecheck`, `npm --prefix ntc_react run lint`, `npm --prefix ntc_react test`, `npm --prefix ntc_react run build`. Browser: từ ntc_react chạy `npx playwright install chromium` và `npm run test:e2e`; fixture host .NET loopback tự khởi động, SQLite/email/clock giả, không dùng DB thật. Xem [frontend runbook](../ntc_react/README.md).
