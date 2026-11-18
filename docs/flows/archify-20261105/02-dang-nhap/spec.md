# FLOW-002 — Đăng nhập mật khẩu và phân luồng quyền

[Danh mục](../README.md) · [Sơ đồ Archify](02-dang-nhap.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Chủ tài khoản hoặc Admin.
- **Kích hoạt:** Gửi form /login.
- **Điều kiện trước:** Tài khoản tồn tại, đã xác minh email, không khóa/vô hiệu hóa/lockout.
- **Đầu vào:** email, password; không có Remember this tab.
- **Truy vết nghiệp vụ:** WF-001.

## Luồng chính

1. **Gửi đăng nhập.** Client chờ health hữu hạn trước xác thực; không tự retry POST đăng nhập.
2. **Kiểm mật khẩu.** Tìm email; legacy mới có username fallback. Sai mật khẩu tăng bộ đếm thất bại.
3. **Kiểm tài khoản.** Chặn khóa/vô hiệu hóa/lockout và email chưa xác minh.
4. **Cấp session.** Lưu hash refresh credential; access JWT ngắn hạn, có sid/stamp và roles.
5. **Lưu & điều hướng.** Client giữ phiên, xóa private cache khi đổi account; Admin đi khu quản trị, customer đi notes.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 401 | Sai email/mật khẩu | Thông báo chung, không tiết lộ mật khẩu hoặc tài khoản. |
| 403 | Tài khoản không đủ điều kiện | Không mở workspace; hướng xác minh email khi phù hợp. |
| Mất kết nối | Health/API không sẵn sàng | Cho thử lại; không lưu mật khẩu để tự gửi lại. |

## Trạng thái sau và bất biến

- Client giữ phiên, xóa private cache khi đổi account; Admin đi khu quản trị, customer đi notes.
- Admin kể cả đồng thời có role User vẫn chỉ dùng vùng quản trị.
- Access token không được ghi vào localStorage; refresh credential được lưu để khôi phục phiên.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /auth/login`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-002-AC1:** Customer vào notes; Admin vào admin/overview.
- **FLOW-002-AC2:** Lock/revoke có hiệu lực với request sau đó.
- **FLOW-002-AC3:** Đổi account không thấy private cache của account trước.

## Nguồn đối chiếu

- [ntc_react/src/application/auth.ts:278](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L278-L290)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:53](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L53-L68)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:26](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L26-L30)
- [ntc_aspnet/NTC.Services/Service/AuthService.cs:120](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/AuthService.cs#L120-L139)
- [ntc_react/src/application/auth.ts:145](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/application/auth.ts#L145-L154)
- [ntc_react/src/app/router.tsx:1](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/app/router.tsx#L1-L40)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
