# 20 — Logging, giám sát và cảnh báo

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

CURRENT RequestTelemetryMiddleware ghi tên endpoint/status/elapsed/correlation; API no-store/nosniff, lỗi envelope traceId. Worker ghi batch exception type và deliveryID/attempt, không notecontent/token/OTP. Health live/ready hiện có (ready chỉ CanConnect); chưa dashboard/alert collector/metrics backend chuyên dụng. Cần alert worker lag/abandoned delivery/DB failure khi vận hành.

| Luồng | Tín hiệu cần có | Dữ liệu không ghi | Ngưỡng ban đầu đề xuất |
| --- | --- | --- | --- |
| API | tên endpoint, method, status, latency, traceId | Request note, token, OTP, query search thô | 5xx >1%/5 phút khi có đủ mẫu |
| Auth | Login fail/lock/rate limit, Google validation code | Password, Google token, email đầy đủ | Tăng bất thường hoặc lock spike |
| SQL | Connection errors, duration, pool saturation | Connection string, nội dung parameter nhạy cảm | Connect fail liên tiếp; latency tăng |
| Reminder | Due lag, claimed/sent/retried/failed/dedup count | Nội dung note/email body | Lag >5 phút trong 10 phút, cần chốt SLA |
| Purge | Candidate/deleted/skipped/race/error, cutoff | Note content | Không chạy trong 26h hoặc xóa ngoài cutoff |
| Email | Delivery attempt/status/provider code | Reset link/OTP/nội dung note | Backlog/retry tăng; permanent error |
| Admin | Actor/action/target account ID, lý do | Nội dung note/profile dư thừa | Đổi quyền/khóa bất thường |

CURRENT correlation/trace cho API và metadata worker; PROPOSED dashboard/tracing pipeline/job metrics chuyên dụng. Liveness chỉ process; readiness cần DB và dependency thiết yếu với timeout; smoke nghiệp vụ dùng fixture riêng, không gửi email thật định kỳ vô hạn.

Thông báo sự cố chỉ đến kênh do chủ dự án chọn; chưa có người trực/contact nên chưa bật alert. Đề xuất lưu operational log 14 ngày, security audit lâu hơn theo nhu cầu, nhưng retention/budget phải duyệt; không mặc định analytics nội dung.

Source đã có ExceptionMiddleware/RequestTelemetryMiddleware/health; Google exception không trả hoặc log token. Runbook ở [21](21-operations-runbook.md), kiểm thử file 06. Tất cả ngưỡng trên chưa benchmark hoặc được xem là cam kết vận hành.
