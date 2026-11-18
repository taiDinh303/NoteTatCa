# FLOW-013 — Tự đồng bộ, Sync now và giải quyết xung đột

[Danh mục](../README.md) · [Sơ đồ Archify](13-dong-bo-xung-dot.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer đã được xác thực lại trên server.
- **Kích hoạt:** Reconnect, sync sau local save hoặc Sync now.
- **Điều kiện trước:** Online, verified, còn owner; khóa sync theo account.
- **Đầu vào:** Outbox có key/version và các mục blocked.
- **Truy vết nghiệp vụ:** DEC-025.

## Luồng chính

1. **Khóa theo owner.** Một sync flight; chỉ chạy khi online và verified.
2. **Chọn pending.** Bỏ cả note đang blocked; đánh dấu attempted trước gửi.
3. **Gửi nguyên request.** Create cùng key hoặc patch với expected version.
4. **Phân biệt ACK mất.** 409 patch được so draft với server; bằng thì coi đã ACK, khác thì block.
5. **Commit và ánh xạ.** Sau ACK, đổi localId thành serverId, cập nhật phiên bản pending kế tiếp rồi cache.
6. **Giải quyết blocked.** Chọn tạo offline copy hoặc lấy bản online; fetch online trước khi bỏ local.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 409/400/404/422 | Xung đột hoặc dữ liệu không còn hợp lệ | Block note đó; tiếp tục note khác khi an toàn. |
| Mất mạng | Flight chưa xong | Giữ pending, không lặp vô hạn trong một lần sync. |
| Account đổi | Guard hoặc saved.userId sai | Không commit vào account mới. |

## Trạng thái sau và bất biến

- Chọn tạo offline copy hoặc lấy bản online; fetch online trước khi bỏ local.
- Không tự nâng expected version rồi ghi đè bản online.
- Download pending là bảo vệ trước logout, khác full workspace archive.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /notes`
- `PATCH /notes/{id}`
- `GET /notes/{id}`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-013-AC1:** ACK create mất không sinh note trùng.
- **FLOW-013-AC2:** Conflict giữ được local cho tới quyết định rõ ràng.
- **FLOW-013-AC3:** Không sync queue của account trước sang account sau.

## Nguồn đối chiếu

- [ntc_react/src/application/offline.ts:334](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L334-L343)
- [ntc_react/src/application/offline.ts:344](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L344-L354)
- [ntc_react/src/application/offline.ts:356](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L356-L361)
- [ntc_react/src/application/offline.ts:362](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L362-L398)
- [ntc_react/src/application/offline.ts:399](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L399-L425)
- [ntc_react/src/application/offline.ts:467](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/offline.ts#L467-L503)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
