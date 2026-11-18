# FLOW-018 — Tạo, sửa và xóa nhãn

[Danh mục](../README.md) · [Sơ đồ Archify](18-quan-ly-label.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer hoặc guest.
- **Kích hoạt:** Mở điểm quản lý labels; tạo/sửa/xóa một label.
- **Điều kiện trước:** Label thuộc owner hiện tại, active; phiên remote không phải Admin.
- **Đầu vào:** Name1–50 ký tự, color/icon, id và version khi PATCH.
- **Truy vết nghiệp vụ:** WF-003.

## Luồng chính

1. **Đọc labels self.** Owned lọc UserId và DeletedTime; list theo tên/id.
2. **Kiểm dữ liệu.** Name không rỗng, max50; màu/icon kiểm whitelist.
3. **Tạo hoặc PATCH.** Create gắn UserId server; PATCH RequireVersion và giữ trường bị bỏ qua.
4. **Xóa liên kết.** Xóa label loại các NoteTag và cập nhật note version liên quan trong transaction.
5. **Giữ note gốc.** Chỉ xóa/soft delete label; không xóa nội dung các note.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Tên/màu/icon sai | Giữ form, không tạo label rác. |
| 404 | Label khác owner | Không sửa/xóa. |
| 409 | Version cũ | Refetch rồi cho user quyết định lại. |

## Trạng thái sau và bất biến

- Chỉ xóa/soft delete label; không xóa nội dung các note.
- Tên label trùng được phép; phân biệt bằng ID.
- Xóa label không đồng nghĩa xóa note.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET/POST /tags`
- `PATCH/DELETE /tags/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-018-AC1:** Hai label cùng tên có thể tồn tại.
- **FLOW-018-AC2:** PATCH bỏ color giữ giá trị cũ; clear theo hợp đồng field presence.
- **FLOW-018-AC3:** Xóa label vẫn còn note và content.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/TagService.cs:15](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/TagService.cs#L15-L22)
- [ntc_aspnet/NTC.Services/Service/TagService.cs:23](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/TagService.cs#L23-L33)
- [ntc_aspnet/NTC.Services/Service/TagService.cs:29](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/TagService.cs#L29-L53)
- [ntc_aspnet/NTC.Services/Service/TagService.cs:57](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/TagService.cs#L57-L65)
- [ntc_aspnet/NTC.Services/Service/TagService.cs:61](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/TagService.cs#L61-L65)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
