# Hiện trạng dự án — 2026-11-07

Đối chiếu source main 1b8ce84, working tree và evidence worklog; không phải kiểm toán production mới. Snapshot này thay các mô tả hiện trạng cũ tháng 10 trong README/intake/plan/backend/release/handover; giữ nguyên quyết định nghiệp vụ và lịch sử.

## CURRENT

- Repo hiện mở tại D:/My Projects/NoteTatCa; dùng đường dẫn tương đối từ Git root. Backend ntc_aspnet/ (.NET 8/Identity), frontend ntc_react/ (React/TypeScript/Vite), tài liệu duy nhất docs/. Razor đã gỡ, không tạo lại.
- Production đã có Vercel React, Render API và Supabase PostgreSQL theo deploy/project.json. Rollout schema NoteRevisions/MascotGeneration và backend/UI ngày 02/11 có evidence trong worklog; không còn trạng thái chờ merge/apply như đoạn lịch sử 01/11.
- Source có offline customer create/edit, auto/manual sync/conflict/logout protection, archive JSON export/import workspace và content revision/restore owner-bound. Archive không chứa credential hoặc backup toàn bộ hệ thống. Không khẳng định Markdown export đã có.
- Có bốn mẫu cấu trúc và mục lục H1–H3; giao diện bốn ngôn ngữ, guest mode, mobile Grid/List, double tap Edit, manifest standalone và emoji local với giới hạn render 96 rồi Show more.
- Admin riêng: account/role/lock/deactivate/restore/statistics/audit và gửi reset link; không được đọc nội dung note người khác. Xóa vĩnh viễn tài khoản chưa bật; announcement và console reminder errors chưa có.
- Grid desktop: fix hiện tại thống nhất geometry lúc load/resize/sidebar toggle, giữ card width/gap và lề phải. Hai Chromium regressions PASS ở 1910–1920 và fractional shell; React build/.NET strict Release PASS. Xem worklog cho publication/rollout, không suy ra website đã cập nhật từ build local.

## Còn lại

- Ưu tiên đã chọn: announcement trong app trước/email sau; console reminder delivery errors bước đầu chỉ đọc. Quy tắc recipient snapshot/thu hồi và thao tác retry cần chốt theo ADMIN-REVIEW-2026-11-04.md.
- Backup DB/Identity/keyring đầy đủ, restore drill biệt lập, retention audit/backup, RPO/RTO và alert worker; snapshot DPAPI trước migration không thay thế full restore drill.
- Account deletion 30 ngày/admin immediate deletion; mở rộng offline mutations/order; checklist/mẫu cá nhân và note links. Media/bảng/vẽ/sharing/comment/realtime/AI chat còn roadmap, không coi việc duyệt kế hoạch là đã code.
- Thiết bị Android/iOS/WebKit thật, native install/display và một số Google/email-client/deliverability flows chưa được nghiệm thu đầy đủ. CI cũ có PG thật/Docker và test PASS theo worklog; không dùng số test cũ làm kết quả của commit hôm nay.

## Cách tiếp tục

Đọc AGENTS.md, docs/00-README.md, PROJECT-INTAKE.md, 01-plan.md, BACKEND-IMPLEMENTATION.md, snapshot này và worklog mới nhất trước thay đổi. Trước hoàn tất ghi scope/kết quả/validation/limits/remaining; phân biệt local, commit, push và rollout. README sản phẩm không thay AGENTS.md. Giữ mọi config và working changes ngoài scope; không migrate/deploy DB từ code task.

## Bổ sung 2026-11-07: Back và vault

Mobile Back đóng note đã publish riêng commit68a8d1e; production verification xem worklog. Ghi chú ẩn DEC-032 đã được chủ dự án chốt và yêu cầu triển khai. PostgreSQL migration20261106223452 đã apply; snapshot20bảng cùngDB, dữ liệu cũ giữ nguyên trongtransaction,48notes/6users tại thời điểmapply. API20f721d live Render và smoke health/auth/CORS PASS. UI commitd694ee4 phát hành sau API và CI; kết quả remote/Vercel/public browser cuối xem worklog và HIDDEN-NOTES. Chưa nghiệm thu thiết bị thật/real email/full external restore drill.
