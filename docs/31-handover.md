# 31 — Bàn giao và bảo trì

> 2026-10-16 | DRAFT | Áp dụng: YES

## Tài sản

| Tài sản | Vị trí | Trạng thái |
| --- | --- | --- |
| Docs soạn thảo | D:\My Project\NTC\docs | 39 file; nguồn chỉnh sửa trong workspace này |
| Docs trong repo | D:\My Project\NTC\NoteTatCa\docs | Bản đồng bộ GitHub, giữ giống bản soạn thảo |
| Backend repo | D:\My Project\NTC\NoteTatCa | main d8f854b ở mốc khảo sát; giữ config local khác commit |
| GitHub | https://github.com/taiDinh303/NoteTatCa | Code đã push phiên trước; docs được thêm theo yêu cầu push tiếp theo |
| Razor | NoteTatCa/NTC.VIEW | Giữ nguyên để tham khảo |
| React | NTC/frontend | Đã chọn hướng, chưa scaffold |
| Cloud | Supabase DB, Render API, Vercel React | Chưa cấp/tạo/deploy tài nguyên trong phiên |
| Secrets | Cấu hình local/server secret store khi triển khai | Không giá trị thật trong docs |

## Kiến thức chuyển giao

Đọc [hồ sơ](PROJECT-INTAKE.md), [plan](01-plan.md), [business](02-business-analysis.md), [API](15-api-contract.md), [security](16-security-privacy.md), [testing](06-testing.md) và snapshot [worklog](worklog.md). Setup local ở file 10; cloud/deploy/operations/backup ở 07–08, 11, 20–23.

Quyết định cần giữ: note riêng; admin không đọc nội dung; editor unified rich/checklist/Markdown shortcuts/màu/emoji; autosave+Save; reminder in-app/email, timezone user/catch-up 24h; trash 7 ngày; bảo toàn account/note; Identity giữ nguyên khi migrate PostgreSQL; UI tiếng Anh.

## Bàn giao phiên

Người nhận: chủ dự án. Nhiệm vụ tiếp theo dự kiến hoàn thiện API, chỉ bắt đầu khi được giao. Ưu tiên auth/ownership rồi contract/schema/editor/jobs, test và migration. Không xóa Razor. Git root mới NTC là kế hoạch cho giai đoạn React, chưa thực hiện; để push ngay, docs được sao chép vào repo dưới docs/. Khi cập nhật tài liệu trong workspace này phải đồng bộ cả hai bản.

API/build/DB/E2E/load/restore và cloud NOT RUN trong phiên tài liệu. Phiên bản package, license editor, chi phí cloud, thời hạn và người vận hành chưa chốt; cần khảo sát khi thực hiện. Không tuyên bố bàn giao sản phẩm chạy hoàn chỉnh chỉ từ docs.
