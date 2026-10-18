# WORKLOG — NoteTatCa

> 2026-10-18 Asia/Bangkok | CURRENT React và backend local; khảo sát cũ được giữ ở cuối file.

## Publish main theo yêu cầu người dùng — 2026-10-18 (CURRENT)

Người dùng yêu cầu push main sau khi hoàn thành React/backend/docs. Remote origin/main đã kiểm ở176a968, trùng HEAD trước commit; không cần force push. Đưa toàn bộ phạm vi đã giao lên cùng cấu trúc root NTC: ntc_aspnet, ntc_react, docs, scripts, CI và deploy assets. Các evidence14unit/12Chromium/80backend+1PGskip của đợt triển khai được giữ ở entry dưới; kiểm docs44Markdown/136links/0errors và staged whitespace PASS trước publish.

Giữ nguyên byte4appsettings local qua đối chiếu SHA256; chỉ stage bản cấu hình sạch trong Git index, bỏ JWT/Google/SMTP secret, email SMTP riêng và connection string local. Ba file config có giá trị riêng sẽ còn modified ngoài commit; không reset hoặc ghi đè chúng. Snapshot index/status/worktree patch và config hashes trước stage ở .git/push-backup-20261018, không publish thư mục backup. Kiểm484indexed files:0credential-pattern findings, không có node_modules/bin/obj/artifacts/test reports/keyring trong index. Publish code PASS: commit c2f4fe178f737d8abf167868e6d5d42dc842372e đã push origin/main; git ls-remote xác nhận SHA remote trùng HEAD local. Đối chiếu4config hashes sau push PASS; chỉ3appsettings riêng còn modified local. Entry kết quả này được commit tài liệu nối tiếp; không amend/force-push lịch sử đã publish.

Theo câu hỏi về việc nhớ cập nhật worklog, bổ sung quy tắc kết thúc task/commit rõ trong root AGENTS.md, bên cạnh quy tắc đã có ở docs/AGENTS.md. Phiên sau đọc AGENTS và latest worklog từ repo; không chỉ dựa vào lịch sử chat. Không deploy, chạy migration hoặc sửa dữ liệu thật trong nhiệm vụ publish.

## React frontend tại ntc_react — 2026-10-18

Hoàn thành phạm vi frontend được user giao: đọc43docs và toàn bộ inventory Razor; tạo React19/TS/Vite trong ntc_react, phân tầng domain/repository/application/features, class/OOP cho session/API/cache/autosave; UI English với responsive sidebar/drawer, light/dark, modals, lazy rich editor và SPA cache theo owner. Các module auth/OTP/Google/recovery, notes/rich/checklist/Markdown/màu/emoji/labels/search/pin/drag,trash,reminders,inbox,profile/account/sessions,admin users/roles/audit/statistics có UI/API wiring. Route mapping và giới hạn tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md), runbook [React README](../ntc_react/README.md). Giữ Razor và toàn bộ backend/config hiện có.

Đã sửa các lỗi tìm thấy khi chạy browser: trash detail dùng API danh sách đã xóa, private cache evict đúng; autosave giữ oversized draft/error thay vì báo Saved sai; serialize version/idempotency khi mất ACK; rollback/revalidate partial pages; refresh single flight, response guard theo identity và tránh pending refresh hồi sinh phiên đã logout; form labels có association/help đúng; Markdown checklist canonical đúng schema API; custom background có foreground theo luminance. Conflict save-as-new dùng cùng coordinator có idempotency/guard busy.

Evidence local: typecheck/lint0warnings/build PASS; Vitest14PASS/4files. Chromium12PASS trong1.5phút, gồm actual pointer+keyboard drag,409 preserve draft/copy, lost-network retry/no duplicate, owner switch, auth code/recovery, reminder→API job→DB→inbox, profile/session và admin metadata. Sau chỉnh copy/save chạy focused conflict1PASS (8.3s), type/lint/unit14/build lại PASS. Screenshots desktop1280/mobile390/dark đã xem tại artifacts/frontend. npm runtime audit0 vulnerabilities. Backend strict Release0warning/0error; fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81,36s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_09_48_48.trx. Docs44Markdown/130links/0errors trước cập nhật worklog cuối.

Đối chiếu riêng384backend/source/Razor/config hashes vẫn nguyên byte; index đúng287baseline R100, HEAD/main/remotes giữ nguyên. Script rename cũ có assertion all refs lỗi vì app tự đổi refs/codex/turn-diffs; không sửa app refs hoặc reset index. Thêm .github/workflows/frontend.yml dùng Node24/.NET8/Chromium synthetic API, secret-free; chưa chạy remote CI. Không commit/push, apply owner DB, SMTP/Google thật, cloud deploy hoặc SQL→PG transfer. External config/jobs/uptime/backup/privacy operator notice còn theo cổng phát hành. Docs bên dưới là lịch sử theo thời điểm, không dùng số tests/frontend-path cũ làm hiện trạng.

## Đổi tên backend thành ntc_aspnet — 2026-10-17 (CURRENT)

Theo yêu cầu trực tiếp chủ dự án đổi folder NoteTatCa → ntc_aspnet. Git root vẫn NTC, docs duy nhất root docs. Đổi tên thư mục và path references trong README/AGENTS/architecture/docs/scripts/CI/Docker; không đổi tên sản phẩm, namespaces/project/assembly, Identity Data Protection application name hoặc GitHub remote. Thư mục frontend ntc_react hiện có được giữ nguyên.

Backup index/status/hash trước đổi tại .git/backend-rename-backup/20261017-235240.384source/config hashes đối chiếu nguyên byte, index chỉ remap prefix cũ sang ntc_aspnet để giữ staging hiện có; không stage nội dung code/config đang sửa. HEAD/branch/refs/remote giữ nguyên, không commit/push hoặc thao tác DB thật. Kiểm cuối từ root PASS: restore; Release strict build0warnings/0errors (17,94s); fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81 (40s); TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_54_42.trx. PublishAPI và dotnet-ef dbcontext list theo path ntc_aspnet PASS, nhận đúng SQLServer/PostgreSQL contexts, không truy cập DB thật. verify_docs43Markdown/123links/0errors. Verify rename xác nhận384source/config hashes nguyên byte, HEAD/branch/refs/remote và staged blob contents giữ nguyên,287rename100%; root links/CI targets hợp lệ. Docker/remoteCI/cloud không chạy trong tác vụ rename.

Các entries bên dưới giữ nguyên đường dẫn cũ như lịch sử. Lệnh hiện hành dùng root NTC với ntc_aspnet/ prefix, xem README và10.

## Chuyển Git root lên NTC và hợp nhất docs — 2026-10-17 (trước khi đổi tên backend)

Theo yêu cầu trực tiếp chủ dự án, Git root chuyển từ NTC/NoteTatCa lên NTC; docs duy nhất NTC/docs. Hai bản43Markdown trước thao tác byte-identical. .git/.config/.github/.gitignore/.dockerignore/.env.example/AGENTS/ARCHITECTURE/README/Dockerfile/render.yaml/scripts chuyển lên root, backend projects/solutions vẫn NoteTatCa và thư mục react trống giữ nguyên.

Recovery backup tại .git/root-relocation-backup/20261017-232836: Git bundle --all, index/config/status/working diff trước chuyển,441filehash và docs zip/archive. HEAD176a968/main/refs/remote giữ nguyên, không rewrite history. Index chỉ stage287 baseline rename100%; nội dung backend/appsettings trước đó vẫn unstaged, không commit/push. Tất cả441filehash được đối chiếu ngay sau move trước sửa docs/tool paths. Bản docs dư archive vào backup khi automatic command review chặn recursive delete; không còn NoteTatCa/docs trong cây dự án.

Đã cập nhật root AGENTS/README/architecture, docs/intake/plan/ADR/handover/AI prompt, scripts/verify_docs.py, Dockerfile/.dockerignore, CI trigger/build paths và frontend ignore rules. Không sửa .NET/Razor/config/migrations/database thật. Tool restore và restore filter từ root PASS. Strict Release build0warnings/0errors (16,46s), fullsuite80PASS/0FAIL/1SKIP PostgreSQL,total81 (26s), TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_31_22.trx tại root. PublishAPI root PASS; EF exportSQL idempotent2provider từ root PASS, không apply DB. OpenAPI inventory regenerate trực tiếp root docs:131operations. verify_docs:43Markdown/123local links/0errors; preservation check384backend/local-config/source hashes giữ nguyên sau sửa root files,287baseline rename100% index không đổi nội dung. Git fsck --full và bundle verify PASS, bundle gồm toàn bộ lịch sử. Root README links và CI/Docker/tool target paths kiểm tồn tại PASS. Không có Docker CLI nên Docker image build/remote GitHub CI/deploy chưa chạy.

Entries phía dưới là lịch sử có cwd/cấu trúc và test counts tại thời điểm cũ. Tác vụ mới dùng root README và10, không sync hoặc tạo lại NoteTatCa/docs.

## Hoàn thiện services/controllers — 2026-10-17 (trước khi chuyển root)

Theo yêu cầu chủ dự án và lời nhắc tiếp tục, đã hoàn thiện [contract](SERVICE-CONTROLLER-REVIEW.md) trước triển khai, rà tất cả business interfaces/services/DI/legacy/v1. Thêm presence-aware PATCH tag/reminder/profile, version response/guard; profile nullable-clear/missing-create, self phone; session metadata/revoke family; admin role/membership/search/deactivate/restore và audit12; inbox unread/bulk; password/mailbox bounds, HTML/link encoding và SMTP timeout retry. Không tạo public CRUD cho internal OTP/hash/delivery/audit writes. Giữ legacy routes/binding/envelope; linked-login exception bảo mật bỏ raw entity/provider keys.

SQL20261017160312 / PG20261017160333_SupportAccountReactivation chỉ mở CHECK action12, không sửa migration trước. Release strict `dotnet build NTC.Backend.slnf -c Release --no-restore -warnaserror -v minimal`:0warnings/0errors. Full suite **80PASS/0FAIL/1SKIP,total81**,59s, TRX `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_23_07_36.trx`.13 cases mới HTTP A/B/admin/anonymous; SQLLocalDB isolated migration fixtures PASS,4SQL/3PG histories/model/no-pending PASS. PostgreSQL runtime SKIP local vì chưa cóserver; không thay cloud verification.

Publish `dotnet publish NTC.API/NTC.API.csproj -c Release --no-build --no-restore -o artifacts/publish` PASS. ExportSQL idempotent2provider PASS, sequential EF CLI `--configuration Release --no-build`; chỉ generate scripts. Swagger export131controlleroperations (health riêng), mọi success schema/commonerror/access metadata kiểm qua test; legacy traceId có correlation regression.Kiểm cuối PASS:43Markdown/123local links/0errors, hai bản sync byte; verify_final xác nhận config hashes/Razor/migration lịch sử giữ nguyên, không staged và223changed/new text files UTF-8/common token patterns; git diff --check sạch.

Trong lượt focused test đầu có2assertion sai: role description trả chuỗi rỗng theo DTO cũ dù DB null, và login tạo sau tăng fake clock làm token future với validator real clock. Đã sửa assertion/fixture và fullsuite0fail; không bỏ test. Lệnh exportSQL dùng nhầm short -c được sửa thành --configuration (short -c thuộc context); export cuối PASS.

Không apply DB chủ dự án, email thật, Docker/GitHubCI/cloud/React E2E/backup restore hoặc SQL→PG transfer. Local appsettings hashes/Razor/source giữ nguyên, HEAD176a968 cộng working changes chưa commit/push. Các entries dưới là lịch sử theo thời điểm; dùng entry này cho test/migration/API/docs totals hiện hành.

## Rà entities theo yêu cầu tiếp theo —2026-10-17

Chủ dự án cho quyền bổ sung entities còn thiếu. Đã rà17 classes, model/migrations/service/DTO và viết [ENTITY-REVIEW](ENTITY-REVIEW.md). Thêm NoteTag.UserId/compositeFK, Notification/Delivery owner+parentFK, immutable occurrence/session identity, shared IAuditableEntity cho Identity, AdministrativeAuditEvent metadata + transactional writes/admin API, LastAttemptAt/AbandonedAt và retry crash cap, CHECK/expiry indexes. Title non-null/rỗng; profile trả canonical Identity email/locale, create validate gender/birthdate.

New migrations SQLServer20261017122802_EnforceEntityIntegrity, PostgreSQL20261017122809_EnforceEntityIntegrity. Không sửa các migration trước của hai history; user data không apply. Preflight invalid links dừng trước DDL; hợp lệ backfill owner. Report chỉ đọc scripts/preflight-entity-integrity-sqlserver.sql.

Lệnh PowerShell cwd backend repo: Release strict build0warning0error; dotnet test NTC.Tests -c Release --no-build --logger trx --results-directory artifacts/test-results đạt **67 PASS/0 FAIL/1 SKIP,total 68**,32 giây. TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_19_36_05.trx.17 case executions thêm so với fullsuite51 trước. SQLite owner/check/audit tests và SQLLocalDB migration/direct-SQL tests PASS; PostgreSQL runtime SKIP(local chưa cóserver), model/history/DDL/no-pending-model PASS. OpenAPI export116 operations,42 docs sync. Publish API và exportSQL idempotent cả2 provider PASS; git diff --check/config preservation kiểm cuối. Chưa Docker/CI/cloud/Google/SMTP/E2E hoặc migrationDB thật.

Trong vòng test đã sửa assertion profile lấy đúng data.profile thay data root; không đổi shape GET me. Audit chỉ append qua app, không chống privileged SQL. Retention audit chưa chốt Q-030, không tự purge; account hard delete vẫn chưa bật. Kết quả baseline bên dưới là mốc cũ; dùng lượt này cho CURRENT entities/test count.

## Bàn giao đợt backend

Git repo `D:\My Project\NTC\NoteTatCa`, branch main, HEAD `176a968e0debde118f09293b99222da3ee317b4b` cộng các thay đổi mới chưa commit/push. Hai appsettings API/VIEW đã modified trước phiên; SHA256 cuối khớp bản đầu. Không sửa source NTC.VIEW khác, không đổi migration lịch sử, không chuyển Git root và không apply/reset database thật.

Theo yêu cầu chủ dự án, đã đọc Marixa/docs/architecture/source, hoàn thiện contract docs trước code và chốt DEC-013–015: untitled, nhãn trùng, month-end/catch-up/restore và quota100.000 ký tự. Marixa chỉ làm nguồn phong cách phân tầng .NET, không nhập nghiệp vụ HR hoặc chỉnh repo tham chiếu.

Đã triển khai Core/contracts boundaries, actor/clock/base classes/UoW; auth/owner/self/admin; Identity email/Google proof/OTP DB/refresh rotation/reuse/revoke; rich schema/plain projection/icon/quota; autosave version/create key; nhãn/pin/reorder/search/trash; recurrence/inbox/email lease/purge/prune; admin metadata/statistics/lock; UTC/audit/immutable owner/concurrency; SQL additive và PostgreSQL baseline; telemetry/errors/health/CORS/rate limit; Docker/env/Render/CI và regression tests.

## Evidence đã chạy

PowerShell cwd backend repo trên Windows, target net8.0. Test dùng A/B/admin giả, fake Google/email/clock; SQLLocalDB fixture tạo/drop database tên riêng. Không đọc connection string chủ dự án hoặc gửi email thật từ tests.

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `dotnet build NTC.Backend.slnf -c Release --no-restore -warnaserror -v quiet` | PASS,0 warnings/0 errors | Filter loại Razor khỏi strict build; NTC.sln vẫn giữ Razor với6 warnings legacy |
| `dotnet test NTC.Tests/NTC.Tests.csproj -c Release --no-build --logger trx --results-directory artifacts/test-results -v minimal` | **50 PASS,0 FAIL,1 SKIP,total51**,17 giây | PostgreSQL runtime skip vì thiếu fixture local; Google/SMTP giả |
| TRX lần cuối | `artifacts/test-results/Admin_DESKTOP-DVT_2026-10-17_17_25_51.trx` | Artifact local ignored, không dữ liệu thật |
| SQL legacy migration fixture | Giữ hash/account/note/UTC instant và version nonempty; duplicate email dừng trước DDL; stale version conflict | Chỉ database LocalDB biệt lập |
| Hai provider models/history/DDL/HasPendingModelChanges | PASS | Không thay PostgreSQL runtime |
| `dotnet publish NTC.API/NTC.API.csproj -c Release --no-build -o artifacts/publish` | PASS | Publish local, chưa Docker/deploy |
| Export SQL theo file10 bằng dotnet-ef Release/no-build/idempotent | PASS `artifacts/sqlserver-migrations.sql` và `artifacts/postgresql-migrations.sql` | Chỉ xuất script; PostgreSQL schema/history ntc trước tables |
| Swagger export + update_api_inventory.py |115 controller operations; v1 typed schemas/access metadata | Health ngoài inventory; ownership còn kiểm ở service |
| `python scripts/verify_docs.py` |41 Markdown,98 local links,0 errors; hai bản docs đồng nhất | Có kiểm UTF-8/H1/placeholder và JSON examples, không thay runtime |
| `git diff --check` và preserve checks | PASS; config hashes/migration lịch sử giữ nguyên | Không audit toàn lịch sử secret |

Lỗi đã phát hiện và sửa qua kiểm thử gồm reset token raw/outer encoding, label mutation/version, account/session state, rich PATCH omission/conversion, version ban đầu cho record cũ. Bổ sung regression không lộ recovery token trong log request, kể cả bật framework Information khi không mang appsettings vào Docker.

Full solution strict build gặp6 warnings Razor cũ; tạo backend filter, không sửa Razor. EF CLI xuất script đồng thời bị khóa chung obj; chạy lần lượt đã thành công. Totals ở trên là lần test cuối sau mọi thay đổi code.

## Chưa chạy và bước tiếp theo

NOT RUN: PostgreSQL runtime/SQL→PG data transfer; backup restore thật; Docker build (máy chưa có CLI); GitHub CI remote; Google/SMTP thật; cloud deploy; React/browser E2E/load. CI đã cấp PostgreSQL17 fixture cho kiểm tiếp theo. Render blueprint free chỉ demo, autoDeploy off/jobs off; chưa bảo đảm uptime nhắc lịch.

Trước production cần persistent Data Protection keyring, trusted proxy/CORS/TLS/private DB grants, backup/restore, uptime và purge candidates review. Worker mặc định tắt. React cần editor/Markdown UX, token storage/refresh coordination, autosave409 và E2E. Export/hard delete account,offline,budget/region/deadline còn mở trong hồ sơ; không hỏi lại các lựa chọn đã chốt.

Source backend hoàn tất phạm vi đợt hiện tại; không tự commit secret,push,deploy hoặc chạy jobs lên dữ liệu cũ.

## Lịch sử khảo sát và docs 2026-10-16

Các đoạn bên dưới là bằng chứng theo thời điểm cũ, không dùng làm hiện trạng source2026-10-17.

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

## Rà soát và triển khai 2026-10-17

Bắt đầu 2026-10-17: Git HEAD 176a968, chỉ hai appsettings có thay đổi pre-existing. Baseline API build PASS, 4 warnings; runtime .NET 8.0.30. Đã đọc reference Marixa/docs/source, chốt 3 câu nghiệp vụ và viết BACKEND-IMPLEMENTATION trước code. Chưa chạy test/migration/provider/cloud ở thời điểm ghi entry này.
