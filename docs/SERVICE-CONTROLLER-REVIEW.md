# Hoàn thiện services và controllers — 2026-10-17

> CURRENT: đã triển khai và kiểm thử sau yêu cầu hoàn thiện toàn bộ services/controllers. Backend local đã kiểm; cloud chưa chạy; React local có evidence riêng tại FRONTEND-IMPLEMENTATION.

## Phạm vi và phát hiện

Giữ private notes/Identity/owner/admin no-content, accounts/hash/notes và Razor/config local. Rà tất cả business interfaces, services, DI, legacy/v1 controllers và OpenAPI, không mặc định mỗi entity nội bộ phải có CRUD public. OTP/hash/session issuance/delivery worker/audit write chỉ ghi qua luồng nghiệp vụ phù hợp.

Các thiếu sót trước triển khai đã được khép: PATCH tag/reminder đang dùng DTO full-update; profile không clear được nullable fields và chưa version rõ; legacy success envelopes chưa traceId đồng nhất; phiên đăng nhập chưa có danh sách/thu hồi từng phiên; v1 chưa có đủ account/admin-role/deactivate/restore; password bounds/email normalization và HTML email cần thống nhất. Đã bỏ INotificationService dư thừa; auth/email và inbox có các interface triển khai riêng. DI của mọi business interface được kiểm qua test.

## Contract triển khai

- PATCH tag/reminder/profile v1 có expected Guid version; merge ở service trong transaction; field chưa gửi giữ nguyên, nullable field gửi null được clear, trường bắt buộc gửi null trả400. Legacy giữ DTO/routes và version optional để Razor tương thích. Profile timezone edit cũng thay profile version.
- Reminder chỉ reschedule/cancel khi trường lịch hoặc active thay đổi; toggle kênh email không tự reset lịch/processed. Tắt email hủy pending email, không xóa inbox. Count/until rõ cách clear null, validate các rule đã chốt.
- Me có profile/account typed response, nullable profile cho account cũ thiếu profile; tạo profile self; patch phone self; liệt kê active sessions không token/hash/stamp và thu hồi family theo owner. Giữ refresh/logout/revoke-all hiện có.
- Admin thêm đường v1 quản lý roles/memberships, deactivate/restore account và list có search/includeDeactivated. Restore không hồi sinh token cũ hoặc tự mở khóa/xác minh user; ghi audit action riêng, migration mới mở enum constraint, không sửa migration lịch sử.
- Inbox có unread count/mark-all-read theo owner + active note; không ảnh hưởng notification user khác/trash. Email template encode toàn bộ dữ liệu/link; password mới8–1024 phù hợp login, email chỉ mailbox chuẩn.
- Chuẩn hóa response/traceId, Swagger typed success/error/access cho v1 và legacy; giữ legacy HTTP/method/path/binding và envelope; ngoại lệ bảo mật: linked-login response chỉ trả provider/display name, bỏ raw entity/provider key/audit fields. Không cấp endpoint raw CRUD cho OTP, hash, delivery hoặc audit writes.

## Nghiệm thu

Regression HTTP A/B/admin/anonymous, PATCH preserve/null/409, reminder pending/processed, profile missing/create, session self/family revoke, role/admin lifecycle/audit, recovery/input/email encoding và toàn bộ route fallback authorization/DI. Release strict, publish, provider model/history/migration checks, docs sync và OpenAPI inventory thực tế. Không migrate DB thật, không gửi email thật hoặc deploy trong task code. PostgreSQL runtime, cloud và React E2E ghi rõ giới hạn.

## Source và hợp đồng đã hoàn thiện

Business services hiện có: Auth, User, UserInfo, UserLogin, Role, UserRole, Note, Tag, NoteTag, Reminder, Inbox, Session, Admin, BackgroundMaintenance. OTP/Google/email có adapters chuyên biệt. Entities OTP, refresh hash, delivery và audit không được mở raw CRUD; sử dụng qua luồng nghiệp vụ/worker. Tất cả interface business đều resolve từ DI trong fixture.

| Phần | Kết quả |
| --- | --- |
| Nhãn/profile/reminder PATCH | Presence tracking phân biệt omission/null; expected version bắt buộc v1; stale409; foreign404. Legacy version optional |
| Reminder | Toggle email giữ anchor/next/processed; email-off hủy pending delivery, giữ inbox; sửa lịch/active tính lại tương lai; guard5 active khi bật lại |
| Me | Profile nullable cho account cũ; self-create201, profile PATCH, phone PATCH chống overpost; linked-login DTO không raw keys |
| Sessions | GET me/sessions trả id,createdAt,expiresAt,isCurrent; DELETE me/sessions/{id} thu hồi family thuộc caller, kể cả ID cũ đã rotation còn lưu; không ảnh hưởng family khác |
| Admin | Search/includeDeactivated, deactivate/restore, role/membership CRUD v1; built-in role và self-admin được bảo vệ; account restore giữ note/lock/verification và vô hiệu token cũ |
| Inbox | GET unread-count, PATCH read-all trả số lượng; chỉ owner và active notes, repeat no-op trả0 |
| Email/input | Password mới8–1024, mailbox normalization; HTML encode text/link và query encode proof; SMTP timeout ghi EMAIL_TIMEOUT và retry có backoff |
| HTTP contract |131 controller operations, success schema rõ + error envelope/access metadata; legacy/v1 response có traceId từ request; health probes riêng |

Profile nullable fields có thể clear: familyName,picture,locale,address,birthDate. givenName,timeZoneId,gender không clear null. Tag color/icon clear null; name không null/rỗng. Reminder repeatDays/repeatUntil/repeatCount clear null khi cấu hình còn hợp lệ; reminderAt/timeZoneId/repeatType/repeatInterval/isActive/sendEmail không null. Role description clear DB null và response vẫn chuỗi rỗng theo DTO legacy. Note PATCH giữ contract riêng ở15, không suy null-clear của DTO khác sang note.

## Migration và bằng chứng cuối

- SQL Server:20261017160312_SupportAccountReactivation; PostgreSQL:20261017160333_SupportAccountReactivation. Chỉ mở CK_AdminAudit_Action từ1–11 sang1–12 cho AccountReactivated; các migration trước giữ nguyên. Không apply database thật.
- Release strict NTC.Backend.slnf:0 warnings,0 errors; publish API PASS.
- Full suite: **80 PASS,0 FAIL,1 SKIP,total81**;13 HTTP/service cases mới trong ServiceControllerTests. TRX `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_07_36.trx`. SQLLocalDB fixtures thật PASS, provider histories4SQL/3PG và no-pending-model PASS.
- PostgreSQL runtime SKIP vì chưa có server local. Export SQL idempotent hai provider PASS; chỉ generate script. Backup/restore và SQL→PG data transfer chưa thực hiện.
- Không chạy React/Razor browser, Google/SMTP thật, Docker, GitHub CI remote hoặc deploy. Giữ config local/Razor/source/migration lịch sử; không commit/push trong đợt này.

Đọc [API](15-api-contract.md), [inventory](api-inventory.md), [testing](06-testing.md), [worklog](worklog.md). Số test/migration/endpoint cũ ở entries lịch sử là bằng chứng theo thời điểm, không phải trạng thái hiện hành.

## Vị trí source/docs sau task cấu trúc

Git root hiện NTC; source/service/controller .NET vẫn ở NoteTatCa, docs duy nhất root docs. Lệnh mới chạy theo10 từ root. Regression sau chuyển root80PASS/1PGskip,total81; không thay code hoặc nghiệp vụ trong task này. Các phát biểu docs hai bản/sync trong evidence trước đã được thay bằng một nguồn duy nhất.
