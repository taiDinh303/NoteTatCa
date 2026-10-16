# 12 — Thuật ngữ và quy ước

> 2026-10-16 | DRAFT | Áp dụng: YES

| Thuật ngữ | Nghĩa trong NoteTatCa | Tên / phân biệt |
| --- | --- | --- |
| Note | Ghi chú của một tài khoản | Note; không phải task có deadline mặc định |
| Owner | Người sở hữu note/nhãn | UserId, lấy từ danh tính xác thực |
| Nhãn | Phân loại một note vào nhiều nhóm | Tag; liên kết NoteTag |
| Ghim | Ưu tiên nhóm note lên trên | IsPinned/PinnedAt; khác Priority chưa định nghĩa |
| Kéo thả | Đổi thứ tự trong nhóm | SortOrder; không đổi owner |
| Thùng rác | Note xóa mềm, giữ tối đa 7 ngày | DeletedTime; không phải archive |
| Xóa hẳn/purge | Loại dữ liệu theo policy | Không restore qua UI |
| Reminder | Lịch nhắc liên quan note | Reminder; khác thông báo đã gửi |
| Occurrence | Một lần tới hạn của lịch lặp | Đề xuất mới; là đơn vị dedup |
| Notification | Bản thông báo trong app | Chưa có entity hiện tại |
| Admin | Quản lý/khóa user và thống kê | Không có quyền đọc/sửa nội dung note của người khác |
| Checklist | Danh sách item đánh dấu trong unified editor | Nhu cầu đã chốt Q-020; document node schema còn đề xuất |
| Rich text | Nội dung định dạng/màu/emoji/icon | Không tự coi là HTML tùy ý an toàn |
| Markdown | Biểu diễn văn bản bằng cú pháp | Không giữ mọi thuộc tính rich text khi export |
| Supabase | PostgreSQL được chọn cho tương lai | Q-019 giữ .NET Identity, không dùng Supabase Auth |
| Tenant | Tổ chức/workspace nhiều thành viên | Chưa có; nhiều user riêng không tự thành team |

Docs tiếng Việt; UI tiếng Anh đã chốt Q-025. ID Guid trao đổi dưới dạng chuỗi; JSON camelCase đề xuất thống nhất; ngày giờ API ISO-8601 có offset, lưu UTC đề xuất. Trong docs ngày theo Asia/Bangkok. Trạng thái tài liệu DRAFT khác trạng thái triển khai NOT RUN.

Ví dụ dùng tài khoản A/B/Admin C, `user-a@example.test`, không dữ liệu thật. REQ/RULE/WF/API/TC/TASK/Q/ADR giữ ID khi cập nhật. Enum qua API phải xác định chuỗi/số trong contract; code Reminder hiện enum số nhưng chưa chốt contract mới.
