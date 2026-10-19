# 15 — Contract API NoteTatCa

> 2026-10-17 | CURRENT từ controller/DTO/OpenAPI và integration tests. React client được triển khai tại ntc_react, xem FRONTEND-IMPLEMENTATION.

## Điểm vào và envelope

DEC-017 (2026-10-19): mọi endpoint thuộc Notes/Tags/Reminders/Notifications v1 và Note/Tag/NoteTag/Reminder legacy áp dụng policy CustomerWorkspace: authenticated non-Admin. Admin nhận403 kể cả có thêm role User và không thể dùng API tạo/đọc/sửa note cá nhân. Non-admin vẫn404 khi khác owner. `/me`, auth/session và `/admin/*` giữ self/admin policies riêng. Role được đọc từ DB mỗi request, không tin role JWT cũ. Không thay payload/route hoặc migrate dữ liệu để tách hai khu.

API v1: `/api/v1`. [Inventory](api-inventory.md) có **131 operations** v1 + legacy, body schema, query/header và quyền từ OpenAPI export. `/health/live` trả200 khi process sống; `/health/ready` trả200 nếu kết nối DB được,503 nếu không. Readiness chưa xác minh schema hay SMTP. Swagger bật Development/Testing hoặc `Swagger:Enabled`.

Success: `{"statusCode":200,"code":"SUCCESS","message":"...","data":{},"traceId":"..."}`. POST note trả201 và Location, kể cả replay cùng create key. Page có items,totalItems,currentPage,totalPages,pageSize,hasPreviousPage,hasNextPage. Query pageNumber≥1, pageSize1–100, note list mặc định20. JSON camelCase; enum số theo DTO; Guid string; thời gian ISO8601 UTC/offset.

| HTTP / code | Ý nghĩa / client |
| --- | --- |
| 400 VALIDATION_ERROR | Payload sai; có thể có errors theo trường; giữ bản nhập |
| 401 UNAUTHORIZED | Thiếu/hết phiên; refresh một lần có điều phối rồi đăng nhập lại nếu thất bại |
| 403 FORBIDDEN hoặc ACCOUNT_LOCKED | Thiếu quyền/tài khoản khóa theo action; không retry mù |
| 404 NOT_FOUND | Không tồn tại hoặc khác owner |
| 409 CONFLICT | Version cũ, payload create key khác, trạng thái/DB conflict; tải lại và cho user giải quyết |
| 429 RATE_LIMITED | Chờ Retry-After nếu có; không tăng tần suất retry |
| 500 INTERNAL_SERVER_ERROR | Lỗi nội bộ đã che; dùng traceId hỗ trợ |

Thông báo cụ thể có thể đổi; client dựa HTTP/code. X-Correlation-ID được trả và expose qua CORS. DB serialization/deadlock được chuyển conflict. Không trả exception/credential/body note trong log lỗi.

## Auth — API-001/002/009

POST auth/email-code `{email}` → register `{username,email,password,confirmPassword,confirmationCode}`. OTP 6 chữ số,10 phút, tối đa5 lần sai, resend tối thiểu60 giây; challenge DB hash và dùng một lần. `verify-email` `{email,code}` dành cho tài khoản chưa xác minh. Login `{email,password,rememberMe}`; v1 bắt buộc email. Google `{idToken}` phải đúng audience/subject/email verified; account email trùng chưa link trả conflict, user đăng nhập link có proof ở me.

Login/google/refresh trả AuthResponseModelView: `token` (access), `expiredAt`, `refreshToken`, `refreshExpiresAt`, user/profile,roles,timeZoneId. Access mặc định15 phút, cấu hình1–60; refresh opaque rotation, lifetime **tuyệt đối theo family**7 ngày hoặc30 ngày RememberMe. POST refresh `{refreshToken}` public nhưng token là proof; token cũ dùng lại thu hồi family. Logout (authenticated) `{refreshToken}`; revoke-all authenticated, không body. Mỗi access kiểm DB session/user/stamp và role hiện tại; lock/logout/password/role changes có hiệu lực với phiên cũ.

Recovery: forgot-password `{email}` thông báo chung; reset-password `{userId,token,newPassword}` có Identity proof; confirm-email-change qua GET với userId/token/newEmail. Reset token nhận dạng raw Identity hoặc Base64URL từ email link. Không log query token. Me profile/account/password/email/Google routes lấy user từ phiên, xem inventory. Hard delete tài khoản trả409 vì policy export/retention tài khoản chưa chốt.

API dùng bearer, chưa dùng refresh cookie; React dùng access memory + refresh sessionStorage theo tab, shared refresh flight; release vẫn cần đánh giá XSS trên môi trường thật. Không mặc định localStorage an toàn.

## Note/editor/autosave — API-003/004/006/007

GET notes hỗ trợ q,tagId,trash,pinned,hasReminder,pageNumber,pageSize. Chỉ dữ liệu owner, active mặc định; sort pinned/rank và tie-breaker ổn định. Search title + plain projection bằng Contains, chưa bảo đảm insensitive với tiếng Việt mọi provider.

POST notes nhận SaveNoteRequest, header `Idempotency-Key: <nonempty-guid>` khuyến nghị cho retry. Key scoped owner + payload fingerprint; cùng key/cùng payload trả cùng ID; khác payload409. Không tái dùng key cho note mới; key gắn với record, không phải kho idempotency vĩnh viễn sau hard delete.

```json
{"title":"","content":"Example note","isPinned":false,"backgroundColor":"#FFF9C4","iconEmoji":"📝","tagIds":[]}
```

PATCH notes/{id} nhận PatchNoteRequest và **version nonempty** từ lần GET/save gần nhất. Bỏ qua trường chưa gửi/null để giữ giá trị; chuỗi rỗng xóa title/icon/color; tagIds=[] gỡ hết. Version lỗi409; client không tự lấy version mới rồi ghi đè bản người khác. Pin gửi `{isPinned,version}` tuyệt đối. Reorder gửi draggedId,previousId?,nextId?,version; neighbor cùng owner/nhóm và kề nhau, server tính rank. Sau label/reorder/trash mutation cần GET version mới trước autosave tiếp.

```json
{"content":"Updated text","version":"11111111-1111-4111-8111-111111111111"}
```

Title ≤150, không bắt buộc; UI hiển thị Untitled. Plain/projection ≤100.000 ký tự .NET UTF-16; JSON UTF-8≤1MiB; ≤20 nhãn/note. Màu #RGB/#RRGGBB/#RRGGBBAA; icon một emoji grapheme≤32 UTF-16. Không có attachment upload.

Rich `documentJson` là **JSON string**, không object lồng trực tiếp; documentSchemaVersion response=1, server suy ra Content. Nodes: doc,paragraph,text,heading,bulletList,orderedList,listItem,taskList,taskItem,blockquote,codeBlock,hardBreak,horizontalRule. Marks: bold,italic,underline,strike,code,link,textStyle,highlight. Chỉ attrs đã allowlist: heading.level1–6, orderedList.start,taskItem.checked,codeBlock.language,textStyle/highlight.color,link.href http/https/mailto. Depth≤32,node≤20.000. Renderer phía React vẫn phải dùng schema an toàn, không dangerouslySetInnerHTML.

```json
{"title":"Rich example","documentJson":"{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hello\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#FF0000\"}}]}]}]}"}
```

Sửa content trên rich note mà không gửi document bị từ chối, trừ `convertToPlainText:true` xác nhận flatten; UI phải cảnh báo. Chưa triển khai Markdown import/export/shortcuts UI trong backend; conversion Markdown tương lai cần cảnh báo mất format.

Trash: POST notes/{id}/trash; restore trước cutoff7 ngày; DELETE notes/{id} chỉ trash. Note trash không sửa/nhắc; restore giữ note/nhãn còn hợp lệ và chỉ lịch tương lai. Tại đúng cutoff không còn restore; worker purge mặc định tắt đến khi review vận hành.

## Nhãn, lịch nhắc, inbox và admin — API-005/008/010/011

Nhãn trùng tên được phép, Name≤50; dùng ID để chọn. PUT/DELETE notes/{id}/tags/{tagId} an toàn theo owner; gán lặp không trùng composite. Xóa nhãn giữ note.

Reminder create dưới notes/{id}/reminders, đọc/sửa/xóa qua reminders. RepeatType0None/1Daily/2Weekly/3Monthly/4Yearly; WeekDays flags Monday1…Sunday64; interval1–365; repeatCount1–100000 tính cả anchor; count/until không đồng thời. Tạo lịch tương lai, max5 đang bật/note. TimeZoneId IANA mặc định user; SendEmail tùy chọn, inbox luôn có. Weekly anchor phải thuộc days. Tháng thiếu ngày dùng cuối tháng và giữ anchor; DST invalid chuyển tới phút hợp lệ đầu, ambiguous chọn instant sớm một lần. Worker chỉ gửi lần gần nhất trong24 giờ, bỏ cũ hơn. Xem [jobs](27-offline-realtime-jobs.md).

Notifications owner-only, page và read action; note trash/mất quyền không trả. Admin user list/detail/create/lock + statistics aggregate, không title/content/preview note khác owner; không tự khóa mình. Account action cần role/self/proof theo service, không chỉ dựa metadata Swagger.

## Legacy và cách tái tạo contract

Giữ route/payload cũ cho Razor, JSON-string email ở auth cũ, username login fallback legacy. Ngoại lệ bảo mật: JWT cũ không có sid phải đăng nhập lại; user CRUD quản trị cần Admin; profile self; connect Google nhận ID token proof thay raw providerKey; rich note không bị client plain cũ ghi đè. Legacy chưa có expected version vẫn chỉ tương thích tạm thời, không dùng cho autosave mới. `NTC.VIEW` chưa được chạy E2E với backend mới.

OpenAPI export được kiểm thử qua ContractTests; tạo inventory:

```powershell
$env:NTC_ARTIFACT_DIR = (Join-Path $PWD 'artifacts')
dotnet test ntc_aspnet/NTC.Tests/NTC.Tests.csproj -c Release --no-build --filter FullyQualifiedName~ContractTests
python scripts/update_api_inventory.py artifacts/openapi.json
```

Lệnh cwd repository root NTC. Regenerate trực tiếp vào root docs duy nhất. Inventory không thay thế [security](16-security-privacy.md) hoặc acceptance tại [testing](06-testing.md).

## Bổ sung sau rà entities

GET `/api/v1/admin/audit-events` chỉ Admin, pageNumber/pageSize(default1/20,max100), targetUserId? và action? (AdministrativeAction1–12). Trả page AdministrativeAuditResponse: id,actorUserId?,targetUserId?,roleId?,action,occurredAt. Không text note/email/token. Không API sửa/xóa audit; no-op lock cùng trạng thái không tạo thêm event. CLI grant admin đã có role là no-op.

GET me vẫn có data.account/data.profile; profile.email lấy ApplicationUser.Email đã xác minh, profile.locale được trả đúng. UserInfo.Email cũ chỉ lịch sử, không nguồn quyền/đăng nhập. Entity/migration và code action ở [ENTITY-REVIEW](ENTITY-REVIEW.md).

## Hoàn thiện services/controllers

PATCH `/api/v1/tags/{id}`, `/api/v1/reminders/{id}` và `/api/v1/me` yêu cầu `version` nonempty từ GET gần nhất; thiếu/empty400, cũ409. Trường chưa gửi giữ nguyên. Tag color/icon null để clear, name không null/rỗng. Profile familyName,picture,locale,address,birthDate null để clear; required givenName/timeZoneId/gender null400. Timezone edit thay cả profile version. Reminder optional repeatDays/count/until null để clear nếu cấu hình hợp lệ; required scalar null400. Toggle sendEmail không reset cursor/anchor; false hủy pending email, inbox giữ nguyên.

```json
{"version":"11111111-1111-4111-8111-111111111111","color":null}
```

GET me trả account/profile có typed schema; profile=null nếu dữ liệu cũ chưa có. POST me/profile nhận givenName,familyName?,birthDate?,gender(defaultRatherNotSay), trả201 + Location; userId luôn từ phiên. PATCH me/account chỉ phoneNumber (omission giữ,null clear,max32), không cho thay email/role/lock qua overpost. GET me/logins chỉ provider/displayName; legacy get-all trả loginProvider/providerDisplayName và không còn entity/provider key.

GET me/sessions page1/20,max100: chỉ active unexpired sessions của owner; items có id,createdAt,expiresAt,isCurrent. DELETE me/sessions/{sessionId} revoke toàn family của ID thuộc owner, gồm replacement sau rotation; other-owner404, không revoke family khác. ID cũ đã prune không còn dùng để revoke; refresh/list để lấy ID hiện tại. Revoke current session trả200, request tiếp401.

Admin thêm GET roles/{id}, GET/POST roles, PATCH/DELETE roles/{id}; GET users/{id}/roles, PUT/DELETE users/{id}/roles/{roleId}. Role create201 + Location, tên1–64 ASCII letters/digits/-/_, description≤500; PATCH description null clear DB (response vẫn rỗng theo DTO cũ). Built-in User/Admin không rename/delete, không tự remove role Admin. Grant/revoke target đổi stamp/revoke sessions.

GET admin/users có q≤200, includeDeactivated=false mặc định. POST users/{id}/deactivate và /restore dùng Admin; deactivate tự mình400. Restore giữ notes, trạng thái lock/verification, không hồi token cũ; đã active là no-op. Audit action12=AccountReactivated; migration mới mở constraint, không API sửa audit. Hard delete account vẫn409 vì policy chưa chốt.

GET notifications/unread-count trả int; PATCH notifications/read-all không body, trả số vừa đánh dấu. Chỉ notifications của owner có note active; lần lặp trả0. Legacy và v1 success envelope cùng traceId; OpenAPI success typed, errors schema ApiErrorResponse với errors nullable. Password mới8–1024; email đầu vào được trim/validate mailbox, không nhận display-name mailbox. Link email encode proof/query và HTML.

Source/evidence: [SERVICE-CONTROLLER-REVIEW](SERVICE-CONTROLLER-REVIEW.md). Các quy tắc null-clear ở đây không thay đổi Note PATCH đã mô tả phía trên.
