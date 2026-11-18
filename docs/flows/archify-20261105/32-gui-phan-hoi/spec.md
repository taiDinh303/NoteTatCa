# FLOW-032 — Gửi phản hồi hoặc báo lỗi

[Danh mục](../README.md) · [Sơ đồ Archify](32-gui-phan-hoi.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** User đã đăng nhập.
- **Kích hoạt:** Help → report/suggestion/question.
- **Điều kiện trước:** Phiên xác thực, message không rỗng <=5000 ký tự.
- **Đầu vào:** Kind thuộc ba lựa chọn và Message do user nhập.
- **Truy vết nghiệp vụ:** CURRENT Help/feedback.

## Luồng chính

1. **Nhận phản hồi.** Server lấy UserId, không nhận danh tính người gửi tùy ý.
2. **Validate loại & độ dài.** Chỉ Report a problem / Suggest an improvement / Ask a question.
3. **Tạo nội dung an toàn.** Encode message, email account và metadata UTC trong HTML.
4. **Gửi support.** IEmailSender gửi tới địa chỉ support cấu hình cứng hiện tại; không chép địa chỉ cá nhân vào đặc tả.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Kind/message không hợp lệ | Giữ form để sửa. |
| 401 | Không tìm thấy user hiện tại | Không gửi feedback giả danh. |
| Email lỗi | Provider thất bại | Không báo gửi thành công; luồng này chưa có outbox retry riêng. |

## Trạng thái sau và bất biến

- IEmailSender gửi tới địa chỉ support cấu hình cứng hiện tại; không chép địa chỉ cá nhân vào đặc tả.
- Nội dung feedback là dữ liệu user chủ động gửi support, không tự đính kèm note.
- Đây không phải lệnh cho agent gửi email; đợt tài liệu không thực thi luồng.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /feedback`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-032-AC1:** Thông điệp HTML được encode.
- **FLOW-032-AC2:** Payload không thể giả userId khác.
- **FLOW-032-AC3:** Provider failure trả lỗi rõ, không giả ACK.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/FeedbackService.cs:14](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/FeedbackService.cs#L14-L16)
- [ntc_aspnet/NTC.Services/Service/FeedbackService.cs:17](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/FeedbackService.cs#L17-L19)
- [ntc_aspnet/NTC.Services/Service/FeedbackService.cs:20](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/FeedbackService.cs#L20-L23)
- [ntc_aspnet/NTC.Services/Service/FeedbackService.cs:24](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/FeedbackService.cs#L24-L24)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
