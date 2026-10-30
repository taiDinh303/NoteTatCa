# Thu gọn nhóm note — 2026-10-30

CURRENT theo yêu cầu chủ dự án: Pinned và nhóm note thường (Everything else/All notes) có nút mũi tên thu gọn/mở rộng riêng, trên desktop và mobile. Tiêu đề và số lượng vẫn hiện khi thu gọn; không thay đổi dữ liệu note, pin, thứ tự hoặc bộ lọc.

- Trạng thái hiển thị lưu riêng hai nhóm trong browser preference `ntc.note-groups.v1`, mặc định mở. Dùng chung giữa các màn hình danh sách giống preference Grid/List; không chứa nội dung note. Storage bị chặn thì vẫn dùng được trong lần mở trang hiện tại.
- Button có nhãn dịch EN/VI/ZH/JA, `aria-expanded`, `aria-controls`, hỗ trợ Tab/Enter/Space và focus outline hiện có. Không áp dụng nút cho Trash.
- Nhóm bị thu gọn không mount card/mascot. Danh sách sortable và strategy chỉ tính các note đang hiện; thao tác reorder vẫn dùng dữ liệu của nhóm đầy đủ. Không cho kéo giữa hai nhóm pin khác nhau như trước.
- Deep link/editor, search/labels/reminders và cache note không bị xóa bởi thu gọn. Count là số note của nhóm đã tải theo logic danh sách hiện có; không tạo thêm request chỉ để thu gọn.

Validation thực tế và giới hạn tại [worklog](worklog.md). Không đổi backend/schema/config hoặc triển khai thủ công.
