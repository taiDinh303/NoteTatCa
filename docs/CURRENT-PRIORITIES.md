# Ưu tiên thực hiện và phỏng vấn — 2026-11-10

Nguồn hiện trạng: [PROJECT-STATUS](PROJECT-STATUS.md). Nguồn evidence theo từng commit/môi trường: [worklog](worklog.md). Chủ dự án yêu cầu chỉnh docs và hoàn thiện việc ưu tiên ngày 10/11; bảng này điều phối việc kế tiếp, không thay quyết định nghiệp vụ trước đây.

## Thứ tự đã được chủ dự án xác nhận

| Thứ tự | Phạm vi | Tiêu chí hoàn thành | Trạng thái |
| --- | --- | --- | --- |
| 1 | Docs hiện trạng và kiểm thử | Gỡ mô tả CURRENT sai; phân biệt lịch sử/local/published; ghi lỗi và giới hạn thực tế, không nâng ngân sách timing hoặc skip để báo xanh | Docs đã chuẩn hóa10/11, focused regressions/build/lint/unit có evidence mới; full frontend10lỗi baseline07/11 chưa xử lý trong đợt console/mobile, không claim fullsuite xanh |
| 2 — TASK-046 | Console reminder deliveries chỉ đọc | Admin-only; lọc owner/status/occurrence, phân trang; không note title/content/NoteId/raw provider error; không gửi lại/cancel hoặc thay worker | Hoàn thiện local10/11: HTTP8/8, E2E desktop/mobile trong production bundle18/18; chưa phát hành |
| 3 — TASK-047 | Announcement trong app | Soạn/xem trước/gửi, snapshot người nhận, chống trùng, đọc/unread/thu hồi, audit metadata; test ownership và concurrency | Quy tắc recipient/thu hồi đã chốt; cần code/migration/test riêng, chưa phát hành |
| 4 — TASK-020 | Backup/restore miễn phí | Bản backup ngoài DB chính gồm DB/Identity/keyring; restore vào DB biệt lập, đối soát và đo RPO/RTO | Chốt không có ngân sách; chưa có backup job hoặc restore evidence mới |
| Sau | TASK-019 và roadmap | Xóa tài khoản sau khi chính sách dữ liệu/audit/restore hoàn thiện; note links, templates, offline/media/cộng tác theo roadmap | Không bật hard delete hoặc mở tính năng roadmap trong đợt dọn docs |

Backup là rủi ro vận hành cần xử lý; không chờ xong roadmap mới làm. Chủ dự án đã giữ thứ tự trên, không phát sinh mua dịch vụ. Lỗi mất dữ liệu/ownership nếu phát hiện sẽ chặn phát hành tính năng liên quan.

## Phỏng vấn đã trả lời ngày 10/11

| ID | Câu hỏi | Quyết định |
| --- | --- | --- |
| Q-039 | Tập người nhận announcement và tài khoản mới? | Chụp lúc gửi: tất cả tài khoản User đang hoạt động hoặc chọn từng tài khoản đủ điều kiện. Tài khoản đăng ký sau không nhận thông báo cũ. Chủ dự án đồng ý toàn bộ đề xuất |
| Q-040 | Thu hồi announcement? | Ẩn phía user, giữ lịch sử admin. Không giả là xóa lịch sử hoặc thu hồi những gì người nhận đã đọc/chụp |
| Q-041 | Ngân sách backup? | Dùng free, không có kinh phí. Cho phép chọn phương án có lợi trong phạm vi miễn phí; không mua gói/nâng plan |
| Q-042 | Thứ tự? | Docs/test → console chỉ đọc → announcement → backup/restore; account deletion/roadmap để sau |
| Q-043 | Nơi lưu backup và máy chạy? | Chủ dự án chọn D:/backup; giờ bật máy không cố định nhưng thường từ19:00 (Asia/Bangkok). Đề xuất19:15 + catch-up khi máy bật; chưa tạo scheduler/chạy backup |
| Q-044 | Yêu cầu mobile cần bổ sung? | Kéo xuống đẩy danh sách note xuống nhẹ để dòng mở ghi chú ẩn chiếm một hàng như kéo rèm. Thêm nút Back trên các trang mobile và tránh Back lần đầu thoát app. Được giao trực tiếp trong phỏng vấn10/11; làm cùng đợt local này, không tự thêm sidebar/nhãn riêng |

RPO ≤24 giờ, RTO ≤4 giờ, daily/14 ngày là mục tiêu đề xuất được dùng để thiết kế theo câu trả lời Q-041, chưa phải SLA hoặc kết quả đạt được. Nơi lưu, lịch máy chạy, mã hóa/key recovery và người thực hiện cần được chốt trước backup thật. Không đưa key/secrets/dump vào Git.

## Contract TASK-046

`GET /api/v1/admin/reminder-deliveries` chỉ Admin (401 anonymous, 403 non-admin). Query: pageNumber≥1, pageSize1–100 (mặc định30), userId UUID, status=pending/retrying/leased/sent/abandoned, from/to ISO instant. Khoảng thời gian theo OccurrenceAt: from inclusive, to exclusive; from>to trả400. UI nhập thời gian local rồi gửi ISO UTC.

Status ưu tiên sent → abandoned → leased (LeaseUntil>now) → retrying (Attempts>0) → pending. Lease hết hạn được phân loại lại theo clock lúc đọc; không sửa DB. pending/retrying là delivery đã được tạo, không phải reminder tương lai chưa dispatch. Sent chỉ là sender/provider acceptance. Không suy ra worker khỏe hoặc email đã tới mailbox từ dữ liệu này.

Response envelope paginated gồm id, userId, status, attempts, occurrenceAt, nextAttemptAt, lastAttemptAt, sentAt, abandonedAt, leaseUntil, errorCode. Lỗi chỉ allowlist PARENT_UNAVAILABLE/RETRY_LIMIT_REACHED/EMAIL_TIMEOUT/EMAIL_SEND_FAILED; mã khác thành UNKNOWN_ERROR. Không trả NoteId/ReminderId, title/content, email, token, leaseId hoặc raw exception/provider response. Có metadata của note ẩn nhưng không quyền đọc note. Không có retry/cancel endpoint hoặc migration.

## Contract nền TASK-047

- Bản đầu trong app, chưa gửi email; nội dung text được render an toàn. Announcement/recipient tách khỏi Notification có FK note/reminder, không tạo note giả. Admin có draft, preview và số người nhận trước gửi.
- User đang active, không locked/deactivated, có role User và không role Admin mới đủ điều kiện. Snapshot recipient trong transaction khi publish; chọn ID không hợp lệ phải báo rõ, không âm thầm đổi tập người nhận. Không tự thêm user mới sau publish.
- Gửi một lần với request idempotency và concurrency; retry/mất ACK không tạo hai announcement hoặc duplicate receipt. Published content không sửa âm thầm; sửa bằng bản mới/thu hồi theo UI.
- Thu hồi ẩn announcement khỏi list/detail/unread user ngay khi server xử lý request; giữ admin metadata/history. Phân trang/đánh dấu đọc/read-all của inbox giữ owner isolation; announcement không có Open note.
- Additive migrations SQL Server/PostgreSQL; test migration/owner/admin/concurrency trên fixture. Schema review/apply/rollout là bước riêng, không chạm production từ code task.

Chi tiết kỹ thuật ở mục TASK-047 là thiết kế triển khai trong phạm vi đã chốt; chỉ Q-039/Q-040 được xác nhận trực tiếp. Trước code cần kiểm hợp đồng quota/validation và luồng inbox đầy đủ; không coi đọc docs là feature đã hoàn thành.

## Câu hỏi còn mở theo phụ thuộc

- Backup: máy/nơi lưu đã chốt Q-043. D:/backup vẫn cùng máy, cần nơi sao chép độc lập và cách giữ khóa phục hồi trước khi gọi là backup ngoài failure domain. Chưa chốt mã hóa/key recovery và vị trí keyring Production; không tự thu thập credential hoặc chạy dump thật từ code task.
- Q-030: giữ audit bao lâu và anonymize sau xóa account; chặn TASK-019/hard delete, không chặn console chỉ đọc.
- Chủ dự án mô tả lại nhu cầu mobile ở Q-044; chưa giao mở rộng sidebar/nhãn riêng trong câu trả lời này. Không tự coi tên pending cũ là contract đủ để triển khai.
- AI Q-031–035 và media/sharing/storage chỉ phỏng vấn khi bắt đầu từng giai đoạn; không mở thêm ngân sách hoặc quyền đọc note từ roadmap.
