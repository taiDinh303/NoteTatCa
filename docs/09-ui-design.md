# 09 — UI React NoteTatCa

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

UI English/React đã triển khai tại ntc_react ngày 2026-10-18; phạm vi/evidence xem FRONTEND-IMPLEMENTATION. Backend đã có v1, version409, idempotency, documentJSON schema1, inbox/admin no-content. DEC-023/2026-10-22: note đã lưu mặc định View note chỉ đọc, chỉ nút Edit bật editor; note mới vào editor ngay. DEC-018/2026-10-20: editor desktop mặc định khung nhỏ cho cả tạo/mở note, có nút phóng to/thu nhỏ; yêu cầu2026-10-22: mobile≤800px luôn toàn màn hình, ẩn nút thu/phóng; autosave/status/error, không Save thường; Retry save khi lỗi, Close bảo vệ draft. Title rỗng ẩn, Add title mở ô nhập tùy chọn; counter cố định góc dưới. Duplicate labels phân biệt ID;100k text/1MiB document. Cảnh báo convert rich→plain/Markdown, giữ bản nhập khi conflict; không tự retry overwrite. Storage refresh/multi-tab/XSS và accessibility cần test khi làm React.

## Phạm vi đã chốt

React + TypeScript + Vite tại `NTC/ntc_react`; UI mặc định tiếng Anh, có Việt/Anh/Trung/Nhật theo DEC-024; Razor cũ đã gỡ theo DEC-020, source tham khảo còn trong Git. Chức năng: note riêng, nhãn/màu/ghim/kéo thả/tìm kiếm/trash; một rich editor tích hợp plain/checklist/Markdown shortcuts, màu chữ/emoji và emoji đại diện note; nhắc trong app+email và admin tài khoản/thống kê không đọc note. Q-020/021 đã chốt, không tạo bốn editor độc lập.

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

- DEC-019: sau login/restore có animation chuẩn bị workspace và progress collection/trang thực tế; lỗi có Try again/Sign out. API chậm có trạng thái Connecting, offline có Reconnect; bootstrap lỗi mạng không xóa phiên đang lưu. Giữ layout/editor/draft khi kết nối gián đoạn trong lúc dùng. Chỉ retry GET/probe tự động; Retry save do user chọn khi lưu lỗi. Cache trong memory giúp chuyển notes/labels/trash/reminders/inbox không chờ tải lần đầu sau preparation; không hứa offline đầy đủ hoặc không có background refresh.
- Loading chi tiết: từng dòng notes/labels/account/... có waiting/loading/ready/error, icon phù hợp và vòng xoay khi đang tải; thanh dữ liệu có phần trăm collection thực, thanh chờ API/session indeterminate không số giả. Banner connecting/reconnecting có spinner đang xoay, đứng yên ở trạng thái offline/error khi không chờ; reduced-motion được giữ. Không đưa note content hoặc thông tin tài khoản cá nhân vào các nhãn tiến trình.
- Danh sách: loading, rỗng lần đầu, không có kết quả search, lỗi có retry, trang ngoài giới hạn.
- Editor: sạch/đang sửa/đang lưu/đã lưu/lưu lỗi/conflict. DEC-018 thay Save thường của Q-023 bằng autosave + Retry save chỉ khi lỗi; giữ bản nhập khi401, mất mạng hoặc server lỗi; không báo Saved trước ACK.
- Notes: một điểm Take a note kể cả empty state; bỏ header giải thích/nút New note/Create your first note trùng. Reminders/Inbox bỏ heading và mô tả đầu trang; Trash/label bỏ heading nhìn thấy, giữ semantic heading cho screen reader và các thao tác/cảnh báo. Sidebar có ẩn/hiện desktop nhớ lựa chọn, mobile drawer, cùng icon ba gạch ngang; YOUR LABELS/icon dùng chung một button, không Create a label trùng. Không routine success toast cho note/label/reminder; lỗi và các xác nhận bảo mật/quản trị giữ nguyên.
- Trash: cảnh báo tự xóa sau 7 ngày và hậu quả xóa hẳn; restore lỗi không làm mất item khỏi UI vô lý.
- Nhắc lịch: hiển thị timezone và lịch lần tiếp; gửi email thất bại không báo đã nhận thành công.
- Admin: không hiển thị preview/title/content, tooltip hay endpoint nội dung note của user khác.
- Mất quyền/khóa tài khoản: ngừng load/sync, không lộ note cached cho người đăng nhập kế tiếp.

## Design system đề xuất

Đã chọn CSS tokens, DM Sans/Manrope self-hosted, Radix/Tiptap/dnd-kit; chưa có Figma. Dùng token cho màu nền/chữ/border/focus, spacing và radius; NoteCard, EditorToolbar, LabelChip, ReminderDialog, ConfirmDialog, Toast có states rõ. Màu note do user chọn không được làm chữ/toolbar mất khả năng đọc. Icon thao tác có nhãn truy cập, không dùng màu làm dấu hiệu duy nhất.

PROPOSED responsive kiểm ở 360/768/1280px; grid chuyển list phù hợp, sidebar drawer trên mobile, drag có phương án di chuyển bằng bàn phím. Modal trap focus, Escape/hủy rõ, trả focus về trigger. Title/content dài, tiếng Việt/emoji và lịch dạng địa phương không tràn.

Nghiệm thu: TC-012/014/015; evidence browser/screenshots ở FRONTEND-IMPLEMENTATION. Q-025 về UI tiếng Anh đã được mở rộng bằng DEC-024; layout/CSS/editor đã chọn trong tác vụ React; file 13 không tự tạo Figma.

## Settings và ngôn ngữ — 2026-10-23

Sidebar Settings mở Language/Privacy/Appearance; tài khoản vẫn nằm tại avatar Account settings. Language là radio group với tên bản địa English, Tiếng Việt, 中文, 日本語, lưu preference riêng trên trình duyệt; đổi tức thì cả label/accessibility/date-time, giữ nội dung người dùng và bản nháp. Mobile Settings có header ← + tên trang, ẩn search/avatar/hamburger và liên kết quay lại trùng trong nội dung; PC giữ toàn bộ header/sidebar và breadcrumb. Privacy có thẻ nội dung về ghi chú riêng, tài khoản, trình duyệt, email nhắc và thời hạn khôi phục; các link account/sessions/trash có thật, không tạo toggle tracking/encryption không có chức năng. Admin có App settings riêng và không có liên kết vào Trash của khách.

## Thu phóng và sidebar gọn — DEC-021

Bỏ badge ⌘ K, khối Personal workspace/Just for you và Big ideas often start with a little note; giữ Ctrl/Cmd+K. Scrollbar thin/bo tròn theo theme. Thu phóng50–150% dùng Ctrl + lăn chuột (Cmd cũng được hỗ trợ), trackpad phát ctrl-wheel hoặc pinch hai ngón trên điện thoại. Không có nút zoom riêng trên topbar. Theo yêu cầu bổ sung, menu tài khoản có Zoom (x%) mở dialog: ô nhập phần trăm, hai nút−/+ bước10%, Reset to 100% và Done; vẫn50–150%, không có slider. Dialog giữ kích thước đọc/bấm được độc lập với scale, vùng bấm44px và hint ngắn về gesture. Enter/blur áp dụng số nhập; ô trống giữ giá trị, số vượt biên clamp, làm tròn phần trăm nguyên. Đóng trả focus về avatar. HUD phần trăm nằm giữa dưới, tự ẩn sau1.2giây từ gesture cuối; inverse zoom giữ chữ đủ đọc, pointer-events none và không lấy focus. Responsive theo container viewport sau zoom; không remount editor hoặc reload. Chỉ chặn mặc định của gesture zoom để tránh phóng hai lần; cuộn thường và một ngón giữ nguyên. Browser keyboard zoom vẫn dùng riêng.

## Nút ghim trong editor — 2026-10-21

Theo ảnh/yêu cầu chủ dự án, editor hiển thị Pin khi chưa ghim và PinOff (Unpin note) khi đã ghim, đồng nhất note card. Bỏ nền active tối; nút trong suốt, màu icon theo foreground tương phản của heading, hover nhẹ từ currentColor và focus outline rõ. aria-pressed phản ánh trạng thái; giữ nguyên update/autosave/version/ownership. Không đổi nút/tag/reminder active khác. Evidence và giới hạn kiểm thử ở worklog.

## Editor: nút đồng nhất và căn giữa — 2026-10-21

Add title, Pin/Unpin và fullscreen dùng chung nền trong suốt, hover nhẹ theo foreground và focus outline; vẫn giữ trạng thái ghim qua icon/aria-pressed. Toolbar có một nút Text alignment, mở menu radio4 lựa chọn Align left/Align center/Align right/Justify. Icon phản ánh căn lề hiện tại; menu đánh dấu lựa chọn, hỗ trợ bàn phím, đóng trả focus editor/giữ vùng chọn. Áp dụng cho paragraph/heading trong vùng chọn. TextAlign cùng phiên bản Tiptap3.32.0; canonical document và API chỉ nhận textAlign left/center/right/justify trên paragraph/heading, không nhận CSS tùy ý. Dữ liệu cũ không có thuộc tính vẫn giữ nguyên. Markdown export cảnh báo mất alignment. Bộ đếm cuối editor hiển thị x / 100,000, giữ nhãn trợ năng Character count. Không cần migration. Evidence thực tế ở worklog.

## Sidebar drawer — 2026-10-21

Sidebar mobile customer/admin không hiện nút X. Chạm/click vùng ngoài drawer đóng, chạm bên trong giữ mở; Escape hoặc chọn link đóng, hamburger mở lại. Chỉ drawer bật dismissOnOutside/hideCloseButton; dialog editor/form/confirmation giữ quy tắc hiện hành.

## Bảng màu note thu gọn — 2026-10-21

Thanh editor chỉ có một nút cọ vẽ Note background color. Radix Popover mở lên phía trên, tránh mép viewport; bảng4 cột, ô44px, đánh dấu màu hiện tại. Chọn preset hoặc Default note color đóng bảng; Custom color mở bộ pha màu native và cập nhật autosave. Escape/click ngoài đóng bảng, trả focus trigger. Lazy editor không lấy focus từ bảng màu/menu đang mở. Không thêm hình nền hoặc đổi API/dữ liệu màu.

## Header editor một hàng, menu icon — 2026-10-21

Icon note, input tiêu đề tùy chọn, ghim và fullscreen nằm cùng một hàng; input co theo chiều ngang, tiêu đề vẫn tối đa150 ký tự. Chọn icon mở Radix Popover (preset/Remove icon/custom emoji), không thêm hàng vào editor; chọn preset đóng bảng, Escape/click ngoài đóng. Trạng thái autosave thường chỉ thông báo trợ năng, không hiển thị dòng All changes saved; lỗi/409/Retry save vẫn hiện và giữ draft theo quy tắc cũ. Không đổi API/schema.

## Tiêu đề luôn hiện, không placeholder — 2026-10-21

Bỏ Add title và cơ chế ẩn input khi blur rỗng. Luôn hiện input Note title trên hàng icon/ghim/fullscreen, không có placeholder, giữ aria-label trợ năng; cho để trống và giới hạn150 ký tự như cũ. Mở note vẫn ưu tiên focus content; người dùng bấm ô title để nhập. Không đổi API/dữ liệu/autosave.

## Cỡ chữ thay nút Heading — 2026-10-21

Toolbar bỏ nút H2/Heading và thay bằng Font size. Menu radio có Default cùng8/9/10/11/12/14/18/24/30/36/48/60/72/96px (mặc định 11px); trigger hiện cỡ tại con trỏ/vùng chọn. Chọn cỡ áp dụng textStyle.fontSize trên văn bản đang chọn hoặc nội dung gõ tiếp, Default bỏ fontSize và giữ marks khác. Dùng FontSize từ package Tiptap text-style3.32.0 sẵn có; không thêm dependency. Canonical/API cùng allowlist preset px, từ chối giá trị CSS tùy ý. Heading cũ và Markdown headings vẫn tương thích, không migrate. Export Markdown cảnh báo mất font size.

## Tiêu đề cạnh icon và màu nền toàn editor — 2026-10-21

Thẻ note ngoài danh sách đặt icon và title trong cùng note-card-identity ở hàng đầu, title có thể wrap dài; cả identity và nội dung vẫn mở note, ghim/drag riêng. Không tự thêm Untitled hiển thị cho note rỗng title. Modal nhận style tùy chọn để NoteEditor truyền backgroundColor, surface và foreground theo notePalette: màu áp dụng cả header/body/toolbar/footer, default bỏ override và trở về theme. Inline màu chữ người dùng vẫn giữ. Không đổi dữ liệu/API/schema.

## Tiêu đề card dài — 2026-10-21

Tiêu đề trong note-card-identity hiển thị một dòng, overflow hidden/text-overflow ellipsis, co theo khoảng còn lại cạnh icon/action. Native title tooltip chứa đầy đủ tiêu đề; input editor và dữ liệu150ký tự giữ nguyên. Không cắt chuỗi đã lưu.

## Chế độ xem note — DEC-023 / 2026-10-22

Note đã lưu mở View note chỉ đọc: icon/title/nội dung và Edit/Close. Không toolbar/input/counter/tool chỉnh sửa; chạm/gõ/checklist không thay dữ liệu. Edit bật editor đầy đủ, note mới vào editor ngay. Card menu: Add label, Add reminder, Move earlier/later, Move to trash; không Open note hoặc Pin/Unpin note trong menu. Ghim vẫn có nút riêng. Mobile view/editor toàn màn hình, desktop view nhỏ và editor có nút thu/phóng.

Bổ sung2026-10-22: footer editor có View để trở về màn hình chỉ xem mà không đóng note. Chờ lưu xong mới chuyển, hiện trạng thái busy và chặn đóng trong lúc chuyển; lỗi giữ bản nháp/editor. Mobile vẫn toàn màn hình.
