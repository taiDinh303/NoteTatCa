# FLOW-011 — Danh sách, tìm kiếm và lọc ghi chú

[Danh mục](../README.md) · [Sơ đồ Archify](11-danh-sach-tim-loc.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer hoặc guest.
- **Kích hoạt:** /notes, /labels/:tagId, /trash hoặc thay bộ lọc.
- **Điều kiện trước:** CustomerWorkspace; với guest dùng adapter local.
- **Đầu vào:** q tối đa200 ký tự, tagId, trash, pinned, hasReminder, pageNumber/pageSize.
- **Truy vết nghiệp vụ:** WF-002.

## Luồng chính

1. **Nhận bộ lọc.** API đọc bộ lọc và phân trang.
2. **Giới hạn owner.** Owned tách active/trash theo UserId; không có admin bypass.
3. **Lọc nội dung.** Tìm title/plain projection, label còn active cùng owner, pin/reminder.
4. **Sắp xếp & phân trang.** Active: pinned rồi rank/id; Trash: thời gian xóa giảm dần.
5. **Hiện danh sách.** DTO có labels/reminders hợp lệ; guest thực hiện filter trên local store.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400 | Query dài hoặc page không hợp lệ | Giữ bộ lọc và hiển thị lỗi validation. |
| 401/403 | Chưa xác thực hoặc là Admin | Không trả notes customer. |
| Không có kết quả | Bộ lọc không khớp | Trả danh sách rỗng; không đổi query thành truy vấn toàn cục. |

## Trạng thái sau và bất biến

- DTO có labels/reminders hợp lệ; guest thực hiện filter trên local store.
- Search dùng plain projection; không chạy script hoặc SQL từ query.
- Không có lọc attachments trong luồng hiện hành.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notes?q=&tagId=&trash=&pinned=&hasReminder=`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-011-AC1:** Không truy vấn được title/content của owner khác.
- **FLOW-011-AC2:** Trash không lẫn active.
- **FLOW-011-AC3:** Trang và thứ tự ổn định theo hợp đồng.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs:20](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Controllers/V1/NotesController.cs#L20-L24)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L22-L35)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:36](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L36-L44)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:45](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L45-L49)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:24](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L24-L26)
- [ntc_react/src/application/guest.ts:274](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guest.ts#L274-L297)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
