# 04 — Dữ liệu NoteTatCa

> 2026-10-16 | DRAFT | Áp dụng: YES | CURRENT từ entity/DbContext/migration, chưa đối chiếu SQL đang chạy

## Entity và quan hệ

| Entity | PK | Quan hệ / ownership | Nguồn |
| --- | --- | --- | --- |
| ApplicationUser | Guid Id | Identity user; owner Note/Tag; tham chiếu UserInfo | Entities/ApplicationUser.cs |
| UserInfo | Guid Id | Id đồng thời liên kết user; hồ sơ cá nhân | Entities/UserInfo.cs |
| ApplicationRole và Identity phụ | Identity keys | UserRole, UserLogin, Claim, Token | DatabaseContext |
| Note | Guid Id | UserId → user; nhiều NoteTag và Reminder | Entities/Tasks/Note.cs |
| Tag | Guid Id | UserId → user; nhiều NoteTag | Entities/Tasks/Tag.cs |
| NoteTag | (NoteId, TagId) | N–N Note/Tag, xóa FK Restrict | DatabaseContext |
| Reminder | Guid Id | NoteId → Note → owner | Entities/Tasks/Reminder.cs |

DbContext cấu hình Note.UserId/Tag.UserId cascade khi xóa user. NoteTag dùng Restrict ở cả hai FK. Cần xem schema SQL thực tế và toàn bộ graph trước hard-delete user; không giả định cascade đủ xử lý mọi đường.

## Trường nghiệp vụ hiện có

| Entity.trường | Kiểu C# / ràng buộc đã thấy | Ý nghĩa / khoảng trống |
| --- | --- | --- |
| Note.Title | string nullable ở entity; MaxLength 150; DbContext IsRequired | Nullability không thống nhất DTO/DB |
| Note.Content | string, mặc định rỗng | Chưa có format/type hoặc giới hạn nghiệp vụ được chốt |
| Note.UserId | Guid FK | Owner server-side cần áp dụng mọi query |
| Note.IsPinned / PinnedAt | bool / DateTimeOffset? | Trạng thái ghim; thời gian server quản lý đề xuất |
| Note.Priority | int mặc định 1 | Chưa có enum/range/nghĩa được chốt, Q-016 |
| Note.BackgroundColor | string? | Cần whitelist/format thay nhận tùy ý |
| Note.SortOrder | double | Xếp trong nhóm ghim/không ghim; cần rebalance/concurrency |
| Tag.Name | string, required, max 50 | Quy tắc trùng tên theo owner chưa chốt |
| Reminder.ReminderAt | DateTimeOffset | Lần đầu; không có bằng chứng worker gửi đúng |
| Reminder.RepeatType | enum 0–4 | None, Daily, Weekly, Monthly, Yearly |
| Reminder.RepeatInterval | int mặc định 1 | Cần >0 và giới hạn hợp lý |
| Reminder.RepeatDays | WeekDays flags nullable | Monday=1 … Sunday=64; tuần cần ngày hợp lệ |
| Reminder.RepeatUntil / RepeatCount | DateTimeOffset? / int? | Service cấm hai điều kiện kết thúc đồng thời |
| Reminder.IsActive | bool mặc định true | Tách khỏi DeletedTime; query phải xét cả note |
| BaseEntity audit | CreatedTime, LastUpdatedTime, DeletedTime và người thao tác | Audit hiện dùng CoreHelper UTC+7 |
| UserInfo | GivenName max 25, FamilyName, Picture, Email, Locale max 10, Address, BirthDate, Gender | Dữ liệu cá nhân, chỉ thu trường cần dùng |

## Invariant đích đề xuất

1. Note, Tag và mọi quan hệ được kiểm tra cùng owner. Reminder chỉ thao tác nếu owner của Note trùng subject.
2. NoteTag unique theo composite PK; transaction xử lý gán/gỡ/xóa note/tag.
3. Soft delete giữ dữ liệu để restore; hard delete và purge phải có policy Q-006, không chỉ xóa record chính.
4. UTC storage và offset API, không cộng/trừ 7 giờ hai lần khi chuyển dữ liệu hiện tại.
5. Không sửa migration baseline đang được DB dùng nếu chưa đối chiếu `__EFMigrationsHistory` và backup (Q-010).

## Thay đổi schema có điều kiện

| Phạm vi nghiệp vụ | Đề xuất bổ sung, chưa tạo migration | Quyết định / phần còn cần chốt |
| --- | --- | --- |
| Unified editor có checklist | Canonical versioned document với checklist node; bảng ChecklistItem chỉ nếu có nhu cầu query độc lập | Q-020 đã chốt một editor; tránh hai nguồn chuẩn |
| Rich text/Markdown/màu/emoji | Document schema/renderer, plain search projection, Note.IconEmoji; Markdown export có cảnh báo | Q-020/021 đã chốt; chưa chọn thư viện/schema cụ thể |
| Archive | ArchivedAt hoặc trạng thái rõ với trash | Q-004, reminder lúc archive |
| Notification/job | Occurrence, delivery attempt/dedup/outbox, timezone | In-app/email/lặp, timezone user/catch-up 24h đã chốt |
| Autosave + Save | Version field portable, conflict response | Q-023 đã chốt; SQL rowversion không tự dùng nguyên trạng ở Postgres |
| Sharing/team/file | Không thêm schema bản đầu | Q-001/004 đã chọn riêng tư, chưa attachments |

## PostgreSQL đích và bảo toàn dữ liệu

Supabase PostgreSQL chỉ làm DB, giữ .NET Identity đã chốt Q-019. Đề xuất EF provider Npgsql và bộ migration phù hợp; Guid→uuid, timestamp UTC, rich document JSON/text theo schema chốt khi triển khai. Dữ liệu account/note/ID/hash cần giữ (Q-022), không reset hoặc tự biến Supabase auth.users thành nguồn user. [Supabase kết nối Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres), kiểm tra 2026-10-16; mapping chi tiết/dry run ở file 23.

Index đề xuất để đo: Note(UserId, DeletedTime, IsPinned, SortOrder, Id); Tag(UserId, DeletedTime, Name); Reminder(IsActive, ReminderAt) và truy vấn join owner. Chưa tạo/benchmark; SQL execution plan và selectivity quyết định index cuối.

Seed dùng tài khoản A/B và note giả, không admin password cố định. Chưa có quyền reset DB; backup/migration tại [22](22-backup-recovery.md)/[23](23-data-migration.md).
