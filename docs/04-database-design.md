# 04 — Thiết kế dữ liệu

> 2026-10-17 | CURRENT model/migration; database thật chưa thay đổi.

## Entity và invariant

| Entity | Dữ liệu / quan hệ chính |
| --- | --- |
| ApplicationUser / Identity | Guid ID, password hash, email normalized unique khi khác null, role/login/claim/token; IsLocked, TimeZoneId mặc định Asia/Ho_Chi_Minh |
| UserInfo | Hồ sơ theo user; không mở quyền đọc hồ sơ người khác |
| Note | UserId, Title required nhưng cho chuỗi rỗng ≤150, Content ≤100.000 ký tự khi lưu mới/sửa, DocumentJson ≤1 MiB, DocumentSchemaVersion=1, IconEmoji một grapheme, màu hex, pin/rank, audit UTC, Guid Version |
| Tag | UserId, Name required ≤50; **tên trùng được phép**, phân biệt bằng ID |
| NoteTag | Composite PK NoteId/TagId; UserId + composite FK ép cùng owner, tối đa20 nhãn/note |
| Reminder | NoteId, anchor ReminderAt, RepeatType/Interval/Days/Until/Count, timezone, NextOccurrenceAt, OccurrencesProcessed, IsActive, SendEmail, Version; tối đa5 lịch bật/note |
| Notification | Owner/note/reminder/occurrence/readAt; unique ReminderId + OccurrenceAt |
| ReminderDelivery | Occurrence, email lease/attempt/backoff/sent/abandoned; unique ReminderId + OccurrenceAt |
| AdministrativeAuditEvent | Actor/target/role IDs, action enum, occurredAt; append-only metadata, không note/email/token |
| RefreshSession | Hash opaque token, user/family/security stamp, expiry/revocation/replacement, concurrency version; không lưu token rõ |
| EmailChallenge | Normalized email key, OTP HMAC hash, expiry/attempt/lastsent/version; không lưu OTP rõ |

BaseEntity có audit và Guid Version. SaveChanges chuẩn hóa DateTimeOffset về UTC, server cấp audit/version; không cho đổi owner Note/Tag hoặc đổi parent Reminder. Version cũ trả409. Danh sách/gán tag lọc owner kể cả khi quan hệ legacy bị sai. Xóa nhãn chỉ gỡ liên kết, giữ note. Hard delete note xóa graph có transaction; FK phụ Restrict yêu cầu service xử lý đầy đủ.

Index hiện có: Note(owner,trash,pin,rank), unique owner/CreateRequestId khi key khác null; Tag(owner,trash); Reminder(active,next); notification/delivery occurrence unique; inbox owner/read/created; refresh token hash unique và user/family. Không có unique Tag.Name. Chưa benchmark execution plan; search hiện là Contains, độ nhạy hoa/dấu phụ thuộc collation/provider.

## Provider và migration

| Provider | Context / migration | Kiểm chứng |
| --- | --- | --- |
| SQL Server | DatabaseContext; lịch sử `20260731153548_InitialCreate` giữ nguyên; mới `20261017044024_CompleteNoteBackend` | Migrate dữ liệu giả cũ trên LocalDB, giữ hash/ID/content/instant, stale version và duplicate-email preflight |
| PostgreSQL | PostgreSqlDatabaseContext; `20261017044034_InitialPostgreSql`, schema và history `ntc` | Model/DDL/history checks PASS; runtime PostgreSQL chưa chạy local |

SQL migration thêm metadata/session/OTP/inbox/delivery; cấp NEWID cho Version trên các record cũ để v1 sửa được. Nếu trùng NormalizedEmail thì dừng trước DDL, không merge/xóa tài khoản. Không cắt ngắn background color hoặc nội dung cũ. Record cũ quá limit phải được báo cáo và xử lý khi sửa, không âm thầm truncate.

PostgreSQL: Guid→uuid, DateTimeOffset→timestamptz, BirthDate→timestamp without time zone; document giữ text JSON đã validate. Baseline không chuyển dữ liệu SQL Server. Không đưa schema `ntc` vào exposed schemas; quyền DB/RLS xem [16](16-security-privacy.md). SQLite UTC-ticks chỉ fixture test, không phải provider production.

Không chạy migration DB thật trong đợt code. Kiểm actual history/backup/duplicate/orphan/purge candidates bằng [runbook migration](23-data-migration.md), không mặc định DB thật khớp baseline repo.

## Rà soát entities tiếp theo

Đã củng cố17 entities theo [ENTITY-REVIEW](ENTITY-REVIEW.md). NoteTag thêm UserId với2 composite FK; Notification/ReminderDelivery cùng note owner và parent reminder; Note/Tag/Reminder có alternate principal key. UserInfo PK=FK user được khai báo tường minh, Title C# non-null/rỗng.

Thêm AdministrativeAuditEvent chỉ metadata, không nội dung note; application append-only, ghi cùng transaction và GET admin-only. Delivery thêm LastAttemptAt/AbandonedAt, không dựng lại timestamp không biết của lịch sử. IAuditableEntity áp dụng cả7 lớp Identity; bảo vệ creation metadata. CHECK/expiry indexes bảo vệ recurrence/auth/lease, không đặt unique Tag.Name.

Migration SQLServer20261017122802_EnforceEntityIntegrity; PostgreSQL20261017122809_EnforceEntityIntegrity. Hai migration trước giữ nguyên. Preflight/backfill và ranh giới legacy ở ENTITY-REVIEW; chưa apply DB thật.

## Account reactivation

Migration nối tiếp SQLServer20261017160312 / PostgreSQL20261017160333_SupportAccountReactivation mở CK_AdminAudit_Action tới12. Không thêm bảng hoặc thay nội dung note. Histories hiện4SQL/3PG, provider checks không pending model. AccountReactivated chỉ metadata; restore không xóa lock/verification hoặc phục hồi token. Xem [services/controllers](SERVICE-CONTROLLER-REVIEW.md).
