# FLOW-022 — Tạo, sửa, tắt và xóa lịch nhắc

[Danh mục](../README.md) · [Sơ đồ Archify](22-tao-sua-reminder.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer chính chủ.
- **Kích hoạt:** Add reminder hoặc quản lý /reminders.
- **Điều kiện trước:** Note active chính chủ; tối đa5 active reminder/note.
- **Đầu vào:** reminderAt, timezone IANA, repeatType/interval/days/count/until, SendEmail, version.
- **Truy vết nghiệp vụ:** WF-005.

## Luồng chính

1. **Chọn note self.** Query reminder lọc qua note owner/active; per-note xác minh note trước.
2. **Kiểm lịch.** Chặn quá5 active, validate recurrence/timezone và ngày bắt đầu tương lai.
3. **Tạo occurrence đầu.** Chuẩn UTC và NextOccurrenceAt rồi lưu reminder.
4. **Sửa có version.** PATCH RequireVersion và phân biệt trường bỏ qua với clear.
5. **Hủy delivery cũ.** Đổi lịch/tắt active/reset làm abandon pending; advance lịch mới qua quá khứ.
6. **Xóa chính chủ.** DELETE xóa reminder và notification/delivery liên quan trong transaction.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Note/reminder không cùng owner hoặc note vào Trash | Không tạo/sửa lịch. |
| 400 | Lịch quá khứ/timezone/quota sai | Giữ form và báo lỗi. |
| 409 | Version cũ | Tải lại trước khi áp dụng thay đổi. |

## Trạng thái sau và bất biến

- DELETE xóa reminder và notification/delivery liên quan trong transaction.
- Guest và Admin không được gọi workspace reminders.
- Xóa/tắt không thể thu hồi email provider đã nhận trước đó.

- Lịch tháng/năm giữ anchor; ngày thiếu clamp cuối tháng. DST gap tiến tới phút hợp lệ; giờ lặp chọn offset lớn hơn.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notes/{noteId}/reminders`
- `POST /notes/{noteId}/reminders`
- `PATCH/DELETE /reminders/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-022-AC1:** Không tạo lịch thứ6 active.
- **FLOW-022-AC2:** PATCH bỏ field giữ giá trị, clear field bắt buộc bị chặn.
- **FLOW-022-AC3:** Sửa lịch không gửi lại các delivery đã bỏ.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:16](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L16-L29)
- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:31](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L31-L42)
- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:38](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L38-L44)
- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:57](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L57-L79)
- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:82](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L82-L104)
- [ntc_aspnet/NTC.Services/Service/ReminderService.cs:115](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/ReminderService.cs#L115-L125)

- [ntc_aspnet/NTC.Services/Notes/ReminderSchedule.cs:14](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Notes/ReminderSchedule.cs#L14-L53)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
