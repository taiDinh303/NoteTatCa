# FLOW-014 — Tạo/sửa note, autosave và đóng an toàn

[Danh mục](../README.md) · [Sơ đồ Archify](14-tao-autosave-dong.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer hoặc guest.
- **Kích hoạt:** Take a note hoặc sửa draft trong Edit.
- **Điều kiện trước:** Note được phép sửa; payload hợp lệ. Remote write dùng CustomerWorkspace.
- **Đầu vào:** title tùy chọn, documentJson, iconEmoji, backgroundColor, tagIds, version/key.
- **Truy vết nghiệp vụ:** WF-002.

## Luồng chính

1. **Cập nhật draft.** Coordinator nhận draft, debounce và giữ dirty/error/conflict.
2. **Chốt request.** Một flight, validate document; create giữ payload và key qua lỗi ACK.
3. **Kiểm owner/version.** Remote create kiểm quota nội dung/labels; update kiểm owner, expected version và rich conversion.
4. **Lưu transaction.** Create note/link hoặc snapshot revision trước update; chỉ ACK khi SaveAsync xong.
5. **Chốt trạng thái.** Coordinator commit phiên bản trả về và tiếp tục nếu draft mới hơn.
6. **Đóng / View.** Flush trước khi đóng/chuyển; lỗi hoặc conflict mở bảo vệ draft.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Schema/giới hạn không hợp lệ | Giữ draft và chỉ rõ lỗi; không ghi payload sai. |
| 409 | Version hoặc idempotency key không khớp | Dừng autosave ghi đè; cho xử lý conflict/copy. |
| Lỗi lưu | Mạng hoặc persistence thất bại | Retry save bằng dữ liệu còn giữ; không tự đóng note. |

## Trạng thái sau và bất biến

- Flush trước khi đóng/chuyển; lỗi hoặc conflict mở bảo vệ draft.
- Title rỗng hợp lệ; nội dung tối đa100.000 ký tự, rich JSON có whitelist/schema.
- Không khẳng định lưu server nếu writer chỉ ACK local; xem luồng offline.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /notes với Idempotency-Key`
- `PATCH /notes/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-014-AC1:** Gõ tiếp khi request đang chạy không bị ACK cũ ghi đè.
- **FLOW-014-AC2:** Retry create dùng lại key/payload gốc.
- **FLOW-014-AC3:** Close lỗi giữ được nội dung chưa lưu.

## Nguồn đối chiếu

- [ntc_react/src/application/autosave.ts:64](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/autosave.ts#L64-L82)
- [ntc_react/src/application/autosave.ts:84](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/autosave.ts#L84-L108)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:97](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L97-L145)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:114](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L114-L145)
- [ntc_react/src/application/autosave.ts:109](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/autosave.ts#L109-L126)
- [ntc_react/src/features/editor/NoteEditor.tsx:486](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/editor/NoteEditor.tsx#L486-L518)

- [ntc_aspnet/NTC.Services/Notes/ContentRules.cs:11](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Notes/ContentRules.cs#L11-L45)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
