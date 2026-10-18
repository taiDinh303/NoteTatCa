# 29 — Cách ly dữ liệu và tenant

> Cập nhật: 2026-10-17 | Áp dụng: NO | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

NO team/organization tenancy; owner isolation bắt buộc đã có service + HTTP tests. Schema ntc không phải tenant, roleAdmin không quyền đọc note. Không thêm companyId/team scopes từ Marixa.

Q-001 đã chốt nhiều user đăng ký, mỗi user chỉ xem note riêng. Chưa có tổ chức, workspace, thành viên, chia sẻ hoặc nhóm cùng sửa. Không thêm TenantId/membership/billing team vào schema bản đầu.

| Tài nguyên | Scope server | Admin | Test |
| --- | --- | --- | --- |
| Note/Tag | UserId từ subject, state phù hợp | Không được đọc nội dung user khác | TC-003/011 |
| NoteTag | Cả note và tag cùng owner | Không gỡ/gán chéo owner | TC-005 |
| Reminder | Note.UserId và parent state | Không đọc lịch riêng/nội dung note | TC-010/011 |
| Notification | UserId người nhận | Chỉ aggregate vận hành không nội dung | TC-003/011 |
| Search/cache/export/job | Bao gồm owner trong filter/key/proof | Không dùng chế độ admin bypass nội dung | TC-013/018 |

Ownership khác với multi-tenant tổ chức. Không tin ID từ client; mọi đường trực tiếp/gián tiếp/bulk và Data API tương lai phải kiểm quyền. Nếu mở chia sẻ sau này, cần spec permission, link expiry/revocation, membership và migration riêng; không lặng lẽ đổi RULE-001.
