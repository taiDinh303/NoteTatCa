# 15 — Contract API NoteTatCa

> 2026-10-16 | DRAFT | Áp dụng: YES | CURRENT từ controller/DTO; PROPOSED không phải API đã triển khai

## Quy ước hiện tại

Route controller là `api/[controller]`; ví dụ dưới dùng chữ thường theo cấu hình LowercaseUrls. Route thực tế chưa thử HTTP; không xem cấu hình này là bắt buộc mọi client chỉ nhận lowercase. Envelope BaseResponse có `data`, `message`, `statusCode`, `code`; paginated data có `items`, `totalItems`, `currentPage`, `totalPages`, `pageSize`, `hasPreviousPage`, `hasNextPage` theo serializer mặc định dự kiến.

Current auth API trả `token`, `expiredAt`, `userId`, `userName`, thông tin profile; chưa có refresh contract. APIController automatic validation có thể trả format khác middleware. POST create/update/restore hiện thường trả HTTP 200 và message/string hoặc DTO, cần chuẩn hóa trước React.

## Inventory source hiện tại

| ID nhóm | Method/path dưới /api | Input chính / response | Quyền hiện thấy / khoảng trống |
| --- | --- | --- | --- |
| API-001 | POST auth/login; auth/register | Login Username/Password/RememberMe; register Username/Email/Password/ConfirmPassword/ConfirmationCode | Public; login đích email phải chỉnh contract |
| API-002 | POST auth/google-login; auth/send-email-confirmation; auth/send-forgot-password-link; auth/verify-password | IdToken; email là JSON string ở hai route gửi mail; verify UserId/Password | Không Authorize ở controller; verify cần self scope |
| API-003 | GET note/get-all; note/get-trash; note/get-by-tag; note/get-by-reminder | pageNumber=1/pageSize=10; tagId query ở get-by-tag; envelope page | List service có lọc owner; controller Authorize bị comment |
| API-004 | GET note/get-by-id/{id}; POST note/create; PUT note/update | Create: userId,title,content,dueDate,isPinned,priority,backgroundColor,sortOrder; Update: id,title,content,isPinned,pinnedAt,priority,backgroundColor | Get/update thiếu owner; dueDate không thấy trên entity |
| API-005 | GET tag/get-all; tag/get-by-id/{id}; POST tag/create; PUT tag/update; DELETE tag/soft-delete/{id}; tag/delete/{id} | DTO Tag; phân trang default 10 | List/create lấy owner; get/update/soft-delete chưa đồng nhất |
| API-005 liên kết | POST notetag/add; DELETE notetag/remove; notetag/remove-tag-from-all-notes; notetag/remove-all-tags-from-note | noteId/tagId theo controller binding/query | Add kiểm owner; remove/bulk cần rà owner và SaveAsync |
| API-006 | PUT note/toggle-pin/{id}; note/reorder | Reorder: draggedId, previousId?, nextId? | Service có owner; toggle là hành động không idempotent |
| API-007 | DELETE note/soft-delete/{id}; note/restore/{id}; note/delete/{id} | id; trả message | Restore dùng DELETE hiện tại; service thiếu owner |
| API-008 | GET reminder/get-all; get-by-id/{id}; get-by-note/{noteId}; POST reminder/create; PUT reminder/update; DELETE reminder/soft-delete/{id}; delete/{id} | DTO recurrence; controller cần xem body binding cụ thể trước client | Authorize Admin,User; nhiều read/delete thiếu owner |
| API-009 | user/profile/userlogin routes | Danh sách dưới đây | Quyền cá nhân chưa đồng nhất; không đưa ra public ngay |

Nhóm user: GET `user/get-all`, `user/get-by-id/{id}`; POST `user/create`, `user/send-change-email`, `user/send-set-password-email/{userId}`, `user/set-password`, `user/change-password`; PUT `user/update`; DELETE `user/soft-delete/{id}`, `user/delete/{id}`; GET `user/confirm-change-email` nhận query userId/token/newEmail. `user/get-all` có Admin attribute; nhiều action khác cần kiểm lại self/admin/token proof.

Nhóm profile: GET `userinfo/get-all`, `get-by-id/{id}`; POST `create`; PUT `update`, `update-name`, `update-gender`, `update-birthday`. Nhóm external login: GET `userlogin/is-connected`, `get-all`; POST `connect`; DELETE `disconnect` với input userId/provider/providerKey cần ràng buộc danh tính thực.

Nhóm role hiện có: `role/get-all`, `get-by-id/{id}`, `create`, `update`, `soft-delete/{id}`, `delete/{id}` và `userrole/add-role`, `remove-role`, có Admin attribute. Quản trị được người dùng chốt chỉ là quản lý/khóa user và thống kê, không mặc định cho admin quyền đọc note.

## Contract đích PROPOSED

Chốt tên/version trước code để không buộc React dùng route legacy. Không tự đổi endpoint chỉ vì REST convention; có thể giữ adapter legacy cho Razor tạm thời nếu cần.

| Nhóm | Endpoint đề xuất / quyền | Schema/hành vi cần chốt |
| --- | --- | --- |
| API-001/002 | /api/v1/auth/... public theo action | Login email; register/OTP; Google idToken; reset; refresh/logout theo ADR-003 |
| API-003 | GET /api/v1/notes, owner | pageNumber≥1, pageSize 1–100 đề xuất; q/tagId/pinned/trash; stable tie-breaker Id |
| API-004 | POST /api/v1/notes; GET/PATCH /notes/{id}, owner | Không client UserId/PinnedAt/audit; type/content/schemaVersion/version theo Q-020 |
| API-005 | /api/v1/tags và /notes/{id}/tags/{tagId}, owner | Gán PUT idempotent; gỡ DELETE; same-owner, active; tag deletion giữ note |
| API-006 | PATCH /notes/{id}/pin; POST /notes/reorder, owner | Gửi trạng thái isPinned tuyệt đối; version/neighbor validation |
| API-007 | POST /notes/{id}/trash; POST /notes/{id}/restore; DELETE /notes/{id}, owner | Hard delete chỉ trash, retention 7 ngày; lỗi/state/retry rõ |
| API-008 | /notes/{id}/reminders; /reminders/{id}, owner | Note active, timezone/recurrence/kênh, server tính lần tiếp |
| API-009 | GET/PATCH /api/v1/me; account actions riêng | Không sửa user khác bằng body ID; re-auth cho thao tác nhạy cảm |
| API-010 | GET /api/v1/notifications; PATCH /notifications/{id}/read, owner | Pagination, readAt; không trả note người khác hoặc note đã mất quyền |
| API-011 | /api/v1/admin/users; /users/{id}/lock; /admin/statistics, admin | Metadata tài khoản cần thiết + tổng số; không title/content/search text/preview |

## API-004 — Tạo note: đặc tả đề xuất chi tiết

- Auth: đã đăng nhập, không bị khóa; owner từ subject. Transaction note + nhãn/item nếu tạo chung.
- Request dưới đây chỉ minh họa plain note, chưa là schema cuối của rich editor:

```json
{"title":"Ghi chú thử","content":"Nội dung giả lập","isPinned":false,"backgroundColor":"#FFF9C4"}
```

- Validate type/length/màu/rich structure theo Q-020/016; GUID empty không hợp lệ. Không nhận audit hoặc owner từ client.
- Response đề xuất HTTP 201, Location theo note ID, envelope và DTO có id/version/timestamps. Update trả representation thống nhất; version cũ trả 409/412 theo lựa chọn cuối.
- Error taxonomy PROPOSED: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 403 FORBIDDEN/ACCOUNT_LOCKED, 404 NOT_FOUND (khác owner), 409 CONFLICT, 429 RATE_LIMITED, 500 INTERNAL_SERVER_ERROR. Format validation fields và traceId cần thống nhất toàn API.
- Retry: không retry POST tạo mù; idempotency key scoped user + operation, lưu kết quả hoặc client đối soát ID. PATCH pin đặt giá trị thay toggle tránh đảo trạng thái khi retry.

## Reminder contract cần chốt

Current fields: noteId, reminderAt, repeatType (0–4), repeatInterval, repeatDays flags, repeatUntil, repeatCount. Target thêm timezone, channels, nextOccurrenceAt, version nếu cần; không hứa đã có. `repeatInterval>0`, thời gian hợp lệ, một điều kiện kết thúc; limit 5 hiện trong service chỉ CURRENT chưa policy được duyệt. Q-024 đã chốt timezone user mặc định Việt Nam, catch-up một lần trong 24h và bỏ cũ hơn; tháng thiếu ngày/ngày nhuận/nhiều occurrence cần acceptance trước scheduler.

## Đối chiếu và compatibility

Consumer CURRENT Razor; consumer TARGET React. Provider controller/service theo source; chưa có OpenAPI snapshot đã export hoặc contract test. Swagger configured `v1` chỉ là tên document, chưa phải URL API versioned. Rate limit/timeout/quota chưa có evidence; chọn khi triển khai. Mỗi đổi schema phải cập nhật DTO/OpenAPI, React types, TC tương ứng và ảnh hưởng Razor.
