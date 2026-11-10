# Hiện trạng dự án — 2026-11-10

Đối chiếu local HEAD 18d8708, working tree và worklog đến 10/11. Đây là nguồn CURRENT thay các snapshot tháng 10/đầu tháng 11; không phải kiểm toán production mới. Thứ tự và phỏng vấn hiện hành ở [CURRENT-PRIORITIES](CURRENT-PRIORITIES.md).

## Đã có trong source và evidence phát hành

- Git root hiện tại D:/My Projects/NoteTatCa; backend ntc_aspnet/ (.NET 8/Identity), frontend ntc_react/ (React/TypeScript/Vite), tài liệu duy nhất docs/. Razor đã gỡ theo DEC-020, không tạo lại.
- Vercel React, Render API, Supabase PostgreSQL đã hoạt động theo evidence worklog. Archive JSON/import và content revisions/restore đã rollout02/11; không còn là nhánh chờ merge/apply. Giữ ownership; archive không phải backup DB/Identity/keyring.
- Auth/password/Google, session rotation/revocation, notes/labels/trash30ngày, reminders/inbox/email/jobs; admin riêng không đọc nội dung note. Google/Brevo có evidence live lịch sử, không coi toàn bộ integration chưa chạy.
- Offline customer xem/tạo/sửa note đã tải, outbox auto/manual sync/conflict/logout protection; mở rộng offline pin/order/label/trash còn roadmap. Reorder hiện ở RAM qua SPA, không hứa giữ qua reload trước ACK.
- JSON export/import workspace và revision restore owner-bound; editor có import/export Markdown với cảnh báo formatting có thể mất. Bản archive thường loại note ẩn, không backup vault.
- Bốn mẫu cấu trúc, mục lục H1–H3, bốn ngôn ngữ, guest, Grid/List, mobile editor/fullscreen/Back, zoom và manifest. Mẫu checklist/cá nhân và note links còn thiếu.
- Hidden notes đã có additive PG migration, API/UI phát hành07/11; PIN6/pattern3×3/reset email, private trash, RAM-only grant/cache/drafts. Policy mới nhất giữ unlock qua tab/SPA, khóa khi đóng/reload/pagehide/offline hoặc15phút idle. Lock controls tối giản, recovery route riêng, lock/sign-out đã được căn giữa. Không E2EE.
- Admin có accounts/roles/lock/deactivate/restore/statistics/audit/reset link. Permanent account deletion chưa bật. Console delivery TASK-046 đã hoàn thiện local ngày10/11 (HTTP/production-bundle browser regression), xem evidence worklog; không coi đã live. Announcement TASK-047 chưa triển khai.

## Đã xác nhận ưu tiên ngày 10/11

Docs/kiểm thử → console reminder deliveries chỉ đọc → announcement trong app → backup/restore miễn phí. Chụp recipient lúc gửi; user mới không nhận announcement cũ; thu hồi ẩn phía user và giữ lịch sử admin. Không có ngân sách dịch vụ trả phí; backup local dự kiến D:/backup, máy thường bật từ19:00. Chi tiết Q-039–044 tại [ưu tiên](CURRENT-PRIORITIES.md).

## Giới hạn còn mở

- Full frontend evidence07/11 có10lỗi baseline tái hiện ở bản trước vault; các lần focused sau không chứng minh fullsuite xanh. Ghi kết quả lệnh mới tại worklog, không dùng số test cũ cho commit hôm nay.
- Browser dùng published assets07/11 đã redirect API vào SQLite/captured-mail fixture và block service worker. Không chứng minh authenticated owner production, real vault mailbox delivery, native Android/iOS/WebKit/PWA hoặc OS background/process lifetime.
- Backup ngoài failure domain gồm DB/Identity/keyring, restore drill biệt lập, retention/RPO/RTO và cảnh báo vận hành chưa có bằng chứng hoàn tất. Snapshot20bảng cùngDB trước vault không thay backup độc lập. Hai advisor warnings cũ public.rls_auto_enable được ghi ở worklog, chưa kiểm lại hôm nay.
- Chủ dự án10/11 đã mô tả mobile Q-044: pull mở một hàng và đẩy note xuống, nút Back/điều hướng mobile. Đã hoàn thiện local và kiểm production-bundle Chromium320/393, giữ note Back/draft regressions; chưa native/published. Không tự thêm sidebar/nhãn riêng từ tên pending cũ.
- Account deletion30ngày/admin immediate deletion chờ thiết kế lifecycle/audit/backup. Admin invariant cuối cùng/concurrency và audit reset link cần rà thêm. Media/bảng/vẽ/sharing/comment/realtime/AI chat là roadmap.

## Cách tiếp tục

Đọc AGENTS và tài liệu đầu vào bắt buộc; dùng trang này cho CURRENT, CURRENT-PRIORITIES cho thứ tự/decision, worklog cho evidence. Không hỏi lại quyết định đã chốt. Giữ local config và working changes ngoài scope; không migrate/deploy DB từ code task. Trước hoàn tất ghi outcome/actual validation/remaining, phân biệt local/commit/push/rollout.
