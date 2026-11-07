# Ghi chú ẩn — hợp đồng triển khai 2026-11-07

## Đã chốt bởi chủ dự án

Khu vực riêng có khóa trên PC/mobile. Người dùng chọn PIN6số hoặc hình nối điểm3×3; quên khóa nhận mã email đã xác minh để đặt lại, giữ note. Chỉ mở online, không cache nội dung ẩn offline; khóa khi rời app hoặc5phút không thao tác. Đây là kiểm soát truy cập bổ sung, không mã hóa đầu cuối. Bản export/cache đã tải trước đó không thể thu hồi từ thiết bị offline.

## Phạm vi phiên bản phát hành

Khóa được kiểm phía server, hash theo Identity PasswordHasher, giới hạn sai theo account. Mã recovery riêng mục đích, hết hạn10phút, tối đa5lần thử, gửi lại tối thiểu60giây. Grant ngẫu nhiên chỉ ở RAM, gắn owner/session và thời hạn5phút; khóa/đổi/reset thu hồi grant. Không gửi khóa/token vào URL/log. Các path legacy/v1, lịch sử, note-tag/reminder/inbox phải chặn note ẩn khi chưa mở khóa. Export thường loại note ẩn; không giả làm backup vault.

Menu note có Hide; vault có Unhide. Desktop từ menu tài khoản, mobile thêm thao tác kéo xuống có nút truy cập thay thế cho bàn phím/screen reader. Khi mở, editor dùng QueryClient và writer riêng trong RAM; khóa xóa list/detail cache và DOM, hủy request đang chờ. Không ghi nội dung ẩn vào IndexedDB/localStorage/serviceworker. Bản nháp chưa ACK giữ riêng trong RAM theo account, chỉ mở lại sau xác thực vault; version cũ phải đi qua conflict, không ghi đè âm thầm. beforeunload cảnh báo và logout bị chặn đến khi lưu/bỏ draft, vì reload sẽ mất RAM. Dữ liệu thường chỉ chuyển sang vault sau xác nhận online, đã sync và bỏ bản cache của note; không tự bỏ outbox/draft.

Reminder note ẩn không lộ tiêu đề/nội dung qua inbox/email; không khẳng định thu hồi mail đã gửi. Note private/owner và admin no-content giữ nguyên. Schema additive riêngSQLServer/PG; review migration và phát hành schema/API trước giao diện.

## Nghiệm thu bắt buộc

Owner A/B/admin/anonymous; khóa sai/rate-limit/recovery replay/expire; grant sai session/account/reset/logout; GET/PATCH/history/labels/reminders/inbox/legacy/export khi khóa; không lộ cache sau hide/lock/reload/back/account switch; offline không mở vault;5phút/rời tab; PIN và pattern dùng touch/keyboard; mobile/desktop4ngôn ngữ. Test chỉ fixture/capturedmail, không DB/email thật. Kết quả thực tế và giới hạn cập nhật trong worklog; không suy ra production PASS từ fixture.

## Hợp đồng API

Tất cả dưới /api/v1/hidden-notes, CustomerWorkspace, Bearer .NET Identity. Header X-Note-Vault chỉ gửi từ vùng mở khóa, không gắn mặc định vào API workspace thường. Token256bit ngẫu nhiên, DB chỉ hash, gắn owner/session/credential version; hết hạn5phút không request, heartbeat chỉ duy trì khi UI có hoạt động. Khóa local ngay khi blur/hidden/pagehide/offline; nếu mất mạng không thể thu hồi grant server ngay, grant tự hết hạn tối đa5phút. Không cam kết xóa bản đã tải ở tab/thiết bị khác đang offline.

| Method/path | Kết quả |
| --- | --- |
| GET /status | Configured/kind/emailVerified, không trả hash hoặc token |
| POST /configure | Lần đầu cần email verified; đổi khóa cần grant hiện hành; {kind,secret}, kind pin/pattern |
| POST /unlock | {kind,secret} → {token,expiresAt}; đặt chỗ attempt bằng concurrency trước hash để chống đoán song song;5sai khóa15phút |
| POST /lock | Thu hồi grant hiện hành |
| POST /heartbeat | Xác nhận grant, không trả dữ liệu note |
| POST /reset-code | Mã email riêng purpose, bind user/email/security stamp,10phút/5attempt, cooldown60giây |
| POST /reset | {code,kind,secret}; code một lần, giữ note, đổi credential version để thu hồi mọi grant cũ |
| GET / | Phân trang pageNumber/pageSize/q/trash, chỉ note ẩn và chỉ khi có grant |
| POST / | SaveNoteRequest + Idempotency-Key Guid; tạo hidden ngay trong transaction tạo, không có giai đoạn note thường |
| PATCH /{id}/visibility | {version,hidden}; ownership và expected version; chặn hide khi có email delivery đang giữ lease |

Lỗi:400 input/secret/code,401 chưa xác thực chính,403 vault khóa/grant sai/Admin,404 note không thuộc owner hoặc đang khóa,409 expected version hoặc reservation concurrency,429 attempt/cooldown/rate limit; không trả hash/secret/nội dung trong lỗi.

Các endpoint notes/history/tag/reminder cũ dùng cùng global filter và ownership. List thường luôn IsHidden=false kể cả khi grant tồn tại; archive thường loại note ẩn và revision của nó. Editor vault dùng rich editor/autosave/Undo/history hiện hữu nhưng writer không qua offline store. Reminder control bị vô hiệu khi hidden; dispatch/delivery không đọc note hidden. Bỏ ẩn advance lịch sang tương lai. Trash vault riêng giữ quy tắc30ngày và worker purge graph không phụ thuộc grant. Admin chỉ có count tổng hợp (không nội dung/grant), kể cả note ẩn trong thống kê.

## Migration và trình tự phát hành

- SQL Server: 20261106223103_AddHiddenNoteVault; PostgreSQL: 20261106223452_AddHiddenNoteVault. Thêm Notes.IsHidden NOT NULL DEFAULT false và hai bảng NoteVault/NoteVaultGrant; CredentialVersion tách khỏi optimistic row Version. Không sửa migration cũ, không chuyển/xóa note/Identity cũ. SQL idempotent đã sinh trong artifacts/hidden-notes/{sqlserver,postgres}.sql, không chứa secret. Snapshot/model consistency được kiểm trong ProviderTests.
- Giữ PostgreSQL schema private ntc, không cấp quyền Data API. Trước apply cần recheck grants/schema exposure của đúng project và backup DB/Identity/keyring; không dùng auth.uid() vì vẫn dùng .NET Identity. Tham chiếu [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api); changelog/CLI v3 đã rà, đợt này dùng EF design-time factories theo lịch sử repo, không Supabase CLI hoặc Supabase Auth.
- Chủ dự án đã yêu cầu triển khai trong chat 07/11. PostgreSQL migration đã apply trên project ntc; snapshot20bảng trong ntc_release_backup_20261107, fingerprint dữ liệu cũ không đổi trong transaction. Snapshot cùng database, không thay full external backup hoặc restore drill/keyring. API20f721d đã live Render, health200, hidden routes401 khi anonymous và CORS X-Note-Vault PASS. UI phát hành sau API; remote/rollout cuối xem worklog. Old API không được chạy sau khi đã có note ẩn vì nó không lọc IsHidden.
- Sau khi feature đã được dùng, rollback UI có thể giữ API/schema mới; không Down migration hoặc rollback API sang code trước vault. Ưu tiên forward fix, nếu phải rollback cần kế hoạch riêng để không làm note ẩn xuất hiện ở danh sách thường.
- Bản archive JSON thường không backup vault. Backup/restore toàn DB và retention vận hành vẫn là phần cần nghiệm thu riêng. Native Android/iOS/WebKit và delivery email thật chưa được fixture chứng minh.
