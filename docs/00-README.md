# NoteTatCa — Tài liệu dự án

> Chuẩn cấu hình hiện hành: [CONFIGURATION-STANDARD](CONFIGURATION-STANDARD.md) — JSON Production sạch, sáu biến triển khai cơ bản, kiểm cấu hình không chạm DB và script chung cho NTC/Marixa.

> Cập nhật: 2026-10-18 (Asia/Bangkok) | Trạng thái: DRAFT | Áp dụng: YES

NoteTatCa là web app ghi chú. Bộ tài liệu này được cá nhân hóa từ `D:\My Project\docs_mau`, dựa trên khảo sát mã nguồn tại commit `d8f854b` và yêu cầu của chủ dự án. Bộ docs đã cập nhật theo Marixa và backend 2026-10-17; React triển khai 2026-10-18, cloud còn giai đoạn sau. Source mới ở working tree trên HEAD 176a968, không dùng khảo sát d8f854b làm hiện trạng mới.

## Bắt đầu

1. Đọc [hồ sơ và câu hỏi lựa chọn](PROJECT-INTAKE.md).
2. Xem [kế hoạch](01-plan.md), [nghiệp vụ](02-business-analysis.md) và [luồng](05-workflow.md).
3. Khi làm API, đọc [contract](15-api-contract.md), [bảo mật](16-security-privacy.md), [dữ liệu](04-database-design.md) và [kiểm thử](06-testing.md).
4. Đọc [worklog](worklog.md) để biết việc đã làm và phần chưa chạy.
5. Đọc [React implementation](FRONTEND-IMPLEMENTATION.md) cho module/frontend, setup, kiểm thử và giới hạn.
6. Đợt backend 2026-10-17 thực hiện theo [BACKEND-IMPLEMENTATION](BACKEND-IMPLEMENTATION.md), tham khảo chọn lọc Marixa. Tài liệu này ghi quyết định bổ sung và contract trước code.

## Ràng buộc đã xác nhận

- Workspace và Git root: `D:\My Project\NTC`; backend: `ntc_aspnet/`.
- Docs duy nhất: `D:\My Project\NTC\docs`, chính là `docs/` trong Git. Bản trùng trong backend đã chuyển vào recovery backup của Git; không tạo lại bản sync thứ hai.
- React + TypeScript + Vite đặt ở `NTC/ntc_react`; UI tiếng Anh, hướng public nhỏ. Đã xác nhận Q-008/025.
- Cloud tương lai: Supabase PostgreSQL, giữ .NET Identity; Render API, Vercel React. Giữ tài khoản/note cũ, chưa migrate/deploy trong phiên docs.
- Đã chốt editor unified rich text/checklist/Markdown shortcuts, màu chữ/emoji, autosave (bỏ Save thường theo DEC-018/2026-10-20; có Retry save khi lỗi), nhắc in-app/email có lặp và gửi bù 24 giờ theo timezone user, trash 7 ngày; admin không đọc nội dung note người khác.
- Giữ nguyên `ntc_aspnet/NTC.VIEW` tạm thời để tham khảo. Không xóa hoặc viết lại Razor trong nhiệm vụ tài liệu.
- Phiên 2026-10-16 chỉ khảo sát/docs; ngày 2026-10-17 chủ dự án đã giao hoàn thiện backend sau khi cập nhật docs. Không tự deploy hoặc migrate DB thật.

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
| [03-architecture](03-architecture.md) | YES | Kiến trúc .NET và React |
| [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md) | YES | React modules, route mapping, UX và evidence |
| [SUPABASE-SETUP](SUPABASE-SETUP.md) | YES | Project ntc, lệnh cấu hình password ẩn và5test accounts |
| [SUPABASE-DOTNET-COMMANDS](SUPABASE-DOTNET-COMMANDS.md) | YES | Lệnh User Secrets chung và ví dụ NTC/Marixa, mẫu cho project mới |
| [RENDER-VERCEL-SETUP](RENDER-VERCEL-SETUP.md) | YES | Dashboard NTC, Docker/CA, env Production và giới hạn trước rollout |
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
| [15-api-contract](15-api-contract.md) | YES | Contract v1 hiện hành + legacy compatibility |
| [16-security-privacy](16-security-privacy.md) | YES | Ownership, auth, dữ liệu ghi chú |
| [17-environment-config](17-environment-config.md) | YES | Tên cấu hình; không chứa secret |
| [18-release-checklist](18-release-checklist.md) | YES | Điều kiện nghiệm thu trước phát hành |
| [19-cicd](19-cicd.md) | YES | Workflow backend/PG/Docker đã tạo, chưa chạy GitHub |
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
| [BACKEND-IMPLEMENTATION](BACKEND-IMPLEMENTATION.md) | YES | Contract trước code, quyết định và kết quả đợt backend |
| [ENTITY-REVIEW](ENTITY-REVIEW.md) | YES | Rà17 entities, quan hệ owner/parent, check/audit/migration |
| [SERVICE-CONTROLLER-REVIEW](SERVICE-CONTROLLER-REVIEW.md) | YES | PATCH/session/admin/inbox/email và evidence hoàn thiện services/controllers |
| [api-inventory](api-inventory.md) | YES |131 operations từ OpenAPI export |
| [worklog](worklog.md) | YES | Snapshot, evidence và tồn đọng |

Ma trận này là nguồn chuẩn về phạm vi áp dụng; hồ sơ dẫn lại để tránh lệch trạng thái. NO chỉ có nghĩa ngoài phạm vi đang được giao, không phải quyết định cấm lâu dài.

## Nguồn chuẩn

- Yêu cầu/ràng buộc: lời chủ dự án trong cuộc trò chuyện; câu trả lời tại PROJECT-INTAKE.
- Hiện trạng implementation: source theo đường dẫn và commit trong worklog.
- Quy tắc sản phẩm: file 02; luồng: file 05; schema: file 04; API: file 15.
- Lệnh/kết quả thực tế: file 06 và worklog. Không suy ra PASS từ source.
- Giá/plan cloud, luật, vòng đời hỗ trợ và phiên bản thư viện tương lai: chưa khảo sát; cần nguồn hiện hành khi chọn thật.

## Rà soát và triển khai 2026-10-17

Đợt triển khai mới đọc BACKEND-IMPLEMENTATION.md. Bộ docs được rà theo Marixa nhưng vẫn giữ toàn bộ quyết định NoteTatCa; số 39 file là mốc thư viện ban đầu, có thể thêm tài liệu triển khai/inventory cần thiết.

## Snapshot hiện hành

47 file Markdown tại root docs duy nhất. Backend .NET8 legacy/v1 đã triển khai owner/auth/editor/version/reminder/jobs/admin và provider migrations. Mốc trước cloud: Release strict/PASS80 tests +1PostgreSQLskip/publishAPI; các đợt Supabase/schema/sample vàhosting config mới được ghi ở worklog. Google/SMTP thật, Docker image runtime/restore và SQL→PG data transfer chưa chạy. Không coi dashboard Save only là triển khai thành công.

React local:14unit/12Chromium E2E và type/lint/build PASS; runbook/route mapping/evidence tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md).

Supabase provisioning theo yêu cầu trực tiếp2026-10-18:3migrations đã apply, pending0;5Identity accounts,25notes và15labels mẫu. HTTP login/read của5accounts và admin owner boundary PASS; không chuyển dữ liệu SQLServer hoặc deploy. Backend mới nhất95PASS/1SKIP,total96 và Release strict sạch; xem [worklog](worklog.md) và [setup](SUPABASE-SETUP.md). Các số80/81 ở snapshot trên là mốc trước bổ sung seeder.
