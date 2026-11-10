# Thông báo hệ thống — TASK-047

Ngày10/11: chủ dự án giao triển khai đợt thông báo admin. Code local đã triển khai API/schema/UI; chưa apply migration hoặc phát hành production. Evidence thực tế ở worklog. Quyết định recipient/thu hồi đã chốt Q-039/040 tại CURRENT-PRIORITIES.

## Phạm vi bản đầu

Admin soạn nháp, xem trước nội dung/số người nhận, gửi, xem lịch sử và thu hồi. User nhận trong Notifications với trạng thái đọc/chưa đọc và bộ đếm chung. Chỉ text, không email/attachment/HTML, không Open note cho announcement.

Title1–150 ký tự sau trim, body1–10000 ký tự sau trim; không dịch nội dung admin khi đổi ngôn ngữ UI. Giữ draft khi request lỗi. Các giới hạn này là lựa chọn kỹ thuật bản đầu, không thay quota note.

## Dữ liệu và quyền

Announcement tách khỏi Notification hiện hữu (Notification có FK bắt buộc NoteId/ReminderId). Không tạo note/reminder giả hoặc nới ownership của InboxService.Owned. Recipient receipt có unique(AnnouncementId,UserId), ReadAt riêng. Không dùng nội dung note để soạn thông báo.

Announcement lưu title/body/recipient mode/status, version concurrency, CreatedBy/PublishedBy/RevokedBy và thời gian UTC. Draft lưu danh sách account ID được chọn riêng. Receipt chỉ tạo khi publish; không cho client gán owner/read state. Published content bất biến; thu hồi giữ lịch sử, không xóa receipt hoặc audit.

Eligible recipient: account hoạt động, không locked/deactivated, role User và không Admin. All-active lấy snapshot trong transaction gửi; selected yêu cầu mọi ID hợp lệ, không âm thầm bỏ ID. Người đăng ký sau không nhận lại thông báo cũ. Preview chỉ là dự kiến; publish revalidate recipient và version, trả số thực tế. UI phải hiện rõ số preview có thể thay đổi trước khi gửi.

## API hiện hành trong source local

- Admin GET/POST /api/v1/admin/announcements: list paginated/create draft. Create bắt buộc requestId, fingerprint canonical title/body/recipient mode/sorted IDs; retry cùng payload trả bản cũ, khác payload409.
- Admin GET /api/v1/admin/announcements/recipients: tìm email/phân trang tài khoản đủ điều kiện; không nhận Admin (kể cả Admin+User), locked hoặc deactivated. Selected tối đa1000UUID riêng biệt.
- Admin GET/PATCH /{id}: detail/update draft với expectedVersion; published không sửa.
- Admin POST /{id}/preview: preview title/body/số recipient từ draft hiện hành.
- Admin POST /{id}/publish: expectedVersion và requestId; transaction snapshot + receipts + metadata audit. Retry cùng requestId trả kết quả cũ; payload khác trả409. Đồng thời publish/revoke/update phải kiểm version, không gửi trùng.
- Admin POST /{id}/revoke: expectedVersion, idempotent khi đã thu hồi; không phát lại.
- Customer GET /api/v1/notifications/feed và /feed/unread-count; PATCH /feed/{id}/read và /feed/read-all. Feed ghép announcement/reminder với kind, nullable noteId/reminderId chỉ cho announcement, title/body text. Routes /notifications cũ giữ nguyên reminder-only cho tương thích. Read-all mới xử lý cả hai loại trong một transaction; read/count/list đều lọc receipt theo owner và announcement published/non-revoked. Không có customer detail endpoint riêng.

Anonymous401, non-admin403 trên admin routes, khác owner404 trên receipt; draft/revoked không xuất hiện ở customer feed/count và không mark-read được. Mọi truy vấn receipt join announcement chưa revoked, không chỉ lọc UI. Client polling60giây/focus/reload; thu hồi được phản ánh sau revalidation, không hứa realtime xóa DOM đã tải. Request sai400, concurrency/idempotency mismatch409. Không trả email/token/provider error hoặc nội dung note trong metadata quản trị.

## Kiểm chứng và phát hành

Additive EF migrations riêng SQL Server/PostgreSQL, không sửa lịch sử. Test trên SQLite và PostgreSQL fixture biệt lập: roles/ownership, hidden note isolation, all/selected recipients, user mới không nhận cũ, khóa/deactivate trước gửi, read/read-all/count, revoke với stale cache, cạnh tranh publish/update/revoke, mất ACK và retry, validation/XSS, rollback transaction. Browser desktop/mobile và bốn ngôn ngữ; kiểm luồng reminder cũ cùng inbox mới.

Không apply DB thật hoặc push UI phụ thuộc schema/API mới trước review/rollout riêng. Done yêu cầu đủ API/schema/UI/tests và evidence; contract hoặc compile không thay nghiệm thu. Chưa bật paid services, gửi email hoặc đọc note thật.


## Source và schema

AnnouncementService dùng BaseService/ICurrentUser/TimeProvider/UOW serializable; parent Version đổi cả khi chỉ sửa targets. Bốn bảng mới Announcements/AnnouncementTargets/AnnouncementReceipts/AnnouncementEvents; audit events append-only, receipt owner/announcement và create-request identity bất biến trong persistence guard. Detail admin trả target IDs, actual recipient snapshot IDs và history actor/time/action; không note content.

SQL Server20261110152419_AddAnnouncements, PostgreSQL20261110152426_AddAnnouncements: Up chỉ thêm bảng/index/FK/check, không sửa dữ liệu/bảng hiện hữu. Script idempotent từ vault migration ở artifacts/announcements/{sqlserver,postgres}.sql (ngoài Git). Migrations cũ giữ nguyên. Provider histories/model snapshots regression được cập nhật; PostgreSQL runtime mới chỉ chạy khi có NTC_TEST_POSTGRES loopback, không dùng appsettings.

Frontend /admin/announcements: draft guard cho SPA/reload, chọn account có search/pagination, Save giữ dữ liệu khi lỗi, preview trước Send, requestId giữ qua retry mất ACK; published chỉ đọc, revoke có xác nhận. Notifications hiện text an toàn, không nút Open note cho announcement, dùng chung unread/read-all với reminder. UI Việt/Anh/Trung/Nhật; content admin giữ nguyên ngôn ngữ. Không push UI này lên main trước khi schema/API đã được rollout riêng.


## Evidence local10/11

Strict .NET8 Release0warnings/errors; backend210PASS/1PGskip sau khi loại5ca chỉ chạy LocalDB (runtime không cài).8ca HTTP announcements và provider histories/model consistency PASS. React lint/typecheck/build PASS, unit164PASS/1SKIP; fixed production-bundle Chromium21/21PASS (3announcement +18regressions). Root docs62Markdown/275links/0errors. Đây là synthetic SQLite/captured mail; SQL Server/PostgreSQL runtime mới, native/WebKit và production rollout chưa được nghiệm thu. Chi tiết lệnh/thất bại ban đầu/giới hạn ở worklog; không claim full frontend suite xanh.
