## Diễn tập workspace và theo dõi job — 2026-10-31

Archive JSON schema1 là bản sao nội dung, không thay backup DB/Identity/keyring. Trước diễn tập dùng hai tài khoản giả ở fixture SQLite riêng: tạo rich note/label/reminder/history/Trash, tải archive, nhập vào nơi đã có note; đối soát nội dung, remap ID, owner, thời điểm và reminder inactive. Kiểm import sai schema/tham chiếu không để dữ liệu dở dang. WorkspaceArchiveTests và archive-history.spec.ts thực hiện luồng này, evidence lượt mới ở worklog.

Provider drill còn mở: trên SQL Server/PostgreSQL biệt lập, jobs/email thật tắt, chạy migration mới và restore bản backup thử; kiểm lại FK/owner/hash/UTC, đăng nhập A/B/admin và đo thời gian phục hồi. Không dùng connection chủ dự án hoặc thao tác DB thật từ code task. Chưa chốt retention lịch sử/backup; không tự purge revision.

MaintenanceWorker ghi completed/ElapsedMs/dispatched/delivered, không ghi title/content/email. Operator theo dõi lỗi batch và retry email; khi worker được bật mà không có completed qua nhiều chu kỳ30giây, kiểm process/log/job configuration trước. Completed không có nghĩa thư đã vào inbox. Alert ngoài ứng dụng, backup schedule/RPO/RTO và keyring bền vững vẫn cần cấu hình môi trường có kiểm chứng; không tự bật purge hay mua dịch vụ.

# 22 — Sao lưu và khôi phục

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

Nguồn thật chưa backup/restore trong phiên. Test SQL migration fixture chứng minh compatibility dữ liệu giả, không thay recovery drill. Giữ ID/hash/content/UTC instant, Identity token keyring backup bảo vệ riêng; mã hóa/retention/RPO/RTO cần operator chốt. Purge30 ngày không xóa backup. Restore trước tiên DB biệt lập, jobs off tránh gửi/purge khi smoke.

## Chính sách đề xuất

| Dataset | RPO/RTO đề xuất | Lịch/retention đề xuất | Quyền / lưu trữ |
| --- | --- | --- | --- |
| SQL Server nguồn | Snapshot trước mọi migration; target vận hành 24 giờ/4h | Daily; giữ 14 ngày ban đầu | Backup mã hóa, hạn chế quyền, ngoài working copy |
| Supabase PostgreSQL đích | 24 giờ/4h ban đầu, cần budget/plan thật | Theo plan + bản logical khi cần; không giả định Free có PITR | Role backup riêng; kiểm restore |
| Repo/docs/config schema | Theo commit + backup workspace local | Git khi docs vào repo; secret tách riêng | Git không chứa credential |

Trash tự xóa 30 ngày là policy ứng dụng đã chốt; backup retention là policy khác chưa duyệt. Người dùng không restore note đã purge qua UI; restore backup là vận hành có đánh giá mất dữ liệu mới. Chưa có file đính kèm nên chưa thiết kế storage backup.

## Restore drill bắt buộc trước phát hành

1. Chọn backup ID, thời điểm, nguồn và đích biệt lập; xác minh không trỏ production.
2. Restore đúng công cụ của provider; chưa có tên DB/file thật nên không cung cấp lệnh xóa/restore giả.
3. Đối soát account/ID/password hash theo Identity, Notes/Tags/NoteTags/Reminders, audit và timezone; kiểm FK và owner.
4. Đăng nhập fixture A/B/admin; đọc/sửa/khôi phục note; job test không gửi email thật cho người dùng.
5. Đo RPO/RTO, ghi sai khác, quyết định cutover sau khi xử lý các ghi mới kể từ backup.

| Ngày | Môi trường/backup | Kết quả | Giới hạn |
| --- | --- | --- | --- |
| 2026-10-16 | Chưa có evidence backup được cung cấp | NOT RUN | Chỉ kế hoạch; chưa đảm bảo phục hồi |

Đọc [Supabase backup docs](https://supabase.com/docs/guides/platform/backups) và plan tại thời điểm triển khai để chốt khả năng/retention; trang này là nguồn cần kiểm trước sử dụng, chưa khảo sát account. Tài khoản/mật khẩu DB không được ghi vào docs.
