# FLOW-019 — Gán hoặc bỏ nhãn của một note

[Danh mục](../README.md) · [Sơ đồ Archify](19-gan-label.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ note chọn labels.
- **Kích hoạt:** Note toolbar hoặc Add label trên card.
- **Điều kiện trước:** Cả note và label active cùng owner; tối đa20 labels/note.
- **Đầu vào:** noteId, label IDs; version note khi cập nhật tập nhãn qua PATCH.
- **Truy vết nghiệp vụ:** WF-003.

## Luồng chính

1. **Chọn tập nhãn.** Tập ID gửi qua note PATCH; v1 cũng có adapter add/remove một link.
2. **Kiểm hai owner.** RequireNote active và RequireTag active của cùng UserId.
3. **Kiểm giới hạn.** Link đã có là idempotent; chặn quá20.
4. **Ghi quan hệ.** Insert/delete NoteTag; update note để đổi concurrency version.
5. **Nhận version mới.** PATCH trả note hiện tại; autosave cũ phải phát hiện version thay đổi.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Note hoặc label khác owner/đã xóa | Không thêm link. |
| 400 | Vượt20 labels | Giữ lựa chọn và chỉ rõ giới hạn. |
| 409 | Expected version cũ ở PATCH | Giữ draft/lựa chọn, không ghi đè tập nhãn mới. |

## Trạng thái sau và bất biến

- PATCH trả note hiện tại; autosave cũ phải phát hiện version thay đổi.
- Không cấp quyền đọc note thông qua nhãn.
- Tên trùng không làm hai label bị gộp.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `PATCH /notes/{id} với tagIds/version`
- `PUT/DELETE /notes/{id}/tags/{tagId}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-019-AC1:** Gán lại cùng link không nhân bản.
- **FLOW-019-AC2:** Không tạo quan hệ chéo owner.
- **FLOW-019-AC3:** Thay labels làm autosave stale bị chặn bằng version.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs:44](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs#L44-L56)
- [ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs:76](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs#L76-L79)
- [ntc_aspnet/NTC.Services/Service/NoteTagService.cs:12](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteTagService.cs#L12-L20)
- [ntc_aspnet/NTC.Services/Service/NoteTagService.cs:21](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteTagService.cs#L21-L24)
- [ntc_aspnet/NTC.Services/Service/NoteTagService.cs:23](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteTagService.cs#L23-L31)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:130](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L130-L145)
- [ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs:55](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs#L55-L56)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
