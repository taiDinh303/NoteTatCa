# FLOW-015 — Mở note, chuyển View/Edit, fullscreen và zoom

[Danh mục](../README.md) · [Sơ đồ Archify](15-mo-view-edit-zoom.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer/guest mở note đã có.
- **Kích hoạt:** Card hoặc /notes/:id; preference có thể chọn mở Edit.
- **Điều kiện trước:** Có cache hoặc GET detail chính chủ; khung workspace đã chuẩn bị.
- **Đầu vào:** noteId, initialAction, preference Edit/fullscreen; content zoom của session.
- **Truy vết nghiệp vụ:** WF-002 / DEC-023.

## Luồng chính

1. **Lấy note hiện tại.** Dùng list snapshot/query; cache mới hơn được ưu tiên.
2. **Đăng ký đúng phiên.** Host chỉ hiện khi registration.session khớp; cleanup đúng token.
3. **Bố cục trước paint.** Bỏ phép đo width0; layer width100% và sync layout trước frame.
4. **View chỉ đọc.** ReadOnlyContent giữ document, chưa tạo Tiptap cho đến Edit.
5. **Bật Edit / trở View.** beginEditing chuẩn bị editor; khi View gọi save trước, giữ frame và session.
6. **Giữ zoom và cuộn.** Content zoom tách workspace zoom, lưu percent/scroll trong session; không ghi vào document.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Note không tồn tại/khác owner | Không hiển thị nội dung phiên cũ. |
| Lỗi đọc | Detail chưa có cache và GET thất bại | Hiện retry trong đúng khung, không giả đã mở. |
| Lỗi flush/409 | Chuyển View khi chưa lưu | Giữ Edit/draft và thông báo. |

## Trạng thái sau và bất biến

- Content zoom tách workspace zoom, lưu percent/scroll trong session; không ghi vào document.
- Không tự thay read-only document bằng editor sau một vài frame.
- Fullscreen/zoom là hiển thị; không đổi ownership hoặc dữ liệu note.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notes/{id}`
- `LOCAL NoteSurfaceHost / ContentZoom`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-015-AC1:** Mở A/B không hiện nội dung/màu cũ.
- **FLOW-015-AC2:** Note ngắn không có chữ dồn dọc hoặc scrollbar tạm ở frame đầu.
- **FLOW-015-AC3:** View/Edit giữ Undo sau lần Edit đầu và scroll phù hợp.

## Nguồn đối chiếu

- [ntc_react/src/features/editor/NoteEditor.tsx:113](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L113-L145)
- [ntc_react/src/features/editor/NoteSurfaceHost.tsx:28](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteSurfaceHost.tsx#L28-L42)
- [ntc_react/src/features/editor/NoteSurfaceHost.tsx:81](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteSurfaceHost.tsx#L81-L90)
- [ntc_react/src/features/editor/ContentZoom.tsx:126](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/ContentZoom.tsx#L126-L149)
- [ntc_react/src/features/editor/NoteEditor.tsx:727](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L727-L739)
- [ntc_react/src/features/editor/NoteEditor.tsx:520](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L520-L529)
- [ntc_react/src/features/editor/NoteEditor.tsx:926](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L926-L947)
- [ntc_react/src/features/editor/ContentZoom.tsx:34](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/ContentZoom.tsx#L34-L103)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
