# 24 — Tích hợp bên ngoài

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

2026-10-22 CURRENT source: thêm Brevo HTTPS adapter qua `IEmailSender` cho OTP, khôi phục email/mật khẩu và reminder; chọn `EMAIL__PROVIDER=Brevo`, SMTP vẫn là mặc định tương thích. Adapter POST tới endpoint cố định `https://api.brevo.com/v3/smtp/email`, header `api-key`, timeout30giây, không tự retry/follow redirect hoặc đưa response body vào lỗi. Reminder vẫn dùng retry/lease hiện có. Render đã Live với Brevo; email OTP thật được Brevo ghi Sent/Delivered và chủ dự án cung cấp ảnh trong Gmail. Chi tiết deployment/smoke ở worklog; recovery/reminder thật chưa nghiệm thu.

Email OTP được làm mới theo yêu cầu chủ dự án: tiếng Anh theo UI, lời chào ấm áp và chủ đề lưu giữ ý tưởng, layout table/inline CSS, thẻ mã nổi bật, thời hạn10phút và nhắc không chia sẻ/ignore khi không yêu cầu. Mã luôn HTML-escape; không đưa mã vào subject/preheader hoặc remote assets. Google frontend live đã có nút GIS chính thức dùng Client ID đúng; bấm nút rồi quan sát trang /notes authenticated, không cần thay biến/cơ chế auth. Không sửa chính sách liên kết tài khoản hoặc quyền owner.

Render Free chặn SMTP25/465/587. Tạo Brevo, xác minh sender trong Settings → Senders, Domains & Dedicated IPs → Senders; lấy API key ở SMTP & API → API Keys (không lấy SMTP key), nhập trực tiếp Render `EMAIL__BREVO__APIKEY`. Thêm `EMAIL__FROMEMAIL` là sender đã xác minh, `EMAIL__FROMNAME=NoteTatCa`, `EMAIL__PROVIDER=Brevo` chỉ sau khi đủ key/sender và code đã sẵn sàng. Redeploy để nhận cấu hình, gửi thử đến mailbox do chủ dự án chỉ định; không thử bằng unit/integration test vào DB hoặc email thật. Không cấu hình một mailbox nhận thay mọi user: OTP/reminder giữ email từng account.

Gmail không xác thực được domain của bên thứ ba; Brevo có thể thay domain From sang `brevosend.com` theo chính sách provider. Muốn From mang domain riêng cần domain thuộc sở hữu và DNS authentication; không giả mạo Gmail/Google Group. Nguồn: [Brevo API](https://developers.brevo.com/reference/send-transac-email), [sender](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [domain replacement](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication), [Render Free](https://render.com/docs/free).

CURRENT: Google server validates ID token audience/subject/verifiedemail, link explicit khi trùng account; API không cần ClientSecret, Razor OAuth riêng giữ nguyên. SMTP adapter dùng config17, không gửi thật trong tests; OTP/recovery đã fake-test, reminders dùng durable retry/lease. External Google/SMTP deliverability thật NOT RUN. Không dùng Supabase Auth/browser database SDK theo Q-019.

| ID | Provider / mục đích | CURRENT/TARGET | Quyền / rủi ro / kiểm thử |
| --- | --- | --- | --- |
| INT-001 | Google login | GoogleJsonWebSignature ID-token adapter; Razor OAuth riêng giữ nguyên; React GIS ID-token flow đã có; external Google chưa kiểm thật | Audience/subject/email verified/linking; TC-002/011 |
| INT-002 | SMTP email | SMTP/EmailService + reminder durable lease/retry đã có | Server credentials; timeout/retry/dedup/throttle; TC-001/010 |
| INT-003 | Supabase PostgreSQL | Provider/baseline đã thêm, cloud/data transfer chưa chạy; Identity giữ nguyên | DB-only connection qua API; không service key/browser DB password; TC-016/018 |
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
