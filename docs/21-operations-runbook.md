# 21 — Vận hành và sự cố

> 2026-10-16 | DRAFT | Áp dụng: YES | Chưa vận hành cloud trong phiên này

## Công việc định kỳ đề xuất

| Việc | Lịch | Bằng chứng / xử lý |
| --- | --- | --- |
| Backup DB | Hằng ngày, giờ ít tải | Backup status/checksum, policy file 22 |
| Purge trash | Hằng ngày hoặc batch thường xuyên | Chỉ DeletedTime ≤ nowUTC−7 ngày, metric count |
| Reminder dispatcher | Theo độ chính xác đã chốt, đề xuất poll ngắn | Due lag, occurrence/dedup/SMTP status |
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
| Reminder không gửi/trùng | Worker heartbeat/lease/occurrence/SMTP | Dừng delivery lỗi; replay theo catch-up 24h và dedup | Không lặp gửi |
| Purge sai/ghi chú mất | Cutoff/timezone/state, migration log, backup | Dừng purge/ghi khi cần; đánh giá restore và dữ liệu mới | Đối soát owner/count |
| React báo save lỗi | TraceId/status/network/version conflict | Giữ bản nhập, không retry create mù | Reload và đối chiếu note |

## Biên bản INC

Ghi incident ID, thời gian UTC và giờ địa phương, môi trường/commit, tác động, người điều phối, timeline, logs đã che dữ liệu, hành động, trạng thái khôi phục, kiểm thử sau sửa và việc phòng ngừa. Chưa có incident thực tế được lập trong docs. Restore/rollback không tự được cấp quyền từ runbook; thực hiện theo nhiệm vụ cụ thể và phạm vi dữ liệu đã xác nhận.
