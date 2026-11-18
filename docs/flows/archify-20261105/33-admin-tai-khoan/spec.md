# FLOW-033 — Admin quản lý tài khoản, khóa và vô hiệu hóa

[Danh mục](../README.md) · [Sơ đồ Archify](33-admin-tai-khoan.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Admin.
- **Kích hoạt:** /admin/users: tìm, tạo, khóa, deactivate, restore hoặc yêu cầu reset.
- **Điều kiện trước:** Role Admin được kiểm từ DB hiện tại; không tự khóa/deactivate Admin đang thao tác.
- **Đầu vào:** Target userId; search/includeDeactivated; role User/Admin khi tạo; locked tuyệt đối.
- **Truy vết nghiệp vụ:** DEC-017.

## Luồng chính

1. **Đọc metadata user.** RequireAdmin, phân trang/search username/email, không projection note content.
2. **Tạo account.** Chỉ role User/Admin; tạo Identity/profile/audit trong transaction, chưa tự email-confirm.
3. **Khóa / mở khóa.** Chặn self-lock; cập nhật flag và revoke-all/stamp.
4. **Deactivate / restore.** Chặn self-deactivate; soft lifecycle và revoke, ghi audit metadata.
5. **Reset qua email.** Chỉ target eligible/verified; token không đi vào response/log.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 403 | Caller không còn Admin | Không quản lý account hoặc đọc thống kê. |
| 400 | Tự khóa/deactivate hoặc target không eligible | Giữ hiện trạng và báo lỗi. |
| 409 | Yêu cầu permanent delete | CURRENT bị chặn; không có luồng purge account đã bật. |

## Trạng thái sau và bất biến

- Chỉ target eligible/verified; token không đi vào response/log.
- Admin không có quyền đọc note content của customer.
- Tự xóa30ngày và admin xóa ngay là TARGET; UserService.DeleteAsync hiện từ chối.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET/POST /admin/users`
- `GET /admin/users/{id}`
- `PATCH /admin/users/{id}/lock`
- `POST /admin/users/{id}/deactivate`
- `POST /admin/users/{id}/restore`
- `POST /admin/users/{id}/password-reset`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-033-AC1:** Lock/deactivate làm session target hết quyền.
- **FLOW-033-AC2:** Restore không tự phục hồi session cũ.
- **FLOW-033-AC3:** Admin API không trả title/body/documentJson của notes.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/UserService.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L22-L40)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:42](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L42-L54)
- [ntc_aspnet/NTC.Services/Service/AdminService.cs:36](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L36-L47)
- [ntc_aspnet/NTC.Services/Service/UserService.cs:72](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L72-L97)
- [ntc_aspnet/NTC.Services/Service/AdminService.cs:19](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L19-L34)

- [ntc_aspnet/NTC.Services/Service/UserService.cs:99](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L99-L102)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
