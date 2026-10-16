# 27 — Offline, realtime và jobs

> 2026-10-16 | DRAFT | Áp dụng: YES cho jobs; offline/realtime chưa chốt Q-015

## Jobs bắt buộc theo nghiệp vụ đã chốt

| Job PROPOSED | Trigger / payload | Idempotency / concurrency | Retry / theo dõi |
| --- | --- | --- | --- |
| Reminder dispatcher | Due occurrence UTC + user timezone, reminderId, occurrenceAt | Unique occurrence; lease/transaction claim; không chỉ memory | Restart an toàn, due lag/attempt status |
| In-app notification | Một occurrence hợp lệ | Unique(user, occurrence, channel); readAt riêng | Không trùng inbox, không lộ note trash/khác owner |
| Email delivery | Outbox/delivery occurrence | Key occurrence+channel; checkpoint sau gửi, xử lý ACK mơ hồ | Backoff/jitter/max attempts; failure queue/manual review |
| Purge trash | cutoff nowUTC−7 ngày | Re-check DeletedTime và state trong transaction; batch/lease | Idempotent; skipped/restored/error counts |

Worker/scheduler đặt trên Render hay phương án khác chưa chọn implementation; một nơi chịu trách nhiệm. [Render workers](https://render.com/docs/background-workers), [Cron jobs](https://render.com/docs/cronjobs), kiểm tra 2026-10-16. Không dựa vào browser timer để gửi khi đóng tab.

## Timezone và catch-up TARGET

Mỗi user có timezone, mặc định `Asia/Ho_Chi_Minh`; lưu timezone IANA bên cạnh instant UTC. Khi hệ thống gián đoạn: gửi bù một lần cho lịch còn trong cửa sổ 24 giờ; bỏ các lần cũ hơn. PROPOSED nếu nhiều lần cùng lịch trong 24h chỉ gửi một bản gần nhất rồi tính next; Q-028 cần xác nhận khi viết scheduler vì lựa chọn vòng phỏng vấn chưa định nghĩa chi tiết nhiều occurrence.

Tháng thiếu ngày, ngày nhuận, DST, đổi timezone sau tạo lịch và giới hạn repeat count phải có rule/test cụ thể trước code, Q-027/016. Trash không gửi lịch; restore không tự replay toàn bộ lịch cũ là đề xuất Q-028. Giờ tài liệu Asia/Bangkok không mặc định thay timezone user.

## Offline/realtime

Chưa được giao sửa offline. PROPOSED bản đầu online, autosave có nút Save; giữ bản nhập trong phiên khi lỗi. Nếu lưu draft vào browser storage cần TTL, bảo vệ và xóa/cách ly khi logout/đổi user; không tự hứa sửa offline đồng bộ đầy đủ.

Inbox có thể polling trước; chưa chọn SignalR/Supabase Realtime. Giữ Identity nên không tự dùng Supabase realtime policies như đã có auth.uid. Nhiều tab autosave cần version/conflict dù chưa làm realtime collaborative editor.

## Tình huống phải thử

TC-009/010/015: crash sau gửi trước DB ACK; hai worker cùng claim; SMTP timeout; duplicate delivery; note restore đồng thời purge; account bị khóa; worker downtime >24h; timezone/DST/end-of-month; ACK save mất. Không cam kết exactly-once email khi provider không hỗ trợ idempotency; phải mô tả mức bảo đảm thực tế sau chọn provider.
