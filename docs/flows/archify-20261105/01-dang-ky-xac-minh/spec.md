# FLOW-001 — Đăng ký và xác minh email

[Danh mục](../README.md) · [Sơ đồ Archify](01-dang-ky-xac-minh.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Khách chưa đăng nhập.
- **Kích hoạt:** Mở /register hoặc /verify-email.
- **Điều kiện trước:** Có email nhận thư; role User đã bootstrap. OTP chỉ dùng cho đúng email.
- **Đầu vào:** email, password, confirmPassword, confirmationCode; username tùy chọn.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Yêu cầu mã.** Chuẩn hóa email; tài khoản đã xác minh/khóa/vô hiệu hóa không được gửi mã mới.
2. **Lưu mã băm.** Sinh mã sáu chữ số; lưu hash, hạn 10 phút và giới hạn gửi lại 60 giây.
3. **Kiểm tra OTP.** Tối đa năm lần thử; mã đúng bị tiêu thụ, mã sai/hết hạn không cho đăng ký.
4. **Tạo tài khoản.** Kiểm mật khẩu và email trùng; transaction tạo Identity user xác minh, role User, profile.
5. **Đăng nhập sau đó.** Đăng ký trả thành công, không tự cấp session; người dùng dùng luồng đăng nhập.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 429 | Gửi mã liên tiếp | Chờ đủ hạn rồi yêu cầu mã mới. |
| 400 INVALID_OTP | Sai/hết hạn/hết lượt | Giữ form; yêu cầu mã mới. |
| 503 BOOTSTRAP_REQUIRED | Thiếu role User | Operator bootstrap đúng môi trường; không tạo tài khoản dở dang. |

## Trạng thái sau và bất biến

- Đăng ký trả thành công, không tự cấp session; người dùng dùng luồng đăng nhập.
- Không ghi OTP, mật khẩu hoặc token vào log/đặc tả.
- Email challenge dùng một lần; việc tiêu thụ mã và tạo user là hai bước, không khẳng định cùng một transaction.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/email-code`
- `POST /auth/register`
- `POST /auth/verify-email`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-001-AC1:** Mã hợp lệ tạo đúng một user/profile và role User.
- **FLOW-001-AC2:** Mã dùng lại hoặc quá hạn bị từ chối.
- **FLOW-001-AC3:** Email đã tồn tại không sinh tài khoản thứ hai.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/AuthService.cs:70](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L70-L77)
- [ntc_aspnet/NTC.Services/Infrastructure/OtpService.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Infrastructure/OtpService.cs#L22-L31)
- [ntc_aspnet/NTC.Services/Infrastructure/OtpService.cs:33](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Infrastructure/OtpService.cs#L33-L41)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:37](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L37-L51)
- [ntc_aspnet/NTC.API/Controllers/V1/AuthenticationController.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/AuthenticationController.cs#L22-L25)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
