# FLOW-034 — Admin quản lý role và gán quyền

[Danh mục](../README.md) · [Sơ đồ Archify](34-admin-role.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Admin.
- **Kích hoạt:** /admin/roles hoặc quản lý memberships của một user.
- **Điều kiện trước:** Admin hiện tại; user/role target không bị deleted.
- **Đầu vào:** Role name ASCII1–64, description<=500; userId, roleId, add/remove.
- **Truy vết nghiệp vụ:** DEC-017 / API-012.

## Luồng chính

1. **Kiểm quyền Admin.** RequireAdmin và đọc role active.
2. **Kiểm role hệ thống.** User/Admin không được đổi tên/xóa; tên/description phải hợp lệ.
3. **Ghi role + audit.** Create/PATCH/Delete qua Identity, unit-of-work và audit.
4. **Gán hoặc bỏ role.** Chặn self-remove Admin; cùng trạng thái là idempotent.
5. **Thu hồi session.** Membership đổi làm revoke/stamp và ghi RoleGranted/RoleRevoked.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 403 | Không Admin | Không thay quyền. |
| 409 | Role built-in hoặc tự bỏ quyền Admin | Giữ role/membership hiện tại. |
| 404/400 | User/role đã deleted hoặc name sai | Không ghi một phần. |

## Trạng thái sau và bất biến

- Membership đổi làm revoke/stamp và ghi RoleGranted/RoleRevoked.
- Không có guard last-admin toàn cục được suy ra ngoài self-remove; cần review nếu bổ sung.
- Custom role không tự được quyền workspace/Admin chỉ vì tên mới.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET/POST /admin/roles`
- `PATCH/DELETE /admin/roles/{id}`
- `GET /admin/users/{id}/roles`
- `PUT/DELETE /admin/users/{userId}/roles/{roleId}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-034-AC1:** Built-in không bị rename/delete.
- **FLOW-034-AC2:** Tự bỏ role Admin bị chặn.
- **FLOW-034-AC3:** Membership thay đổi vô hiệu token cũ nhờ DB revalidation.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/RoleService.cs:17](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/RoleService.cs#L17-L31)
- [ntc_aspnet/NTC.Services/Service/RoleService.cs:18](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/RoleService.cs#L18-L23)
- [ntc_aspnet/NTC.Services/Service/RoleService.cs:32](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/RoleService.cs#L32-L41)
- [ntc_aspnet/NTC.Services/Service/RoleService.cs:55](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/RoleService.cs#L55-L88)
- [ntc_aspnet/NTC.Services/Service/UserRoleService.cs:27](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserRoleService.cs#L27-L38)
- [ntc_aspnet/NTC.Services/Service/UserRoleService.cs:38](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserRoleService.cs#L38-L41)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
