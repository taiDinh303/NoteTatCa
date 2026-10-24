# 16 — Bảo mật và riêng tư

> 2026-10-17 | CURRENT controls có regression tests; chưa audit độc lập hoặc xác nhận cloud.

## Quyền dữ liệu

2026-10-24/DEC-025/026 thay phần memory-only/no-replay của DEC-019: snapshot active notes/labels và queue create/edit được persist riêng theo userId trong IndexedDB; metadata để mở offline không có access/refresh token. Storage credential hiện có không đổi. Chỉ unlock local khi có credential đã lưu còn hợp lệ của đúng account và snapshot hoàn chỉnh; không cấp token hoặc tin role cache để gửi ghi lên server. Revalidate server trước sync; auth400/401/403 kết thúc phiên local, giữ pending trong kho riêng để phục hồi khi đăng nhập lại đúng account. Service worker chỉ cache static shell/assets, không API. Logout có pending yêu cầu ở lại hoặc tải backup trước khi clear account cache. Browser storage không phải mã hóa đầu cuối/backup; không thể thu hồi dữ liệu đã tải hoặc revoke server ngay khi thiết bị offline. Chi tiết replay/version/multi-tab và giới hạn tại FRONTEND-IMPLEMENTATION/worklog; Admin vẫn không preload nội dung customer.

2026-10-20/DEC-019 (lịch sử, đã được cập nhật ở trên): preparation giữ memory riêng trong tab, reset/cancel khi logout/đổi account/nhóm quyền; health GET anonymous không mang cookie/token và retry hữu hạn. Giữ các guard trước ghi cache/detail và không coi outage là xác thực sai.

2026-10-19/DEC-017: tài khoản có Admin chỉ làm quản trị. Policy CustomerWorkspace chặn Admin trên toàn bộ workspace controller v1/legacy, bao gồm admin lịch sử có cả User. Không chỉ ẩn nút trong React; server trả403 trước thao tác dữ liệu. Self profile/security/sessions được giữ. Nội dung note/account cũ không bị xóa hoặc đổi owner; admin metadata/statistics/audit không có nội dung note. Frontend clear cache và bỏ response đang bay khi chuyển nhóm quyền cùng user.

Fallback authenticated toàn controller trừ các action AllowAnonymous auth/proof/health. Note/tag/reminder/notification là owner scope tại service; biết ID người khác trả404, không chỉ ẩn menu. Admin không có bypass nội dung note, chỉ metadata account/aggregate. Profile/account tự sửa; role quản trị hoặc proof token cho recovery. DTO không cấp quyền qua UserId client; SaveChanges chặn chuyển owner ở dữ liệu chính.

## Theo dõi phát hiện baseline 2026-10-16

| ID | Phát hiện cũ | Trạng thái source/test 2026-10-17 |
| --- | --- | --- |
| SEC-001 | Note/Tag/profile quyền không đồng nhất | FIXED: fallback + service owner/self, HTTP A/B/admin âm và legacy |
| SEC-002 | Reminder không scope parent | FIXED: join note owner/state mọi đường; test cross-owner |
| SEC-003 | NoteTag remove/bulk/Save thiếu | FIXED: owner2đầu, transaction/save, max20, label mutation bump note version |
| SEC-004 | Google audience/link proof | FIXED code: client audience/verified email/subject; link có token proof; tests fake adapter, Google thật NOT RUN |
| SEC-005 | OTP Random/cache/không cap | FIXED: RNG, HMAC DB hash,10min/5attempts/60sresend, auth rate limit |
| SEC-006 | Login không lockout/unique email | FIXED: Identity unique normalized email,5sai/5phút; migration dừng nếu duplicate |
| SEC-007 | JWT dài không revoke | FIXED: access ngắn, refresh rotation/reuse/session revocation, DB stamp/session/role check |
| SEC-008 | Response ex.Message | FIXED: envelope/traceId, internal error đã che |
| SEC-009 | Secret local/lịch sử cũ | Local config giữ nguyên ngoài đợt code; không audit toàn lịch sử hoặc rotate credential trong phiên |

FIXED ở đây là source + kiểm thử biệt lập, không chứng minh bản cloud đang chạy có cùng cấu hình. Ca kiểm thử tại [06](06-testing.md).

## Các lớp bảo vệ đã có

JWT HMAC SHA256, key≥32 bytes, issuer/audience/lifetime, skew30 giây. Every access kiểm DB active/verified/notlocked, session/security stamp và active role; user lock/revoke có hiệu lực ngay. Refresh chỉ DB hash, family rotation không hết hạn tự động theo DEC-022; refresh cũ còn hợp lệ được nâng policy khi đổi token; role/password/email change làm phiên cũ mất hiệu lực. Login sai chung; link Google account cùng email phải rõ proof. Recovery dùng Identity token; Data Protection keyring phải bền vững/giữ kín khi deploy nhiều instance/restart.

CORS allowlist origin cụ thể, không wildcard/AllowCredentials. API bearer chưa refresh cookie. Auth limiter20/IP/phút, global600/user hoặc IP/phút mặc định, fixed window in-process; không thay DDoS/distributed limit. Không trust X-Forwarded-For từ client; cần cấu hình proxy/network tin cậy sau khi biết Render topology, nếu không nhiều user có thể chung IP hạn mức.

Rich document allowlist node/mark/attrs/scheme, size/depth/count và màu/emoji; không execute HTML. React renderer/paste/Markdown vẫn cần E2E và XSS test. Không expose content/token/OTP/password/connection string qua response/log; API no-store,nosniff,route-template telemetry. Framework Hosting.Diagnostics ở mức dưới Warning bị tắt bằng filter vì log URL/query có thể chứa proof token; regression bật framework Information vẫn không lộ sentinel token. TLS termination do host, production origin/HTTPS/key storage cần kiểm thật.

## Supabase và dữ liệu cá nhân

PostgreSQL schema app `ntc`, không thêm vào exposed Data API schemas; không cung cấp DB/service secret cho VITE_. Supabase chỉ DB, .NET Identity JWT không tự map `auth.uid()`. Cấp runtime DB role tối thiểu, migration role riêng. Kiểm grants/default privileges theo account thật; nếu bật Data API phải có RLS/grant tests A/B/anon trước dùng. Không coi schema name tự thay thế quyền DB. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

Trash30 ngày không tự xóa backup. Account export/hard delete, backup retention và legal privacy notice còn Q-014/Q-009; hard delete account hiện409. Admin statistics không analytics nội dung. Purge/job mặc định tắt, cần review candidates/backup trước bật; không tự xử lý dữ liệu thật từ task code.

## Ràng buộc dữ liệu và nhật ký quản trị

Owner guard service được bổ sung composite FK bảo vệ NoteTag/Notification/Delivery ngay khi import/direct SQL. Parent occurrence và session identity không đổi sau tạo. Check constraints ngăn invalid recurrence/expiry/lease states. Không coi FK thay authorization.

AdministrativeAuditEvent không có trường note/title/email/token/free-text; chỉ IDs/action/time, đọc Admin-only, ghi chung transaction. SaveChanges từ chối sửa/xóa audit. Người có quyền SQL quản trị vẫn có thể thay đổi trực tiếp, nên runtime grants và retention cần review trước deploy. Audit không tự purge; khi mở hard delete account phải xử lý FK/retention đúng policy.

## Sessions, admin lifecycle và email

Session list chỉ trả metadata của caller; revoke family kiểm owner, ID cũ qua rotation còn lưu vẫn revoke được family hiện tại. Restore account không hồi token/verification/lock; audit action12 ghi chung transaction, không nội dung note. Me/account chỉ cho phoneNumber, overpost email/role/lock không thay quyền. Linked-login response không serialize raw Identity entity/provider key.

Password mới8–1024 trên register/admin-create/reset/change. Template HTML encode username/email/code/link; query link encode proof/mailbox trước HTML encode. SMTP timeout được retry với EMAIL_TIMEOUT và backoff; vẫn có at-least-once limit đã ghi, không hứa exactly-once. Phạm vi13 regression mới và giới hạn external provider ở [06](06-testing.md).
