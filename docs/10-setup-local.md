# 10 — Setup local

> 2026-10-16 | DRAFT | Áp dụng: YES | Lệnh hướng dẫn chưa chạy, trừ lệnh kiểm SDK trong worklog

## Công cụ và đường dẫn

| Thành phần | Đã biết | Cách kiểm tra |
| --- | --- | --- |
| OS/shell | Windows, PowerShell | Môi trường phiên hiện tại |
| Git root backend | D:\My Project\NTC\NoteTatCa | `git -C .\NoteTatCa status --short` từ NTC |
| .NET target | net8.0 trong csproj; máy có SDK 9.0.317 | `dotnet --list-sdks`; runtime .NET 8 chưa kiểm |
| SQL Server | Provider trong code, instance chưa xác minh | Kiểm kết nối DB local được chỉ định, không in secret |
| EF tool | Chưa kiểm tool global/local cho API | `dotnet tool list --global` và tìm manifest phù hợp |
| Node/npm | Chưa kiểm; React chưa có package.json | `node --version`, `npm --version` khi làm React |

SDK/runtime phiên bản triển khai sẽ chọn và pin khi làm API; không tự nâng target trong phiên docs.

## Chuẩn bị backend

1. Mở workspace NTC, vào repo backend bên dưới. Giữ thay đổi local `NTC.API/appsettings.json` và `NTC.VIEW/appsettings.json`.
2. Cấp cấu hình qua environment/session secret store; xem file 17. Không dùng config đã sanitize trên GitHub để suy ra app khởi động được.
3. Cần SQL Server database test đúng tên, JWT signing key, issuer/audience, TTL, Google ClientId/Secret hiện bắt buộc ở startup; SMTP cho OTP/forgot-password.
4. Restore/build (PowerShell, cwd `D:\My Project\NTC\NoteTatCa`, NOT RUN):

```powershell
dotnet restore .\NTC.API\NTC.API.csproj
dotnet build .\NTC.API\NTC.API.csproj --no-restore
dotnet run --project .\NTC.API\NTC.API.csproj --launch-profile https
```

URL theo source profile: `https://localhost:5033/swagger`, HTTP 5032. Certificate HTTPS cần được chuẩn bị trên máy; chưa thử endpoint. Chạy Razor riêng nếu cần tham khảo, không xem đó là frontend React đã có.

## Database và migration

Q-022 đã chốt phải giữ dữ liệu; không chạy `database update` trước backup và đối chiếu migration history. Repo hiện có baseline `20260731153548_InitialCreate`; Git lịch sử trước đó có tên migration khác. Phải dry run DB riêng theo file 23. Không có seed role được xác minh; registration gọi AddToRole(User), cần kiểm role tồn tại và kết quả.

## React tương lai

Thư mục chốt là `D:\My Project\NTC\frontend`. Chưa scaffold. Khi được giao: chọn/pin phiên bản package, tạo lockfile và scripts; sau đó mới ghi lệnh cài/build/dev thực tế. Dev origin dự kiến `http://localhost:5173` phải được API cho phép; source hiện chỉ allow Razor HTTPS 5037.

## Dừng và lỗi thường gặp

Ctrl+C dừng dev server. Không drop DB hoặc xóa bin/obj mặc định để chữa mọi lỗi. Startup thiếu Google/JWT: cấp cấu hình đúng, không bỏ qua kiểm tra bảo mật. Lỗi CORS: kiểm origin/scheme/port. DB lỗi: kiểm provider/credential/network. Build/runtime và smoke đều NOT RUN trong phiên docs.
