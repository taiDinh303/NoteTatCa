# FLOW-028 — Nhập workspace JSON thành bản sao

[Danh mục](../README.md) · [Sơ đồ Archify](28-import-workspace.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer.
- **Kích hoạt:** Privacy → Import workspace backup.
- **Điều kiện trước:** Archive đúng format/schema1, file/request<=50MB; account hiện tại là đích.
- **Đầu vào:** Notes, labels, reminder, revision, references và timestamps trong archive.
- **Truy vết nghiệp vụ:** DEC-027 / TASK-018.

## Luồng chính

1. **Đọc JSON.** Client kiểm file size và JSON.parse trước POST.
2. **Validate toàn bộ.** Server validate trước transaction; không dùng owner trong file.
3. **Map ID mới.** Tạo labels/notes thuộc UserId; remap label references.
4. **Nhập lịch & history.** Reminder nhập inactive; revision gắn note mới; note Trash bắt đầu30ngày từ thời điểm nhập.
5. **Commit và làm mới.** Save transaction trả counts; client invalidate notes/labels.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 400/413 | Sai format/schema, quá size hoặc reference hỏng | Không nhập một phần. |
| Transaction lỗi | Lưu graph thất bại | Rollback toàn bộ lần import. |
| Mất ACK | Client không biết server đã nhập chưa | Không khẳng định retry idempotent; kiểm dữ liệu trước nhập lại. |

## Trạng thái sau và bất biến

- Save transaction trả counts; client invalidate notes/labels.
- Import tạo bản sao, không overwrite note có sẵn.
- Không tự bật nhắc/email từ file backup; import chưa có idempotency key riêng.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `POST /workspace/archive/import`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-028-AC1:** Tất cả ID đích mới và owner đúng.
- **FLOW-028-AC2:** Reminder được nhập tắt.
- **FLOW-028-AC3:** Archive không hợp lệ không tạo graph nửa chừng.

## Nguồn đối chiếu

- [ntc_react/src/features/settings/PrivacySettings.tsx:35](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PrivacySettings.tsx#L35-L41)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:53](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L53-L57)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:115](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L115-L158)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:59](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L59-L84)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:79](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L79-L108)
- [ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs:109](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/WorkspaceArchiveService.cs#L109-L112)
- [ntc_react/src/features/settings/PrivacySettings.tsx:42](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PrivacySettings.tsx#L42-L48)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
