# FLOW-012 — Lưu note trên thiết bị khi offline

[Danh mục](../README.md) · [Sơ đồ Archify](12-luu-offline.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer có snapshot của chính mình.
- **Kích hoạt:** Tạo/sửa qua adapter offline; local persistence là điểm xác nhận trên thiết bị.
- **Điều kiện trước:** Có owner hiện tại; note cũ phải được mở/tải trước để sửa offline.
- **Đầu vào:** draft, version, create key; store riêng theo owner.
- **Truy vết nghiệp vụ:** DEC-025.

## Luồng chính

1. **Xác minh local.** Validate document; requireOwner; note cũ phải có trong snapshot.
2. **Kiểm version.** Theo alias/version chain; khác local version trả409.
3. **Gộp khi an toàn.** Chỉ gộp patch chưa gửi và chưa blocked; request đã attempted giữ nguyên payload.
4. **Ghi note & outbox.** Ghi note phiên bản local:key và pending atomically qua store change.
5. **Báo lưu thiết bị.** Guard owner, emit refresh, yêu cầu sync; chưa đồng nghĩa server đã ACK.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| DeviceSaveError | Quota/storage không ghi được | Giữ draft, báo lỗi lưu thiết bị; không báo Saved. |
| 409 | Version trên thiết bị đã đổi | Giữ draft hoặc tạo copy. |
| Thiếu snapshot | Note chưa tải online | Yêu cầu mở online trước; không tạo update rỗng. |

## Trạng thái sau và bất biến

- Guard owner, emit refresh, yêu cầu sync; chưa đồng nghĩa server đã ACK.
- Saved on device và All changes saved trên server là hai trạng thái khác nhau.
- Offline không bỏ ownership hoặc biến phiên chưa verified thành quyền ghi server.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `LOCAL OfflineNotes.save`
- `LOCAL IndexedDB snapshot/outbox`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-012-AC1:** Reload giữ note và pending đã persist.
- **FLOW-012-AC2:** Không gộp làm đổi payload của request ACK chưa rõ.
- **FLOW-012-AC3:** Lỗi storage không bị che thành lưu thành công.

## Nguồn đối chiếu

- [ntc_react/src/application/offline.ts:236](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L236-L249)
- [ntc_react/src/application/offline.ts:250](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L250-L263)
- [ntc_react/src/application/offline.ts:264](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L264-L283)
- [ntc_react/src/application/offline.ts:284](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L284-L308)
- [ntc_react/src/application/offline.ts:310](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L310-L314)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
