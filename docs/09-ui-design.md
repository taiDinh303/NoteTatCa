# 09 — UI React NoteTatCa

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

UI English/React đã triển khai tại ntc_react ngày 2026-10-18; phạm vi/evidence xem FRONTEND-IMPLEMENTATION. Backend đã có v1, version409, idempotency, documentJSON schema 1, inbox/admin no-content. Editor phải có Save/auto-saving/error, Untitled khi title rỗng; duplicate labels phân biệt ID;100k text/1 MiB document. Cảnh báo convert rich→plain/Markdown, giữ bản nhập khi conflict; không tự retry overwrite. Storage refresh/multi-tab/XSS và accessibility cần test khi làm React.

## Phạm vi đã chốt

React + TypeScript + Vite tại `NTC/ntc_react`; UI tiếng Anh; giữ Razor ở `ntc_aspnet/NTC.VIEW`. Chức năng: note riêng, nhãn/màu/ghim/kéo thả/tìm kiếm/trash; một rich editor tích hợp plain/checklist/Markdown shortcuts, màu chữ/emoji và emoji đại diện note; nhắc trong app+email và admin tài khoản/thống kê không đọc note. Q-020/021 đã chốt, không tạo bốn editor độc lập.

| ID | Route PROPOSED | Component / hành động | REQ / API |
| --- | --- | --- | --- |
| UI-001 | /login, /register | Email/password, Google, OTP, quên mật khẩu | REQ-001, API-001/002 |
| UI-002 | /notes | SearchBar, sidebar nhãn, note grid/list, ghim/kéo thả | REQ-003/004/005/007, API-003/005/006 |
| UI-003 | /notes/:id hoặc dialog editor | Title, editor, format, checklist, màu chữ/nền, icon, lưu | REQ-003/011, API-004 |
| UI-004 | /labels/:id | Note list lọc tag, tạo/sửa/gỡ tag | REQ-004, API-005 |
| UI-005 | /reminders | Note có lịch, dialog giờ/lặp/kênh | REQ-008, API-008 |
| UI-006 | /trash | Thời gian còn lại đến 7 ngày, restore, xác nhận xóa hẳn | REQ-006, API-007 |
| UI-007 | /settings | Hồ sơ, đổi email/password, liên kết Google, timezone | REQ-009, API-009 |
| UI-008 | /notifications | Inbox, chưa đọc/đã đọc; mở note còn quyền | REQ-008, API-010 |
| UI-009 | /admin/users, /admin/overview | Quản lý/khóa user, thống kê không chứa nội dung | REQ-012, API-011 |

Routes hiện hành được ánh xạ cụ thể ở FRONTEND-IMPLEMENTATION; bảng trên giữ ID UI gốc. UI chỉ ẩn/hiện theo capability; API luôn kiểm quyền riêng.

## Trạng thái bắt buộc

- Danh sách: loading, rỗng lần đầu, không có kết quả search, lỗi có retry, trang ngoài giới hạn.
- Editor: sạch/đang sửa/đang lưu/đã lưu/lưu lỗi/conflict. Autosave + nút Save đã chốt Q-023; giữ bản nhập khi 401, mất mạng hoặc server lỗi; không báo Saved trước ACK.
- Trash: cảnh báo tự xóa sau 7 ngày và hậu quả xóa hẳn; restore lỗi không làm mất item khỏi UI vô lý.
- Nhắc lịch: hiển thị timezone và lịch lần tiếp; gửi email thất bại không báo đã nhận thành công.
- Admin: không hiển thị preview/title/content, tooltip hay endpoint nội dung note của user khác.
- Mất quyền/khóa tài khoản: ngừng load/sync, không lộ note cached cho người đăng nhập kế tiếp.

## Design system đề xuất

Đã chọn CSS tokens, DM Sans/Manrope self-hosted, Radix/Tiptap/dnd-kit; chưa có Figma. Dùng token cho màu nền/chữ/border/focus, spacing và radius; NoteCard, EditorToolbar, LabelChip, ReminderDialog, ConfirmDialog, Toast có states rõ. Màu note do user chọn không được làm chữ/toolbar mất khả năng đọc. Icon thao tác có nhãn truy cập, không dùng màu làm dấu hiệu duy nhất.

PROPOSED responsive kiểm ở 360/768/1280px; grid chuyển list phù hợp, sidebar drawer trên mobile, drag có phương án di chuyển bằng bàn phím. Modal trap focus, Escape/hủy rõ, trả focus về trigger. Title/content dài, tiếng Việt/emoji và lịch dạng địa phương không tràn.

Nghiệm thu: TC-012/014/015; evidence browser/screenshots ở FRONTEND-IMPLEMENTATION. UI tiếng Anh đã chốt Q-025; layout/CSS/editor đã chọn trong tác vụ React; file 13 không tự tạo Figma.
