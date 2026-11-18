# FLOW-006 — Đăng xuất và thu hồi phiên

[Danh mục](../README.md) · [Sơ đồ Archify](06-dang-xuat-phien.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** User hoặc Admin quản lý phiên của mình.
- **Kích hoạt:** /logout, Sign out hoặc Settings → Sessions.
- **Điều kiện trước:** Có phiên hoặc dữ liệu cục bộ cần bảo vệ trước đăng xuất.
- **Đầu vào:** refreshToken hoặc sessionId chính chủ; lựa chọn ở lại/tải backup khi pending.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Kiểm pending.** beforeLogout có thể dừng thao tác để user bảo vệ thay đổi chưa sync.
2. **Chọn phiên self.** List chỉ session còn hiệu lực của UserId hiện tại; revoke không nhận userId tùy ý.
3. **Thu hồi family.** Revoke session chọn thu hồi các rotation trong cùng family; revoke-all là lựa chọn riêng.
4. **Đăng xuất server.** Client rotate credential mới nhất rồi gọi logout với access tương ứng; lỗi mạng vẫn cho sign-out local.
5. **Xóa dữ liệu phiên.** Hoàn tất local sign-out và thông báo các tab; không hứa revoke server khi đang offline.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Pending chưa sync | User chưa chấp nhận tiếp tục | Ở lại hoặc tải backup trước khi kết thúc phiên. |
| 404 | sessionId không thuộc self | Không revoke phiên của người khác. |
| Mạng lỗi | Không revoke được server | Kết thúc phiên cục bộ; ghi rõ giới hạn revoke từ xa. |

## Trạng thái sau và bất biến

- Hoàn tất local sign-out và thông báo các tab; không hứa revoke server khi đang offline.
- Logout local không đồng nghĩa xóa được bản export hay dữ liệu trên thiết bị khác.
- Không gửi queue dưới account kế tiếp.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/logout`
- `POST /auth/revoke-all`
- `GET /me/sessions`
- `DELETE /me/sessions/{sessionId}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-006-AC1:** Hủy cảnh báo logout giữ phiên và pending.
- **FLOW-006-AC2:** Revoke session khác user trả404.
- **FLOW-006-AC3:** Sign-out đồng bộ không để tab cũ giữ cache account mới.

## Nguồn đối chiếu

- [ntc_react/src/application/auth.ts:335](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L335-L337)
- [ntc_aspnet/NTC.Services/Service/SessionService.cs:15](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/SessionService.cs#L15-L29)
- [ntc_aspnet/NTC.Services/Service/SessionService.cs:28](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/SessionService.cs#L28-L33)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:173](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L173-L176)
- [ntc_react/src/application/auth.ts:339](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L339-L364)
- [ntc_react/src/application/auth.ts:335](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L335-L375)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
