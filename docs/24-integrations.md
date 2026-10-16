# 24 — Tích hợp bên ngoài

> 2026-10-16 | DRAFT | Áp dụng: YES

| ID | Provider / mục đích | CURRENT/TARGET | Quyền / rủi ro / kiểm thử |
| --- | --- | --- | --- |
| INT-001 | Google login | GoogleJsonWebSignature và .NET Google auth hiện có; React flow cần chỉnh | Audience/subject/email verified/linking; TC-002/011 |
| INT-002 | SMTP email | SmtpEmailSender/EmailService hiện có; thêm reminder delivery | Server credentials; timeout/retry/dedup/throttle; TC-001/010 |
| INT-003 | Supabase PostgreSQL | TARGET tương lai, giữ .NET Identity | DB-only connection qua API; không service key/browser DB password; TC-016/018 |
| INT-004 | Render | TARGET host API và job theo phương án | Docker/env/PORT/health/uptime; staging smoke |
| INT-005 | Vercel | TARGET host React TS/Vite | Public env only, SPA route/callback/CORS; TC-014 |

App không dùng payment, AI, external note service hoặc file storage trong bản đầu đã chọn. Không tạo tài nguyên/account khi chỉ ghi tài liệu.

## Luồng lỗi đích

| Lỗi | Hành vi đề xuất | Người dùng nhìn thấy |
| --- | --- | --- |
| Google token sai/hết hạn | 401 code rõ, không 500 ex.Message | Đăng nhập lại Google |
| OTP SMTP fail | Throttle/retry có kiểm soát, không xác nhận gửi chắc chắn | Lỗi gửi có retry sau khoảng chờ |
| Reminder SMTP timeout | Delivery state bền vững, retry theo dedup | In-app vẫn theo trạng thái riêng; không báo email đã đến |
| DB unavailable | Timeout/cancel và response lỗi đã che | Giữ bản nhập, thử lại, không lưu giả |
| API khởi động chậm | Theo dõi cold-start/health; policy timeout client | Loading rồi lỗi có retry |

Chưa có quota/giá/timeout/provider request ID được kiểm từ tài khoản thật. Khuyến nghị deadline/retry exponential+jitter, tránh retry lỗi auth/validation; chọn số cụ thể khi có SLA. Email body đề xuất chỉ thông báo và link đăng nhập, không chứa toàn bộ note riêng tư.

Nguồn 2026-10-16: source AuthService/SmtpEmailSender; [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [Render Docker](https://render.com/docs/docker), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite). Changelog Supabase đã đọc; phải rà lại thay đổi TLS/DB/SDK liên quan khi triển khai thực tế.
