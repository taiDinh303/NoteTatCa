# FLOW-003 — Đăng nhập Google

[Danh mục](../README.md) · [Sơ đồ Archify](03-google-dang-nhap.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Khách đăng nhập bằng Google.
- **Kích hoạt:** Google callback cấp ID token cho client.
- **Điều kiện trước:** Google client ID cấu hình; ID token hợp lệ theo validator server.
- **Đầu vào:** idToken, không dùng raw subject làm chứng cứ.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Nhận ID token.** Client gửi token qua luồng xác thực có session lock.
2. **Xác minh Google.** Backend gọi validator; tra liên kết theo provider và subject.
3. **Đối chiếu email.** Chưa link nhưng email đã tồn tại: yêu cầu đăng nhập account đó để link.
4. **Tạo hoặc dùng user.** Email mới tạo user, role, profile và Google login trong transaction; user có link được dùng lại.
5. **Cấp phiên.** Kiểm active rồi phát session như đăng nhập mật khẩu.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Token không hợp lệ | Sai audience/issuer hoặc email không được validator chấp nhận | Không tạo user hoặc session. |
| 409 GOOGLE_LINK_REQUIRED | Email trùng account chưa link | Đăng nhập account cũ, làm luồng liên kết Google. |
| 403 | Account bị khóa/vô hiệu hóa | Không cấp phiên. |

## Trạng thái sau và bất biến

- Kiểm active rồi phát session như đăng nhập mật khẩu.
- Không tự nối tài khoản chỉ vì cùng email.
- Tài khoản Google mới không đồng nghĩa đã có mật khẩu cục bộ.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/google`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-003-AC1:** Subject đã link nhận đúng userId.
- **FLOW-003-AC2:** Email trùng không tạo account/link ngoài ý muốn.
- **FLOW-003-AC3:** Client nhận lỗi vẫn giữ khả năng đăng nhập bằng mật khẩu.

## Nguồn đối chiếu

- [ntc_react/src/application/auth.ts:292](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L292-L304)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:93](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L93-L98)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:99](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L99-L102)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:103](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L103-L109)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:110](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L110-L111)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
