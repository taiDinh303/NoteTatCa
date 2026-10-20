# 05 — Luồng nghiệp vụ

> 2026-10-17 | Backend CURRENT; trạng thái UX React vẫn TARGET.

## WF-001 — Đăng ký, đăng nhập và phiên

REQ-001/009, RULE-009. Password: gửi mã email → nhập mã còn hạn → register tạo user/profile/role trong transaction → login email. OTP DB có hash/TTL/attempt/use-once; verify-email hỗ trợ account cũ chưa xác minh. Google ID token được validate server, account trùng email chưa link yêu cầu sign-in rồi link bằng proof, không tự nối.

Access ngắn hạn + refresh rotation/reuse/family expiry. Refresh có điều phối một request ở client; logout/revoke/lock/password change làm phiên cũ mất hiệu lực. Email/Google/SMTP thật và UI login/forgot/reset/link cần E2E khi xây React; backend đã có fake-provider HTTP tests. Xem [15](15-api-contract.md).

DEC-019/2026-10-20: trước login/Google/restore, kiểm health GET hữu hạn để chờ API; không retry tự động POST auth hoặc lưu note. Sau auth, preparation tải đủ pages của workspace account hiện tại và modules chính, hiển thị animation/progress thực rồi mở layout. Admin chỉ me/statistics/module quản trị. Outage khi restore giữ refresh session để Retry connection; mất mạng khi soạn giữ editor/draft, reconnect chỉ revalidate đọc. Cached lists hiển thị ngay khi chuyển trang; Inbox/Reminders làm mới nền khi mount để nhận dữ liệu mới. Logout/đổi account/nhóm quyền hủy tải và xóa cache riêng.

## WF-002 — Tạo, xem, sửa và tìm note

REQ-002/003/007/011. Editor unified rich/checklist/màu/emoji/Markdown shortcuts là UX đích; API nhận document schema1 hoặc plain, owner từ phiên. Title rỗng hợp lệ; DEC-018/2026-10-20 ẩn title rỗng, Add title mở input khi cần. Create key scoped user tránh tạo trùng khi ACK mất; autosave/Retry save khi lỗi dùng version từ response, lỗi409 phải giữ bản nhập và cho user giải quyết. UI chỉ báo Saved sau ACK; không tự retry ghi đè với version mới. Close chờ flush khi chưa ACK; lỗi/conflict không âm thầm đóng hoặc mất draft.

Plain note cũ giữ nguyên text; rich document có projection tìm kiếm. Bỏ trường PATCH giữ giá trị, convertToPlainText cần xác nhận; Markdown export sau này cảnh báo mất định dạng. Tìm title/content trong owner, có filter tag/pin/trash/reminder và pagination. Không có attachment/share/archive trong đợt đầu.

## WF-003 — Nhãn, ghim và kéo thả

REQ-004/005, RULE-004/005/007. Nhãn cùng user có thể trùng tên, chọn bằng ID. Gán nhãn chỉ khi note/tag cùng owner và active, gán lại không tạo composite trùng; max20. Xóa nhãn giữ note. Thay liên kết làm tăng note version để autosave cũ không ghi đè trạng thái nhãn.

Pin gửi trạng thái tuyệt đối + version, server quản lý PinnedAt và rank nhóm. Reorder xác minh dragged/neighbor kề nhau, cùng owner/nhóm, không self; transaction tính rank. UI optimistic rollback khi fail, refetch version trước lần save tiếp.

## WF-004 — Trash, restore và xóa hẳn

REQ-006, RULE-002/008. Soft delete → ẩn active/search/inbox và ngừng nhắc → owner xem trash → restore trước7 ngày hoặc xác nhận hard delete. Restore giữ content/nhãn còn hợp lệ, chỉ tính lịch tương lai. Tại cutoff DeletedTime≤nowUTC−7 ngày không còn restore. Purge worker có transaction recheck parent, xóa graph NoteTag/Reminder/Notification/Delivery rồi Note.

Worker default off, chưa chạy trên dữ liệu thật; lần bật đầu cần thống kê candidates/backup. Removed không restore trong app; backup recovery là quy trình riêng, không hứa khôi phục từng note.

## WF-005 — Nhắc lịch, inbox và email

REQ-008, RULE-006. Owner chọn note active, giờ tương lai/timezone/kênh/lịch lặp; server validate max5 active, anchor/interval/end. Worker đọc due, kiểm parent/user và lưu occurrence/inbox/delivery trước gửi. Mỗi lịch chỉ catch-up lần gần nhất trong24 giờ; bỏ cũ hơn. Month thiếu ngày clamp cuối tháng nhưng giữ anchor; timezone/DST theo15.

Inbox unique occurrence, email lease/retry/backoff; có thể gửi trùng khi external send mất ACK. Tắt lịch/trash/lock ngừng nhắc tiếp; restore không replay quá khứ. Chi tiết crash/lease/in-flight race tại [27](27-offline-realtime-jobs.md).

## Truy vết

| WF | UI dự kiến | API nhóm | Entity | TC |
| --- | --- | --- | --- | --- |
| WF-001 | Auth/settings | API-001/002/009 | Identity/Session/EmailChallenge/UserInfo | TC-001/002/011 |
| WF-002 | Editor/list | API-003/004 | Note | TC-003/004/012/013/015 |
| WF-003 | Labels/pin/drag | API-005/006 | Note/Tag/NoteTag | TC-005/006/007 |
| WF-004 | Trash | API-007 | Note graph | TC-008/009 |
| WF-005 | Reminder/inbox | API-008/010 | Reminder/Notification/ReminderDelivery | TC-010 |
