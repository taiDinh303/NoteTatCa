# 25 — Hiệu năng và tải

> 2026-10-16 | DRAFT | Áp dụng: YES | Hướng public nhỏ đã chốt; số tải/SLO dưới đây PROPOSED

| Luồng | Dataset test giả lập đề xuất | Tải / mục tiêu | Đo |
| --- | --- | --- | --- |
| List/search note | 2 user x 1.000 note, thêm case user 10.000 note | 20 concurrent; p95 read <500ms | API latency/SQL plan; search tiếng Việt/Anh |
| Save/autosave | Rich document/checklist trong giới hạn payload | p95 write <800ms; không mất cập nhật | Version conflict/throughput/write amplification |
| Reminder | 1.000 occurrence tới hạn theo batch | Lag <1 phút mục tiêu ban đầu | Due→claimed→sent, retry/dedup |
| Trash purge | Nhiều note cũ và quan hệ | Không chặn request dài; batch có checkpoint | Lock time/rows/time và race restore |
| Frontend | Mobile+desktop và note dài | Không giật editor khi gõ, tránh tải toàn note list | Browser profiling và bundle khi có React |

Không phải benchmark, SLA hoặc bảo đảm cloud plan hiện có. Tải thật/ngân sách chưa rõ, chủ dự án duyệt sau đo. Không load test production trong nhiệm vụ tài liệu.

PROPOSED tối ưu sau đo: projection DTO, AsNoTracking cho read phù hợp, giới hạn pagination, stable ordering, tránh Include quá rộng/N+1, search text tách từ document rich, debounce autosave, index owner/state/rank. Chuyển Postgres cần kiểm query/collation/FTS, không bê SQL Server index một cách máy móc.

Cache note nếu dùng phải scope user + query + version, TTL/invalidate khi save/pin/tag/delete/lock; không cache dùng chung theo note ID mà bỏ quyền. Chưa cần Redis/CDN content riêng khi chưa đo điểm nghẽn.

Bảng benchmark hiện NOT RUN; artifact/commit/env/latency/error/pool/CPU sẽ ghi khi test. Plan Render uptime, Supabase connections và Vercel build/bandwidth phải kiểm theo tài khoản thật, không mặc định miễn phí đủ tải.
