# WORKLOG — NoteTatCa

> 2026-10-16 (Asia/Bangkok) | DRAFT | Áp dụng: YES

## Snapshot bàn giao

- Workspace `D:\My Project\NTC`; source Git repo `D:\My Project\NTC\NoteTatCa`, branch main, mốc khảo sát `d8f854b245c29bfb84bbf8f541822a6718fe4b2c`.
- Scope phiên: đọc docs_mau/source, phỏng vấn lựa chọn, tạo docs cá nhân hóa; không sửa API/React/Razor/DB hoặc deploy.
- Trước phiên docs: `NTC.API/appsettings.json`, `NTC.VIEW/appsettings.json` có thay đổi local để giữ secret, không được ghi đè.
- Bản soạn thảo docs ở NTC/docs. Theo yêu cầu push tiếp theo, thêm bản đồng bộ ở NoteTatCa/docs để commit vào Git repo hiện tại. Kế hoạch gom Git root lên NTC khi bắt đầu React đã được chọn, chưa thực hiện.
- Người dùng chốt các lựa chọn ở PROJECT-INTAKE. Một số chi tiết kỹ thuật như auth session, rich schema, scheduler và quota vẫn PROPOSED.
- Bước sau: người dùng giao hoàn thiện API; đọc 15/16/06/23 và quyết định hiện hành trước làm. Giữ NTC.VIEW.

## Khảo sát source

| Nguồn dưới NoteTatCa | Kết luận CURRENT |
| --- | --- |
| NTC.API/NTC.API.csproj và các project | Target net8.0, ASP.NET/EF/Identity/SQL Server |
| NTC.API/Program.cs, DependencyInjection.cs | Swagger/JWT/Google/CORS AllowRazor, SMTP/OTP/service DI |
| NTC.API/Controllers/*.cs | Route inventory, auth attribute không đồng nhất |
| NTC.Services/Service/NoteService.cs | List owner; detail/update/trash mutation thiếu owner; pin/reorder |
| TagService, NoteTagService, ReminderService | Nhãn/quan hệ/lịch; owner/scope/SaveAsync cần rà |
| AuthService và Infrastructure/OtpService.cs | Username login, OTP email/cache, Google JWT, chưa refresh/revoke rõ |
| NTC.Contract.Repositories/Entities và NTC.Repositories/Context/DatabaseContext.cs | Note/Tag/NoteTag/Reminder/Identity/profile, FK và constraints |
| NTC.ModelViews và NTC.Core/Base | DTO, response/page, nullable title/DB mismatch, audit |
| NTC.Core/Utils/CoreHelper.cs | Audit time dùng UTC+7 helper |
| NTC.VIEW/Program.cs, Pages, wwwroot | Razor consumer/session/Google; nguồn tham khảo, giữ nguyên |
| NTC.API/Properties/launchSettings.json | API HTTPS 5033, HTTP 5032 trong source |

Đây là khảo sát sơ bộ, không audit mọi dòng hoặc DB live. Không trích giá trị secret từ appsettings vào docs.

## Ma trận truy vết

| REQ | WF/RULE | Source / API / UI đích | TASK | Runtime |
| --- | --- | --- | --- | --- |
| REQ-001/009 | WF-001, RULE-009 | Auth/User/UserInfo/UserLogin; API-001/002/009 | TASK-003 | NOT RUN |
| REQ-002 | RULE-001 | Toàn bộ controller/service, file 16 | TASK-003 | NOT RUN |
| REQ-003/011 | WF-002 | Note/DTO/editor tương lai; API-004 | TASK-004/005 | NOT RUN |
| REQ-004/005 | WF-003 | Tag/NoteTag/NoteService; API-005/006 | TASK-004 | NOT RUN |
| REQ-006 | WF-004 | Note trash; API-007; purge chưa có | TASK-004/006 | NOT RUN |
| REQ-007 | WF-002 | Search chưa thấy trong API | TASK-005 | NOT RUN |
| REQ-008 | WF-005 | Reminder CRUD; dispatcher/inbox chưa có | TASK-006 | NOT RUN |
| REQ-010/012 | UI-001–009 | React chưa có; admin role API có nhưng chưa đủ scope đích | TASK-007/010 | NOT RUN |

## Nhật ký lệnh và kết quả

PowerShell, cwd `D:\My Project\NTC` trừ nơi ghi khác. Ngày 2026-10-16 theo múi giờ người dùng.

| Kiểm tra / lệnh | Kết quả / evidence | Giới hạn |
| --- | --- | --- |
| `rg --files 'D:\My Project\docs_mau'`; đọc AGENTS/README/intake và các mẫu | 39 file mẫu Markdown | Nguồn mẫu không phải yêu cầu sản phẩm |
| `rg --files -g AGENTS.md 'D:\My Project'` | Không thấy AGENTS áp dụng workspace NTC trước tạo docs | AGENTS dự án khác không áp dụng |
| `rg --files NoteTatCa` với filter source; Get-Content source có chọn lọc | Các nguồn bảng trên được khảo sát | Không phải runtime test |
| `git -C NoteTatCa status --short` | Chỉ hai appsettings local đã có thay đổi | Không sửa chúng trong phiên docs |
| `dotnet --list-sdks` | SDK 9.0.317 | Chưa kiểm .NET 8 runtime/SQL |
| `rg --files --hidden NoteTatCa` filter Test/YAML/package | Không tìm thấy suite test/CI/React package trong scope | Không suy ra PASS |
| Đọc docs chính thức Supabase/Render/Vercel, Supabase changelog | Source link tại 07/11/24; changelog lấy qua HTTP do web parser không hỗ trợ markdown | Chưa kiểm account/plan/tài nguyên |
| Phỏng vấn 2 vòng lựa chọn | TARGET được ghi với nguồn/ngày trong hồ sơ | Còn các chi tiết chưa duyệt |
| Tạo và kiểm docs | Kết quả kiểm cuối bổ sung bên dưới | Chỉ tài liệu |

Build, API HTTP, DB query/migration/seed, E2E, load, security runtime, worker email, deploy và restore: NOT RUN vì phiên này chỉ làm docs, không có thay đổi implementation.

## Vấn đề cần giải quyết khi làm API

| ID | Bằng chứng / mục tiêu | Đề xuất / trạng thái |
| --- | --- | --- |
| ISSUE-001 | Note/Tag/Reminder/NoteTag/UserInfo scope chưa đồng nhất | Auth/owner mọi entrypoint, P0 OPEN |
| ISSUE-002 | JWT/Google/OTP/account state cần rà | Token proof/unique email/rate limit/revoke, P0 OPEN |
| ISSUE-003 | Reminder mới có data, chưa dispatcher/inbox; purge chưa thấy | DB-backed jobs, OPEN |
| ISSUE-004 | Current DTO/route/validation không đồng nhất cho SPA | Version/adapter/envelope/OpenAPI, OPEN |
| ISSUE-005 | Title nullable ở entity/DTO nhưng DB required; DueDate DTO không thấy entity | Chốt rule/editor rồi migration additive, OPEN |
| ISSUE-006 | Git root cũ không bao bản soạn thảo docs/frontend | Docs đã có bản đồng bộ trong repo; bảo toàn history trước gom root NTC, OPEN cho giai đoạn React |
| ISSUE-007 | Migration baseline khác lịch sử, DB live chưa khảo sát | Inventory/backup/dry run, không reset, OPEN |

## Kết quả kiểm tài liệu cuối

2026-10-16, PowerShell cwd NTC: đối chiếu tên file bằng Get-ChildItem; đọc UTF-8 và regex kiểm local Markdown links, placeholder mẫu, ký tự thay thế và một số định dạng credential phổ biến. Kết quả: 39/39 file trùng tên bộ mẫu, không file thiếu/thừa; 67 link local có đích tồn tại; không placeholder mẫu, ký tự lỗi encoding hoặc pattern secret được phát hiện. Đây là kiểm tra mẫu secret phổ biến, không chứng nhận scan bí mật toàn diện hoặc audit lịch sử Git.

Rà consistency câu trả lời: Q-001–008 và Q-019–025 đã được lưu; UI tiếng Anh, trash 7 ngày, Identity giữ nguyên và editor unified được cập nhật ở nguồn chủ quản. Các chi tiết còn mở được giữ PROPOSED trong hồ sơ, không hỏi lại quyết định đã xác nhận.

`git -C NoteTatCa diff --name-only` cuối khảo sát vẫn chỉ hai file appsettings đã khác từ trước; HEAD vẫn d8f854b. Không có thay đổi code/Razor được thực hiện bởi nhiệm vụ docs. Bộ docs chưa nằm trong Git repo backend và chưa push. Kiểm tra docs PASS trong phạm vi trên; mọi test runtime vẫn NOT RUN.

## Lượt tiếp theo — đồng bộ GitHub theo yêu cầu người dùng

Người dùng yêu cầu push bộ docs. Giữ Git root hiện tại, cập nhật mô tả bản soạn thảo NTC/docs và bản đồng bộ NoteTatCa/docs; sao chép đủ 39 file rồi kiểm nội dung giống nhau, link và placeholder. Commit chỉ docs/, không stage hai appsettings local. Sau push, kiểm remote main trùng HEAD; kết quả commit/push được báo trong cuộc trò chuyện, không dự đoán SHA trong chính commit. Không sửa code, chuyển Git root, xóa Razor hoặc thay cấu hình local trong lượt này.
