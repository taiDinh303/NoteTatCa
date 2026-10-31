## Trạng thái 2026-10-31

Checklist 2026-10-17 bên dưới là mốc lịch sử, không phải mô tả đầy đủ cloud hiện tại. Google/Brevo có evidence live trong worklog; không tự triển khai lại. Archive/history có code local và kiểm thử, schema mới chưa apply production. Chỉ xét phát hành sau provider migration trên DB riêng, đối soát round-trip và hồi quy offline/mobile. Kết quả lượt này xem worklog.

# 18 — Phát hành và nghiệm thu

> 2026-10-17 | Backend source gate đã qua; production gate chưa xét.

## Backend đã kiểm

- [x] Contract v1/legacy inventory, validation/envelope/traceId, quota đã chốt.
- [x] Email/password/OTP/Google proof/recovery với fixture giả; refresh rotation/revoke/lock.
- [x] HTTP anonymous/ownerA/B/admin, không admin bypass note content.
- [x] Rich document whitelist/projection/limits; PATCH/version409/create idempotency.
- [x] Nhãn trùng/owner/transaction, pin/reorder, search/filter/page, trash/hard delete.
- [x] Recurrence month/DST/catch-up, inbox/email retry fixture, restore future/purge cutoff.
- [x] SQLlegacy additive preserve và duplicate preflight, provider model/history checks.
- [x] Release strict build,80 PASS/1PostgreSQLskip,total81, publish API; root docs duy nhất,43Markdown/123links kiểm tra PASS.

## Cổng phát hành còn mở

- [ ] PostgreSQL runtime trong CI/staging, Docker build và GitHub workflow thật.
- [ ] Backup/restore drill và SQL→PG dry run giữ account/hash/note/ID/instant; đối soát owner/count.
- [ ] Google/SMTP thật, quota/deliverability, client callback/link/reset paths và keyring bền vững.
- [ ] Runtime DB role/grants/private schema `ntc`; không có Data API vòng; config/TLS/CORS/trusted proxy.
- [ ] Chọn uptime/plan/worker, review purge candidates trước bật BackgroundJobs.
- [ ] React auth/token/multi-tab, editor renderer/Markdown warning/XSS, autosave409 không mất nhập liệu.
- [ ] Browser→API→DB smoke haiuser/admin, deep links, mobile/keyboard.
- [ ] Log/alert/backup retention/operator, rollback artifact tương thích schema và xử lý ghi mới sau backup.

Mỗi release ghi commit/tag/operator/ngày/URL/backupID/migrationID và evidence. Chưa deploy hoặc xét Go/No-go trong đợt code. Lỗi truy cập chéo owner, mất note hoặc purge sai phải dừng rollout. [Worklog](worklog.md) không thay biên bản kiểm môi trường thật.
