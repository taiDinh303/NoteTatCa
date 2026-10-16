# 30 — Hướng dẫn sử dụng dự thảo

> 2026-10-16 | DRAFT | Áp dụng: YES | UI đích tiếng Anh; tên nút dưới đây đề xuất, chưa được kiểm trên React

## Bắt đầu

Đăng ký bằng email/mật khẩu, nhập mã xác minh email, hoặc chọn **Continue with Google**. Sau đăng nhập, **Notes** hiển thị ghi chú của bạn. Tài khoản khác và quản trị viên ứng dụng không được xem nội dung ghi chú riêng qua chức năng app.

## Tạo và tổ chức note

1. Chọn **New note**, nhập tiêu đề và nội dung.
2. Dùng thanh công cụ để định dạng, chọn màu chữ, chèn emoji hoặc checklist; chọn emoji đại diện nếu muốn.
3. Nội dung tự lưu và có nút **Save**; chỉ tin trạng thái **Saved** sau khi lưu thành công. Khi **Save failed**, giữ cửa sổ mở để thử lại hoặc sao chép bản nhập.
4. Gán **Labels**, đổi **Note color**, **Pin** hoặc di chuyển thứ tự. Dùng **Search notes** để tìm nội dung của mình.

Cú pháp Markdown hỗ trợ trong editor theo thiết kế; chuyển/xuất Markdown có cảnh báo các định dạng không giữ được như màu. Không có upload ảnh/tệp, archive hoặc chia sẻ trong phạm vi đã chọn.

## Nhắc lịch

Chọn **Reminder**, giờ và lịch lặp, kiểm timezone tài khoản. Thông báo xuất hiện trong **Notifications** và gửi email theo lịch. Nếu hệ thống gián đoạn, gửi bù một lần trong 24 giờ; lịch cũ hơn không gửi bù. Không hứa email luôn vào inbox; kiểm thư rác nếu cần.

## Thùng rác

**Move to trash** chuyển note vào **Trash**, có thể **Restore** hoặc **Delete permanently**. Note tự bị xóa hẳn sau 7 ngày tính từ lúc đưa vào trash. Xóa hẳn không khôi phục qua app. Note trong trash không tiếp tục nhắc lịch.

## Tài khoản và hỗ trợ

Trong **Settings**, quản lý hồ sơ, timezone, email/mật khẩu và Google link khi chức năng tương ứng hoàn thiện. Admin được quản lý/khóa tài khoản và xem thống kê tổng hợp, không đọc/sửa nội dung note người dùng khác.

Khi lỗi, ghi thời gian và mã lỗi/traceId nếu có; không gửi password, OTP hoặc nội dung note riêng tư để yêu cầu hỗ trợ. Kênh hỗ trợ/giờ phục vụ chưa được chủ dự án cung cấp. Offline, export dữ liệu, xóa tài khoản và đa ngôn ngữ chưa chốt; không trình bày là tính năng đã có.
