# FLOW-008 — Vào guest, dùng dữ liệu mẫu và reset

[Danh mục](../README.md) · [Sơ đồ Archify](08-guest-local.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Khách không có tài khoản.
- **Kích hoạt:** /guest hoặc Try guest mode.
- **Điều kiện trước:** Trình duyệt có thể lưu dữ liệu cục bộ. Không dùng credential/API workspace anonymous.
- **Đầu vào:** Dữ liệu mẫu và các thay đổi note/label của khách.
- **Truy vết nghiệp vụ:** WF-002 / DEC-028.

## Luồng chính

1. **Vào guest.** Chỉ khi auth anonymous, GuestEntry khởi tạo local rồi enterGuest.
2. **Khởi tạo mẫu.** ensure đọc store, chỉ seed khi chưa initialized.
3. **Sửa trên thiết bị.** CRUD guest dùng dữ liệu local, idempotency create và kiểm version riêng.
4. **Reset có xác nhận.** Reset chỉ xóa demo local và seed lại; không đụng dữ liệu account.
5. **Quay lại hoặc đăng nhập.** Dữ liệu guest được giữ tại browser; Sign in đánh dấu đề nghị copy.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Storage lỗi | Không ghi được store | Hiện lỗi, không báo đã lưu thành công. |
| 409 | Version guest đã đổi | Giữ draft, không ghi đè bản của tab khác. |
| Hủy reset | User đóng xác nhận | Giữ demo hiện tại. |

## Trạng thái sau và bất biến

- Dữ liệu guest được giữ tại browser; Sign in đánh dấu đề nghị copy.
- Guest không có quyền reminders/email/admin trên server.
- Xóa dữ liệu trình duyệt có thể làm mất guest; đây không phải cloud backup.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `LOCAL GuestWorkspace.ensure/create/patch/reset/discard`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-008-AC1:** Guest dùng note/label mà không login và không gọi API ghi anonymous.
- **FLOW-008-AC2:** Reload cùng browser giữ dữ liệu.
- **FLOW-008-AC3:** Reset chỉ tác động guest.

## Nguồn đối chiếu

- [ntc_react/src/app/GuestControls.tsx:24](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/app/GuestControls.tsx#L24-L43)
- [ntc_react/src/application/guest.ts:230](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guest.ts#L230-L239)
- [ntc_react/src/application/guest.ts:299](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/guest.ts#L299-L360)
- [ntc_react/src/app/GuestControls.tsx:103](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/app/GuestControls.tsx#L103-L117)
- [ntc_react/src/app/GuestControls.tsx:90](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/app/GuestControls.tsx#L90-L98)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
