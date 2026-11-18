# FLOW-010 — Tải workspace và phân tách dữ liệu nền

[Danh mục](../README.md) · [Sơ đồ Archify](10-chuan-bi-workspace.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer, guest hoặc Admin sau xác thực.
- **Kích hoạt:** WorkspaceReady chuẩn bị route được bảo vệ.
- **Điều kiện trước:** Phiên đã xác định; cache key tách theo userId và identity.
- **Đầu vào:** Session, page dữ liệu, AbortSignal; modules editor preload từ Startup.
- **Truy vết nghiệp vụ:** WF-001 / DEC-026.

## Luồng chính

1. **Chốt identity.** Hủy generation cũ, AbortController và khóa cache theo userId.
2. **Tải dữ liệu chính.** Customer: trang active notes đầu và toàn bộ labels. Admin: me và admin statistics.
3. **Kiểm owner & cache.** Mỗi note phải khớp session.userId trước khi cache detail.
4. **Mở workspace.** Emit ready ngay khi critical xong.
5. **Tải nền độc lập.** Trash, reminder, inbox, unread và me dùng allSettled; lỗi nền không đóng notes.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Lỗi critical | Notes/labels hoặc nhánh Admin chưa tải được | Báo lỗi có Retry; không giả tiến độ hoàn tất. |
| Abort/account đổi | Response thuộc identity cũ | Bỏ response; không điền cache mới. |
| Lỗi dữ liệu nền | Một nguồn phụ thất bại | Trang tương ứng xử lý lỗi, workspace chính vẫn mở. |

## Trạng thái sau và bất biến

- Trash, reminder, inbox, unread và me dùng allSettled; lỗi nền không đóng notes.
- CURRENT chỉ gate trang notes đầu, không phải toàn bộ active notes như mô tả lịch sử.
- Không suy ra số liệu hiệu năng production từ thiết kế preload.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notes`
- `GET /tags`
- `GET /reminders`
- `GET /notifications`
- `GET /notifications/unread-count`
- `GET /me`
- `GET /admin/statistics`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-010-AC1:** Nguồn phụ chậm không chặn trang notes.
- **FLOW-010-AC2:** Response sai user không được cache.
- **FLOW-010-AC3:** Admin không tải danh sách nội dung note customer.

## Nguồn đối chiếu

- [ntc_react/src/application/preparation.ts:98](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/preparation.ts#L98-L112)
- [ntc_react/src/application/preparation.ts:234](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/preparation.ts#L234-L251)
- [ntc_react/src/application/preparation.ts:252](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/preparation.ts#L252-L266)
- [ntc_react/src/application/preparation.ts:267](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/preparation.ts#L267-L269)
- [ntc_react/src/application/preparation.ts:270](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/preparation.ts#L270-L316)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
