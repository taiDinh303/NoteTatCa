# 21 — Vận hành và sự cố

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

CURRENT recovery: dùng traceId, không dump env/body. 401 kiểm session/stamp/expiry rồi sign-in; Google409 cần link proof;409save tải lại cho user resolve;429 tuân Retry-After. Worker default off: kiểm due/lease/attempt/abandoned và parent lock/trash; không reset occurrence hoặc resend hàng loạt. DB/migration lỗi: dừng rollout, giữ backup/history, không reset. Runbooks bên dưới là operator procedure chưa chạy môi trường thật.

## Công việc định kỳ đề xuất

| Việc | Lịch | Bằng chứng / xử lý |
| --- | --- | --- |
| Backup DB | Hằng ngày, giờ ít tải | Backup status/checksum, policy file 22 |
| Purge trash | Worker tick30 giây/batch100 khi bật | Chỉ DeletedTime ≤ nowUTC−7 ngày, metric count |
| Reminder dispatcher | Worker tick30 giây khi bật; cloud uptime chưa chốt | Due lag, occurrence/dedup/SMTP status |
| Rà lỗi/auth/DB | Hằng ngày | Không đọc note để debug |
| Restore drill | Hằng tháng đề xuất | DB biệt lập, RPO/RTO thực đo |
| Rà dependency/secret access | Mỗi release và khi có cảnh báo | Chủ vận hành; không in secret |

Chủ vận hành tạm thời là chủ dự án; phân công/kênh trực/ngân sách chưa rõ, không tự gửi thông báo cho người khác. Lịch nghiệp vụ theo timezone user; cutoff purge theo elapsed UTC.

## Sự cố và bước xử lý

| Sự cố | Kiểm tra ban đầu | Giảm ảnh hưởng / phục hồi | Xác nhận |
| --- | --- | --- | --- |
| Truy cập chéo owner/admin xem note | Route/trace/user ID giả hóa, không copy content | Dừng endpoint/tính năng bị ảnh hưởng, sửa scope, rà tác động | TC-003/011/018 |
| Không login/Google fail | Config present, issuer/audience, khóa account, callback | Sửa cấu hình đúng môi trường; không bỏ validate | TC-001/002 |
| SQL lỗi/hết connection | Pool/network/provider/migration, credential reference | Giảm concurrency, xử lý nguyên nhân, retry giới hạn | Read/write fixture |
| Reminder không gửi/trùng | Worker heartbeat/lease/occurrence/SMTP | Dừng delivery lỗi; replay theo catch-up 24 giờ và dedup | Inbox dedup; email có thể trùng nếu ACK mất |
| Purge sai/ghi chú mất | Cutoff/timezone/state, migration log, backup | Dừng purge/ghi khi cần; đánh giá restore và dữ liệu mới | Đối soát owner/count |
| React báo save lỗi | TraceId/status/network/version conflict | Giữ bản nhập, không retry create mù | Reload và đối chiếu note |

## Biên bản INC

Ghi incident ID, thời gian UTC và giờ địa phương, môi trường/commit, tác động, người điều phối, timeline, logs đã che dữ liệu, hành động, trạng thái khôi phục, kiểm thử sau sửa và việc phòng ngừa. Chưa có incident thực tế được lập trong docs. Restore/rollback không tự được cấp quyền từ runbook; thực hiện theo nhiệm vụ cụ thể và phạm vi dữ liệu đã xác nhận.

## Entities, audit và delivery diagnostics

GET admin/audit-events theo user/action để xem khóa/unlock/account/role metadata; không mở note để debug. LastAttemptAt/AbandonedAt/LastErrorCode/Attempts/lease của delivery cho biết retry dừng vì parent không khả dụng, reminder đổi hoặc hết lần thử. Crash ở lần5 không tiếp tục gửi lần6. Timestamp cũ có thể null vì không có bằng chứng lịch sử; không tự điền thời điểm giả.

Trước EnforceEntityIntegrity dùng scripts/preflight-entity-integrity-sqlserver.sql trên clone sau CompleteNoteBackend. Nonzero counts phải review; không xóa link/merge account hàng loạt. Migration fail50002 giữ dữ liệu, kiểm schema/history trước tiếp tục.

## Quản trị tài khoản và phiên

Admin search/includeDeactivated để tìm tài khoản ngừng hoạt động, deactivate/restore theo yêu cầu vận hành. Restore giữ lock và email verification; unlock là thao tác riêng và user phải login lại. Không dùng restore để debug nội dung note. Chủ tài khoản có me/sessions để revoke từng family thay revoke-all; không hiển thị token/hash trong công cụ vận hành. EMAIL_TIMEOUT phân biệt timeout với EMAIL_SEND_FAILED, cùng bounded retry/backoff.

SupportAccountReactivation chỉ mở constraint; Down có thể bị chặn bởi event12, không xóa audit tự động. Xem [migration](23-data-migration.md).
