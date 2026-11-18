# FLOW-009 — Sao chép guest vào tài khoản sau đăng nhập

[Danh mục](../README.md) · [Sơ đồ Archify](09-copy-guest.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer đã đăng nhập.
- **Kích hoạt:** Chấp nhận Copy guest notes to your account; có thể để sau.
- **Điều kiện trước:** Không phải Admin; còn guest data, owner không đổi trong quá trình copy.
- **Đầu vào:** Snapshot guest, map label, checkpoint theo account, create idempotency key.
- **Truy vết nghiệp vụ:** DEC-028.

## Luồng chính

1. **Xác nhận đích.** Chốt owner và generation guard; đọc snapshot nguồn.
2. **Ánh xạ label.** Đọc đủ label; dùng checkpoint và đối chiếu đầy đủ thuộc tính để phục hồi ACK mất.
3. **Copy từng note.** Lưu key và payload create trước request; kiểm userId và dữ liệu response.
4. **Giữ trạng thái Trash.** Note guest đã xóa được đưa vào Trash ở account; checkpoint chỉ hoàn tất sau thao tác.
5. **Dọn khi hoàn tất.** Chỉ xóa guest nếu revision không đổi; nếu tab khác sửa thì giữ nguồn.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Account changed | User đổi account khi copy | Dừng ngay; không gửi tiếp sang account mới. |
| Mất ACK/lỗi mạng | Một phần đã copy | Giữ nguồn và checkpoint; lần sau tiếp tục bằng key cũ. |
| Nguồn thay đổi | Guest revision khác snapshot | Giữ guest, không tuyên bố xóa nguồn xong. |

## Trạng thái sau và bất biến

- Chỉ xóa guest nếu revision không đổi; nếu tab khác sửa thì giữ nguồn.
- Tạo bản sao, không ghi đè note account có sẵn.
- Bản guest chỉ bị xóa khi việc copy đã hoàn tất và snapshot vẫn khớp.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET/POST /tags`
- `POST /notes`
- `POST /notes/{id}/trash`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-009-AC1:** Retry không nhân bản note đã ACK mất.
- **FLOW-009-AC2:** Đổi account dừng copy.
- **FLOW-009-AC3:** Guest thay đổi ở tab khác được bảo toàn.

## Nguồn đối chiếu

- [ntc_react/src/application/guestTransfer.ts:27](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guestTransfer.ts#L27-L39)
- [ntc_react/src/application/guestTransfer.ts:40](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guestTransfer.ts#L40-L81)
- [ntc_react/src/application/guestTransfer.ts:98](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guestTransfer.ts#L98-L128)
- [ntc_react/src/application/guestTransfer.ts:130](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guestTransfer.ts#L130-L143)
- [ntc_react/src/application/guestTransfer.ts:145](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guestTransfer.ts#L145-L156)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
