# 18 — Phát hành và nghiệm thu

> CURRENT2026-11-10. Đây là checklist cho đợt kế tiếp, không phủ nhận các lần đã phát hành. [Hiện trạng](PROJECT-STATUS.md), [ưu tiên](CURRENT-PRIORITIES.md), [evidence lịch sử](worklog.md).

## Đã có evidence lịch sử

- [x] .NET8/Identity, owner isolation/admin no-content và routes legacy/v1 có HTTP regressions.
- [x] React đã phát hành; Vercel/Render/Supabase có rollout evidence. Google/Brevo đã có live evidence lịch sử.
- [x] CI PostgreSQL17/Docker/Release đã chạy ở các commit ghi worklog; không còn là hạng mục chưa từng chạy.
- [x] Archive/import JSON và NoteRevisions/MascotGeneration đã rollout02/11; vault additive migration/API/UI đã rollout07/11.
- [x] Vault policy15phút/tab/SPA, recovery route, lock/sign-out layout có focused/public-assets fixture evidence07/11.

## Gate cho thay đổi kế tiếp

- [ ] Contract/ownership và payload không lộ note của người khác; diagnostics chỉ metadata và lỗi chuẩn hóa.
- [ ] Focused HTTP/React/browser tests theo scope; strict Release build/lint/typecheck/build và docs links đạt ở đúng working tree. Ghi actual command/count/skip, không copy số cũ.
- [ ] Đối chiếu full frontend:10lỗi baseline ở mốc07/11 chưa có evidence fullsuite mới xanh; ghi rõ khi chỉ chạy focused tests. Không tăng timing budget/skip để làm xanh.
- [ ] Nếu có migration: additive provider histories, review scripts, test DB biệt lập. Schema thật/deploy là bước được giao riêng, không chạy từ code task.
- [ ] Backend compatible và healthy trước UI phụ thuộc endpoint mới. Không push UI console độc lập khi production API chưa có endpoint.
- [ ] Scope commit không kèm mascot/assets/config/local worklog ngoài việc đã giao; xác minh remote sau push, hosting và public smoke sau rollout.
- [ ] Không rollback API về trước vault khi đã có hidden data; dùng forward fix hoặc kế hoạch rollback tương thích được review.

## Nợ nghiệm thu/vận hành cần theo dõi

- [ ] Backup ngoài DB failure domain: toàn schema ứng dụng/Identity/vault/history, Data Protection keyring và khóa bảo vệ; restore drill biệt lập, đối soát và đo thời gian.
- [ ] Phương án free: chốt máy/lịch/nơi lưu/key recovery, retention14ngày và mục tiêu RPO24h/RTO4h; chưa là SLA. Không mua plan/PITR hoặc claim same-DB snapshot là full backup.
- [ ] Native Android/iOS/WebKit, PWA/service-worker, OS background và authenticated production owner flow. Published assets + synthetic API không thay các kiểm chứng này.
- [ ] Recovery vault tới mailbox thật, callback/client email cần nghiệm thu theo scope; không gửi mail thật từ test tự động.
- [ ] Worker heartbeat/lag/abandoned alert, operator/log retention; readiness không chứng minh worker/email khỏe.
- [ ] Hai advisor warnings cũ public.rls_auto_enable: audit trạng thái hiện hành trước xử lý grants; không sửa unrelated grants từ release console.
- [ ] SQL→PG data transfer chỉ khi chủ dự án còn cần dữ liệu SQL nguồn; backup/dry-run/cutover riêng, không là lý do deploy lại hệ thống.

Các ô chưa đánh không ngụ ý phải triển khai lại chức năng đã chạy. Lỗi ownership/mất dữ liệu/purge sai chặn phát hành phần liên quan. Ghi commit/operator/ngày/môi trường/backupID/migrationID và giới hạn; giữ secrets/nội dung thật ngoài docs.
