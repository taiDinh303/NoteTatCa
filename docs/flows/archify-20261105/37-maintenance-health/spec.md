# FLOW-037 — Khởi động API, health và bảo trì định kỳ

[Danh mục](../README.md) · [Sơ đồ Archify](37-maintenance-health.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Host/operator và worker.
- **Kích hoạt:** API khởi động; health probe; maintenance tick khi đã bật.
- **Điều kiện trước:** Cấu hình hợp lệ và môi trường riêng; không tự bật jobs hoặc apply migrations từ đặc tả.
- **Đầu vào:** BackgroundJobs:Enabled; UTC now; service scopes.
- **Truy vết nghiệp vụ:** CURRENT operations.

## Luồng chính

1. **Đăng ký worker có điều kiện.** Maintenance chỉ được AddHostedService nếu BackgroundJobs:Enabled parse true.
2. **Health độc lập.** Live trả liveness; ready thử DB connection và503 khi không connect được.
3. **Tick có scope mới.** Mỗi30giây dispatch/deliver/purge/prune trong các scope riêng.
4. **Purge note quá hạn.** Batch100, recheck cutoff<=now-30ngày trong transaction rồi xóa graph.
5. **Dọn identity state.** Xóa session hết hạn/revoked theo cutoff và challenge cũ; không purge account/audit.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 503 ready | DB không sẵn sàng | Probe báo unavailable; live không được hiểu là DB ready. |
| Concurrency | Note vừa được restore/đổi trạng thái | Recheck/rollback; không xóa theo snapshot cũ. |
| Batch lỗi | Worker gặp exception | Log loại exception và thử ở tick sau; hủy host thì dừng. |

## Trạng thái sau và bất biến

- Xóa session hết hạn/revoked theo cutoff và challenge cũ; không purge account/audit.
- Mô tả đường chạy khi enabled, không khẳng định jobs production hiện đang bật.
- Không chạy purge, migration hay email thật trong đợt tạo đặc tả.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /health/live (ngoài /api/v1)`
- `GET /health/ready (ngoài /api/v1)`
- `JOB PurgeTrashAsync / PruneIdentityStateAsync`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-037-AC1:** Jobs disabled không dispatch/deliver/purge.
- **FLOW-037-AC2:** Ready DB lỗi trả503.
- **FLOW-037-AC3:** Restore trước cutoff/recheck không bị purge nhầm.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/DependencyInjection.cs:47](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/DependencyInjection.cs#L47-L47)
- [ntc_aspnet/NTC.API/Program.cs:90](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Program.cs#L90-L95)
- [ntc_aspnet/NTC.API/Jobs/MaintenanceWorker.cs:5](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Jobs/MaintenanceWorker.cs#L5-L21)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:102](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L102-L119)
- [ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs:121](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Jobs/BackgroundMaintenanceService.cs#L121-L129)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
