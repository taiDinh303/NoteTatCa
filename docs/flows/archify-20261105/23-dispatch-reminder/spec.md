# FLOW-023 — Worker tạo occurrence, nhắc bù và inbox

[Danh mục](../README.md) · [Sơ đồ Archify](23-dispatch-reminder.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** MaintenanceWorker.
- **Kích hoạt:** Tick30giây khi BackgroundJobs:Enabled=true.
- **Điều kiện trước:** Worker được cấu hình bật; database có due reminders.
- **Đầu vào:** UTC now, NextOccurrenceAt, repeat anchor và trạng thái note/account.
- **Truy vết nghiệp vụ:** WF-005.

## Luồng chính

1. **Chọn due batch.** Lấy tối đa100 reminder active/chưa xóa đến hạn.
2. **Tính occurrence.** Transaction đọc lại parent; tìm lần gần nhất và lần tương lai.
3. **Kiểm parent & hạn.** Note/user phải active, user không khóa; chỉ latest trong24giờ.
4. **Tạo thông báo.** Chống trùng reminder/occurrence; tạo Notification và delivery nếu SendEmail.
5. **Advance lịch.** Lưu processed index/NextOccurrenceAt; hết lịch thì IsActive=false.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Parent không active | Note Trash hoặc user khóa/vô hiệu hóa | Không tạo inbox/email cho occurrence đó. |
| Ngoài24giờ | Lần nhắc quá cũ | Bỏ lần cũ, không gửi mọi occurrence bị lỡ. |
| Concurrency | Hai worker đụng cùng reminder | Rollback batch item; lần khác recheck. |

## Trạng thái sau và bất biến

- Lưu processed index/NextOccurrenceAt; hết lịch thì IsActive=false.
- Catch-up chỉ một lần gần nhất trong24giờ, không replay toàn bộ lịch.
- Month/DST theo ReminderSchedule; không lấy timezone hệ điều hành làm timezone user.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `JOB DispatchRemindersAsync; không có endpoint anonymous để phát nhắc`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-023-AC1:** Nhiều due occurrence chỉ tạo latest eligible.
- **FLOW-023-AC2:** Chạy lại không nhân đôi notification cùng occurrence.
- **FLOW-023-AC3:** Trash/locked user không nhận occurrence mới.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:16](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L16-L21)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:25](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L25-L33)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:34](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L34-L36)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:37](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L37-L43)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:45](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L45-L50)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
