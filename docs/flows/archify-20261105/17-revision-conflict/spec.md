# FLOW-017 — Xung đột online và khôi phục phiên bản note

[Danh mục](../README.md) · [Sơ đồ Archify](17-revision-conflict.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ note.
- **Kích hoạt:** 409 khi lưu hoặc mở Version history.
- **Điều kiện trước:** Note active chính chủ; restore phải có version hiện tại.
- **Đầu vào:** noteId, revisionId, expected version; draft local chưa lưu.
- **Truy vết nghiệp vụ:** WF-002 / TASK-029.

## Luồng chính

1. **Dừng autosave conflict.** 409 đặt trạng thái conflict; update tiếp không tự gửi đè.
2. **Giữ bản nhập.** UI cho copy/save as new hoặc discard rõ ràng, không âm thầm bỏ draft.
3. **Đọc lịch sử self.** Kiểm note Owned trước khi đọc revision theo note/user.
4. **Chọn khôi phục.** Client gửi revisionId với version của note đang mở.
5. **Restore transaction.** Kiểm version và ownership của revision; snapshot bản hiện tại rồi phục hồi trường nội dung.
6. **Đọc lại sau restore.** Refetch detail/list để nhận version mới; không tái dùng expected version cũ.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Note/revision khác owner hoặc không tồn tại | Không tiết lộ bản cũ. |
| 409 | Note đã đổi trước khi restore | Không khôi phục; tải lại rồi chọn lại. |
| Mạng lỗi | Restore chưa ACK | Giữ phiên đang mở và báo lỗi; không giả đã restore. |

## Trạng thái sau và bất biến

- Refetch detail/list để nhận version mới; không tái dùng expected version cũ.
- Revision là snapshot nội dung, không phải lịch sử mọi thao tác pin/label/reminder.
- Autosave conflict online khác blocked outbox; xem luồng Sync now cho offline.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notes/{id}/revisions`
- `POST /notes/{id}/revisions/{revisionId}/restore`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-017-AC1:** Revision khác note/user bị404.
- **FLOW-017-AC2:** Restore tạo snapshot của bản bị thay thế.
- **FLOW-017-AC3:** Conflict không làm mất draft hoặc âm thầm ghi đè.

## Nguồn đối chiếu

- [ntc_react/src/application/autosave.ts:71](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/autosave.ts#L71-L77)
- [ntc_react/src/application/autosave.ts:117](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/autosave.ts#L117-L126)
- [ntc_react/src/features/editor/NoteEditor.tsx:668](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L668-L721)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:66](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L66-L75)
- [ntc_react/src/features/editor/NoteEditor.tsx:355](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L355-L383)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:78](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L78-L94)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
