# FLOW-004 — Quên, đặt mới và đổi mật khẩu

[Danh mục](../README.md) · [Sơ đồ Archify](04-khoi-phuc-mat-khau.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ email hoặc user đã đăng nhập.
- **Kích hoạt:** /forgot-password, link reset, hoặc Settings → Password.
- **Điều kiện trước:** Quên mật khẩu cần email đã xác minh và account active. Đổi mật khẩu cần phiên self.
- **Đầu vào:** email; hoặc userId/token/newPassword từ link; hoặc currentPassword/newPassword.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Yêu cầu khôi phục.** Chỉ account eligible mới được gửi reset link; phản hồi không khẳng định email tồn tại.
2. **Gửi token Identity.** Dùng email sender cấu hình; token không có trong response/log.
3. **Kiểm bằng chứng.** Reset dùng token; đổi mật khẩu dùng currentPassword và RequireSelf.
4. **Ghi mật khẩu mới.** Identity xác minh token/chính sách mật khẩu; reset còn đánh dấu email confirmed.
5. **Thu hồi phiên.** RevokeAll/security stamp làm phiên cũ mất hiệu lực; đăng nhập lại.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Phản hồi chung | Email không eligible | Không gửi thư; không tiết lộ trạng thái tài khoản. |
| 400 | Token sai hoặc mật khẩu yếu | Giữ form và cho xin link mới; không thay mật khẩu. |
| 401/403 | Sai currentPassword/không self/account khóa | Không ghi mật khẩu. |

## Trạng thái sau và bất biến

- RevokeAll/security stamp làm phiên cũ mất hiệu lực; đăng nhập lại.
- Không chạy email thật để kiểm đặc tả.
- Set password cho tài khoản Google là cùng cơ chế link Identity, không gửi mật khẩu bằng email.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /me/password-email`
- `POST /me/change-password`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-004-AC1:** Token đúng đặt được mật khẩu, token sai không thay đổi account.
- **FLOW-004-AC2:** Đổi mật khẩu làm phiên cũ hết quyền.
- **FLOW-004-AC3:** Email không eligible không phát sinh thư khôi phục.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/AuthService.cs:87](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L87-L91)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:142](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L142-L161)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:142](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L142-L151)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:148](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L148-L161)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
