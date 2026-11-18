# FLOW-005 — Khôi phục phiên, refresh và đồng bộ nhiều tab

[Danh mục](../README.md) · [Sơ đồ Archify](05-khoi-phuc-refresh.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Trình duyệt quay lại ứng dụng.
- **Kích hoạt:** Bootstrap hoặc access token cần làm mới.
- **Điều kiện trước:** Có refresh credential đã lưu; offline cache chỉ được mở cho đúng customer account.
- **Đầu vào:** refreshToken; userId để chọn cache cục bộ.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Đọc phiên đã lưu.** Không có credential: thử khôi phục guest rồi về anonymous.
2. **Mở cache an toàn.** Customer có snapshot được vào offline, access token rỗng; Admin không dùng fallback này.
3. **Điều phối refresh.** Một flight và khóa dùng chung; nhận rotation từ tab khác trước khi refresh tiếp.
4. **Rotate trên server.** Kiểm expiry, account/stamp; revoke refresh cũ, tạo replacement cùng family trong transaction.
5. **Chấp nhận phiên mới.** Ghi credential mới và broadcast session; generation guard chặn kết quả của account cũ.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 401/403 | Credential bị revoke, replay hoặc account không active | Xóa credential/cache private; về anonymous. |
| Mạng/API lỗi | Không xác minh được nhưng có snapshot customer | Chỉ mở offline; không đồng bộ ghi khi chưa verified. |
| Account đổi | Kết quả async thuộc generation trước | Bỏ kết quả, không nhập queue/cache vào account mới. |

## Trạng thái sau và bất biến

- Ghi credential mới và broadcast session; generation guard chặn kết quả của account cũ.
- Refresh token bị dùng lại làm revoke các session còn sống trong cùng family.
- Sentinel expiry năm9999 không bỏ kiểm revoke, stamp và trạng thái account.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/refresh`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-005-AC1:** Hai tab không tự làm replay do rotate chéo.
- **FLOW-005-AC2:** Mất mạng không mở cache của account khác.
- **FLOW-005-AC3:** Token replay không nhận access token mới.

## Nguồn đối chiếu

- [ntc_react/src/application/auth.ts:156](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L156-L172)
- [ntc_react/src/application/auth.ts:173](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L173-L218)
- [ntc_react/src/application/auth.ts:227](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L227-L255)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:141](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L141-L164)
- [ntc_react/src/application/auth.ts:245](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L245-L254)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
