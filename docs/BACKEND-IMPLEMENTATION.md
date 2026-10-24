# Backend implementation contract — 2026-10-17

> Contract viết trước code theo yêu cầu2026-10-17; CURRENT backend đã triển khai, bằng chứng tại06/worklog. Frontend/cloud rollout ngoài đợt code.

## Nguồn tham khảo và lựa chọn

Đã đọc docs và architecture/source của `D:\My Project\marixa_aspnet_react`. Áp dụng cho NTC: tầng Core độc lập HTTP/EF, contracts không tham chiếu implementation repository; ICurrentUser/TimeProvider; BaseService/BaseApiController; cấu hình DB/auth/CORS/rate limit tập trung; envelope lỗi/validation có traceId; HTTP regression test bằng SQLite biệt lập và provider-model/migration checks. Không mang nghiệp vụ HR, ảnh public, company/attendance/payroll hoặc quyền staff đọc dữ liệu sang note riêng.

Giữ solution .NET 8/Identity, routes legacy và payload đang dùng ở Razor trong khả năng tương thích; bổ sung `/api/v1` cho React. Yêu cầu giữ NTC.VIEW ban đầu đã được thay bằng DEC-020 ngày 2026-10-21: gỡ project Razor khỏi repo/solution; giữ API legacy và dữ liệu. Git root đã được chuyển lên NTC trong task cấu trúc tiếp theo theo yêu cầu chủ dự án. SQL Server vẫn là mặc định local; PostgreSQL/Supabase là provider được bổ sung và có migration history riêng. Không tự apply migration vào DB của chủ dự án; phải giữ account/note cũ.

## Quyết định bổ sung đã xác nhận

| ID | Quyết định | Nguồn |
| --- | --- | --- |
| DEC-012 | Triển khai backend ngay sau khi cập nhật docs; chọn lọc phong cách .NET từ Marixa | Chủ dự án 2026-10-17 |
| DEC-013 | Note không cần tiêu đề; **cho phép nhãn trùng tên** cùng user | Phỏng vấn 2026-10-17, lựa chọn C |
| DEC-014 | Lịch tháng thiếu ngày dùng ngày cuối tháng; gửi bù một lần gần nhất mỗi lịch trong 24 giờ; restore chỉ tiếp tục lịch tương lai | Phỏng vấn 2026-10-17, lựa chọn A |
| DEC-015 | Title 150; tag name 50; plain text 100.000 ký tự; rich JSON ≤1 MiB; ≤20 nhãn/note; ≤5 active reminders/note | Phỏng vấn 2026-10-17, B tăng text lên 100.000 |

## Thiết kế triển khai

Thay đổi 2026-10-19/DEC-017: Admin là nhóm quản trị riêng. Policy `CustomerWorkspace` yêu cầu xác thực và không có Admin, gắn trên Notes/Tags/Reminders/Notifications v1 và Note/Tag/NoteTag/Reminder legacy. Admin+User cũ cũng bị403 trước model binding; private ownership non-admin vẫn404. AuthConfiguration kiểm role DB hiện tại nên JWT role cũ không vượt policy. Profile/account/sessions self và các API quản trị không bị policy workspace. Không migration hoặc sửa role/note live. Seed demo mới tạo admin chỉ role Admin và không note mẫu; rerun không tự loại role hoặc xóa note cũ của admin.

- Auth: Identity + JWT access ngắn hạn; refresh token opaque, chỉ lưu hash trong DB, rotation và phát hiện reuse; logout/revoke/đổi mật khẩu/khóa user làm phiên mất hiệu lực. Bearer API không tự phụ thuộc cross-site cookie. React đã có ở ntc_react; storage/token/tests xem FRONTEND-IMPLEMENTATION, không mặc định localStorage an toàn.
- Google: kiểm audience bằng client ID cấu hình, email verified và subject; đăng nhập qua link đã xác minh. Không tự nối account hiện có chỉ dựa vào trùng email; user đang đăng nhập phải link bằng Google ID token. OTP RNG mật mã, hash DB, hết hạn/attempt limit/use-once và throttle.
- Ownership: note/tag/reminder/notification/profile là self-scope, admin không bypass để đọc note. Anonymous 401, dữ liệu khác owner 404, thiếu role 403. Legacy user management chỉ admin ở action quản trị; profile/account action kiểm self hoặc proof token.
- Editor: document JSON có schema version, whitelist nodes/marks/attrs/URL, depth/size limit; server lấy plain projection để search. Không render HTML tùy ý. Emoji đại diện tối đa một grapheme; không upload file. String Content cũ vẫn là plain text. Legacy không được ghi đè rich document bằng plain payload thiếu cảnh báo.
- Autosave: version Guid portable là concurrency token; API v1 yêu cầu expected version khi sửa. Conflict trả 409, không âm thầm ghi đè. Create có idempotency key scoped user và payload fingerprint; pin đặt trạng thái tuyệt đối. Legacy tiếp tục có adapter, ghi rõ giới hạn.
- Note: title rỗng được lưu rỗng, UI hiện Untitled; không đặt dữ liệu giả vào title cũ. Nhãn trùng tên hợp lệ, phân biệt theo ID; chỉ composite NoteTag chống gán trùng. Ghim và reorder theo nhóm/owner, finite rank và transaction.
- Time: UTC instants, IANA timezone user mặc định Asia/Ho_Chi_Minh. Lịch tháng/năm tính theo ngày anchor, không drift sau tháng ngắn. DST thiếu giờ chuyển tới giờ hợp lệ, giờ lặp chọn một instant; đây là lựa chọn kỹ thuật ghi rõ trong test.
- Reminder/jobs: persisted occurrence/delivery + concurrency lease; inbox unique theo occurrence; email retry có backoff, body chỉ link/nhắc chung không nội dung note. Email có mức at-least-once nếu crash sau provider gửi trước ACK, không hứa exactly-once. Trash/khóa user ngừng nhắc; restore tính lần tương lai.
- Trash: purge khi DeletedTime ≤ nowUTC−30 ngày; transaction và recheck state; hard delete chỉ trash, xử lý graph note/tag links/reminder/delivery/notification. Chạy worker mặc định **tắt** đến khi review migration và vận hành, tránh tự purge dữ liệu cũ khi startup.
- Admin: danh sách/khóa user và aggregate statistics; không title/content/preview/search note khác owner. Khóa user phải có hiệu lực với token còn hạn; audit metadata tối thiểu.
- Vận hành: health/live + health/ready, request correlation, no-store API, log tên endpoint/status/latency không body/token. Docker Render, env example không secret, CI build/test; không tự deploy.

## Tiêu chí hoàn tất đợt backend

Build Release sạch; test auth/owner/admin/validation/editor/concurrency/idempotency/trash/recurrence/jobs và HTTP legacy/v1. Không chạy test/migrate với connection string local thật. Giữ nguyên migration lịch sử; generate/review migration SQL Server additive và PostgreSQL baseline; provider checks không thay thế live migration/restore. Docs tại root duy nhất, API inventory và actual evidence cập nhật. Production rollout/SQL→Postgres data transfer vẫn cần backup/dry run/cutover riêng.

Nguồn kỹ thuật kiểm 2026-10-17: [Microsoft Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-8.0), [Integration testing](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-8.0), [Npgsql EF8](https://www.npgsql.org/efcore/release-notes/8.0.html), [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Kết quả triển khai

Các thiết kế backend ở trên đã có source và regression tests: Release strict: 0 warnings/0 errors,67 PASS/1 SKIP PostgreSQL trong 68 tests, publishAPI PASS. SQLlegacy migration fixture bảo toàn hash/note/instant và cấpversion; PostgreSQL model/history/script PASS nhưng runtime chưa chạy. [Inventory116 operations](api-inventory.md). Docker/CI assets đã tạo, chưa chạy môi trường thật. Không thay NTC.VIEW/config local/DB của chủ dự án; worker default off. Chi tiết [06](06-testing.md), [worklog](worklog.md).

## Lượt rà entities tiếp theo

Theo yêu cầu chủ dự án đã bổ sung các ràng buộc/trường/nhật ký cần thiết ở [ENTITY-REVIEW](ENTITY-REVIEW.md). Scope vẫn note riêng/Identity/admin no-content và bảo toàn data; migration mới nối tiếp, không sửa lịch sử. Fullsuite67 PASS/1PGskip/68total và116APIoperations, không thay verification cloud.

## Lượt hoàn thiện services/controllers

Đã rà mọi business service/interface/DI và legacy/v1 controllers; triển khai PATCH/version/null, profile/account/session, admin roles/lifecycle/search, inbox bulk và email/input handling. [SERVICE-CONTROLLER-REVIEW](SERVICE-CONTROLLER-REVIEW.md) ghi contract, source và kết quả hiện hành:80PASS/0FAIL/1PGskip,total81; Release strict/publish/scriptSQL PASS,131operations. Các số67/68 và116 phía trên là mốc rà entities trước lượt này. Không commit/push/migrate DB thật/deploy.

## Chuyển cấu trúc theo yêu cầu tiếp theo

Git root hiện là NTC, backend vẫn ntc_aspnet, docs duy nhất NTC/docs. Root scripts/tool/CI/Docker/README/AGENTS cập nhật theo cấu trúc mới. Các phát biểu sync hai bản phía trên là bằng chứng lịch sử trước khi gom root; không áp dụng cho tác vụ mới. Không đổi nghiệp vụ hoặc local configuration trong đợt cấu trúc.
