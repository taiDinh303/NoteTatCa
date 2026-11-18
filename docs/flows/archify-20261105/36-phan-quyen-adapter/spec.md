# FLOW-036 — Ủy quyền request và adapter routes legacy

[Danh mục](../README.md) · [Sơ đồ Archify](36-phan-quyen-adapter.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Mọi client gọi API bảo vệ.
- **Kích hoạt:** Bearer request tới v1 hoặc legacy.
- **Điều kiện trước:** Token chữ ký/audience/issuer hợp lệ; mỗi request còn phải qua trạng thái DB.
- **Đầu vào:** sub/sid/stamp và resource ID; không tin role/owner do client nhập.
- **Truy vết nghiệp vụ:** WF-001 / RULE-009.

## Luồng chính

1. **Xác định session.** Parse sub/sid, đọc user và RefreshSession theo đúng user.
2. **Kiểm trạng thái DB.** Chặn locked/deleted/unconfirmed/lockout/revoked/expiry/stamp mismatch.
3. **Đọc lại roles.** Thay role claims cũ bằng membership active từ database.
4. **Áp workspace policy.** CustomerWorkspace chặn Admin dù có role User; anonymous mặc định không được vào.
5. **Service kiểm owner.** Owned note theo UserId, active/trash; không tìm thấy trả404, không admin bypass.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 401 | Token/session không hợp lệ | JSON challenge, không chạy nghiệp vụ. |
| 403 | Sai vùng quyền như Admin→workspace | JSON forbidden. |
| 404 | ID không thuộc owner | Không tiết lộ existence/content khác chủ. |

## Trạng thái sau và bất biến

- Owned note theo UserId, active/trash; không tìm thấy trả404, không admin bypass.
- Legacy route không phải lối bỏ auth/ownership; xem bảng coverage controller trong danh mục.
- Core business dùng ICurrentUser/repository, không lấy owner từ payload.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `MIDDLEWARE JWT validation → authorization → controller/service`
- `LEGACY controllers → cùng service ownership`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-036-AC1:** Revoke/lock thay đổi quyền ở request tiếp theo.
- **FLOW-036-AC2:** Role lịch sử Admin+User không đọc workspace.
- **FLOW-036-AC3:** IDOR qua v1/legacy đều bị chặn.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs:38](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs#L38-L46)
- [ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs:47](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs#L47-L49)
- [ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs:50](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs#L50-L55)
- [ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs:69](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.API/Configuration/AuthConfiguration.cs#L69-L74)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:22](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L22-L26)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:51](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L51-L52)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
