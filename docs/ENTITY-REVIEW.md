# Rà soát entities NoteTatCa — 2026-10-17

> CURRENT sau yêu cầu chủ dự án rà và bổ sung entities. Chỉ tạo source/migration; chưa thay đổi database thật.

## Kết luận và phạm vi

17 entities hiện bao phủ các chức năng đã chốt: Identity/hồ sơ, note rich/plain, nhãn, lịch nhắc, inbox, email delivery, OTP/refresh và nhật ký quản trị. Đợt này củng cố tính toàn vẹn, audit và các trạng thái lỗi; không coi số lượng bảng nhiều hơn là tiêu chí đầy đủ.

Giữ tài khoản/hash/ID/note cũ, note không tiêu đề, nhãn trùng tên, quota100.000 ký tự và admin không đọc nội dung note. Các tính năng sharing/archive/attachments chưa thuộc phạm vi; export/hard delete account, offline và retention audit còn quyết định riêng.

## Phát hiện và thay đổi

| ID | Thiếu sót trước rà soát | Thay đổi và ý nghĩa |
| --- | --- | --- |
| ENT-001 | NoteTag chỉ có hai ID; DB vẫn cho gán nhãn userB vào note userA khi bypass service | Thêm UserId, hai composite FK (NoteId,UserId)/(TagId,UserId); PK vẫn NoteId/TagId; Name không unique |
| ENT-002 | Notification/ReminderDelivery có thể trỏ đúng ID riêng lẻ nhưng sai owner hoặc sai parent reminder | FK (NoteId,UserId)→Note và (ReminderId,NoteId)→Reminder; navigation rõ; chặn cả import/direct SQL |
| ENT-003 | Identity có audit fields nhưng SaveChanges chỉ cập nhật BaseEntity | IAuditableEntity chung cho BaseEntity và7 lớp Identity; UTC/server clock, bảo toàn CreatedTime/CreatedBy khi update |
| ENT-004 | Chưa có lịch sử quản trị riêng, LastUpdatedBy chỉ giữ lần cuối | AdministrativeAuditEvent lưu actor/target/role IDs, action enum và thời điểm; ghi cùng transaction với khóa/tạo/deactivate/role changes; CLI grant admin có event actor null |
| ENT-005 | Delivery thiếu mốc thử/dừng; crash ở lần gửi cuối có thể tiếp tục retry | LastAttemptAt/AbandonedAt, mã nguyên nhân dừng, clear lease khi hủy; tối đa5 lần kể cả lease lần cuối hết hạn sau crash |
| ENT-006 | Giá trị enum/recurrence/session/lease chủ yếu dựa service | Check constraints cho lịch lặp/count/end/processed/days, OTP attempts/expiry, refresh expiry/replacement, lease pair, delivery completion, schema/idempotency metadata, gender/audit action |
| ENT-007 | Cleanup auth state chưa có index expiry riêng | Index RefreshSession.ExpiresAt và EmailChallenge.ExpiresAt cho batch prune |
| ENT-008 | Title C# nullable dù DB required; profile email/locale response chưa phản ánh entity đúng | Title non-null mặc định rỗng; UserInfo PK=FK user cấu hình tường minh; response profile email từ Identity đã xác minh, trả Locale; create profile validate gender/date và Kind portable |

## Entity và quan hệ

| Nhóm | Entity | Quy tắc |
| --- | --- | --- |
| Identity | ApplicationUser, ApplicationRole | Identity quản lý credential/role/concurrency stamp; có audit UTC; user có timezone/lock/soft delete |
| Identity liên kết | ApplicationUserRole, ApplicationUserLogin, ApplicationUserClaim, ApplicationRoleClaim, ApplicationUserToken | Giữ model/keys Identity; audit chung; UserManager/RoleManager là đường ghi chính |
| Profile | UserInfo | Id đồng thời PK/FK ApplicationUser, không tự phát ID; email legacy giữ để bảo toàn, không dùng làm email đăng nhập/authorization |
| Notes | Note,Tag,NoteTag | Owner FK và composite principal keys bảo vệ liên kết; Version Guid; nhãn trùng tên hợp lệ |
| Reminder | Reminder | Parent note bất biến; recurrence anchor/timezone/next/processed; max5 active/note ở service transaction |
| Inbox | Notification | Owner/note/reminder/occurrence bất biến; unique occurrence; ReadAt có thể cập nhật |
| Email | ReminderDelivery | Parent/owner/occurrence bất biến; lease/retry/sent/abandoned và timestamps; unique occurrence |
| Session | RefreshSession | Hash token, family, stamp và expiry tuyệt đối; không đổi owner/family/created/expiry sau tạo; ReplacedById là metadata chuỗi, không FK để cleanup không bị giữ bởi record hết hạn |
| OTP | EmailChallenge | Email normalized key/hash/attempt/TTL/version; index expiry |
| Audit | AdministrativeAuditEvent | Không note/title/content/email/token/free-text payload; chỉ append qua SaveChanges; không API sửa/xóa audit |

Composite FK cần principal key theo đúng thứ tự cột; các key phụ bổ sung index và tăng chi phí ghi, cần đo khi có tải thực tế. Model checks không tạo shadow FK. Thiết kế dựa [EF Core foreign/principal keys](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/foreign-and-principal-keys) và [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), kiểm2026-10-17.

## Ranh giới có chủ ý

Validation nội dung rich, emoji, timezone, giới hạn20nhãn/5lịch và quyền owner vẫn nằm ở service; CHECK không thay quyền API hoặc aggregate transaction. Không thu hẹp cột legacy unbounded để tránh truncate dữ liệu cũ. Không thêm global soft-delete query filter vì restore/purge/Identity cần truy cập trạng thái rõ. Admin không có bypass nội dung.

Audit append-only ở tầng ứng dụng, không chống người có quyền SQL quản trị sửa trực tiếp. DB runtime grants/operator retention cần review khi deploy. Chưa chốt retention audit nên chưa có job xóa audit; hard delete tài khoản vẫn chưa bật. RoleId audit không FK để lịch sử còn sau xóa custom role. Actor/target user FK Restrict cần xử lý theo policy khi bật account purge.

AbandonedAt/LastAttemptAt nullable cho delivery cũ vì không biết chính xác mốc lịch sử. SMTP vẫn at-least-once quanh external ACK; lưu metadata không biến email thành exactly-once. Xem [jobs](27-offline-realtime-jobs.md).

## Migration và dữ liệu cũ

| Provider | Migration mới |
| --- | --- |
| SQL Server |20261017122802_EnforceEntityIntegrity sau CompleteNoteBackend |
| PostgreSQL |20261017122809_EnforceEntityIntegrity sau InitialPostgreSql; schema ntc |

Không sửa migration trước. Preflight dừng khi quan hệ owner/parent hiện có sai, không tự xóa/merge/reassign. Với liên kết hợp lệ, backfill NoteTag.UserId từ note owner rồi thêm FK/check/index. Hash/account/note/nhãn/instant cũ giữ nguyên. Dữ liệu scalar không hợp lệ có thể làm CHECK fail và rollback migration; dùng report trước rollout.

PowerShell cwd repository root NTC: script `scripts/preflight-entity-integrity-sqlserver.sql` chỉ đọc counts, chạy trên bản clone được phép **sau** CompleteNoteBackend và **trước** migration mới. Export DDL bằng lệnh file10; không apply vào DB thật từ task code. Migration Down loại bảng audit và metadata mới nên không phải quy trình rollback dữ liệu an toàn; cần backup/export và operator review.

## API và bằng chứng

GET `/api/v1/admin/audit-events?pageNumber=1&pageSize=20&targetUserId=<guid>&action=<enum>`; Admin-only, phân trang1–100, action1–11 theo enum AdministrativeAction, filters tùy chọn. No-op khóa lại cùng trạng thái không tạo event/thu hồi phiên thêm. BootstrapCLI grant admin đã có role là no-op. [Inventory](api-inventory.md) có116 operations sau bổ sung endpoint.

Tests mới ở EntityIntegrityTests/EntityMigrationTests kiểm direct SQL/ORM, owner/parent FK, enum/check/lease/session, audit immutable/no-content/admin-only, Identity timestamp/canonical email, retry crash và migration preflight không mất dữ liệu. ProviderTests kiểm SQL legacy backfill giữ note/nhãn/hash/instant; PostgresTests đã bổ sung đường baseline→backfill nhưng runtime local vẫn SKIP. Kết quả cuối tại [06](06-testing.md) và [worklog](worklog.md).
