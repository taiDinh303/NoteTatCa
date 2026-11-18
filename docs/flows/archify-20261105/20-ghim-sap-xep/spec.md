# FLOW-020 — Ghim, bỏ ghim và sắp xếp note

[Danh mục](../README.md) · [Sơ đồ Archify](20-ghim-sap-xep.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ workspace.
- **Kích hoạt:** Pin button, kéo thả hoặc Move earlier/later.
- **Điều kiện trước:** Note active chính chủ; neighbors cùng nhóm pin và còn kề nhau.
- **Đầu vào:** isPinned tuyệt đối/version; draggedId, previousId, nextId, version.
- **Truy vết nghiệp vụ:** WF-003.

## Luồng chính

1. **Gửi ý định.** Pin là giá trị tuyệt đối; reorder v1 bắt version khác rỗng.
2. **Kiểm note/version.** Lấy Owned và CheckVersion; không chấp nhận note owner khác.
3. **Chọn nhóm đúng.** Đổi pin chuyển rank vào đầu nhóm đích; reorder chỉ trong nhóm pin hiện tại.
4. **Kiểm neighbors.** Không self/equal; previous/next phải tồn tại và kề nhau sau khi bỏ dragged.
5. **Ghi thứ tự.** Transaction reindex nhóm bằng các bội1000 rồi SaveAsync.
6. **Cập nhật client.** Workspace queue pin/rollback và cache; dùng version response cho thao tác tiếp.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Self-neighbor hoặc version rỗng | Không đổi rank. |
| 404 | Neighbor khác owner/nhóm | Không dịch note sang nhóm trái phép. |
| 409/lỗi mạng | Order hoặc version đã đổi | Rollback/refetch; không giữ optimistic như đã lưu. |

## Trạng thái sau và bất biến

- Workspace queue pin/rollback và cache; dùng version response cho thao tác tiếp.
- Sắp xếp không thay nội dung rich text.
- Pin không dùng toggle không xác định ở v1; legacy có adapter riêng.

- UI chỉ cho kéo khi không Trash, không search/tag/reminder filter và nhóm đã tải đủ trang.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `PATCH /notes/{id}/pin`
- `POST /notes/reorder`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-020-AC1:** Hai request pin cùng trạng thái không đảo ngược ý định.
- **FLOW-020-AC2:** Neighbor không kề trả409.
- **FLOW-020-AC3:** Lỗi remote không để UI báo thứ tự đã lưu sai.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs:58](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs#L58-L68)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:175](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L175-L178)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:206](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L206-L212)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:164](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L164-L168)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:212](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L212-L219)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:213](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L213-L219)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:220](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L220-L223)
- [ntc_react/src/application/workspace.ts:134](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/workspace.ts#L134-L195)

- [ntc_react/src/features/notes/NotesPage.tsx:405](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/notes/NotesPage.tsx#L405-L411)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
