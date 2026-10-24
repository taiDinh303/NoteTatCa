# 27 — Offline, realtime và background jobs

> 2026-10-17 | CURRENT worker có test; live worker/SMTP cloud NOT RUN.

## Reminder và delivery

MaintenanceWorker trong API chỉ đăng ký khi BackgroundJobs:Enabled=true, default false; tick30 giây. Mỗi pha có DI scope riêng: dispatch → email → purge → prune. Lỗi ghi loại lỗi/batch metadata, retry tick sau. Không có Redis/Quartz/Hangfire/Supabase Cron trong implementation này.

Dispatch query tối đa100 lịch due hoặc legacy chưa khởi tạo; transaction serializable, đọc parent/user lại. Tính lịch từ anchor IANA timezone, chỉ tạo inbox/delivery cho **một occurrence gần nhất mỗi reminder trong24 giờ**, bỏ các lần cũ hơn. Unique reminder/occurrence + Guid concurrency. Locked/deleted user và trash không tạo nhắc. Restore tính tương lai, không replay lịch đã qua. Month-end clamp giữ anchor; DST quy tắc tại [15](15-api-contract.md).

Email batch100, lease2 phút + version, tối đa5lần với backoff, hết thì Abandoned. SMTP body chỉ nhắc chung/link, không title/content note. Recheck parent/account trước cấp lease. Nếu external send thành công nhưng mất ACK/crash, có thể gửi lại: **at-least-once**, không hứa exactly-once. In-flight send có thể hoàn tất trong race trash/lock sau kiểm tra; inbox/query vẫn scope hiện trạng. Trước scale nhiều replica phải kiểm contention/lease và trusted proxy với tải thật.

Purge batch100 chỉ DeletedTime≤nowUTC−30 ngày, transaction recheck để tránh xóa note restore. Graph gồm NoteTag/Reminder/Notification/Delivery rồi Note; không xóa tài khoản. Prune batch≤500 mỗi nhóm expired refresh/OTP sau grace1ngày; không xóa session còn hạn cần phát hiện reuse.

## Bật vận hành

Backup + migration đúng → preflight purge candidates → SMTP/IANA/clock/URL → uptime luôn chạy hoặc worker riêng có thiết kế → bật jobs → synthetic note theo dõi due/inbox/email/retry → kiểm không payload trong log. Render free blueprint chỉ demo, không bảo đảm nhắc đúng giờ khi sleep. Worker tắt không tự purge record cũ.

Offline/realtime/cộng tác chưa chốt Q-015; chưa có service worker, SignalR hay Supabase Realtime. Autosave/version và inbox polling không có nghĩa offline sync. React phải giữ bản nhập khi lỗi và xử lý409, tránh tự ghi đè. Quyết định offline chỉ hỏi khi triển khai phần tương ứng.

## Bổ sung integrity và crash cuối retry

Delivery/inbox có composite FK bảo đảm cùng owner note và parent reminder, bên cạnh unique occurrence. LastAttemptAt ghi khi claim gửi; AbandonedAt/LastErrorCode ghi khi dừng/cancel, lease được clear. Sau crash ở attempt5, lease hết hạn sẽ đánh dấu RETRY_LIMIT_REACHED, không gửi tiếp vô hạn. Retry/cancellation không sửa owner/parent/occurrence đã tạo. Đây vẫn là SMTP at-least-once, không bảo đảm exactly-once.
