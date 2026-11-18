# FLOW-035 — Thống kê tổng hợp và nhật ký quản trị

[Danh mục](../README.md) · [Sơ đồ Archify](35-admin-thong-ke-audit.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Admin.
- **Kích hoạt:** /admin/overview hoặc /admin/audit.
- **Điều kiện trước:** Admin theo authorization và service gate.
- **Đầu vào:** Page/size, targetUserId và AdministrativeAction tùy chọn.
- **Truy vết nghiệp vụ:** DEC-017.

## Luồng chính

1. **Kiểm Admin.** RequireAdmin trước đọc aggregate hoặc audit.
2. **Đếm tổng hợp.** Đếm user/locked, note active/Trash, reminder active và delivery pending.
3. **Lọc audit.** Chỉ action enum hợp lệ, filter targetUserId; sort thời gian/id.
4. **Trả metadata.** Audit DTO gồm actor,target,role,action,time; không chứa body notes.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 403 | User thường/guest | Không trả thống kê hệ thống. |
| 400 | Action/page không hợp lệ | Không chạy truy vấn rộng do bỏ validation. |
| Mạng/DB lỗi | Không lấy được dashboard | Hiển thị retry; không dùng số0 như kết quả thật. |

## Trạng thái sau và bất biến

- Audit DTO gồm actor,target,role,action,time; không chứa body notes.
- Aggregate note counts không cấp quyền đọc từng note.
- Retention/anonymization audit chưa được chốt; không tự tạo purge audit.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /admin/statistics`
- `GET /admin/audit-events`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-035-AC1:** DTO không có title/content/documentJson.
- **FLOW-035-AC2:** Audit filter chỉ trả action/target phù hợp.
- **FLOW-035-AC3:** Token mất Admin bị từ chối dù claim cũ từng có role.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/AdminService.cs:50](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L50-L61)
- [ntc_aspnet/NTC.Services/Service/AdminService.cs:52](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L52-L56)
- [ntc_aspnet/NTC.Services/Service/AdminService.cs:61](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L61-L67)
- [ntc_aspnet/NTC.Services/Service/AdminService.cs:66](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AdminService.cs#L66-L69)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
