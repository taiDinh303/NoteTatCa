# 23 — Migration và bảo toàn dữ liệu

> 2026-10-16 | DRAFT | Áp dụng: YES | Chủ dự án đã xác nhận giữ tài khoản và note hiện có

## CURRENT và đích

EF Core SQL Server hiện có migration `20260731153548_InitialCreate` và snapshot. Lịch sử Git trước cập nhật có các migration tên khác; chưa xem `__EFMigrationsHistory` của DB thật. Không coi baseline trong repo là schema mọi database đang dùng. TARGET tương lai: Supabase PostgreSQL, giữ .NET Identity, API Render; không thay Auth sang Supabase.

Chuyển React không bắt buộc chuyển DB cùng ngày. Chia đợt: ổn định contract/ownership → rich schema và migration additive → React → dry run Postgres → cutover cloud theo kế hoạch. Không reset DB hoặc sửa migration đã áp dụng để tiện phát triển.

## Mapping dự kiến

| Nguồn | Đích | Biến đổi / kiểm tra |
| --- | --- | --- |
| Guid keys/owner FK | PostgreSQL uuid | Giữ nguyên ID, không phát user ID mới |
| Identity users/roles/logins/claims/tokens | Identity EF schema trên Postgres | Giữ password hash và linkage; compatibility/collation/normalization test |
| Note.Content string | Canonical editor document schema version | Plain text cũ thành paragraph/text an toàn, không parse như HTML |
| Title/Tag.Name | varchar/text theo limit đã chốt | Null/empty/duplicate report trước unique/check mới |
| DateTimeOffset audit/reminder | timestamptz/UTC theo provider | Giữ instant; không cộng 7h lặp; timezone recurring lưu riêng |
| SortOrder double | double precision hoặc chiến lược rank đã duyệt | Giữ thứ tự; xử lý tie bằng Id; kiểm NaN/Infinity |
| NoteTag | Composite PK và FK | Giữ relation/owner, loại lỗi theo report có duyệt |
| DeletedTime | Trash cutoff giữ từ lúc xóa ban đầu | Không tự reset thời gian 7 ngày trong migrate |

Mapping C#→Postgres là đề xuất thiết kế, phải kiểm Npgsql/EF version và DDL generated khi thực hiện. Không dùng migration SQL Server nguyên trạng trên PostgreSQL.

## Kế hoạch thực thi khi được giao

1. Inventory schema/version/history/count, null/duplicate/orphan và dữ liệu nhạy cảm, chỉ xuất summary đã che.
2. Backup và restore drill nguồn; chốt downtime/cutover. Không sửa trực tiếp DB thật để thử schema.
3. Tạo bộ migration provider đúng, schema app không expose Data API; roles DDL/runtime riêng; xử lý Identity indexes/collation.
4. Dry run DB biệt lập; batch có checkpoint và upsert/ID ổn định; báo rejects thay âm thầm bỏ record.
5. Đối soát count theo owner/state, sample nội dung/hash có kiểm soát, FK, audit instant, login account cũ và Google link.
6. Freeze write nếu chọn cutover đơn; backup cuối → migrate delta → smoke → chuyển API connection và worker; không dual-write thiếu thiết kế.
7. Rollback xác định dữ liệu phát sinh sau cutover; không đơn giản chuyển URL về DB cũ và làm mất ghi mới.

Purge 7 ngày khi bật lần đầu: thống kê note cũ đủ cutoff và review tác động trước chạy. Không xem lựa chọn retention là cho phép xóa dữ liệu ngay trong phiên docs. TC-009/016/017, mọi run hiện NOT RUN.
