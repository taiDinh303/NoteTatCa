# WORKLOG — NoteTatCa

> 2026-10-18 Asia/Bangkok | CURRENT React và backend local; khảo sát cũ được giữ ở cuối file.

## Công bố cấu hình NTC lên main — 2026-10-18

- Theo yêu cầu “push ntc lên đi”, chuẩn bị commit toàn bộ thay đổi NTC đã hoàn thiện từ mốc 1fc2cda: operator Supabase/demo, kiểm tra cấu hình startup, Production JSON sạch, CA public, Docker/Render/Vercel, manifest/exporter, frontend environment validation, regression tests và tài liệu. Không đưa thay đổi Marixa vào publication này.
- Loại khỏi commit ba appsettings local đang sửa sẵn của API/Razor; đối chiếu cả bốn file local với backup: giữ nguyên byte. Private exports/password manifests/logs/screenshots trong artifacts bị ignore. Rà 55 file dự kiến commit không phát hiện mẫu private key/access token/OAuth secret/JWT thật; CA được đưa vào repo là certificate public. Không stage User Secrets hoặc dữ liệu tài khoản mẫu thật.
- Kiểm tra lại trước commit: Release build **0 warning/0 error**; backend **111 PASS / 0 FAIL / 1 SKIP / 112 total** (PostgreSQL fixture không cấu hình; không dùng owner DB). TRX: artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_23_01_08.trx. Frontend **4 config tests + 14 Vitest PASS**, lint max-warnings0 và Production typecheck/Vite build PASS với API URL NTC/VERCEL=1.
- Synthetic cloud exporter PowerShell5.1 PASS; clean Production publish và static checks SQL Server/PostgreSQL/invalid sanitized config PASS. Docs **48 Markdown / 176 local links / 0 errors**; diff --check PASS, chỉ có cảnh báo line ending hai file cũ. Không lặp lại E2E/Docker image build/cloud DB checks đã ghi ở các mốc trước.
- Fetch origin/main trước publication: local/remote cùng 1fc2cda, không divergence. Sau push phải đối chiếu SHA main trên remote. Không chạy migration/seed/email thật hoặc bấm deploy; Git push có thể kích hoạt CI/hosting integration đang cấu hình, chưa xác minh rollout cloud trong tác vụ này.
- Publication hoàn tất: commit **3ea2b8db17f287de0390977cbad0a221147c2e5f** (55 files) đã push bằng fast-forward lên origin/main; git ls-remote xác nhận main trên GitHub trùng SHA local. Entry xác nhận này được lưu bằng commit tài liệu tiếp theo; ba appsettings local vẫn ngoài commit.

## Tiếp cấu hình Marixa sau đổi tài khoản — 2026-10-18

User đăng nhập Render/Vercel Marixa; dashboard đã Save only job=true và MyCnn VerifyFull/CA Linux đúng project, giữ password cloud (khác local), JWT/Storage key. Vercel giữ API URL Config/Production /api, root/Node24, đổi Other→Vite và bỏ dashboard Build/Output overrides. Chưa deploy source/CA mới hoặc kiểm DB thật; chi tiết và bằng chứng trong worklog Marixa. Không thao tác thêm dashboard NTC vì user đã chuyển tài khoản. Exporter warning chung sửa đúng manifest reserve, synthetic export tests hai repo PASS; common standard bổ sung khác biệt credential local/cloud. Không sửa runtime/API/business/data hoặc commit/push/deploy NTC trong lượt này.

## Bổ sung Storage dự phòng và chốt nguồn cấu hình — 2026-10-18

- Chủ dự án yêu cầu giữ SUPABASE__URL/SUPABASE__SERVICE_KEY cho NTC để sau này upload ảnh note; Swagger bỏ khỏi Render, JWT issuer/audience/TTL và cờ tạo dữ liệu mẫu dùng chung cách lấy từ Production JSON. Chốt BackgroundJobs=true cho cả hai. Giữ giá trị JWT riêng từng app; NTC DemoAccounts=false, Marixa Seed/DatabaseInitialization=false, không thêm cờ demo giả cho Marixa.
- NTC Production JSON thêm section Supabase rỗng an toàn và đổi BackgroundJobs=true. Manifest đánh dấu reserveSupabaseStorage=true nhưng supabaseStorage=false: mới dự phòng credential, chưa tạo bucket/adapter/endpoint/frontend upload. Ảnh note tương lai phải private theo owner, không copy ảnh attendance public Marixa. Không có migration hoặc thay đổi tài khoản/note trong lượt này.
- Mẫu Render/blueprint và exporter hai repo dùng tên SUPABASE__SERVICE_KEY, job=true; cùng chín key khi đã có credential Storage. NTC chưa có key local thì exporter bỏ secret chưa cấu hình, không ghi env rỗng hoặc key giả. JWT issuer/audience/TTL/demo/Swagger không được export lặp. Giữ tương thích ServiceKey/Service_Key trong code và stable export JWT profile; không xoay key hoặc lấy key từ app khác.
- Render NTC srv-dba6j3nbtjjs73e08dm0: dùng phiên đăng nhập hiện hữu, cập nhật BACKGROUNDJOBS__ENABLED=true và thêm SUPABASE__URL=https://nxqupzwqawujtgeuvvcj.supabase.co; bấm Save only, xác nhận quay lại bảng đã lưu và đọc lại hai giá trị public đúng. Không deploy, đổi credentials hoặc xóa JWT/demo/Swagger env. Secret Storage có sẵn giữ nguyên, chưa xác minh quyền/project của key. Most recent deploy vẫn Failed trên commit cũ; Save only không nghiệm thu runtime. Bằng chứng private screenshots artifacts/deployment/ntc-jobs-storage-saved.png và ntc-background-jobs-saved.png, các secret đều masked.
- Marixa dashboard trong phiên hiện tại báo Access denied (khác tài khoản); user sẽ đăng nhập sau khi xong NTC. Source/template/docs Marixa đã cập nhật theo cùng quyết định, không sửa dashboard Marixa trong lượt này. Không coi Access denied là thiếu quyền source hoặc kết nối Supabase.
- Kiểm chứng: strict Release NTC.Backend.slnf và M.BE.sln **0 warning/0 error**; focused NTC StartupConfiguration+Maintenance **22 PASS / 0 FAIL / 0 SKIP**, Marixa StartupConfiguration+Storage+JWT **33 PASS / 0 FAIL / 0 SKIP**. Export smoke PowerShell5.1 hai repo PASS, gồm chín key với secret giả, không export JSON-owned policies, key NTC chưa có bị bỏ qua, stable signing key và quoting fallback. Production publish/static CLI valid SQL Server/PostgreSQL + invalid sanitized configuration PASS cả hai, chỉ fake closed-loopback credentials, job/test host không chạy thật.
- Kiểm cuối: NTC 48 Markdown/176 local links/0 lỗi; Marixa 47 files/370 links/10 anchors/0 lỗi; diff --check PASS (chỉ warning LF/CRLF file cũ). Exporter/test/common standard hai repo byte-identical; screenshots bằng chứng Gitignored.
- Hash local appsettings API/Razor giữ nguyên so baseline trước chuẩn hóa; production JSON là file được chủ dự án giao sửa. Không owner DB/bucket/email, full suite/frontend/E2E hoặc Docker image/remote rollout trong lượt này. NTC job bật ở source sẽ dispatch/email/purge trash bảy ngày/prune khi triển khai; SMTP/uptime Free cần kiểm ở rollout riêng. Docs CONFIGURATION-STANDARD/17/01-plan/hosting và worklog được cập nhật, không stage/commit/push.

## Chuẩn hóa cấu hình/phong cách cùng Marixa — 2026-10-18 (CURRENT source)

- Theo yêu cầu chủ dự án, chọn JSON Production sạch + User Secrets Development + env theo deployment. Thêm CONFIGURATION-STANDARD.md giống nhau trong hai repo; root .editorconfig UTF-8/LF/C#4space/JS-TS-JSON2space, manifest deploy/project.json lưu đường dẫn/URL public và target đúng từng app. Giữ .NET8/Identity, routes, data, Razor và policy token/nghiệp vụ riêng; không reformat toàn codebase.
- NTC có appsettings.Production.json chỉ giữ defaults an toàn: NoteTatCa/NoteTatCa.Web/15 phút, jobs/Swagger/Google/demo false. csproj publish chỉ nhận Production JSON, loại base/Development/local env/keyring/App_Data/uploads; Docker exception chỉ cho Production JSON. CA public Linux path giữ nguyên. Sáu env Render cơ bản, NTC không cần Supabase service key; blueprint không generate/rotate JWT hoặc tự deploy. Chưa cleanup 14 biến đã lưu ở dashboard trong lượt trước.
- StartupConfiguration aggregate lỗi provider/connection/JWT/Production HTTPS/CORS/TLS/Storage/flags theo tên key, không echo credential; --check-config và options validator chạy trước operator handlers/host, không DB/worker/migrate/seed/email. Thiếu durable Data Protection keyring có warning rõ. Thêm Test-Configuration.ps1 và Test-ProductionConfiguration.ps1 dùng cùng lệnh với Marixa; Production wrapper dùng publish sạch thay vì nạp nhầm base local.
- Export-CloudEnvironment.ps1 đọc manifest riêng, output sáu keys (Marixa thêm Storage), giữ stable private export key profile và Linux CA path, quoting khó thì JSON thay .env; không đổi cloud/local secret thật. Test exporter dùng APPDATA/credential giả. API_PROXY_TARGET thống nhất dev frontend, giữ aliases cũ; shared Vite validator báo key sai, chặn Vercel relative/HTTP API, giữ /api/v1 NTC và /api Marixa. Browser suite ép API/proxy fixture riêng. Node24 engines/lock/CI, Vercel SPA/API/assets fallback và security headers theo cùng quy ước.
- Verification cuối: strict Release backend **0 warning/0 error**; full NTC suite **110 PASS / 0 FAIL / 1 SKIP / 111 total**, PostgreSQL fixture không có nên skip, không dùng owner connection. Frontend **4 config tests + 14 Vitest PASS**, lint max-warnings0/typecheck/build PASS; **12 Playwright Chromium PASS** qua fixture DB/email cô lập. Production build dùng manifest API URL với VERCEL=1 PASS. Các suite trước chỉ là mốc, không cộng trùng vào kết quả này.
- Production publish mới đúng một appsettings.Production.json, static CLI checks cả SQL Server/PostgreSQL và invalid config sanitized PASS. Process HTTP Production từ publish với DB loopback giả: live200, ready503 đúng dự kiến, CORS exact/blocked origin và correlation header PASS, process đã dừng. Không kiểm password/cloud DB thật. Export smoke PowerShell5.1/7 PASS: key count/Storage alias, special characters, Linux CA, stable key và stale .env fallback. Workflow thêm hai script kiểm config/export; GitHub CI remote và Docker image build/run chưa chạy (máy không có Docker CLI).
- Hash bốn appsettings local/API/Razor giữ nguyên so backup đầu phiên; Marixa cũng giữ appsettings local. Artifacts/backups/private exports Gitignored, không stage/commit/push/deploy hoặc migration/seed/email thật. SMTP/Google/keyring/uptime production vẫn theo release checklist; chuẩn hóa source không nghiệm thu hosting. Marixa còn cảnh báo bundle lớn, không đổi dependencies/định dạng project ngoài phạm vi cấu hình.
- Bằng chứng: artifacts/test-results/*.trx, artifacts/configuration-test-*/publish và http-smoke.log; backup config cục bộ trong artifacts/configuration-standard-backup (private, ignored). Cập nhật docs 17/setup/deploy/index/README và AGENTS với nguồn chủ quản mới. Kiểm cuối docs: 48 Markdown / 173 local links / 0 errors; diff --check PASS (Git có warning LF/CRLF ở file cũ).

## Render/Vercel NTC theo Marixa — 2026-10-18 (CURRENT)

Đọc render.txt/vercel.txt tại D:/zsecret dưới dạng dữ liệu, không in secrets. Tham khảo read-only Docker/blueprint/SPA/deploy/env của Marixa, không sửa hoặc dùng credentials dự án khác. User chọn sửa dashboard trực tiếp, đăng nhập Render/Vercel trong IAB. Connector Vercel get_project scope kunheo-team trả403; không retry quyền, dùng phiên browser được user xác nhận. Giữ thay đổi runbook chung được phiên Marixa thêm song song trong entry tiếp theo, không ghi đè.

Render thực tế: NoteTatCa/srv-dba6j3nbtjjs73e08dm0, NoteTatCa/main, Free/Singapore; Dockerfile ./Dockerfile/context . vàroot trống đã đúng, khác file render.txt cũ. Đặt Health Check Path=/health/ready; Save tự kích hoạt dep-dbabr149v7es73ftvigg trên1fc2cda, khi quay lại hủy thì đãFAILED16.1s/exit139, log thiếu JWT key≥32bytes/issuer/audience. Đã thông báo side effect, không bấm Manual Deploy hoặc báo rollout thành công. Sau đó env chỉ Save only.

Render đã lưu13keys NTC: Production/provider/DB connection/JWT key+issuer+audience+TTL/CORS/clientURL/jobs/Swagger/Google/demo flags. DB connection từ User Secrets đúngNTC, giữ password/VerifyFull vàđổi bản export Root Certificate sang /app/certificates/supabase-prod-ca-2021.crt/pool10. JWT ô cũ trống (Copy empty/UI Generate), bổ sung32random bytes Base64 riêng, không lấy key Marixa/development. Import tạo3dòng trùng; đã giữ key gốc/cập nhật value/bỏ dòng trùng trong form rồi Save thành công. Legacy SUPABASE__SERVICE_KEY cósẵn giữ nguyên, NTC không dùng; tổng14keys sauSave. Không print password/JWT hoặc xóa account/resource.

Vercel kunheo-team/note-tat-ca/prj_kKCnrbpC1hjW05gzXGOPqSQNW1J5: biến cũVITE_API_BASE_URL /api làSecret Production+Preview, UI chặn sửa public-prefix Secret/đổi loại. User xác nhận riêng bước xóa vĩnh viễn; đã xóa đúng biến rồi tạo lại ngay Config Production=https://notetatca.onrender.com/api/v1. UI xác nhậnAdded successfully/cần deployment mới, public value đã thấy. Không redeploy hoặc nốiPreview vàoDB production. Vite/rootntc_react/Node24.x cósẵn đúng; giữ mặc định framework.

Source Docker copy7API projects/cache restore, UseAppHost=false/nonroot/Production/PORT; bổ sung CA public Supabase2021 vào Linuxpath. DER SHA256807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA; PEMfile SHA256700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7. Không nhầm filehash/certfingerprint, không đưa localappsettings vàoimage. render.yaml khớpname/Free/Singapore/rootpaths/health/env, generateValue choJWT chưa có, autodeployoff; không syncBlueprint/tạo resource/đổi plan. vercel.json cóschema/framework/npmci/build/dist, fallback loạiAPI/assets/favicon; package/lockNode24.x nhấtquán.

Thêm Export-CloudEnvironment.ps1: validate UserSecrets target, xuấtprivate .env/JSON vàoignored artifacts/deployment, stable exportJWTprofile vàLinux CApath; quotingkhó thì giữJSON/xóa.envcũ, khôngxuấtsai. Synthetic Test-CloudEnvironmentExport.ps1 chạystoreAPPDATA biệt lập, không ownerDB. Theo câu hỏi4biến, giải thích Marixa đọcJSON cònDockerNTC loạiJSON; phương án3biến+safeproductionJSON là PROPOSED, chưa tự đổi thêm hoặc xóa env dashboard. File chủ quản RENDER-VERCEL-SETUP và07/08/11/17/README/index cập nhật.

Validation: exportsmoke PowerShell5.1/7 PASS(specialcharacters/LinuxTLSpath/stablekey/disabledjobs-seed/staleenvfallback); actual private.env↔JSON NodeparseEnv PASSkhônginvalues. SemanticRender/build/env vàSPA API/assets exclusion PASS; engineslockconsistency PASS. Officialschema2020 khôngvalidate bằngAJV6 cài sẵn, khôngcài package thêm chỉđể báoPASS. Frontendproductionbuild đúngAPIURL PASS. Strictpublish7projects sanitizedkhôngappsettings PASS; Productionstartup/live200/ready503expectedDBsynthetic/exactVercelCORS204 PASS, server5299 đãdừng. DockerCLI khôngcó:imagebuild/runNOTRUN. Fullsuite95PASS/1SKIP làmốc trước, không giả rerun hoặc testownerDB.

Screenshots masked/private artifacts/deployment/render-environment-saved.png vàvercel-production-config-saved.png; giữhai tabdashboard. Khôngcommit/push/rolloutsource mới; imagecũ chưa cóLinuxCA nên cầnpublish trướcdeploy. SMTP/Googleproduction/durableDataProtection/jobsuptime/restore chưaverify, khôngmua/đổiplan. Giữnguyên appsettingslocal/Razor/SQLServer/Supabase data; chỉ lưu hosting config đã giao.

Kiểm cuối47Markdown/160local links/0errors; git diff --check PASS(chỉwarningLF/CRLF). Hashes appsettings API/Razor giữ nguyên; private env/JSON/export key profile xác nhận Gitignored. Haiảnh bằng chứng đã xem, chỉchứa configpublic hoặc secretmasked.

## Dùng chung một runbook Supabase với Marixa — 2026-10-18

Theo yêu cầu chủ dự án từ phiên Marixa, cập nhật SUPABASE-DOTNET-COMMANDS.md thành một khối PowerShell có lựa chọn NTC/Marixa, bảng target đúng source hiện tại, nhập password ẩn, CA/VerifyFull/pool 10 và Marixa tắt auto initialize/seed khi dùng cloud. Giữ nội dung phân biệt provider/Data API/Storage, thứ tự override, migration riêng từng repo và giới hạn local/hosting. Không dùng lại lệnh Node của project/ref cũ.

Chỉ sửa runbook chung và entry worklog này trong NTC; giữ code/config/secrets cùng toàn bộ thay đổi đang có, không stage/commit/push NTC. Cấu hình Marixa local đã được chuẩn hóa và kiểm Npgsql read-only thành công ở repo Marixa; không sửa secret hoặc truy cập DB NTC trong lượt này (chỉ đọc đường dẫn CA local đã kiểm ở lượt trước). Validator NTC trước/sau sửa: 46 Markdown/149 links/0 errors. Khối PowerShell parse 0 lỗi, builder round-trip password giả có ký tự đặc biệt/Unicode và JSON stdin PASS; không chạy nhập password thật qua toàn khối tương tác. Marixa chạy FoundationTests 10 PASS bằng dữ liệu giả, không test fixture cloud. Migrations/tài khoản/rollout vẫn theo các entry và runbook riêng, không suy từ kết nối.

## Apply Supabase migrations và tạo dữ liệu mẫu — 2026-10-18 (CURRENT)

Người dùng trực tiếp yêu cầu kết nối Supabase, áp dụng migrations và tạo5accounts/note mẫu. Yêu cầu này cho phép provisioning cloud cụ thể; không phải chuyển dữ liệu SQLServer hoặc deploy app. Đọc AGENTS/docs/skill Supabase, dùng User Secrets hiện có và CA VerifyFull; target được kiểm đúng ref nxqupzwqawujtgeuvvcj/session host5432/user/database. Không yêu cầu lại password và không in secret. Lưu metadata project/session host và password demo ngẫu nhiên riêng trong User Secrets, giữ nguyên database password.

Explicit CLI --initialize-supabase --seed-test-accounts thành công:3EF histories PostgreSQL cũ đã apply trong schema ntc, pending0; không sửa migrations lịch sử. Guard schema trống trước apply, giữ schema public/auth; thu hồi PUBLIC/anon/authenticated quyền schema/table. Tạo5Identity accounts đã xác minh:admin@ntc.example.test(Admin+User),user01..04@ntc.example.test(User). Không dùng Supabase Auth; không gửi email hoặc bật worker. Giữ nguyên hashes mọi appsettings API/Razor trước/sau; không truy cập/chuyển SQLServer data.

Mở rộng DemoAccountSeeder/DemoNotes để seed5notes+3labels cho từng account trong cùng transaction/advisory lock. Mẫu English gồm rich text có màu chữ/ghim, checklist, plain ideas, untitled vàtrash. Tổng25notes(20active/5trash),15tags và25NoteTag owner links. Dùng ContentRules hiện hành tạo plain projection/validate emoji/color; clock qua TimeProvider. Identity content marker chỉ đánh dấu hoàn thành một lần, không tạo lại/ghi đè mẫu đã sửa hoặc xóa. Collisions tài khoản thật/password/state không phù hợp vẫn dừng, không reset/unlock/promote.

Credentials đã lưu artifacts/supabase/test-accounts.local.json bị Git ignore, đồng thời DemoAccounts:Password trong User Secrets; không đưa password vào docs/Git/chat. File artifacts/supabase/provision.local.log chỉ giữ local. Không cần cấu hình profile appsettings.Supabase.Local.json để chạy API vì User Secrets đã sẵn. Hướng dẫn/commands/data inventory đã cập nhật tại SUPABASE-SETUP và SUPABASE-DOTNET-COMMANDS.

Verification thực tế: Npgsql read-only transaction kiểm3applied/0pending, password hashes/roles/verified/active của5users,5notes(4active+1trash)/3labels mỗiuser, canonical projection vàsame-owner links PASS; anon/authenticated không có schema/table grants PASS. HTTP loopback API port5188→Supabase:5login vàlist note/trash/tag PASS, admin đọc note user01 trả404. Cleanup script đầu thiếu Bearer ở logout nên401; đã sửa dùng authenticated revoke-all cho5demo accounts vừa tạo và chạy lại toàn bộ HTTP thành công, thu hồi cả các phiên verification trước. Server verification được dừng; không để app test chạy nền hoặc gửi SMTP.

Evidence: focused7DemoAccountTests PASS; thêmcase sample/private/valid/rerun sau edit/hard-delete giữ nguyên thay đổi vàkhông gửi mail. Strict Release build0warnings/0errors PASS. Fullsuite95PASS/0FAIL/1SKIP,total96,33s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_58_37.trx. SKIP vẫn là PostgreSQL regression fixture thiếu connection test biệt lập, không dùng owner DB thay vào. Cloud kiểm riêng chỉ dữ liệu mẫu có chủ đích. Chưa chạy React browser→Supabase, SMTP/Google thật, deployment, backup/restore hoặc SQL→PG transfer. Source/docs chưa commit/push.

Kiểm cuối:46Markdown/149local links/0errors; git diff --check PASS (chỉ thông báo normalization LF/CRLF file config source), credentials/scripts/evidence artifacts bị ignore. Đối chiếu hashes appsettings giữ nguyên; manifest có đủ5password entries, không in ra; port5188 đã ngừng. HTTP đọc notes phát cảnh báo EF MultipleCollectionIncludeWarning, chưa chỉnh query splitting trong task seed; không có lỗi đọc/count/ownership, tối ưu query là việc riêng khi đo tải.

## Kiểm tra kết nối Supabase thực tế — 2026-10-18 (CURRENT)

Theo yêu cầu người dùng kiểm tra vào được chưa, đọc config User Secrets nhưng không in connection/password: provider PostgreSQL, đúng session host aws-0-ap-northeast-1.pooler.supabase.com, VerifyFull, password không còn placeholder. Chỉ chạy explicit --check-supabase; không --initialize-supabase/--seed-test-accounts, không migrate, không ghi SQL hoặc gửi mail.

Lần đầu TLS handshake FAIL. Probe PostgreSQL SSLRequest/TLS không gửi password, callback luôn từ chối kết nối để chỉ đọc certificate metadata: hostname hợp lệ, RemoteCertificateChainErrors/UntrustedRoot; leaf *.pooler.supabase.com, chain Supabase Intermediate2021→Supabase Root2021. Tải CA public qua HTTPS từ Supabase certificate distribution, kiểm subject/root và hạn2031-04-26, SHA256807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA. Bổ sung Root Certificate, giữ VerifyFull; không Trust Server Certificate hoặc tắt xác minh.

CA lưu bền ở %LOCALAPPDATA%/NoteTatCa/certificates/supabase-prod-ca-2021.crt, không cài vào trust store toàn máy. Chỉ cập nhật ConnectionStrings:MyCnn trong User Secrets để trỏ CA; giữ nguyên host/user/database/password/SSL mode. Kiểm lại bằng cấu hình đã lưu, không override connection ở process: PASS, thông báo Supabase connected with TLS. Pending EF migrations:3. Xác nhận network/TLS/database authentication của Npgsql trên project ntc hoạt động; schema NTC và5test accounts chưa được tạo bởi lần kiểm tra này. Không coi đó là full API/browser/cloud deployment verification.

Logs lỗi chẩn đoán trước sửa ở artifacts/supabase/*.local.log bị Git ignore; không publish logs hoặc secrets. Cập nhật trạng thái Supabase docs từ chưa kết nối sang kết nối read-only PASS/migrations pending. Không commit/push, deploy hoặc thay đổi database/schema/data trong tác vụ check.

## Chuẩn hóa lệnh chung .NET/Supabase theo Marixa — 2026-10-18 (CURRENT)

Người dùng muốn dùng lại các lệnh dotnet user-secrets như Marixa và tài liệu cho project mới, thay vì mặc định script riêng NTC. Đã đọc M.API.csproj, DatabaseConfig/PostgresConnectionString của repo marixa_aspnet_react: có UserSecretsId và keys Database:Provider/ConnectionStrings:MyCnn. Chỉ đọc repo Marixa, không sửa secrets/schema/Storage hoặc code của nó. Dòng node run-migrations thuộc Marixa_Workforce/ref lasdnfytejntonjfkspv, khác ntc vàmarixa001; ghi rõ không phải lệnh migration chung.

Chạy dotnet user-secrets init cho NTC.API để thêm UserSecretsId5fd8c2b4-3a1b-4d28-950f-aad3848a849b vào csproj; không lưu database password thật hoặc đổi4appsettings local. WebApplication.CreateBuilder tự đọc User Secrets trong Development; tài liệu nêu thứ tự ưu tiên, production dùng host env, remove đúng2keys khi quay về SQLServer. Keyword Npgsql connection string là mẫu chung không phụ thuộc URI adapter; NTC bổ sung normalize sslmode verify-full/verify-ca theo URI chuẩn và reject invalid enum không echo secret.

Tạo [lệnh chung](SUPABASE-DOTNET-COMMANDS.md) với ví dụ NTC/Marixa, variant nhập password ẩn/JSON stdin và boundary migration/seed. Lưu mẫu generic riêng D:\My Project\docs_mau\SUPABASE-DOTNET-COMMANDS.md; cập nhật danh mục/worklog thư viện mẫu, không chép project refs/keys/password thật vào template. SUPABASE-SETUP/10/17 cập nhật User Secrets là chuẩn chính; script riêng vẫn tùy chọn. NTC initialization/5demo accounts giữ explicit CLI của backend, không giả Node runner dùng chung hoặc Supabase Auth.

Evidence: strict Release build0warnings/0errors PASS;4normalize connection/TLS/password tests mới PASS. Full suite94PASS/0FAIL/1SKIP PostgreSQL,total95,30s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_33_00.trx. CLI user-secrets JSON stdin/set/list read-back PASS bằng temporary ID synthetic riêng và clear sau kiểm, không đọc store/secrets của user hoặc Marixa. Đối chiếu4API/Razor local config hashes nguyên byte. Docs NTC46Markdown/146links/0errors trước entry này; thư viện mẫu40Markdown/162links/0errors. Kiểm lại links/whitespace trước bàn giao. Chưa kết nối Supabase cloud, chưa tạo5cloud accounts, chưa migrate/deploy/commit/push trong tác vụ này; user cần nhập password và chạy các lệnh đã cung cấp.

## Supabase project ntc và explicit test accounts — 2026-10-18 (CURRENT)

Người dùng cung cấp organization kunheo/project ntc/reference nxqupzwqawujtgeuvvcj, URL/publishable key/direct/session endpoints; yêu cầu cấu hình Supabase và5account có sẵn, sau đó chọn nhập database password ẩn ở máy và yêu cầu lệnh copy chạy. Giữ .NET Identity, PostgreSQL schema ntc; publishable key không dùng làm DB password và không đưa vào React vì API truy cập DB trực tiếp. Supabase connector get_project trả permission error; không có cloud access hoặc password ở phiên này, chưa kết nối/migrate/seed cloud và không báo5account thật đã tạo.

Thêm scripts/Use-Supabase.ps1: -Configure đọc SecureString, lưu profile appsettings.Supabase.Local.json bị Git ignore; Npgsql session host5432 do user cấp, VerifyFull TLS, pool10, connection builder xử lý ký tự đặc biệt. Môi trường chỉ override trong child process và restore cả PowerShell5.1/7; SQLServer/Razor config4hash đối chiếu nguyên byte. -Check chỉ đọc; -Initialize explicit apply EF PostgreSQL histories vào schema mới, dừng schema có bảng/pending cần review; thu hồi PUBLIC/anon/authenticated grants schema ntc. Không chuyển dữ liệu SQLServer, không bật worker hoặc gửi email.

Thêm explicit operator CLI --seed-test-accounts qua DemoAccountSeeder:1Admin+User và4User, email .test, password random private được giữ khi configure lại. UserManager hash/role/profile/audit trong transaction, PostgreSQL advisory lock, Identity claim marker; rerun idempotent, không reset/unlock/adopt account có sẵn. Guard nonproduction+enabled, no startup/HTTP seed. Schema/target CLI kiểm project host/user/port/postgres database/VerifyFull trước thao tác. Password manifest chỉ ghi sau dotnet success. Runbook/copy commands tại [SUPABASE-SETUP](SUPABASE-SETUP.md).

Evidence: strict Release build0warnings/0errors PASS.6DemoAccountTests PASS, gồm actual HTTP login của5users, admin không đọc note user khác, no email, rerun không đổi hash/stamp/audit, collision/flag/production/password guards. Full suite sau6case mới86PASS/0FAIL/1SKIP PostgreSQL,total87; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_03_19.trx.4target guard tests thêm sau đó PASS riêng, TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_15_04_54.trx; không giả đã rerun full91. Script smoke với fake dotnet/password tại artifacts subfolder riêng PASS trên WindowsPowerShell5.1 vàPowerShell7, test quoting/config/CLI flags/5manifest/env restore, không gọi DB/network. EF idempotent PostgreSQL export PASS artifacts/supabase-schema-review.sql; không apply. Docs/link/whitespace kiểm lại trước bàn giao. Source changes chưa commit/push.

Đã đọc Supabase skills/changelog/current docs; TLS HTTP breaking-change10/11/2026 không tác động kết nối Npgsql/PostgreSQL này; không cài Supabase Auth/SDK chỉ vì project có publishable key. Sau khi user chạy setup với password local: kiểm log success +5Identity accounts, schema/ownership, đọc private manifest để login; cloud PostgreSQL runtime vẫn NOT VERIFIED trong phiên này. Local/appsettings config không đổi, schema/migration histories cũ không sửa.

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
