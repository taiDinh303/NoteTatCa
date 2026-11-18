# FLOW-007 — Liên kết và gỡ Google khỏi tài khoản

[Danh mục](../README.md) · [Sơ đồ Archify](07-lien-ket-google.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** User/Admin trong Settings của chính mình.
- **Kích hoạt:** Connect hoặc Disconnect Google.
- **Điều kiện trước:** Đã đăng nhập; link cần ID token Google, email khớp account.
- **Đầu vào:** ID token mới; provider Google khi unlink.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Chọn thao tác.** Dùng self identity từ API, không tin userId của form.
2. **Kiểm Google.** Validate ID token; email phải khớp; subject không được thuộc account khác.
3. **Bảo vệ đăng nhập.** Link đã có là idempotent; unlink bị chặn nếu đó là phương thức đăng nhập cuối và chưa có password.
4. **Ghi liên kết.** Identity AddLogin/RemoveLogin trong transaction.
5. **Thu hồi phiên cũ.** Cập nhật security stamp/revoke-all sau thay đổi phương thức đăng nhập.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Google email không khớp hoặc provider khác | Không thêm liên kết. |
| 409 | Subject thuộc user khác/đã link Google khác | Giữ hiện trạng; yêu cầu xử lý link cũ trước. |
| 409 | Gỡ phương thức cuối | Đặt mật khẩu trước. |

## Trạng thái sau và bất biến

- Cập nhật security stamp/revoke-all sau thay đổi phương thức đăng nhập.
- Không nhận raw Google subject thay ID token.
- Admin chỉ sửa phương thức đăng nhập của chính Admin.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /me/logins`
- `POST /me/google-link`
- `DELETE /me/google-link`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-007-AC1:** Subject khác chủ không bị chuyển quyền.
- **FLOW-007-AC2:** Unlink cuối bị chặn khi chưa có password.
- **FLOW-007-AC3:** Thay đổi link vô hiệu phiên cũ.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/Controllers/V1/MeController.cs:45](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/MeController.cs#L45-L51)
- [ntc_aspnet/NTC.Services/Service/UserLoginService.cs:18](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserLoginService.cs#L18-L27)
- [ntc_aspnet/NTC.Services/Service/UserLoginService.cs:28](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserLoginService.cs#L28-L42)
- [ntc_aspnet/NTC.Services/Service/UserLoginService.cs:31](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserLoginService.cs#L31-L44)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
