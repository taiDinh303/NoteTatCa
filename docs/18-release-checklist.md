# 18 — Phát hành và nghiệm thu

> 2026-10-16 | DRAFT | Áp dụng: YES | Chưa có release candidate; không tick hạng mục chưa chạy

## Checklist API trước React/public

- [ ] REQ được chốt, DTO/OpenAPI/errors/validation thống nhất.
- [ ] Email/password + OTP + Google và recovery chạy với fixture đúng.
- [ ] User/anonymous/admin qua mọi test ownership, không có đường admin đọc nội dung note người khác.
- [ ] Editor document/checklist/màu/emoji round-trip; sanitizer và giới hạn payload được thử.
- [ ] Autosave version/conflict/idempotency đã kiểm; không mất bản nhập hoặc tạo trùng do timeout.
- [ ] Search và pagination ổn định, không chứa note người khác/trash ngoài filter.
- [ ] Trash đúng 7 ngày; restore/purge race; hard delete graph nguyên tử.
- [ ] Reminder in-app/email, lịch lặp, timezone và gửi bù 24h; restart/dedup/retry được thử.
- [ ] Khóa user ngừng truy cập kể cả đang có token; admin audit không chứa note.

## Checklist cloud

- [ ] Dữ liệu account/note cũ đã backup/dry-run/đối soát trước SQL→Postgres.
- [ ] Identity chỉ có một nguồn auth; login account cũ giữ đúng mapping.
- [ ] Render API/worker, Vercel React, Supabase DB đúng môi trường; config/secret/TLS/CORS/callback đúng.
- [ ] Không có secret trong bundle/docs/artifact; không có đường Data API vòng.
- [ ] Health/readiness, log redaction, cảnh báo job/email và backup/restore có evidence.
- [ ] SPA deep-link reload và React→API→DB smoke PASS; mobile/keyboard đã kiểm.
- [ ] Artifact rollback tương thích schema; người nhận và thời gian theo dõi rõ.

## Biên bản hiện tại

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Docs cá nhân hóa | Kiểm cuối tại worklog | Danh mục đủ và câu trả lời được ghi |
| API build/runtime/security | NOT RUN | Phiên docs |
| React/cloud/migration/restore | NOT RUN | Chưa triển khai |
| Go/No-go production | Chưa xét | Chủ dự án quyết định sau evidence |

Không hứa production-ready. Release phải có version/commit/operator/ngày/URL thật và ghi giới hạn được chấp nhận. Lỗi quyền, mất note hoặc purge sai là đề xuất điều kiện dừng ngay.
