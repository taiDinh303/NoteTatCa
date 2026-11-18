# FLOW-031 — Xem kết quả, áp dụng và xóa mascot tùy chỉnh

[Danh mục](../README.md) · [Sơ đồ Archify](31-ai-mascot-ap-dung.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ account có generation/slot.
- **Kích hoạt:** Preview, Apply, Edit hoặc Delete custom mascot.
- **Điều kiện trước:** Job thuộc UserId; result ready và còn hạn7ngày; apply phải qua slot consistency.
- **Đầu vào:** generationId, directions/reactions WebP base64; slotId để xóa.
- **Truy vết nghiệp vụ:** CURRENT Mascot AI.

## Luồng chính

1. **Lấy result self.** OwnedAsync và available; chỉ ready có ảnh trong7ngày.
2. **Chuẩn bị preview.** UI lấy PNG và căn atlas trước khi hiển thị/apply.
3. **Kiểm WebP.** Apply xác minh owner, header và giới hạn600.000bytes mỗi ảnh.
4. **Apply slot.** Store apply kiểm current slot/consistency; sai thì409.
5. **Đọc lại / xóa.** Saved chỉ applied có byte đầy đủ; Delete chỉ slot đang thuộc job chính chủ.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Generation/slot khác owner | Không tải binary hoặc xóa slot. |
| 409 | Chưa ready, hết hạn hoặc slot đã đổi | Reload status, không áp dụng kết quả cũ. |
| 400 | WebP/base64 không hợp lệ | Giữ slot hiện tại. |

## Trạng thái sau và bất biến

- Saved chỉ applied có byte đầy đủ; Delete chỉ slot đang thuộc job chính chủ.
- Áp dụng mascot không sửa nội dung note.
- Không coi thumbnail/preset local là bằng chứng đã persist account mascot.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /mascot-ai/generations/{id}/result`
- `POST /mascot-ai/generations/{id}/apply`
- `GET /mascot-ai/slot/result`
- `DELETE /mascot-ai/slot/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-031-AC1:** Account khác không lấy được result.
- **FLOW-031-AC2:** Apply stale bị409.
- **FLOW-031-AC3:** Xóa chỉ tác động custom slot của owner.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:116](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L116-L122)
- [ntc_react/src/features/mascot/MascotAiSettings.tsx:78](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/mascot/MascotAiSettings.tsx#L78-L86)
- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:88](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L88-L99)
- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:100](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L100-L101)
- [ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs:103](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Mascots/MascotAiService.cs#L103-L114)

- [ntc_aspnet/NTC.Repositories/Mascots/MascotGenerationStore.cs:71](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Repositories/Mascots/MascotGenerationStore.cs#L71-L94)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
