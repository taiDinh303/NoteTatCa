# FLOW-030 — Yêu cầu AI tạo hoặc sửa mascot

[Danh mục](../README.md) · [Sơ đồ Archify](30-ai-mascot-tao.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer chủ slot mascot.
- **Kích hoạt:** Appearance → mascot AI khi available.
- **Điều kiện trước:** Feature/provider configured, consent rõ ràng; một slot/account, quota1request/ngày UTC.
- **Đầu vào:** requestId, description<=1000, reference PNG<=2MB/2048px, replacesId khi sửa.
- **Truy vết nghiệp vụ:** CURRENT Mascot AI; khác AI chat ghi chú.

## Luồng chính

1. **Đọc khả dụng.** Status kiểm option/slot/latest; UI poll khi queued/running.
2. **Xác nhận dữ liệu gửi.** Consent bắt buộc; validate request ID, description và ảnh tham chiếu.
3. **Giữ quota & slot.** Idempotent theo requestId; kiểm ngày UTC, pending và replacesId.
4. **Worker claim.** Processor lấy job, giới hạn10phút, gọi generator.
5. **Ghi ready / failed.** Store.Complete hoặc Fail bằng error code; không log private input.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 503 AI_NOT_CONFIGURED | Feature/provider chưa sẵn sàng | Không gửi dữ liệu sang provider. |
| 429 MASCOT_DAILY_LIMIT | Đã dùng quota UTC hôm nay | Chờ reset; không tự retry tạo tốn phí. |
| 409/provider lỗi | Slot đổi, pending hoặc tạo thất bại | Giữ trạng thái/error code; user quyết định bước tiếp. |

## Trạng thái sau và bất biến

- Store.Complete hoặc Fail bằng error code; không log private input.
- Không tự gọi AI thật trong đợt đặc tả; đây là source capability, không xác nhận cloud đã bật.
- Chỉ mô tả/ảnh được consent gửi tới OpenAI; không có luồng chat tự đọc notes trong tính năng này.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /mascot-ai/status`
- `POST /mascot-ai/generations`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-030-AC1:** Cùng requestId không reserve quota hai lần.
- **FLOW-030-AC2:** Không consent bị từ chối.
- **FLOW-030-AC3:** Job failed không bị hiển thị như mascot ready.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:19](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L19-L35)
- [ntc_react/src/features/mascot/MascotAiSettings.tsx:47](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/mascot/MascotAiSettings.tsx#L47-L71)
- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:36](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L36-L51)
- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:53](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L53-L85)
- [ntc_aspnet/NTC.Services/Mascots/MascotGenerationProcessor.cs:7](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotGenerationProcessor.cs#L7-L17)
- [ntc_aspnet/NTC.Services/Mascots/MascotGenerationProcessor.cs:16](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotGenerationProcessor.cs#L16-L25)

- [ntc_aspnet/NTC.Repositories/Mascots/MascotGenerationStore.cs:27](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Repositories/Mascots/MascotGenerationStore.cs#L27-L36)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
