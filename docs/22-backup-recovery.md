# 22 — Sao lưu và khôi phục

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

Nguồn thật chưa backup/restore trong phiên. Test SQL migration fixture chứng minh compatibility dữ liệu giả, không thay recovery drill. Giữ ID/hash/content/UTC instant, Identity token keyring backup bảo vệ riêng; mã hóa/retention/RPO/RTO cần operator chốt. Purge7 ngày không xóa backup. Restore trước tiên DB biệt lập, jobs off tránh gửi/purge khi smoke.

## Chính sách đề xuất

| Dataset | RPO/RTO đề xuất | Lịch/retention đề xuất | Quyền / lưu trữ |
| --- | --- | --- | --- |
| SQL Server nguồn | Snapshot trước mọi migration; target vận hành 24 giờ/4h | Daily; giữ 14 ngày ban đầu | Backup mã hóa, hạn chế quyền, ngoài working copy |
| Supabase PostgreSQL đích | 24 giờ/4h ban đầu, cần budget/plan thật | Theo plan + bản logical khi cần; không giả định Free có PITR | Role backup riêng; kiểm restore |
| Repo/docs/config schema | Theo commit + backup workspace local | Git khi docs vào repo; secret tách riêng | Git không chứa credential |

Trash tự xóa 7 ngày là policy ứng dụng đã chốt; backup retention là policy khác chưa duyệt. Người dùng không restore note đã purge qua UI; restore backup là vận hành có đánh giá mất dữ liệu mới. Chưa có file đính kèm nên chưa thiết kế storage backup.

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
