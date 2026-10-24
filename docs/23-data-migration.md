# 23 — Migration và bảo toàn dữ liệu

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

CURRENT source: SQL 20261017044024_CompleteNoteBackend additive sau baseline20260731153548 giữ nguyên; PostgreSQL20261017044034_InitialPostgreSql/context/history riêng schema `ntc`. SQL preflight dừng duplicate normalized email trước DDL, backfill Guid versions cho record cũ; không truncate/content parse. Script scripts/preflight-sqlserver.sql chỉ đọc. Export scripts ở artifacts; chạy tuần tự EF CLI theo10. LocalDB legacy preserve/stale-write/duplicate tests PASS; PG runtime/data transfer/DB của chủ dự án migration NOT RUN. Canonical rich metadata để null cho note cũ, Content cũ giữ plain nguyên trạng, không bắt chuyển thành document. Phần kế hoạch dưới vẫn dành cho rollout riêng có backup/dry run.

## CURRENT và đích

SQLServer có baseline `20260731153548_InitialCreate` và additive `20261017044024_CompleteNoteBackend`; snapshot cập nhật. Lịch sử Git trước cập nhật có các migration tên khác; chưa xem `__EFMigrationsHistory` của DB thật. Không coi baseline trong repo là schema mọi database đang dùng. TARGET tương lai: Supabase PostgreSQL, giữ .NET Identity, API Render; không thay Auth sang Supabase.

Chuyển React không bắt buộc chuyển DB cùng ngày. Chia đợt: ổn định contract/ownership → rich schema và migration additive → React → dry run Postgres → cutover cloud theo kế hoạch. Không reset DB hoặc sửa migration đã áp dụng để tiện phát triển.

## Mapping dự kiến

| Nguồn | Đích | Biến đổi / kiểm tra |
| --- | --- | --- |
| Guid keys/owner FK | PostgreSQL uuid | Giữ nguyên ID, không phát user ID mới |
| Identity users/roles/logins/claims/tokens | Identity EF schema trên Postgres | Giữ password hash và linkage; compatibility/collation/normalization test |
| Note.Content string | Giữ plain, DocumentJson=null, schemaVersion=1 | Không ép chuyển rich hoặc parse HTML; chỉ chuyển khi editor có thao tác rõ |
| Title/Tag.Name | varchar/text theo limit đã chốt | Null/empty/duplicate report trước unique/check mới |
| DateTimeOffset audit/reminder | timestamptz/UTC theo provider | Giữ instant; không cộng 7h lặp; timezone recurring lưu riêng |
| SortOrder double | double precision hoặc chiến lược rank đã duyệt | Giữ thứ tự; xử lý tie bằng Id; kiểm NaN/Infinity |
| NoteTag | Composite PK và FK | Giữ relation/owner, loại lỗi theo report có duyệt |
| DeletedTime | Trash cutoff giữ từ lúc xóa ban đầu | Không tự reset thời gian 30 ngày trong migrate |

Mapping C#→Postgres đã có model/DDL checks; Npgsql8.0.11/EF8.0.32, runtime round-trip vẫn cần CI/staging. Không dùng migration SQL Server nguyên trạng trên PostgreSQL.

## Kế hoạch thực thi khi được giao

1. Inventory schema/version/history/count, null/duplicate/orphan và dữ liệu nhạy cảm, chỉ xuất summary đã che.
2. Backup và restore drill nguồn; chốt downtime/cutover. Không sửa trực tiếp DB thật để thử schema.
3. Tạo bộ migration provider đúng, schema app không expose Data API; roles DDL/runtime riêng; xử lý Identity indexes/collation.
4. Dry run DB biệt lập; batch có checkpoint và upsert/ID ổn định; báo rejects thay âm thầm bỏ record.
5. Đối soát count theo owner/state, sample nội dung/hash có kiểm soát, FK, audit instant, login account cũ và Google link.
6. Freeze write nếu chọn cutover đơn; backup cuối → migrate delta → smoke → chuyển API connection và worker; không dual-write thiếu thiết kế.
7. Rollback xác định dữ liệu phát sinh sau cutover; không đơn giản chuyển URL về DB cũ và làm mất ghi mới.

Purge 30 ngày khi bật lần đầu: thống kê note cũ đủ cutoff và review tác động trước chạy. Không xem lựa chọn retention là cho phép xóa dữ liệu ngay trong phiên docs. TC-009 backend fixture PASS; TC-016/017 data-transfer/restore thật NOT RUN.

## Migration rà entities

SQLServer20261017122802 và PostgreSQL20261017122809_EnforceEntityIntegrity bổ sung owner/parent composite FK,CHECK,index,audit và delivery timestamps. Giữ baseline/additive trước đó. Backfill NoteTag.UserId từ owner note, chỉ khi tag cùng owner; dữ liệu sai preflight dừng, không tự xóa/merge/reassign.

Report scripts/preflight-entity-integrity-sqlserver.sql chạy trên clone sau CompleteNoteBackend; CHECK bất hợp lệ cần review trước rollout. LastAttemptAt/AbandonedAt cũ giữ null khi không biết mốc. Migration Down bỏ audit table/metadata nên có rủi ro mất lịch sử; không dùng như rollback dữ liệu không cần backup. Chi tiết [ENTITY-REVIEW](ENTITY-REVIEW.md).

## Migration account reactivation

20261017160312_SupportAccountReactivation (SQL) và20261017160333_SupportAccountReactivation (PostgreSQL) chỉ mở audit action constraint tới12. Export idempotent và LocalDB full-chain tests PASS; chưa apply DB thật. Down thu hẹp về11 sẽ thất bại nếu đã có action12; không tự xóa audit để rollback. Review clone/backup và chọn forward fix hoặc kế hoạch phục hồi có bảo toàn lịch sử. Các migration trước không sửa.
