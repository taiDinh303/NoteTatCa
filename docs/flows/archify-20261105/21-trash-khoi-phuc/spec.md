# FLOW-021 — Đưa vào Trash, khôi phục và xóa hẳn

[Danh mục](../README.md) · [Sơ đồ Archify](21-trash-khoi-phuc.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ note.
- **Kích hoạt:** Move to Trash, Restore hoặc Delete permanently.
- **Điều kiện trước:** Active để soft delete; note trong Trash để restore/hard delete.
- **Đầu vào:** noteId; xác nhận UI khi xóa hẳn.
- **Truy vết nghiệp vụ:** WF-004.

## Luồng chính

1. **Soft delete self.** Tra note theo id/UserId; gán DeletedTime/DeletedBy, lặp lại không thay nội dung.
2. **Ẩn khỏi active.** Owned active và inbox/reminder lọc note chưa xóa.
3. **Chọn phục hồi.** Chỉ Owned(trash); chặn nếu đã qua cutoff30ngày.
4. **Khôi phục tương lai.** Clear DeletedTime; advance reminder past, không replay quá khứ.
5. **Hoặc xóa hẳn.** Chỉ note trong Trash; xóa graph rồi note trong transaction.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Note khác owner hoặc không ở Trash khi delete | Không xóa note active/khác chủ. |
| 409 | Hết30ngày khôi phục | Không khôi phục, không tự tạo bản trống. |
| Lỗi transaction | Xóa graph thất bại | Rollback; không báo permanent delete thành công. |

## Trạng thái sau và bất biến

- Chỉ note trong Trash; xóa graph rồi note trong transaction.
- Trash note30ngày tách biệt kế hoạch xóa account30ngày.
- Xóa hẳn không có Undo trong ứng dụng; backup recovery là quy trình khác.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /notes/{id}/trash`
- `POST /notes/{id}/restore`
- `DELETE /notes/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-021-AC1:** Trash không xuất hiện ở active search/inbox.
- **FLOW-021-AC2:** Restore đúng trước cutoff và không gửi bù lịch cũ.
- **FLOW-021-AC3:** Hard delete xóa graph chính chủ, không ảnh hưởng note khác.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/NoteService.cs:180](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L180-L184)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L22-L26)
- [ntc_aspnet/NTC.Services/Service/InboxService.cs:13](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L13-L17)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:186](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L186-L191)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:192](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L192-L195)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:198](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L198-L204)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
