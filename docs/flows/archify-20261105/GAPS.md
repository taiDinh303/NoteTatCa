# Chênh lệch, kế hoạch và giới hạn

## Cần đọc theo thứ tự mới nhất

| Chủ đề | CURRENT được đối chiếu | Cách đọc tài liệu cũ |
| --- | --- | --- |
| Chuẩn bị notes | Gate trang notes đầu và labels, dữ liệu phụ tải nền (FLOW-010) | Quy tắc cũ tải toàn bộ workspace trước khi vào không còn mô tả đúng runtime |
| Email nhắc | Có title/preview được HTML encode (FLOW-024) | Mô tả email chỉ-link trong docs cũ đã được yêu cầu bổ sung; xem [worklog ở commit](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/docs/worklog.md#L446) |
| UI note | Frame dùng lại, mặc định theo preference; View không tự tạo editor (FLOW-015) | Không lấy mô tả khung modal/Razor lịch sử làm hiện trạng |
| Archive/history | Source backend và UI đã có (FLOW-017/027/028) | Không suy source có sẵn thành schema/provider production đã rollout |
| Phiên | Access ngắn hạn, refresh sentinel lâu dài và vẫn revoke/stamp (FLOW-005) | Không dùng expiry cũ để kết luận phiên nhớ đăng nhập tự hết hạn |

## TARGET/PLANNED, chưa có luồng runtime hoàn chỉnh trong snapshot này

| Mục | Điều đã được ghi nhận | Điều chưa được khẳng định | Nguồn |
| --- | --- | --- | --- |
| Tự yêu cầu xóa account sau30ngày / Admin xóa ngay | DEC-027 và TASK-019 là quyết định kế hoạch | UserService.DeleteAsync hiện chặn permanent delete; chưa có account-purge/cancel workflow | [UserService](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_aspnet/NTC.Services/Service/UserService.cs#L99-L102), [kế hoạch](../../01-plan.md) |
| AI chat tạo/đọc note | DEC-030/REQ-013 | Mascot AI không phải chat agent đọc workspace; provider/scope chat chưa được xác nhận | [AI roadmap](../../32-ai-features.md) |
| Attachment, bảng, vẽ, comment, share/realtime | Roadmap nội dung/cộng tác | Chưa có luồng ghi/chia sẻ tương ứng được chứng minh bởi snapshot hiện hành | [Roadmap](../../ROADMAP-CONTENT-COLLABORATION.md) |
| Note links/backlinks/formula | TASK-033/037/039 | Không suy khả năng hyperlink HTML thành domain note-link có remap/permission/backlink | [Roadmap](../../ROADMAP-CONTENT-COLLABORATION.md) |
| Audit/backup retention và restore drill | Có runbook/định hướng vận hành | Chưa chốt các thông số giữ bản backup, anonymization và bằng chứng restore thật trong đợt này | [Runbook](../../21-operations-runbook.md), [backup](../../22-backup-recovery.md) |

Không tự biến chênh lệch thành thay đổi nghiệp vụ, migration hay triển khai. Các quyết định còn thiếu thuộc chủ dự án; tài liệu chỉ chỉ ra bước phụ thuộc.

## Giới hạn khảo sát

Bằng chứng mã theo commit; thay đổi local có sẵn ở mascotBodyFloor.ts/test, paper-preview.webp và worklog không được dùng để khẳng định hành vi của revision. Mọi dòng source trong candidate đã kiểm tồn tại và không vượt EOF. Không chạy ownerDB, gọi AI/mail thật hoặc truy cập nội dung note của người dùng. Một số trạng thái lỗi mạng/storage là điều kiện cần nghiệm thu, không phải kết quả production đã đo.
