# Email nhắc lịch — 2026-10-30

CURRENT source theo yêu cầu chủ dự án: email ngắn, khung căn giữa như ảnh tham khảo, có tiêu đề/nội dung để nhận biết note và nút **Xem ghi chú**. Thay quyết định email generic trước đây cho riêng reminder; không đổi email OTP/recovery hoặc các email tài khoản khác.

- Subject `Nhắc lịch: {title}`; title trống dùng `Ghi chú không tiêu đề`. Chuẩn hóa khoảng trắng/xuống dòng, tối đa 100 cụm ký tự Unicode cho title và 240 cho đoạn nội dung; thêm dấu … khi cắt, giữ nguyên emoji tổ hợp. Không gửi toàn bộ nội dung dài hoặc document JSON.
- Nội dung lấy từ `Note.Content` (plain text đã được sinh từ rich document khi lưu). HTML encode title/preview/link, không render markup do note cung cấp. Note trống bỏ đoạn preview.
- Khung table rộng tối đa 520px, căn giữa ngang, viền mảnh, inline CSS; nút là thẻ link có hình thức button, URL `{AppSettings:ClientUrl}/notes/{NoteId}` dùng route adapter hiện có. Không cấp quyền truy cập qua link; người xem vẫn cần đăng nhập và được kiểm ownership.
- Giữ điều kiện SendEmail, địa chỉ đã xác minh, note/user khả dụng và cơ chế lease/retry/dedup inbox hiện tại. Chỉ gửi tới email của chủ note. Privacy public/settings và bản dịch mô tả title/preview mới; không thay đổi các chức năng backup đang được sửa riêng trong working tree.

Validation/giới hạn thực tế xem entry cùng ngày tại [worklog](worklog.md). Preview local dùng dữ liệu giả tại `artifacts/reminder-email-preview/`; không gửi mail thật. Chromium kiểm bố cục không thay thế thử nghiệm Gmail/Outlook thực tế. Không thay cấu hình, migration hoặc deploy từ task code này.
