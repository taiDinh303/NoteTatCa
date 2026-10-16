# 20 — Logging, giám sát và cảnh báo

> 2026-10-16 | DRAFT | Áp dụng: YES | PROPOSED, chưa có dashboard/alert được kiểm chứng

| Luồng | Tín hiệu cần có | Dữ liệu không ghi | Ngưỡng ban đầu đề xuất |
| --- | --- | --- | --- |
| API | route template, method, status, latency, traceId | Request note, token, OTP, query search thô | 5xx >1%/5 phút khi có đủ mẫu |
| Auth | Login fail/lock/rate limit, Google validation code | Password, Google token, email đầy đủ | Tăng bất thường hoặc lock spike |
| SQL | Connection errors, duration, pool saturation | Connection string, nội dung parameter nhạy cảm | Connect fail liên tiếp; latency tăng |
| Reminder | Due lag, claimed/sent/retried/failed/dedup count | Nội dung note/email body | Lag >5 phút trong 10 phút, cần chốt SLA |
| Purge | Candidate/deleted/skipped/race/error, cutoff | Note content | Không chạy trong 26h hoặc xóa ngoài cutoff |
| Email | Delivery attempt/status/provider code | Reset link/OTP/nội dung note | Backlog/retry tăng; permanent error |
| Admin | Actor/action/target account ID, lý do | Nội dung note/profile dư thừa | Đổi quyền/khóa bất thường |

PROPOSED correlation ID từ API đến service/job/outbox; log structured, redaction trước ghi. Liveness chỉ process; readiness cần DB và dependency thiết yếu với timeout; smoke nghiệp vụ dùng fixture riêng, không gửi email thật định kỳ vô hạn.

Thông báo sự cố chỉ đến kênh do chủ dự án chọn; chưa có người trực/contact nên chưa bật alert. Đề xuất lưu operational log 14 ngày, security audit lâu hơn theo nhu cầu, nhưng retention/budget phải duyệt; không mặc định analytics nội dung.

Source hiện có ExceptionMiddleware và Console.WriteLine trong Google catch; chưa thấy correlation/structured metrics/health endpoint. Runbook ở [21](21-operations-runbook.md), kiểm thử file 06. Tất cả ngưỡng trên chưa benchmark hoặc được xem là cam kết vận hành.
