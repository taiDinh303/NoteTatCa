# 16 — Bảo mật và quyền riêng tư

> 2026-10-16 | DRAFT | Áp dụng: YES | Khảo sát source, chưa security test runtime

## Tài sản và trust boundary

Nội dung note, rich document, checklist, nhãn, lịch nhắc, thông báo, email/profile, password hash, Google link, JWT/refresh, DB/SMTP credentials. Browser là đầu vào không tin cậy; API .NET là nơi kiểm auth/owner/admin; DB Supabase tương lai không được mở đường vòng bỏ qua API. Admin không có quyền đọc nội dung note người khác, kể cả preview/search/export/log.

## Ma trận quyền TARGET

| Actor | Thao tác | Phạm vi | Kết quả |
| --- | --- | --- | --- |
| Khách | Đăng ký, OTP, login, Google, khôi phục mật khẩu | Theo proof và rate limit | Cho phép đúng action public |
| Khách | Note/tag/reminder/profile/admin | Không có | 401 |
| User | Note/tag/reminder/notification/profile | Chính mình, account không bị khóa | Cho phép, kiểm mọi reference |
| User A | ID/bulk/reorder/link tới dữ liệu B | Không có | 404 đề xuất, không tác động |
| User | Admin API | Không có | 403 |
| Admin | Quản lý/khóa user, thống kê tổng hợp | Metadata cần thiết | Cho phép, audit không nội dung |
| Admin | Đọc/sửa note user khác | Không có | Từ chối như user khác owner |
| Worker | Delivery/purge đúng policy | Query theo owner/note state/job scope | Privilege tối thiểu, audit riêng |

Ẩn menu không thay thế server policy. Quyền hệ thống ở DB/dashboard là ranh giới vận hành riêng: không hứa dữ liệu được mã hóa đầu cuối hoặc DB operator không thể đọc. Kiểm soát quyền vận hành và tránh sử dụng credential superuser cho app.

## Khoảng trống CURRENT phải xử lý trước public

| ID | Bằng chứng source | Rủi ro / yêu cầu |
| --- | --- | --- |
| SEC-001 | Authorize bị comment ở Note/Tag/NoteTag/UserInfo; Note detail/update/delete/restore thiếu owner | Áp dụng auth và owner đồng nhất; TC-003/011 |
| SEC-002 | Reminder list/detail/by-note/delete thiếu owner filter ở service | Rò lịch/nội dung qua quan hệ; lọc Note.UserId + parent state |
| SEC-003 | Remove/bulk NoteTag query theo ID chưa scope đầy đủ | Gỡ nhãn người khác; rà SaveAsync/transaction |
| SEC-004 | Google ValidateAsync không truyền audience settings rõ trong call; connect nhận providerKey từ client | Chốt audience, issuer, verified identity, linking proof; không tin email/providerKey đơn thuần |
| SEC-005 | OTP Random, cache theo email; chưa thấy rate limit/attempt cap | RNG mật mã, TTL/use-once, throttle, giới hạn thử; shared store nếu scale |
| SEC-006 | PasswordSignInAsync lockoutOnFailure=false, unique email=false | Khóa thất bại và email login đích cần policy/unique normalization |
| SEC-007 | Current JWT dài theo RememberMe, chưa refresh/revoke/logout server | Khóa user phải ngừng phiên, check account state; ADR-003 |
| SEC-008 | Google action catch trả ex.Message ở response | Không lộ lỗi nội bộ/token; log đã che và code ổn định |
| SEC-009 | Config local chứa bí mật, commit mới đã sanitize; lịch sử cũ chưa audit | Không chép vào docs; rà lịch sử và rotation trong nhiệm vụ bảo mật được giao |

## Kiểm soát đích đề xuất

- Giữ .NET Identity khi chuyển Supabase PostgreSQL (Q-019 đã chốt); unique email và auth/role quản lý server. Google email verification/subject/audience phải kiểm rõ.
- Xác định vòng đời token: access TTL ngắn, refresh rotation/revocation hoặc cơ chế phiên thay thế; logout/khóa user có hiệu lực theo policy được kiểm thử. Không chỉ tin role JWT cũ sau khóa.
- Input rich text cần schema/size/depth limit, sanitize render, whitelist marks/link scheme/color, emoji. Không render HTML tùy ý; chặn script, event handler, javascript URL/paste nguy hiểm. Metadata icon không nhận remote code.
- CORS chỉ origin đã cho phép; nếu refresh cookie phải xử lý CSRF/SameSite/Secure và third-party cookie trên domain Vercel/Render. Không đưa token vào URL.
- Rate limit auth/OTP/email/search, limit page/content và retry có kiểm soát. Không trả lỗi account-exists quá chi tiết ở recovery public.
- Logs không chứa Content/document, OTP, password, JWT, reset token, connection string hoặc email đầy đủ mặc định. Admin thống kê dùng aggregate không nội dung.

## Supabase và dữ liệu cá nhân

React gọi API Render; API kết nối DB bằng role riêng. PROPOSED dùng schema app không expose Data API hoặc tắt Data API khi không dùng. Nếu bảng nằm trong schema exposed, bật RLS và grants đúng cho mọi bảng; Identity JWT không tự trở thành Supabase `auth.uid()`. App DB credential có thể bypass RLS nên API ownership vẫn bắt buộc. [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), kiểm tra 2026-10-16.

Không đưa service/secret key hay DB password vào VITE_ env. App không cần Supabase Auth hoặc browser DB SDK theo quyết định hiện hành.

Trash retention đã chốt 7 ngày; backup retention và data export/account deletion chưa chốt Q-014. Purge ở app không tự xóa dữ liệu trong backup. Khu vực pháp lý/privacy notice chưa xác định; chưa có đánh giá pháp lý, không tuyên bố tuân thủ. Kiểm thử tại TC-003/011/012/018 và file 06.
