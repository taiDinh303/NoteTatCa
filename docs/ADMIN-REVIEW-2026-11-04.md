# Rà soát admin — 2026-11-04

> CURRENT10/11: console reminder deliveries đã có source local và đang kiểm chứng; bảng hiện trạng04/11 bên dưới là baseline. [Ưu tiên/contract/phỏng vấn](CURRENT-PRIORITIES.md) điều phối TASK-046/047. Announcement recipient snapshot và thu hồi đã chốt Q-039/040, không còn câu hỏi chưa trả lời; implementation/rollout announcement vẫn chưa hoàn tất. Không suy ra có retry/cancel hoặc worker-health telemetry từ console.

## Yêu cầu và lựa chọn đã chốt

- Đồng nhất phong cách admin với workspace user, giữ khu quản trị riêng và có đủ công cụ xử lý bất tiện vận hành.
- Chủ dự án chọn thông báo **trong app trước, email sau**; ưu tiên **thông báo và theo dõi nhắc nhở lỗi** sau giao diện.
- Quy tắc note riêng và admin không đọc/sửa nội dung note người khác vẫn áp dụng. Không suy diễn “toàn quyền” thành bỏ ownership.

## Giao diện trong đợt này

Header toàn chiều ngang, logo/menu cùng vị trí với user, cùng màu/font/nút/navigation và chiều rộng sidebar đáp ứng. Desktop có thu gọn sidebar, ghi nhớ riêng cho admin; sidebar ẩn không nhận focus. Mobile giữ drawer, header con Settings và tài khoản. Tổng quan bỏ eyebrow, dòng thống kê lặp và khối privacy lớn, thay bằng ghi chú ngắn. Giữ heading truy cập được, Refresh, báo lỗi và thao tác tài khoản/vai trò hiện có. Không thêm nút dẫn tới chức năng chưa có API.

## Hiện trạng từ source, không phải kiểm chứng production

| Nhóm | Đang có | Thiếu hoặc giới hạn |
| --- | --- | --- |
| Tài khoản | Tìm/phân trang, tạo User/Admin, xem metadata, khóa/mở khóa, vô hiệu hóa/khôi phục, xem/gán vai trò; gửi link đặt lại mật khẩu theo yêu cầu chủ tài khoản | Chưa có màn hình sửa hồ sơ người khác hoặc thu hồi phiên riêng theo tài khoản; self-service không phải công cụ admin |
| Quyền | Admin/User, CRUD vai trò tùy chỉnh và membership | Vai trò tùy chỉnh chưa tương đương tập quyền API chi tiết; chưa có ma trận capability |
| Bảo vệ admin | Chặn tự khóa, tự vô hiệu hóa, tự gỡ Admin; thay role/khóa thu hồi phiên | Cần rà invariant luôn còn ít nhất một admin hoạt động khi tác động admin khác, kể cả yêu cầu đồng thời |
| Tổng quan | Tổng tài khoản, tài khoản khóa, note active/trash, reminder active, email pending | Chưa có số lỗi/retry/abandoned, backlog quá hạn, trạng thái worker/lần chạy gần nhất; pending không chứng minh worker khỏe |
| Nhật ký | Actor/target/role/action/time, lọc target/action, phân trang | UUID khó tra cứu; thiếu lọc thời gian/actor và lý do thao tác, liên kết tới tài khoản |
| Thông báo | Inbox nhắc lịch, đọc từng mục/đọc hết, unread count, owner isolation | Chưa có thông báo do admin soạn, chọn người nhận hoặc lịch sử gửi/thu hồi |
| Nhắc nhở | Worker, occurrence, delivery, attempts/last error/lease/sent/abandoned trong dữ liệu | Chưa có console theo dõi/xử lý lỗi; admin không mở note hoặc chỉnh reminder cá nhân |
| Cấu hình | App settings, profile, account/security, sessions của chính admin | App settings không phải cấu hình toàn hệ thống; chưa có quản lý đăng ký/bảo trì/hạn mức |
| Xóa tài khoản | Deactivate/restore đã có | `UserService.DeleteAsync` luôn trả conflict: permanent deletion chưa bật; không quảng bá là đã hỗ trợ xóa ngay |
| Hỗ trợ | User có Help & feedback | Chưa có hàng đợi ticket và quy trình phản hồi/xử lý cho admin |

Nguồn chính: `ntc_react/src/features/admin/AdminPage.tsx`, `ntc_react/src/app/AdminShell.tsx`, `ntc_aspnet/NTC.API/Controllers/V1/AdminController.cs`, `AdminRolesController.cs`, `NTC.Services/Service/AdminService.cs`, `UserService.cs`, `UserRoleService.cs`, `NTC.Contract.Repositories/Entities/Tasks/Notification.cs`, `ReminderDelivery.cs` và `NTC.Services/Jobs/BackgroundMaintenanceService.cs` (các đường dẫn rút gọn backend đều dưới `ntc_aspnet/`).

## Ưu tiên chức năng kế tiếp, chưa triển khai trong đợt giao diện

### 1. Thông báo hệ thống trong app

Phạm vi đã chọn: trong app trước, email sau. Chi tiết dưới là đề xuất kỹ thuật, chưa coi runtime đã có.

- Soạn tiêu đề/nội dung văn bản, chọn tất cả tài khoản hoạt động hoặc từng tài khoản; xem trước và hiện số người nhận trước xác nhận gửi.
- Danh sách bản nháp/đã gửi/đã thu hồi, thời điểm và admin thực hiện. Có chống gửi trùng khi double-click hoặc retry mạng.
- User thấy thông báo hệ thống và nhắc lịch trong Notifications, phân biệt loại, dùng chung unread/read-all. Thông báo hệ thống không có nút mở note.
- Tách announcement và recipient/read receipt khỏi notification nhắc lịch hiện tại. `Notification` có khóa ngoại Note/Reminder bắt buộc; không tạo note/reminder giả hoặc dùng Guid rỗng để gửi announcement.
- Đề xuất chụp tập người nhận lúc gửi; tài khoản đăng ký sau không tự nhận thông báo cũ. Thu hồi ẩn thông báo, giữ lịch sử quản trị. Hai quy tắc này cần xác nhận khi hoàn thiện hợp đồng tính năng.
- Bổ sung migration additive cho SQL Server/PostgreSQL, giữ lịch sử provider, test fixture riêng. Review và áp dụng schema thật là bước riêng; không đổi schema/deploy trong đợt giao diện.

### 2. Theo dõi nhắc nhở và lỗi gửi

- Trang vận hành có pending/retrying/abandoned/sent, lọc tài khoản/trạng thái/thời gian, phân trang. Chỉ trả owner ID, delivery ID, attempts, thời gian, mã lỗi chuẩn hóa; không trả note title/content hoặc raw SMTP response.
- Phân biệt reminder chưa tới hạn với delivery đến hạn đang chờ; worker tắt với worker lỗi. Trạng thái worker/lần chạy cuối cần telemetry thật, không suy ra từ readiness.
- Bước đầu chỉ đọc. Retry/cancel là đề xuất cần kiểm lease, account/note/reminder còn hợp lệ, audit và xác nhận. Không resend thư sent/đang giữ lease; không chỉnh lịch cá nhân thay user.
- Test Admin/User, owner isolation, metadata không lộ note, lọc/phân trang/lỗi mạng; thao tác retry cần kiểm trùng, tranh chấp worker, lịch đã hủy và tài khoản khóa.

## Mở rộng đề xuất sau hai ưu tiên

1. Hỗ trợ tài khoản: chỉnh display name/phone với lý do và audit, revoke sessions. Gửi link khôi phục đã có source trong đợt bổ sung cùng ngày, token theo Identity hiện có; không xem mật khẩu/token hoặc đặt mật khẩu âm thầm.
2. Nhật ký dễ tra cứu, lọc actor/time, liên kết tài khoản; bảo vệ admin hoạt động cuối cùng.
3. Cấu hình hệ thống: đăng ký mới, banner bảo trì, hạn mức có validation/version/audit. Không đưa JWT/DB/SMTP secrets vào giao diện.
4. Hàng đợi hỗ trợ/feedback; xóa tài khoản thực theo quyết định vòng đời dữ liệu, xác nhận hậu quả và chính sách lưu audit.

Các mục mở rộng là PROPOSED, không coi là đã duyệt triển khai toàn bộ. Kết quả lệnh và giới hạn tại [worklog](worklog.md).

## Bổ sung theo yêu cầu trực tiếp cùng ngày

Sidebar admin gom bốn mục Profile/Account & security/Active sessions/App settings thành một Settings ở cuối, dùng index/tabs hiện có. Đường dẫn con cũ tiếp tục hoạt động.

Menu Accounts thêm Send password reset link, xác nhận email đích trước gửi. Chỉ Admin dùng endpoint mới, gửi tới email đã xác minh lưu trong tài khoản; chặn account khóa/deactivated/chưa verified. Dùng rate limit auth hiện có. Không gửi mật khẩu tạm, không trả token/link cho admin, không đổi password/revoke phiên khi chỉ yêu cầu gửi. User dùng link email qua luồng reset hiện có; reset thành công mới thu hồi phiên cũ, token không dùng lại được.

Nhật ký reset là structured server logs chứa actor/target ID và thời điểm yêu cầu, thêm event accepted sau khi email sender thành công. Không chứa email/body/token; không thêm enum vào AdministrativeAuditEvent vì check constraint hiện chỉ chấp nhận1–12. Vì vậy thao tác này chưa xuất hiện trong trang Audit trail của database. Không thay schema/migration hoặc cấu hình SMTP; kiểm thử chỉ captured mail giả. Provider chấp nhận gửi không chứng minh email đã tới hộp thư.
