# FLOW-025 — Xem inbox, mở note và đánh dấu đã đọc

[Danh mục](../README.md) · [Sơ đồ Archify](25-inbox.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** Customer.
- **Kích hoạt:** /notifications hoặc mở thông báo.
- **Điều kiện trước:** Phiên workspace; notification và note liên quan đều thuộc self, note active.
- **Đầu vào:** unreadOnly, page; notificationId để MarkRead.
- **Truy vết nghiệp vụ:** WF-005.

## Luồng chính

1. **Đọc inbox self.** Owned kiểm UserId và note active cùng owner.
2. **Lọc và phân trang.** UnreadOnly tùy chọn; sắp occurrence/id giảm dần, DTO không chứa note body.
3. **Đánh dấu một mục.** ReadAt chỉ gán nếu chưa có; lưu chính chủ.
4. **Hoặc đọc tất cả.** Transaction xử lý batch500 đến khi không còn unread.
5. **Đếm lại / mở note.** Unread count vẫn dùng Owned; note GET tiếp tục enforce ownership.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| 404 | Notification khác chủ hoặc note đã Trash | Không đánh dấu hay lộ nội dung. |
| 401/403 | Phiên hết quyền hoặc Admin | Không tải inbox customer. |
| Mạng lỗi | Read chưa ACK | Hiển thị lỗi; không khẳng định server đã read. |

## Trạng thái sau và bất biến

- Unread count vẫn dùng Owned; note GET tiếp tục enforce ownership.
- Đưa note vào Trash làm notification liên quan mất khỏi inbox query.
- MarkRead không thay đổi nội dung note.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/{id}/read`
- `PATCH /notifications/read-all`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-025-AC1:** Read lại không thay timestamp lần đọc đầu.
- **FLOW-025-AC2:** Read-all chỉ tác động notification eligible của self.
- **FLOW-025-AC3:** Link không vượt quyền đọc note đích.

## Nguồn đối chiếu

- [ntc_aspnet/NTC.Services/Service/InboxService.cs:13](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L13-L17)
- [ntc_aspnet/NTC.Services/Service/InboxService.cs:19](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L19-L24)
- [ntc_aspnet/NTC.Services/Service/InboxService.cs:26](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L26-L27)
- [ntc_aspnet/NTC.Services/Service/InboxService.cs:29](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L29-L40)
- [ntc_aspnet/NTC.Services/Service/InboxService.cs:28](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/InboxService.cs#L28-L28)
- [ntc_aspnet/NTC.Services/Service/NoteService.cs:51](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/NoteService.cs#L51-L52)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
