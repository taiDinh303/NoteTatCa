# FLOW-016 — Định dạng rich text, checklist, mẫu, mục lục và Markdown

[Danh mục](../README.md) · [Sơ đồ Archify](16-rich-markdown-template.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** User đang Edit.
- **Kích hoạt:** Toolbar, shortcut Markdown, Append template, mục lục hoặc import/export.
- **Điều kiện trước:** Editor editable; action thay nội dung dùng chung autosave.
- **Đầu vào:** Document schema1; text marks, taskItem, heading, nguồn Markdown.
- **Truy vết nghiệp vụ:** WF-002 / DEC-029.

## Luồng chính

1. **Soạn có cấu trúc.** Tiptap extensions cho checklist, textStyle, màu/highlight, căn lề và bullet style.
2. **Chèn mẫu.** Chọn mẫu và append tại cuối document, không thay nội dung sẵn có.
3. **Điều hướng heading.** Mục lục đọc heading trong document; View dùng heading id riêng.
4. **Import có cảnh báo.** Parse Markdown, sanitize HTML và validate; xác nhận thay nội dung.
5. **Export có giới hạn.** Tải Markdown sau xác nhận mất định dạng; giữ original rich document.
6. **Lưu canonical.** onUpdate serialize/validate rồi gửi onChange cho autosave.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Validation | Document không thuộc whitelist hoặc vượt quota | Giữ editor và báo lỗi; không đưa HTML tùy ý vào note. |
| Import lỗi | Markdown/HTML sau parse không hợp lệ | Không thay document hiện tại. |
| Hủy xác nhận | Không chấp nhận thay nội dung hoặc mất định dạng | Giữ nguyên note. |

## Trạng thái sau và bất biến

- onUpdate serialize/validate rồi gửi onChange cho autosave.
- Export Markdown không bảo toàn mọi màu, font size, highlight, căn lề.
- Đây không phải luồng upload attachments hoặc trình soạn công thức.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `LOCAL Tiptap commands`
- `POST/PATCH /notes qua autosave`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-016-AC1:** Append template giữ nội dung cũ.
- **FLOW-016-AC2:** Script/link không an toàn bị loại hoặc bị validation từ chối.
- **FLOW-016-AC3:** Mục lục tới đúng heading; Export không sửa original.

## Nguồn đối chiếu

- [ntc_react/src/features/editor/RichEditor.tsx:78](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/RichEditor.tsx#L78-L128)
- [ntc_react/src/features/editor/NoteTemplates.tsx:51](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteTemplates.tsx#L51-L80)
- [ntc_react/src/features/editor/ReadOnlyContent.tsx:210](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/ReadOnlyContent.tsx#L210-L255)
- [ntc_react/src/features/editor/RichEditor.tsx:600](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/RichEditor.tsx#L600-L649)
- [ntc_react/src/features/editor/RichEditor.tsx:655](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/RichEditor.tsx#L655-L680)
- [ntc_react/src/features/editor/RichEditor.tsx:170](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/RichEditor.tsx#L170-L188)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
