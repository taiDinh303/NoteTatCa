# FLOW-026 — Hồ sơ cá nhân, timezone và đổi email có xác nhận

[Danh mục](../README.md) · [Sơ đồ Archify](26-profile-doi-email.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer hoặc Admin sửa chính mình.
- **Kích hoạt:** Settings Profile/Account hoặc link confirm-change-email.
- **Điều kiện trước:** Phiên self; PATCH profile có version; đổi email cần email mới chưa thuộc account khác.
- **Đầu vào:** GivenName/FamilyName/picture/birthDate/gender/address/locale/timezone, version; email mới/token.
- **Truy vết nghiệp vụ:** WF-001 / API-009.

## Luồng chính

1. **Đọc hồ sơ self.** Profile Find RequireSelf; account/profile không dùng để duyệt note người khác.
2. **Kiểm profile.** Version và field presence; tên, ngày sinh, giới tính, picture và timezone được validate.
3. **Lưu hồ sơ.** Ghi profile/timezone qua unit of work; đổi email phải đi luồng xác minh riêng.
4. **Xin đổi email.** RequireSelf, chuẩn email, kiểm email trùng; gửi token change-email.
5. **Xác nhận & revoke.** Identity ChangeEmail trong transaction; kiểm locked/trùng và revoke-all.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 409 | Profile version cũ | Không ghi đè; đọc lại và cho user chọn. |
| 400 | Field/timezone/picture/email sai | Giữ form và giá trị chưa lưu. |
| Token lỗi/403 | Link hỏng, email trùng hoặc account khóa | Không đổi email; xin lại link khi cần. |

## Trạng thái sau và bất biến

- Identity ChangeEmail trong transaction; kiểm locked/trùng và revoke-all.
- UserInfo.Update không được dùng để sửa email trực tiếp.
- Đổi UI language lưu browser khác với profile locale; không dịch nội dung user.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET/PATCH /me`
- `PATCH /me/account`
- `POST /me/change-email`
- `GET /auth/confirm-email-change`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-026-AC1:** Không PATCH profile của user khác.
- **FLOW-026-AC2:** Email chỉ đổi sau token hợp lệ.
- **FLOW-026-AC3:** Email đổi xong làm credential cũ hết quyền.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/UserInfoService.cs:15](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserInfoService.cs#L15-L31)
- [ntc_aspnet/NTC.Services/Service/UserInfoService.cs:43](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserInfoService.cs#L43-L72)
- [ntc_aspnet/NTC.Services/Service/UserInfoService.cs:50](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserInfoService.cs#L50-L60)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:103](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L103-L110)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:124](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L124-L135)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
