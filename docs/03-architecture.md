# 03 — Kiến trúc NoteTatCa

> 2026-10-16 | DRAFT | Áp dụng: YES

## CURRENT

Monolith chia nhiều project .NET, target `net8.0` trong csproj. API dùng ASP.NET Core controllers, JWT Bearer, Identity, Swagger; repository dùng EF Core/SQL Server. `NTC.VIEW` là Razor Pages, session và Google cookie flow. Source version là bằng chứng cấu hình, chưa chứng minh runtime tương thích/hoạt động.

| Thành phần | Trách nhiệm / contract | Đường dẫn dưới NoteTatCa |
| --- | --- | --- |
| API | HTTP, DI, auth, middleware lỗi, Swagger | NTC.API |
| Services | Quy tắc nghiệp vụ, mapping, OTP/email | NTC.Services |
| Contract.Services | Interface service | NTC.Contract.Services |
| Repositories | DbContext, EF migrations, generic repo/UOW | NTC.Repositories |
| Contract.Repositories | Entity, interface repo/UOW | NTC.Contract.Repositories |
| ModelViews | DTO request/response | NTC.ModelViews |
| Core | Response, exception, pagination, audit/time helper | NTC.Core |
| VIEW | Consumer Razor hiện có, giữ tham khảo | NTC.VIEW |

Luồng CURRENT: request → middleware lỗi → routing/CORS → authentication/authorization → controller → service → repository/UOW → SQL Server → DTO/response. Quyền owner hiện chưa được áp dụng đồng nhất; xem file 16.

## TARGET đã chốt và cấu trúc đề xuất

Frontend React TS/Vite tại frontend đã chốt. API .NET giữ Identity; tương lai chạy Render và dùng Supabase PostgreSQL; React chạy Vercel. SQL Server hiện tại chưa migrate, không reset dữ liệu cũ. Không cần chia microservice chỉ để chuyển UI. Các đường dẫn dưới đây chưa phải thư mục đã tạo ngoài docs.

```text
D:\My Project\NTC\
  docs\                    # bản soạn thảo theo yêu cầu người dùng
  NoteTatCa\               # Git repo hiện tại, .NET solution
    docs\                  # bản đồng bộ GitHub, giống bản soạn thảo
    NTC.API\
    NTC.Services\
    NTC.Repositories\
    ...
    NTC.VIEW\              # giữ nguyên, chưa xóa
  frontend\                # TARGET React + TypeScript + Vite, chưa tạo
```

Luồng đề xuất: React → HTTPS API → auth/owner → service → SQL. Google/SMTP là ranh giới ngoài; UI không giữ client secret/SQL credential. Job nhắc lịch đã nằm trong phạm vi, cần đọc DB bền vững; request tạo reminder không tự đồng nghĩa notification đã gửi.

## Thuộc tính và khoảng trống

- Giữ dependency service/interface/repo hiện tại trước; chưa làm refactor toàn bộ solution khi chỉ cần hoàn thiện API.
- Transaction cho tạo user+profile/role, note+tag, hard delete và cập nhật thứ tự; cần kiểm tra UOW thực tế trước thiết kế chi tiết.
- Current response có BaseResponse; validation tự động có thể khác format. Contract đích thống nhất tại file 15.
- Current CORS `AllowRazor` chỉ cho `https://localhost:5037`; React origin phải cấu hình riêng khi làm React.
- Auth provider đã chốt giữ .NET Identity, không Supabase Auth. Vòng đời bearer/refresh và cookie còn đề xuất ADR-003, quyết định trước code session.
- Concurrency: chưa thấy rowversion trong Note. Đề xuất optimistic concurrency khi autosave; trả conflict thay ghi đè âm thầm.
- Quy mô public nhỏ và hosting Supabase/Render/Vercel đã chốt; timeout/retry/plan/region/budget chưa rõ. Không có cơ sở runtime để tuyên bố chịu tải.

Nguồn: Program.cs/DependencyInjection.cs, csproj, DatabaseContext và Services. Quyết định tại [14](14-architecture-decisions.md); cấu hình tại [17](17-environment-config.md).
