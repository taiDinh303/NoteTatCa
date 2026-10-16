# 05 — Luồng nghiệp vụ

> 2026-10-16 | DRAFT | Áp dụng: YES | Phạm vi đã chốt; trình tự/contract chi tiết là đề xuất, runtime NOT RUN

## WF-001 — Đăng ký và đăng nhập

REQ-001/009, RULE-009. Khách chọn email/mật khẩu hoặc Google. Đăng ký mật khẩu: gửi OTP theo Q-002, nhập mã còn hạn, tạo user/profile/role nhất quán, login phát phiên. Google: server xác minh ID token đúng audience và email đủ điều kiện; chính sách link tài khoản phải chống chiếm tài khoản. Login sai/OTP hết hạn/rate limit trả lỗi ổn định; không lộ tài khoản tồn tại qua thông báo công khai.

CURRENT dùng username khi login; TARGET email theo Q-002. Registration OTP trong IMemoryCache, TTL 10 phút từ AuthService; Google flow riêng API và Razor. Không có chứng cứ refresh/logout server; restart hiện có thể làm mất OTP. Giữ Identity khi chuyển Supabase DB.

## WF-002 — Tạo và sửa ghi chú

REQ-002/003/011. User nhập nội dung bằng unified rich editor có checklist/màu chữ/emoji/Markdown shortcuts, chọn nhãn/màu/ghim. Có autosave và nút Save đã chốt Q-023. React kiểm tra cơ bản; API xác thực owner, validation và transaction, trả DTO chuẩn. UI chỉ báo Saved sau ACK. Lưu lỗi giữ bản nhập; timeout cần đối chiếu kết quả trước gửi tạo lại. Version/conflict contract là đề xuất cần hoàn thiện.

CURRENT create lấy owner từ claim nhưng DTO còn UserId; update/detail thiếu owner filter. Chưa có checklist model riêng. Đổi định dạng phải giữ note cũ đọc được.

## WF-003 — Nhãn, ghim và kéo thả

REQ-004/005, RULE-004/005/007. Gán nhãn chỉ khi cả note và tag thuộc user, còn hoạt động. Gán lặp không sinh bản trùng. Xóa nhãn gỡ quan hệ, giữ note. Ghim chuyển nhóm, server quản lý PinnedAt/thứ tự. Reorder chỉ chấp nhận dragged/neighbor cùng owner, nhóm; cập nhật nguyên tử. UI optimistic phải rollback nếu API thất bại.

CURRENT có composite PK, pin/reorder service, nhưng remove/bulk NoteTag chưa kiểm quyền đồng nhất và một số helper chưa tự SaveAsync. Phải xác định ranh giới UOW ở từng entrypoint.

## WF-004 — Trash, restore và xóa hẳn

REQ-006, RULE-002/008. User xóa mềm note → khỏi danh sách hoạt động → xem trash → restore hoặc xác nhận xóa hẳn; tự purge sau 7 ngày đã chốt Q-006. Note trong trash không nhắc, không hiện ở search mặc định. Khi restore: đề xuất giữ nội dung/nhãn còn hợp lệ, không replay toàn bộ lịch cũ; chi tiết lịch sau restore cần chốt khi làm scheduler.

Hard delete cần xóa quan hệ/nhắc/delivery đúng transaction và audit không chứa nội dung. Gửi lại delete/restore phải có contract ổn định; không xóa note người khác dù biết ID.

## WF-005 — Nhắc lịch

REQ-008, RULE-006. User chọn giờ, timezone, kênh và lịch lặp đã duyệt. API lưu reminder và occurrence/delivery cần thiết; worker đến hạn xác minh note còn hoạt động và user còn quyền, gửi, ghi kết quả/dedup, tính lần tiếp. Tắt lịch/xóa note ngừng occurrence tương lai. Retry không gây gửi nhiều thông báo; worker restart không mất lịch.

CURRENT chỉ thấy CRUD/recurrence data; chưa thấy hosted worker/job scheduler. TARGET in-app/email, có lặp; timezone từng user mặc định Việt Nam và gửi bù một lần trong 24h, bỏ cũ hơn đã chốt Q-024. DST, cuối tháng, nhiều occurrence quá hạn và giới hạn 5 lịch hiện trong code phải chốt trước triển khai scheduler.

## Chuyển trạng thái đề xuất

| Trước | Sự kiện / guard | Sau | Side effect |
| --- | --- | --- | --- |
| Active note | Soft delete bởi owner | Trash | Dừng thông báo, ẩn khỏi active |
| Trash | Restore bởi owner, chưa purge | Active | Khôi phục nội dung, không tự gửi bù lịch |
| Trash | Hard delete xác nhận hoặc hết retention đã chốt | Removed | Xóa graph liên quan trong transaction |
| Active normal | Pin bởi owner | Active pinned | Gán PinnedAt/thứ tự nhóm |
| Active pinned | Unpin bởi owner | Active normal | Xóa PinnedAt, chuyển nhóm |
| Active reminder | Disable/delete/parent trash | Inactive | Không tạo delivery mới |

Removed không restore trong app; chỉ phục hồi backup theo vận hành, không hứa khôi phục từng note. Archive là trạng thái có điều kiện Q-004, chưa giả lập bằng trash.

## Truy vết

| WF | UI dự kiến | API nhóm | Entity | TC |
| --- | --- | --- | --- | --- |
| WF-001 | Auth/settings | API-001/002/009 | Identity/UserInfo | TC-001/002/011 |
| WF-002 | Editor/list | API-003/004 | Note | TC-003/004/012 |
| WF-003 | Labels/pin/drag | API-005/006 | Note/Tag/NoteTag | TC-005/006/007 |
| WF-004 | Trash | API-007 | Note graph | TC-008/009 |
| WF-005 | Reminder dialog/inbox | API-008 | Reminder/delivery đề xuất | TC-010 |
