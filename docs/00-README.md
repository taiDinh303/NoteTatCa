# NoteTatCa — Tài liệu dự án

> Cập nhật: 2026-10-16 (Asia/Bangkok) | Trạng thái: DRAFT | Áp dụng: YES

NoteTatCa là web app ghi chú. Bộ tài liệu này được cá nhân hóa từ `D:\My Project\docs_mau`, dựa trên khảo sát mã nguồn tại commit `d8f854b` và yêu cầu của chủ dự án. Đây là đặc tả làm việc để chốt nghiệp vụ trước khi hoàn thiện API và xây frontend React.

## Bắt đầu

1. Đọc [hồ sơ và câu hỏi lựa chọn](PROJECT-INTAKE.md).
2. Xem [kế hoạch](01-plan.md), [nghiệp vụ](02-business-analysis.md) và [luồng](05-workflow.md).
3. Khi làm API, đọc [contract](15-api-contract.md), [bảo mật](16-security-privacy.md), [dữ liệu](04-database-design.md) và [kiểm thử](06-testing.md).
4. Đọc [worklog](worklog.md) để biết việc đã làm và phần chưa chạy.

## Ràng buộc đã xác nhận

- Workspace: `D:\My Project\NTC`; Git repo hiện tại: `D:\My Project\NTC\NoteTatCa`.
- Bản soạn thảo docs đặt ở `D:\My Project\NTC\docs` theo yêu cầu. Để đồng bộ GitHub với Git root hiện tại, bản giống nội dung được lưu ở `D:\My Project\NTC\NoteTatCa\docs` (đường dẫn repo `docs/`). Khi sửa bản soạn thảo, cập nhật bản trong repo cùng lần commit để tránh lệch nhau.
- React + TypeScript + Vite đặt ở `NTC/frontend`; UI tiếng Anh, hướng public nhỏ. Đã xác nhận Q-008/025.
- Cloud tương lai: Supabase PostgreSQL, giữ .NET Identity; Render API, Vercel React. Giữ tài khoản/note cũ, chưa migrate/deploy trong phiên docs.
- Đã chốt editor unified rich text/checklist/Markdown shortcuts, màu chữ/emoji, autosave + Save, nhắc in-app/email có lặp và gửi bù 24h theo timezone user, trash 7 ngày; admin không đọc nội dung note người khác.
- Giữ nguyên `NoteTatCa/NTC.VIEW` tạm thời để tham khảo. Không xóa hoặc viết lại Razor trong nhiệm vụ tài liệu.
- Phiên này chỉ khảo sát và làm docs. Hoàn thiện API là nhiệm vụ tiếp theo khi người dùng giao.

## Cách đọc trạng thái

| Nhãn | Ý nghĩa |
| --- | --- |
| CURRENT | Quan sát từ source hoặc lệnh, không đồng nghĩa đã chạy đúng |
| TARGET | Điều cần đạt đã được người dùng xác nhận |
| PROPOSED | Khuyến nghị chưa được chốt; không dùng như yêu cầu đã duyệt |
| NOT VERIFIED / NOT RUN | Chưa kiểm chứng runtime / chưa chạy kiểm tra |
| YES / NO / UNDECIDED | Tài liệu có áp dụng, không áp dụng, hoặc chờ quyết định |

Tài liệu đang ở DRAFT; yêu cầu người dùng đã xác nhận vẫn có hiệu lực. Câu hỏi chưa trả lời phải giữ CHƯA XÁC ĐỊNH. Chủ dự án quyết định phạm vi; AI ghi nhận hiện trạng và đề xuất. ID REQ/RULE/WF/API/TC/TASK/ADR/ISSUE/Q được giữ ổn định.

## Danh mục

| File | Áp dụng | Nội dung / lý do |
| --- | --- | --- |
| [PROJECT-INTAKE](PROJECT-INTAKE.md) | YES | Hồ sơ, phạm vi, phỏng vấn và quyết định còn thiếu |
| [AGENTS](AGENTS.md) | YES | Hướng dẫn cập nhật docs |
| [AI-START-PROMPT](AI-START-PROMPT.md) | YES | Prompt bàn giao phiên tiếp theo |
| [00-README](00-README.md) | YES | Điểm vào và danh mục |
| [01-plan](01-plan.md) | YES | Quyết định, thứ tự và backlog API/React |
| [02-business-analysis](02-business-analysis.md) | YES | Yêu cầu và acceptance criteria |
| [03-architecture](03-architecture.md) | YES | .NET hiện tại, React dự kiến |
| [04-database-design](04-database-design.md) | YES | Identity, Note, Tag, NoteTag, Reminder |
| [05-workflow](05-workflow.md) | YES | Auth, ghi chú, thùng rác, nhắc lịch |
| [06-testing](06-testing.md) | YES | Kịch bản nghiệm thu và bằng chứng |
| [07-deploy-overview](07-deploy-overview.md) | YES | Supabase/Render/Vercel đã chọn; plan/region chưa chọn |
| [08-deploy-detail](08-deploy-detail.md) | YES | Runbook dự thảo, chưa thực thi |
| [09-ui-design](09-ui-design.md) | YES | Màn hình React và trạng thái UX |
| [10-setup-local](10-setup-local.md) | YES | Cách chuẩn bị API hiện tại |
| [11-setup-cloud](11-setup-cloud.md) | YES | Supabase DB/Render API/Vercel React đã chọn; plan/budget chưa rõ |
| [12-glossary](12-glossary.md) | YES | Thuật ngữ và quy ước |
| [13-figma-sync](13-figma-sync.md) | NO | Chưa có yêu cầu hoặc file Figma |
| [14-architecture-decisions](14-architecture-decisions.md) | YES | Quyết định đã chốt và đề xuất |
| [15-api-contract](15-api-contract.md) | YES | Inventory hiện tại, contract đích đề xuất |
| [16-security-privacy](16-security-privacy.md) | YES | Ownership, auth, dữ liệu ghi chú |
| [17-environment-config](17-environment-config.md) | YES | Tên cấu hình; không chứa secret |
| [18-release-checklist](18-release-checklist.md) | YES | Điều kiện nghiệm thu trước phát hành |
| [19-cicd](19-cicd.md) | YES | Đề xuất pipeline, chưa có workflow |
| [20-observability](20-observability.md) | YES | Logging và theo dõi API/job |
| [21-operations-runbook](21-operations-runbook.md) | YES | Sự cố auth, SQL, email, job |
| [22-backup-recovery](22-backup-recovery.md) | YES | Note là dữ liệu cần bảo vệ |
| [23-data-migration](23-data-migration.md) | YES | Lịch sử EF migration và chuyển frontend |
| [24-integrations](24-integrations.md) | YES | Google và SMTP đã có code |
| [25-performance-capacity](25-performance-capacity.md) | YES | Mục tiêu tải đề xuất và cách đo |
| [26-mobile-desktop](26-mobile-desktop.md) | NO | Chỉ web; responsive theo file 09 |
| [27-offline-realtime-jobs](27-offline-realtime-jobs.md) | YES | Reminder/catch-up/purge đã chốt; offline/realtime chưa chốt |
| [28-payments-commerce](28-payments-commerce.md) | NO | Chưa có yêu cầu trả phí/thương mại |
| [29-multitenancy](29-multitenancy.md) | NO | Không team/tenant; file vẫn ghi cách ly owner bắt buộc |
| [30-user-guide](30-user-guide.md) | YES | Hướng dẫn dự thảo, cần đối chiếu React sau này |
| [31-handover](31-handover.md) | YES | Bàn giao docs và việc tiếp theo |
| [32-ai-features](32-ai-features.md) | NO | Chưa có yêu cầu tính năng AI |
| [33-data-analytics](33-data-analytics.md) | YES | Thống kê admin đã chọn; không analytics nội dung/pipeline |
| [34-risks-changes](34-risks-changes.md) | YES | Rủi ro và quản lý thay đổi |
| [worklog](worklog.md) | YES | Snapshot, evidence và tồn đọng |

Ma trận này là nguồn chuẩn về phạm vi áp dụng; hồ sơ dẫn lại để tránh lệch trạng thái. NO chỉ có nghĩa ngoài phạm vi đang được giao, không phải quyết định cấm lâu dài.

## Nguồn chuẩn

- Yêu cầu/ràng buộc: lời chủ dự án trong cuộc trò chuyện; câu trả lời tại PROJECT-INTAKE.
- Hiện trạng implementation: source theo đường dẫn và commit trong worklog.
- Quy tắc sản phẩm: file 02; luồng: file 05; schema: file 04; API: file 15.
- Lệnh/kết quả thực tế: file 06 và worklog. Không suy ra PASS từ source.
- Giá/plan cloud, luật, vòng đời hỗ trợ và phiên bản thư viện tương lai: chưa khảo sát; cần nguồn hiện hành khi chọn thật.
