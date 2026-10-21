# 30 — Hướng dẫn sử dụng dự thảo

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

React hiện ở ntc_react; route/chức năng thực tế xem FRONTEND-IMPLEMENTATION, tài liệu dưới giữ ID luồng. Backend cung cấp API cho React; NTC.VIEW đã gỡ theo DEC-020; tên nút/UI dùng English. Lưu conflict phải giữ bản nhập; Untitled hợp lệ; nhãn trùng được phép; trash7 ngày; restore chỉ nhắc tương lai. Markdown conversion cần cảnh báo format. Có export Markdown từng note với cảnh báo mất định dạng; full account export/permanent delete còn chưa chốt doQ014.

## Bắt đầu

Đăng ký bằng email/mật khẩu, nhập mã xác minh email, hoặc chọn **Continue with Google**. Sau đăng nhập, **Notes** hiển thị ghi chú của bạn. Tài khoản khác và quản trị viên ứng dụng không được xem nội dung ghi chú riêng qua chức năng app.

## Tải dữ liệu và kết nối

Sau đăng nhập, **Preparing your workspace** tải notes, labels, Trash, Reminders và Inbox để chuyển trang nhanh. Thanh tiến trình hiển thị các collection/trang đã tải; nhiều note có thể mất lâu hơn. Nếu báo **Connecting to NoteTatCa…**, hãy đợi API phản hồi. Khi thất bại dùng **Try again**, **Reconnect** hoặc **Retry connection** theo màn hình; không cần nhập lại mật khẩu chỉ vì phiên chưa khôi phục được do mất mạng.

Các dòng nhỏ như **Loading notes…**, **Loading labels…**, **Loading account details…** cho biết phần đang tải; dấu tick là đã sẵn sàng, trạng thái Waiting là đang chờ tới lượt. Phần trăm theo số collection hoàn tất. Khi mới chờ server, thanh chạy và vòng xoay chỉ báo đang kết nối, chưa có phần trăm dữ liệu; hệ điều hành bật giảm chuyển động có thể giữ icon đứng yên.

Khi đang soạn mà mất kết nối, giữ tab mở; bản nháp ở trong bộ nhớ. Sau khi có mạng, kiểm trạng thái lưu và dùng **Retry save** nếu còn lỗi. Kết nối lại không tự gửi lại thao tác ghi. Tải lại/đóng tab có thể mất nội dung chưa lưu; ứng dụng chưa có lưu offline bền vững. Sign out xóa cache riêng của tài khoản khỏi tab.

## Tạo và tổ chức note

1. Chọn **Take a note…** để mở editor toàn màn hình và nhập nội dung. Nút góc trên **Exit full screen / Enter full screen** chuyển giữa modal và toàn màn hình, giữ nguyên bản đang nhập. Tiêu đề không bắt buộc; chọn **Add title** khi muốn thêm.
2. Dùng thanh công cụ để định dạng, chọn màu chữ, chèn emoji hoặc checklist; chọn emoji đại diện nếu muốn.
3. Nội dung tự lưu; chỉ tin **All changes saved** sau ACK. Khi lỗi, dùng **Retry save** hoặc sao chép bản nhập. **Close** chờ lưu xong; nếu chưa lưu được, bạn có thể giữ cửa sổ hoặc xác nhận bỏ bản nháp. Bộ đếm ký tự nằm cố định ở dưới.
4. Gán **Labels**, đổi **Note color**, **Pin** hoặc di chuyển thứ tự. Dùng **Search notes** để tìm nội dung của mình.

Cú pháp Markdown hỗ trợ trong editor theo thiết kế; chuyển/xuất Markdown có cảnh báo các định dạng không giữ được như màu. Không có upload ảnh/tệp, archive hoặc chia sẻ trong phạm vi đã chọn.

Nút **Hide sidebar / Show sidebar** trên desktop giúp tập trung vào note; lựa chọn được nhớ trên trình duyệt. Trên điện thoại dùng **Open navigation**. Bấm cả dòng **YOUR LABELS** hoặc icon cạnh nó để quản lý nhãn. Ghim/đổi vị trí/các thao tác note thường cập nhật trực tiếp mà không hiện toast thành công; lỗi vẫn được báo.

## Nhắc lịch

Chọn **Reminder**, giờ và lịch lặp, kiểm timezone tài khoản. Thông báo xuất hiện trong **Notifications** và gửi email theo lịch. Nếu hệ thống gián đoạn, gửi bù một lần trong 24 giờ; lịch cũ hơn không gửi bù. Không hứa email luôn vào inbox; kiểm thư rác nếu cần.

## Thùng rác

**Move to trash** chuyển note vào **Trash**, có thể **Restore** hoặc **Delete permanently**. Note tự bị xóa hẳn sau 7 ngày tính từ lúc đưa vào trash. Xóa hẳn không khôi phục qua app. Note trong trash không tiếp tục nhắc lịch.

## Tài khoản và hỗ trợ

Trong **Settings**, quản lý hồ sơ, timezone, email/mật khẩu và Google link khi chức năng tương ứng hoàn thiện. Admin được quản lý/khóa tài khoản và xem thống kê tổng hợp, không đọc/sửa nội dung note người dùng khác.

Khi lỗi, ghi thời gian và mã lỗi/traceId nếu có; không gửi password, OTP hoặc nội dung note riêng tư để yêu cầu hỗ trợ. Kênh hỗ trợ/giờ phục vụ chưa được chủ dự án cung cấp. Offline, export dữ liệu, xóa tài khoản và đa ngôn ngữ chưa chốt; không trình bày là tính năng đã có.

## Thu phóng giao diện

Giữ **Ctrl + lăn chuột** để phóng to/thu nhỏ từ **50% đến150%**; Cmd + lăn chuột cũng được hỗ trợ. Trên điện thoại, dùng **hai ngón chụm vào/mở ra**. Số phần trăm hiện tạm ở giữa cạnh dưới và tự ẩn sau khoảng1.2giây khi dừng thao tác. Bạn cũng có thể mở menu avatar/tài khoản → **Zoom (x%)**, nhập phần trăm rồi Enter/rời ô, hoặc dùng **− / +** (mỗi lần10%). **Reset to 100%** về mặc định và **Done** đóng bảng. Chỉnh bằng gesture hay bảng đều đồng bộ và nhớ cùng lựa chọn; không có nút zoom riêng trên thanh trên cùng.

Lựa chọn được nhớ trong trình duyệt cho cả người dùng/admin, không tải lại trang hoặc đổi nội dung/định dạng note. Lăn chuột thường và cuộn một ngón vẫn cuộn trang. Phím tắt zoom bàn phím của trình duyệt vẫn hoạt động riêng. Nhãn ⌘ K đã bỏ nhưng Ctrl+K (Windows) hoặc Cmd+K (Mac) vẫn focus tìm kiếm. Sidebar cũng đã bỏ khối Big ideas often start with a little note.

## Căn lề nội dung note

Đặt con trỏ trong đoạn hoặc chọn các đoạn, nhấn **Text alignment** trên toolbar rồi chọn **Align left** (trái), **Align center** (giữa), **Align right** (phải) hoặc **Justify** (đều hai bên). Menu đánh dấu lựa chọn hiện tại và icon nút thay đổi theo căn lề. Định dạng tự lưu và được giữ khi mở lại; Markdown xuất ra không giữ căn giữa. Bộ đếm cuối editor dùng dạng **8 / 100,000**.

## Đổi màu note

Nhấn biểu tượng **cọ vẽ** ở thanh dưới để mở bảng màu. Chọn màu có sẵn hoặc **Custom color** để pha màu; **Default note color** bỏ màu nền riêng. Màu tự lưu cùng note. Nhấn bên ngoài bảng hoặc Escape để đóng.

## Xem trước khi sửa hồ sơ/tài khoản — 2026-10-21

Profile mặc định hiển thị thông tin dạng văn bản, giá trị trống là Not provided; chọn Edit profile mới mở form. Save profile thành công trở về chế độ xem; Cancel bỏ thay đổi chưa lưu. Account & security có Edit email, Edit phone number và Edit password riêng; chỉ mục đang sửa có input. Cancel xóa bản nhập của mục đó; khi API lỗi, form và dữ liệu đang nhập vẫn giữ để sửa/thử lại. Gửi đổi email vẫn cần xác nhận ở email mới, thay mật khẩu vẫn đăng xuất theo luồng bảo mật hiện có. Áp dụng cho customer và admin; Active sessions/Connected accounts giữ hành động hiện có.

## Icon và tiêu đề note

Nhấn icon góc trên để chọn icon từ menu hoặc dán emoji riêng; **Remove icon** bỏ icon tùy chọn. Icon, tiêu đề, ghim và thu phóng nằm trên một hàng. Note vẫn tự lưu; thông báo lưu thành công không hiện trên giao diện, lỗi lưu vẫn hiện để xử lý.

Ô tiêu đề luôn nằm trên hàng icon/ghim/thu phóng, không có nút Add title hoặc chữ gợi ý. Bạn có thể bấm trực tiếp để nhập hoặc để trống nếu chỉ cần nội dung.


## Ghi nhớ đăng nhập — 2026-10-21

Đăng nhập mặc định được lưu trên trình duyệt, không tự hết hạn sau7/30ngày; mở lại cùng trình duyệt/profile có thể tiếp tục dùng notes. Active sessions hiển thị No expiration. Sign out, thu hồi phiên, đổi mật khẩu/quyền hoặc khóa account vẫn chấm dứt phiên; xóa dữ liệu trang/private browsing cũng có thể làm mất phiên đã lưu. Phiên cũ còn hợp lệ được nâng thời hạn khi làm mới; phiên đã hết hạn cần đăng nhập lại một lần. Notes cache vẫn ở memory, không phải offline storage.

## Cỡ chữ nội dung

Chọn đoạn chữ rồi mở **Font size** trên toolbar để chọn cỡ12–48px. Nếu chưa chọn chữ, cỡ mới áp dụng khi gõ tiếp. **Default** trở về cỡ mặc định và giữ các định dạng khác như in đậm/màu chữ. Cỡ chữ tự lưu; Markdown xuất ra không giữ cỡ riêng.
