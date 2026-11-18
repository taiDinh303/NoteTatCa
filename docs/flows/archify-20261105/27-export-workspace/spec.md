# FLOW-027 — Xuất bản sao lưu workspace JSON

[Danh mục](../README.md) · [Sơ đồ Archify](27-export-workspace.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer.
- **Kích hoạt:** Privacy → Download workspace backup.
- **Điều kiện trước:** Đã xác thực; client chặn nếu còn pending edits chưa sync.
- **Đầu vào:** Không nhận owner từ request; server lấy UserId.
- **Truy vết nghiệp vụ:** DEC-027 / TASK-018.

## Luồng chính

1. **Kiểm pending.** UI yêu cầu sync trước khi download full archive.
2. **Đọc graph self.** Query labels active, mọi notes của owner, reminders và revisions.
3. **Dựng archive schema1.** Giữ rich JSON, metadata, label IDs, trạng thái Trash và revision history.
4. **Tải JSON.** Client tạo Blob và tên backup theo ngày; revoke object URL sau đó.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Pending edits | Local chưa đồng bộ | Không xuất bản thiếu pending như thể đầy đủ; dùng backup pending riêng nếu cần. |
| 401/403 | Guest/Admin/phiên không eligible | Không trả archive workspace. |
| Mạng hoặc download lỗi | GET/file tạo thất bại | Báo lỗi; dữ liệu server không đổi. |

## Trạng thái sau và bất biến

- Client tạo Blob và tên backup theo ngày; revoke object URL sau đó.
- Archive không chứa credential, auth session hoặc toàn bộ inbox đã gửi.
- Đây là logical export, không thay backup database và restore drill vận hành.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /workspace/archive`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-027-AC1:** Chỉ có notes/labels/revisions của owner.
- **FLOW-027-AC2:** Rich document giữ nguyên trong JSON.
- **FLOW-027-AC3:** Export không làm đổi version/nội dung note.

## Nguồn đối chiếu

- [ntc_react/src/features/settings/PrivacySettings.tsx:20](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PrivacySettings.tsx#L20-L24)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:17](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L17-L29)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:31](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L31-L49)
- [ntc_react/src/features/settings/PrivacySettings.tsx:24](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PrivacySettings.tsx#L24-L33)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
