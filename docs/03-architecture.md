# 03 — Kiến trúc NoteTatCa

> 2026-10-17 | CURRENT: backend đã triển khai và kiểm thử; React SPA triển khai local 2026-10-18; cloud chưa triển khai.

## Hệ thống và ranh giới

React TypeScript/Vite ở `NTC/ntc_react`, UI tiếng Anh → HTTPS bearer API .NET 8 trên Render → Supabase PostgreSQL. Local mặc định vẫn SQL Server. Supabase chỉ database, không thay .NET Identity bằng Supabase Auth. `NTC.VIEW` giữ nguyên tạm thời. Git root hiện là `NTC`; backend projects/solutions giữ trong `NTC/ntc_aspnet`, docs duy nhất `NTC/docs`, scripts/tool/CI/deploy files ở root.

| Project | Trách nhiệm |
| --- | --- |
| NTC.Core | BaseEntity/response/page/errors, ICurrentUser; không HTTP/EF |
| NTC.Contract.Repositories | Entity và interface repository/UoW |
| NTC.ModelViews | DTO legacy và request/response v1 |
| NTC.Contract.Services | Interface nghiệp vụ/adapter; không tham chiếu implementation repository |
| NTC.Repositories | EF DbContext, provider, migration, repository/UoW, UTC/audit/version |
| NTC.Services | BaseService, nghiệp vụ cụ thể, rich document/recurrence, auth/email, maintenance |
| NTC.API | Composition root, cấu hình tập trung, BaseApiController, legacy/v1 controllers, middleware/worker/health |
| NTC.Tests | HTTP SQLite, lịch lặp, SQL LocalDB migration và PostgreSQL fixture tùy chọn |

Áp dụng chọn lọc Marixa: dependency theo tầng, current actor/clock injection, base class chia sẻ hành vi, transaction và kiểm thử HTTP. Không đưa company/HR/staff/public photo vào NTC. Services dùng EF query extension trên IQueryable qua repository: đây là phân tầng thực dụng, không tuyên bố pure DDD. Chi tiết ở `../ARCHITECTURE.md` ở repository root.

## Luồng xử lý

Request → correlation/no-store → exception envelope → route/CORS → bearer xác minh chữ ký và DB session/user/role → authorization/rate limit → controller DTO → service owner/rule → transaction/UoW → EF. Response có traceId. Không lấy UserId client làm quyền. Admin cũng đi qua owner guard khi gọi note.

Worker tùy chọn chạy trong API mỗi 30 giây, scope riêng cho dispatch/email/purge/prune. Occurrence và delivery lưu DB, version/lease chống xử lý đồng thời; SMTP có thể gửi trùng khi mất ACK. Không phụ thuộc timer trình duyệt.

## Dữ liệu và tương thích

DocumentJson version 1 là nguồn rich content; Content là projection tìm kiếm. Plain note cũ vẫn plain. Guid Version dùng cho autosave, Idempotency-Key cho tạo. Hai context có migration history riêng; PostgreSQL schema `ntc` không expose Data API. Runtime role và migration role phải tách khi vận hành.

Legacy routes giữ adapter an toàn; thay đổi auth/proof và rich editing có giới hạn tại [API](15-api-contract.md). Không tự migrate/seed hoặc chạy purge khi startup. Xem [migration](23-data-migration.md), [cấu hình](17-environment-config.md), [kiểm thử](06-testing.md).
