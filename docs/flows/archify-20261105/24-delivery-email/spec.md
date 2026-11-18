# FLOW-024 — Gửi email nhắc, lease và retry

[Danh mục](../README.md) · [Sơ đồ Archify](24-delivery-email.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** MaintenanceWorker và email provider được cấu hình.
- **Kích hoạt:** Có ReminderDelivery chưa gửi đến NextAttemptAt.
- **Điều kiện trước:** Jobs enabled; email sender có cấu hình; account đủ điều kiện nhận thư.
- **Đầu vào:** deliveryId, occurrence, note/account/reminder hiện tại.
- **Truy vết nghiệp vụ:** WF-005.

## Luồng chính

1. **Lấy delivery due.** Chọn tối đa100 chưa sent/abandoned, lease hết hoặc chưa có.
2. **Kiểm parent.** Đọc note/user/reminder; parent không dùng được thì abandon.
3. **Giữ lease.** Đặt leaseId, hạn2phút; tăng attempts trước khi gọi mạng và commit.
4. **Render & gửi.** CURRENT email có tiêu đề note rút gọn và preview tối đa240 grapheme, HTML-encode và link.
5. **ACK / backoff.** Đánh dấu SentAt hoặc tăng backoff; tối đa5 attempts, bỏ lease khi xong.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Parent unavailable | User/email/note/reminder không eligible | Abandon, không gọi provider. |
| Provider timeout/failure | Gửi thất bại hoặc ACK chưa rõ | Backoff theo2^attempts phút; không hứa exactly-once. |
| Lease/concurrency | Owner lease khác đã cập nhật | Clear tracking; không ép ghi đè hàng mới. |

## Trạng thái sau và bất biến

- Đánh dấu SentAt hoặc tăng backoff; tối đa5 attempts, bỏ lease khi xong.
- Email có title/preview là thay đổi bổ sung được ghi trong worklog; không gửi rich HTML/JSON và không tự mở rộng phạm vi dữ liệu.
- Chỉ ghi error code trong log; không log nội dung thư/token; crash sau send trước ACK có thể gây gửi trùng.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `JOB DeliverEmailsAsync`
- `OUTBOUND IEmailSender (Brevo hoặc SMTP)`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-024-AC1:** Không có hai lease hợp lệ đồng thời cho cùng delivery.
- **FLOW-024-AC2:** Attempt thứ5 thất bại được abandon.
- **FLOW-024-AC3:** Ký tự HTML trong title/preview được encode; đặc tả không gửi email thật.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:54](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L54-L59)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:67](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L67-L76)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:77](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L77-L82)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:85](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L85-L87)
- [ntc_aspnet/NTC.Services/Infrastructure/EmailTemplateRenderer.cs:8](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Infrastructure/EmailTemplateRenderer.cs#L8-L35)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:88](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L88-L98)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
