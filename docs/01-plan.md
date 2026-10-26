# 01 — Kế hoạch NoteTatCa

> 2026-10-17 | WORKING PLAN | Áp dụng: YES


DEC-031 cập nhật theo lựa chọn trực tiếp của chủ dự án2026-10-26: ưu tiên khít5mốc50/75/100/125/150%, cho phép width card thích ứng theo zoom và phải nội suy từng frame, không nhảy khi tính lại. Giữ lề trái/New+/heading thẳng cột, gap gốc20px desktop/16px compact và sidebar đứng yên khi zoom. Cỡ tham chiếu/sidebar chọn theo cửa sổ như trước; chọn số cột gần cỡ tham chiếu rồi tính width đích vừa hàng đầy. Đây là thay đổi đã duyệt của ràng buộc width cố định trước đó. Width thật cập nhật bằng một rAF chung, không scaleX chữ hoặc đọc bounds từng card mỗi frame; đổi cột vẫn animate vị trí. Giữ zoom danh sách50–150%, chrome/View/Edit không thuộc phạm vi zoom ngoài, content zoom riêng và không tự cuộn. Chi tiết/evidence tại [frontend](FRONTEND-IMPLEMENTATION.md) và [worklog](worklog.md).

## Quyết định hiện hành

DEC-030 (chủ dự án2026-10-25): đồng ý đưa toàn bộ đề xuất mở rộng vào roadmap, gồm realtime TASK-029, TASK-035–042 và thông báo cộng tác TASK-044; bổ sung TASK-043 AI chat tạo note/nội dung theo prompt (ví dụ từ vựng tiếng Anh chủ đề family). Tất cả PLANNED, chưa code. Quyền Editor/link public, tập công thức, dữ liệu gửi/provider AI, phương án delta/pagination và chi phí/thứ tự vẫn cần chốt trước từng đợt. Delta được hiểu là đồng bộ phần thay đổi, không phải một kiểu tìm kiếm. TASK-014/015 tiếp tục phụ trách đo tải để chọn tối ưu. Chi tiết [roadmap](ROADMAP-CONTENT-COLLABORATION.md) và [AI](32-ai-features.md).

Bổ sung DEC-029 (chủ dự án2026-10-25): đã duyệt đưa mẫu ghi chú, lọc/tìm theo loại tệp, liên kết giữa note và mục lục trong note vào kế hoạch. TASK-031–034 tại [roadmap](ROADMAP-CONTENT-COLLABORATION.md) có ví dụ, acceptance và phụ thuộc. PLANNED, chưa code; lọc loại tệp không bao gồm OCR/đọc PDF/chuyển giọng nói; mục lục không thay label. Các mở rộng tiếp theo đã được bổ sung vào kế hoạch theo DEC-030, chưa triển khai hoặc chốt thiết kế chi tiết.

DEC-029 (định hướng chủ dự án2026-10-25): tương lai hỗ trợ ảnh/video/audio, bảng, vẽ bằng bút, bình luận và mời người xem note như chia sẻ bảng tính. Đây là kế hoạch chưa triển khai, không mở quyền API hiện tại. Note mặc định riêng tư và admin không đọc nội dung; chia sẻ là grant rõ ràng của owner. Roadmap TASK-022–030, acceptance, phụ thuộc và các đề xuất cần duyệt tại [ROADMAP-CONTENT-COLLABORATION](ROADMAP-CONTENT-COLLABORATION.md). Realtime/link public/OCR/AI đã được đưa vào kế hoạch theo DEC-030; chi tiết thiết kế chưa chốt. Yêu cầu tương lai này mở rộng giới hạn không-sharing của bản đầu, không thay runtime/policies trước khi có thiết kế và tests.

DEC-028 (chủ dự án2026-10-24): thêm nút Try guest mode trên landing và route `/guest` cho người xem CV thử không tài khoản. Guest có notes/labels mẫu, editor/CRUD/search/pin/reorder/trash30ngày và local persistence/offline, không server credentials hoặc quyền API anonymous mới. Khi đăng nhập customer, hỏi copy vào account; có thể để sau, bản gốc chỉ clear sau thành công. Chi tiết hiện hành và evidence tại FRONTEND-IMPLEMENTATION/worklog. TASK-021: guest local + copy an toàn, triển khai lượt này; không mở public sharing/cộng tác hoặc tài khoản demo dùng chung.

Cập nhật2026-10-24 theo yêu cầu trực tiếp: trash note đổi từ7sang30ngày, tính từ DeletedTime UTC; restore chỉ trước cutoff, purge khi đủ30ngày. Áp dụng cả note đang trong trash chưa bị purge, không reset DeletedTime hoặc phục hồi note đã xóa hẳn. Chính sách này độc lập với kế hoạch xóa tài khoản30ngày.

| ID | Nội dung | Trạng thái / nguồn | Ảnh hưởng |
| --- | --- | --- | --- |
| DEC-001 | Tạo docs theo đủ file docs_mau cho app ghi chú | TARGET, người dùng 2026-10-16 | Bộ tài liệu này |
| DEC-002 | Chuyển frontend sang React trong workspace NTC | TARGET, người dùng 2026-10-16 | Tách consumer API khỏi Razor |
| DEC-003 | Tạm giữ NTC.VIEW | SUPERSEDED bởi DEC-020 ngày 2026-10-21 | Source lịch sử còn trong Git |
| DEC-004 | Docs trước, rồi backend; nhiệm vụ backend được giao 2026-10-17 | TARGET, người dùng 2026-10-16 và 2026-10-17 | Đợt mới theo BACKEND-IMPLEMENTATION |
| DEC-005 | React TS/Vite ở frontend; .NET API Render, DB Supabase PostgreSQL tương lai, React Vercel; giữ Identity | TARGET Q-008/019 | ADR-002/003; SQL Server hiện tại chưa đổi |
| DEC-006 | Note riêng từng tài khoản; admin quản lý/khóa user và thống kê, không đọc nội dung note | TARGET Q-001/007 | Ownership, không chia sẻ/team |
| DEC-007 | Git root NTC, một docs tại root; backend giữ ntc_aspnet | IMPLEMENTED theo yêu cầu trực tiếp 2026-10-17, nối tiếp Q-025 | Giữ HEAD/history/remote và thay đổi đang làm; cập nhật CI/Docker/scripts |
| DEC-008 | Unified rich editor: plain/checklist/rich/Markdown shortcuts, màu chữ/emoji/emoji đại diện; conversion cảnh báo | TARGET Q-003/020/021 | Schema version/renderer; bản hiện tại chưa upload ảnh, xem DEC-016 |
| DEC-009 | Autosave, trạng thái lưu rõ; bỏ Save thường theo DEC-018 | Q-023 cập nhật bởi user2026-10-20 | Version/conflict/idempotency, Retry save khi lỗi |
| DEC-010 | Trash 30 ngày, restore/xóa hẳn sớm; reminder in-app/email có lặp, timezone user, catch-up 24 giờ | TARGET Q-005/006/024 | Jobs/retention/notifications |
| DEC-011 | Giữ tài khoản/note cũ; mặc định UI tiếng Anh; hướng public nhỏ | TARGET Q-022/025, ngôn ngữ mở rộng tại DEC-024 | Migration an toàn, nội dung UI và vận hành |

## Quyết định bổ sung 2026-10-18

DEC-016: chủ dự án yêu cầu chuẩn bị SUPABASE__URL/SUPABASE__SERVICE_KEY cho ảnh note tương lai; mới cấu hình dự phòng, chưa giao triển khai upload trong lượt này. Giữ private owner/bucket; không dùng ảnh public như attendance Marixa. JWT issuer/audience/TTL và Swagger/demo lấy JSON Production; BackgroundJobs true ở cả hai project. Source/template/docs cập nhật, dashboard/deploy chưa thao tác trong lượt này.

## DEC-017 — Quản trị độc lập (2026-10-19)

Chủ dự án yêu cầu admin chỉ làm quản trị, đăng nhập từ cùng form ứng dụng nhưng mở khu `/admin`; không dùng như khách tạo note. Quyền Admin ưu tiên ngay cả account lịch sử có cả Admin/User. React có layout/sidebar/settings riêng, không query note/tag/reminder/inbox. API áp dụng policy non-Admin trên toàn bộ controller workspace v1 và legacy; admin nhận403, người dùng khác owner vẫn404. Admin quản lý tài khoản, role/membership, lock/unlock/deactivate/restore, thống kê tổng và audit; không đọc nội dung note, không sửa/xóa nhật ký audit hoặc tự vô hiệu hóa tài khoản hiện tại. Giữ nội dung/account cũ, không migration/live-data rewrite hoặc deploy trong tác vụ code này.

## DEC-018 — Không gian tập trung vào nội dung (2026-10-20)

User yêu cầu bỏ toast thành công kiểu Note pinned, editor mặc định toàn viewport và có nút phóng to/thu nhỏ theo yêu cầu bổ sung cùng ngày, bỏ Save và dấu× đóng trùng Close; title rỗng không hiện Untitled/input, có Add title khi cần; đếm ký tự nằm cố định góc dưới. Trang notes bỏ header giải thích/New note, chỉ dùng Take a note; user xác nhận bỏ luôn Create your first note ở empty state. Bổ sung cùng ngày: bỏ tiêu đề/mô tả đầu trang Reminders/Inbox và heading nhìn thấy của Trash/label, giữ thao tác/cảnh báo và heading cho screen reader. Sidebar có nút ẩn/hiện desktop nhớ lựa chọn trên máy, mobile vẫn drawer, cùng icon ba gạch ngang; YOUR LABELS+icon thành một nút chung, bỏ Create a label trùng. Giữ trạng thái autosave/error/conflict, Retry save khi lỗi và bảo vệ draft khi Close/điều hướng. Không thay API, dữ liệu, admin hoặc quyền riêng tư.

## DEC-019 — Chuẩn bị dữ liệu và trạng thái kết nối (2026-10-20)

Phần tải hết trước khi mở workspace và giới hạn cache memory là CURRENT lịch sử; TARGET mới tại DEC-025/026 ngày2026-10-24 thay các phần này khi triển khai. Giữ nguyên các bảo vệ ownership/session/draft.

Theo yêu cầu chủ dự án, sau login/khôi phục phiên tải đủ các trang notes active/trash, labels, reminders, inbox, unread count và hồ sơ trước khi mở workspace. Tối đa bốn luồng tải, tuần tự từng trang trong mỗi collection; tiến trình dựa trên collection/trang hoàn tất. Cache chỉ trong memory của tab đến logout/đổi account/nhóm quyền; labels/pin/search lấy danh sách ban đầu từ notes đã tải đủ, không gọi một API cho từng label. Cache được làm mới nền và invalidation khi sửa; không cam kết dữ liệu là một snapshot transaction hoặc truy cập offline bền vững. Account có nhiều note/nội dung lớn sẽ mất nhiều thời gian/bộ nhớ ở bước đầu.

Login/Google/refresh kiểm tra GET health trước khi gửi credentials/token: một probe dùng chung, timeout/backoff hữu hạn, không tự retry POST/ghi chú. Có animation khi chuẩn bị/chờ kết nối, thông báo offline/API chậm và nút retry khi thất bại; không khẳng định server chắc chắn ngủ chỉ từ lỗi mạng. Giữ editor/draft khi outage, chỉ hết phiên khi server xác nhận auth không hợp lệ. Không thêm keep-alive định kỳ để chống sleep; polling chức năng inbox/unread hiện có vẫn giữ. Admin chỉ preload me/statistics và module quản trị, không note/label/reminder/inbox. Không migrate/deploy hoặc đổi dữ liệu cloud.

Bổ sung cùng ngày theo ảnh user: hiện dòng nhỏ cho từng tác vụ notes/labels/account/reminders/trash/inbox, với trạng thái waiting/loading/ready/error lấy từ preparation thực tế. Progress dữ liệu có phần trăm theo số collection hoàn tất; chờ server/session dùng thanh indeterminate, không phần trăm giả. Icon xoay bằng wrapper animation trong cả kết nối lần đầu và reconnect; reduced-motion vẫn được tôn trọng. Banner login đặt phía trên để không đè heading/form.

## Backlog theo thứ tự

| ID | Ưu tiên | Kết quả | REQ / phụ thuộc | Tiêu chí chấp nhận | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| TASK-001 | P0 | Khảo sát, cá nhân hóa đủ docs | DEC-001 | 39 file, không còn placeholder, link đúng, câu hỏi rõ | DONE: kiểm tra tại worklog |
| TASK-002 | P0 | Chốt hai vòng phỏng vấn chính | Q-001–008, Q-019–025 | Lưu câu trả lời, cập nhật yêu cầu/schema/API | DONE, câu trả lời chủ dự án 2026-10-16 |
| TASK-003 | P0 | Auth + ownership API | REQ-001/002/009, TASK-002 | 401 đúng; A không đọc/sửa/xóa dữ liệu B ở mọi endpoint | DONE backend; tests file 06, UI/cloud riêng |
| TASK-004 | P0 | Chuẩn hóa note/tag/trash contract | REQ-003–006, Q-003/004/006/013/016 | Validation, DTO thống nhất, transaction, test âm | DONE backend; tests file 06, UI/cloud riêng |
| TASK-005 | P1 | Search và loại nội dung đã chọn | REQ-007/011, Q-003/004 | Tìm đúng trong phạm vi user; editor round-trip | DONE backend; tests file 06, UI/cloud riêng |
| TASK-006 | P1 | Reminder/inbox/email và worker purge 30 ngày | REQ-008, Q-005/006/024 | Gửi đúng, không trùng, restart không mất lịch; purge không xóa note đã restore | DONE backend; tests file 06, UI/cloud riêng |
| TASK-007 | P1 | React nền tảng + luồng auth/note | DEC-002, Q-008/012/013/017 | Luồng React→API→SQL→UI có test; giữ Razor | Triển khai local; evidence FRONTEND-IMPLEMENTATION |
| TASK-008 | P1 | Migration/bảo toàn dữ liệu | Q-010 | SQL additive fixture PASS; PG baseline/model/script PASS | PARTIAL: live SQL→PG dry run/restore TODO |
| TASK-009 | P2 | Hosting/CI/backup/observability | Q-009/011 | Docker/CI/Render assets + telemetry/health | PARTIAL: GitHub/Docker/cloud/restore NOT RUN |
| TASK-010 | P1 | Admin quản lý/khóa user và thống kê không nội dung | REQ-012, Q-007 | Không đọc/sửa note người khác; lock có hiệu lực với phiên hiện tại | DONE backend; tests file 06, UI/cloud riêng |

Chủ dự án ưu tiên và giao nhiệm vụ; AI thực hiện theo phạm vi từng phiên. Hạn từng task CHƯA XÁC ĐỊNH (Q-011). Thứ tự API ưu tiên bảo vệ note trước khi mở thêm consumer React.

## Ready / Done

Ready của một hạng mục: biết actor, dữ liệu, quyền, request/response, lỗi, acceptance và câu hỏi chặn đã được giải quyết. Không cần chốt toàn bộ tính năng tương lai mới làm phần độc lập.

Done API: test nghiệp vụ/ownership trên DB test, contract tương thích consumer, cấu hình và migration rõ; cập nhật docs. Done React: chạy được luồng đã giao và giữ nhập liệu khi lỗi. Done docs không đồng nghĩa API/React hoàn thiện. Quyết định DEC-012–015 và acceptance đợt backend tại [BACKEND-IMPLEMENTATION](BACKEND-IMPLEMENTATION.md).

## Rà soát và triển khai 2026-10-17

Trình tự triển khai: foundation/auth/owner → editor/note/tag/trash → reminder/inbox/jobs → admin/provider/migration/ops → regression + cập nhật CURRENT. Frontend/cloud data cutover vẫn ngoài scope implementation đợt này.

## Quyết định đợt backend

DEC-012–015 tại [implementation](BACKEND-IMPLEMENTATION.md): scope backend, note untitled/label trùng, month clamp/catch-up/restore, quota100.000 ký tự. Backend DONE không bao gồm React, chuyển dữ liệu thật hoặc cloud release.

## TASK-011 — Rà và củng cố entities

DONE source + fixture tests, theo yêu cầu tiếp theo2026-10-17.17 entities, owner/parent composite FK, shared Identity audit, administrative audit metadata/API, delivery diagnostics/crash retry và provider migrations. Full suite67 PASS/1PostgreSQLruntimeSKIP; không apply data thật. [Phạm vi/evidence](ENTITY-REVIEW.md).

## TASK-012 — Hoàn thiện services/controllers

DONE backend local: PATCH presence/version; profile/account/session API; admin roles/deactivate/restore/search; inbox unread/bulk; input/email handling; typed Swagger và legacy trace.80PASS/1PGskip,total81, Release strict/publish/provider fixtures PASS;131 operations,43 docs sync. [Phạm vi/evidence](SERVICE-CONTROLLER-REVIEW.md). Production gates/React/data cutover vẫn riêng, không coi local tests là phát hành.

## TASK-013 — Gom Git root và docs

IMPLEMENTED theo yêu cầu chủ dự án: Git ở NTC/.git, một NTC/docs, metadata/tool/CI/deploy/scripts ở root, backend giữ ntc_aspnet. Hai bản43docs đã đối chiếu byte-identical; bản dư được archive trong .git/root-relocation-backup.287 baseline renames được stage để giữ tracking; các sửa backend/config trước đó vẫn unstaged, không commit/push. Build Release/root tool restore/restore/publish/SQL export PASS; fullsuite80PASS/1PGskip,total81 và Git preservation/fsck/bundle checks PASS. Evidence tại worklog. Các đề nghị sync hai bản trong entries cũ đã được thay thế bởi DEC-007 hiện hành.

## Đổi tên thư mục backend

Theo yêu cầu chủ dự án 2026-10-17: backend hiện là ntc_aspnet, Git root/docs root không đổi. Source/config/history giữ nguyên; CI/Docker/scripts và lệnh trong docs đã cập nhật. Bằng chứng kiểm sau đổi tên tại worklog. Không đổi tên sản phẩm/remote hoặc scaffold frontend trong tác vụ này.

## React 2026-10-18

Theo yêu cầu mới, frontend chính thức ở ntc_react; các module Razor có route/SPA thay thế và module mới theo API. Quyết định cache, editor, session và phạm vi xác minh tại [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md). Cloud/data cutover và giữ Razor là các ranh giới riêng.

## DEC-020 — Gỡ frontend Razor cũ (2026-10-21)

Theo yêu cầu trực tiếp của chủ dự án, gỡ ntc_aspnet/NTC.VIEW và project NTC.Razor khỏi solution; quyết định này thay DEC-003 giữ tạm. Frontend hiện hành là ntc_react. Source lịch sử còn trong Git; toàn bộ thư mục local gồm cấu hình chưa commit được giữ bản khôi phục ngoài repo. Không xóa dữ liệu, migrations, backend services hoặc adapter API legacy; không deploy trong tác vụ này.

## DEC-021 — Hiển thị gọn và thu phóng giao diện (2026-10-21)

Theo yêu cầu chủ dự án, bỏ badge phím tắt ⌘ K khỏi ô tìm kiếm (giữ Ctrl/Cmd+K để focus), bỏ thẻ Personal workspace/Just for you của sidebar người dùng. Thanh cuộn mảnh, bo tròn, màu theo light/dark. Theo cập nhật mới nhất cùng ngày, không đặt nút zoom riêng trên topbar; thêm mục Zoom (phần trăm hiện tại) trong menu tài khoản cho customer/admin để dễ tìm. Mục này mở dialog có ô nhập, hai nút−/+ (mỗi lần10%) và Reset to 100%; giới hạn50–150%. Ctrl + lăn chuột hoặc pinch hai ngón vẫn hoạt động và đồng bộ cùng preference. Phần trăm hiện tạm1.2giây ở giữa dưới, không chặn thao tác. Bỏ thêm khối Big ideas often start with a little note trong sidebar. Đây là preference hiển thị lưu trên từng trình duyệt, không đổi nội dung note hoặc quyền truy cập, không reload. Gesture được xử lý thành app zoom một lần, tránh chồng browser pinch; cuộn thường/một ngón và browser keyboard zoom vẫn giữ. Responsive theo không gian khả dụng sau scale; modal/editor vẫn vừa viewport.


## DEC-022 — Ghi nhớ đăng nhập không tự hết hạn (2026-10-21)

Theo yêu cầu chủ dự án, browser lưu refresh credential lâu dài để quay lại notes nhanh; bỏ checkbox Remember this tab, không lưu access token hoặc nội dung notes vào localStorage. Login/Google/refresh cấp phiên không hết hạn theo thời gian (sentinel9999-12-31 UTC giữ schema/DTO cũ); phiên cũ còn hợp lệ được nâng policy khi refresh. Access vẫn ngắn hạn/rotation/replay detection, logout/revoke/password/role/lock vẫn vô hiệu hóa phiên. Storage event đồng bộ logout/đổi user, Web Locks và BroadcastChannel tránh token rotation chéo tab. Phải đăng nhập lại nếu credential cũ đã hết hạn/thu hồi, xóa dữ liệu browser hoặc không thể lưu persistent. Không migrate data/schema hoặc tự deploy cloud.

### Mặc định khung ghi chú — 2026-10-21

Theo yêu cầu mới, Take a note mở note mới ở khung nhỏ, thay mặc định fullscreen của DEC-018. Nút Enter full screen/Exit full screen vẫn chuyển kích thước, giữ draft/autosave. Theo bổ sung cùng lượt, mở note đã lưu cũng bắt đầu ở khung nhỏ, kể cả trạng thái chờ tải note.

### Mobile editor luôn toàn màn hình — 2026-10-22

Theo yêu cầu mới thay mặc định khung nhỏ trên điện thoại: container≤800px luôn mở note mới/note đã lưu/khung chờ tải toàn màn hình, ẩn nút Enter/Exit full screen. Desktop giữ hành vi khung nhỏ và nút chuyển kích thước. Không đổi autosave/draft/API hoặc dữ liệu.

## DEC-023 — Note đã lưu mở chỉ xem, Edit mới chỉnh sửa (2026-10-22)

Chủ dự án chọn rõ chỉ nút Edit mới bật sửa; click nội dung/checklist không tự vào editor. Note mới vẫn tạo/sửa/autosave trực tiếp. Note đã lưu mở từ card hoặc deep link ?note= ở View note: hiện icon/title/nội dung rich text, giữ màu/định dạng/checklist chỉ đọc, chỉ có Edit/Close; ẩn input title, toolbar, tool chỉnh màu/nhãn/reminder, save status và counter. Mobile luôn toàn màn hình; desktop view khung nhỏ, Edit mới có các nút editor/thu phóng desktop. Giữ autosave/error/conflict/draft guards trong chế độ sửa.

Menu thẻ bỏ Open note và Pin/Unpin note, thay Add label và Add reminder; nút ghim trực tiếp và Move earlier/later/trash giữ. Add label mở hộp riêng chọn nhãn, Save labels với version lúc mở, lỗi giữ lựa chọn; Add reminder mở quản lý nhắc lịch của đúng note, không tự bật editor. Không thay backend/schema/ownership.

### Quay về View ngay trong editor — 2026-10-22

Theo yêu cầu bổ sung DEC-023: editor có nút View cạnh Close. View chờ flush autosave thành công rồi chuyển sang viewer ngay trong modal flow; lỗi/conflict giữ editor/draft, không cần Close rồi mở lại. Note mới sau lưu cũng xem/sửa qua lại được theo ID vừa tạo.

## Email trên Render Free — 2026-10-22

Chủ dự án chọn giữ Render Free và yêu cầu bổ sung gửi email qua HTTPS API. CURRENT source thêm Brevo adapter cho IEmailSender dùng chung OTP/recovery/reminder; giữ SMTP mặc định cho môi trường hiện hữu. Không đổi người nhận theo account hoặc chuyển OTP sang Google Group. Cấu hình/phê duyệt provider và gửi nhận thật PENDING: chủ dự án đang tạo Brevo và xác minh sender. Hướng dẫn/giới hạn tại [24-integrations](24-integrations.md); rollout chỉ có ý nghĩa sau khi có key/sender hợp lệ.

## DEC-024 — Đa ngôn ngữ, Privacy và header Settings mobile (2026-10-23)

Chủ dự án xác nhận chọn ngôn ngữ là đổi ngay toàn bộ giao diện: Việt, Anh, Trung, Nhật; mặc định English và ghi nhớ trên trình duyệt. Bổ sung hệ thống dịch nhãn/menu/form/editor/auth/admin/accessibility và định dạng ngày giờ; không dịch dữ liệu người dùng, không remount editor khi đổi ngôn ngữ. Ngôn ngữ ứng dụng là preference trình duyệt riêng, không tự sửa Locale của hồ sơ.

Settings có Language/Privacy/Appearance. Privacy mô tả quyền truy cập note, tài khoản/phiên đăng nhập, browser storage, email nhắc và thời hạn khôi phục; liên kết tới các chức năng có thật. Tham khảo bố cục/nội dung Joplin, Notion, Standard Notes, không đưa cam kết mã hóa đầu cuối, chứng nhận hoặc chính sách kinh doanh của sản phẩm khác vào NoteTatCa. Account export/hard delete, retention backup và thông báo pháp lý của đơn vị vận hành vẫn chưa được chốt.

Bổ sung2026-10-24: export/xóa tài khoản đã được chủ dự án chốt tại DEC-027; retention backup và nội dung cam kết vận hành vẫn cần xác định trước khi công bố thời điểm xóa hoàn toàn.

Chủ dự án chọn mobile Settings dùng header gọn ← và tên trang, thay hamburger/search, không lặp breadcrumb trong nội dung. Trang con → Settings → ghi chú; PC giữ header/sidebar. Admin có App settings với đường dẫn và liên kết self phù hợp, không truy cập workspace khách. Không đổi API/schema/config hoặc tự deploy/migrate.

## DEC-025 — Offline và đồng bộ (2026-10-24)

TARGET đã chốt bởi chủ dự án, chưa triển khai: xem/tạo/sửa note offline sau khi đã mở online và tải dữ liệu về thiết bị; tự đồng bộ khi có mạng, đồng thời có nút Sync now. Hiển thị phân biệt lưu trên thiết bị/chờ đồng bộ/đã đồng bộ/xung đột. Đăng xuất khi có thay đổi chưa đồng bộ phải cảnh báo, cho ở lại để đồng bộ hoặc tải bản dự phòng trước khi xóa dữ liệu máy; không tự bỏ draft.

Thiết kế kỹ thuật PROPOSED: app shell/static assets qua service worker, note/labels và hàng đợi ghi qua IndexedDB riêng theo account; không cache tràn lan response auth/security/admin. Version server kiểm xung đột; giữ cả bản local/server để chọn, không âm thầm last-write-wins. Queue có operation ID chống tạo trùng, thứ tự thao tác, retry có giới hạn/backoff và phối hợp nhiều tab; reconnect phải xác nhận đúng account và quyền trước khi gửi. Cache local không phải backup hoặc mã hóa đầu cuối; trình duyệt có thể xóa/thu hồi storage. Chốt chi tiết offline unlock/thời hạn cache và quota sau khảo sát, trước triển khai lưu nội dung bền vững. Khi quyền bị thu hồi mà thiết bị offline, không thể cam kết thu hồi ngay bản đã tải; khi online phải chặn sync và xử lý cache đúng chính sách.

Bản đầu giới hạn xem/tạo/sửa nội dung note; thay đổi account/security, hard delete và gửi reminder cần online. Reminder chưa lên server phải báo chưa được lên lịch. Offline label mutation/reorder/trash, đồng bộ thứ tự label giữa thiết bị và lịch sử phiên bản là backlog mở rộng, chưa tự thêm vào phạm vi bản đầu. Admin tiếp tục không tải nội dung note của người khác.

## DEC-026 — Ưu tiên dữ liệu workspace và độ phản hồi (2026-10-24)

TARGET chủ dự án: notes active và labels ưu tiên trước; vẫn tải đủ dữ liệu còn lại nhưng chạy nền khi đã vào workspace. Dữ liệu tối thiểu xác minh phiên/quyền không được trì hoãn. Lỗi trash/inbox/profile chi tiết không chặn notes; truy cập mục nào ưu tiên mục đó. Không mặc định tải toàn bộ dữ liệu Settings nhạy cảm vào cache offline. Giữ bounded concurrency và kiểm account khi session thay đổi. Optimistic updates và cache bổ sung theo từng thao tác, có rollback hoặc pending draft khi lỗi; không báo đã lưu server trước ACK. CURRENT đã có optimistic pin/reorder, chưa coi các thao tác khác hoặc full offline là hoàn thiện.

Đo baseline trước/sau: từ restore/login tới notes thao tác được, số request/payload, chuyển note/label, tải lạnh/ấm và mạng chậm/API wake. Chưa có số đo production trong lượt phân tích này; không cam kết mức cải thiện hoặc quy lỗi cho hosting khi chưa đo.

## DEC-027 — Export và vòng đời tài khoản (2026-10-24)

TARGET: người dùng tự yêu cầu xóa tài khoản, hệ thống tự xóa vĩnh viễn sau30ngày; admin được xóa ngay để chủ dự án quản lý linh hoạt. Tách rõ vô hiệu hóa (giữ dữ liệu, khôi phục được), lên lịch xóa (hiện ngày hết hạn, có thể hủy trong hạn), xóa ngay/vĩnh viễn (không khôi phục từ ứng dụng). Trash note vẫn30ngày, không dùng lẫn hạn30ngày của account. CURRENT UserService có deactivate/restore và chặn DeleteAsync; chưa có lịch purge account.

Thiết kế PROPOSED: re-auth cho yêu cầu tự xóa/hủy, confirm nguy hiểm riêng cho admin xóa ngay, chống tự xóa admin hiện tại và mất admin cuối cùng. Thu hồi phiên và dừng gửi reminder khi account chờ xóa; cung cấp luồng truy cập hạn chế để hủy/xuất dữ liệu thay vì mở lại workspace bình thường. Email tới địa chỉ đã xác minh khi lên lịch, nhắc trước hạn và thông báo khi admin xóa ngay (không làm trì hoãn xóa30ngày); dùng outbox/retry để email lỗi không làm mất trạng thái xử lý. Nội dung email không chứa note. Job purge idempotent/restart-safe, kiểm lại yêu cầu chưa hủy trước khi xóa. Rà toàn bộ quan hệ dữ liệu, audit tối thiểu/anonymization, cache thiết bị và backup trước khi triển khai; không hứa xóa backup tức thì. Không thể xóa từ xa bản export hoặc cache trên thiết bị đang offline.

Export đã được đồng ý trong trao đổi; JSON đầy đủ và Markdown dễ đọc là đề xuất trước, PDF/ảnh đính kèm để sau. Phải giữ rich content và labels, test round-trip cho JSON; export chỉ dữ liệu chính chủ. Thời điểm email nhắc, retention backup/audit và quyền admin xóa admin khác chưa được chốt, không tự suy ra quyền mới.

## Backlog tiếp theo — 2026-10-24

Tất cả dưới đây là TODO; lượt này chỉ ghi quyết định/tài liệu, không code/deploy/migrate. Làm từng đợt độc lập, mỗi đợt ghi evidence/giới hạn vào worklog.

Cập nhật lượt code tiếp theo2026-10-24 theo yêu cầu chủ dự án: TASK-014 đã tách critical/background; TASK-016/017 có bản offline customer và kiểm local, xem FRONTEND-IMPLEMENTATION/worklog. TASK-015 có coalesce outbox và cache revalidation, chưa audit/đo performance toàn project. TASK-018 mới có backup JSON phục vụ logout, chưa import JSON hoặc export account đầy đủ. TASK-019/admin deletion để sau theo lệnh mới; TASK-020 vẫn TODO. Không coi các acceptance stress/production/backup vận hành đã hoàn tất. Bảng dưới giữ phạm vi kế hoạch, trạng thái hiện hành là cập nhật này.

| ID | Ưu tiên/thứ tự | Công việc | Tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| TASK-014 | P1 / 1 | Đo tải và tách critical/background theo DEC-026 | Notes/labels dùng được khi nguồn phụ chậm/lỗi; nền vẫn tải đủ; số đo trước/sau; account switch hủy request cũ |
| TASK-015 | P1 / 2 | Rà cache, invalidation và optimistic mutations | Không refetch dư có bằng chứng; không mất draft/ghi đè ACK mới; lỗi rollback/pending rõ; multi-tab/account isolation |
| TASK-016 | P1 / 3 | Offline shell + snapshot riêng theo user | Mở lại offline sau lần online, note/label đã tải xem được; schema upgrade/quota/storage failure không mất draft hoặc lộ account khác |
| TASK-017 | P1 / 4 | Offline edits/outbox + auto/manual sync | Create/edit sống qua reload; reconnect không tạo trùng; conflict giữ hai bản; logout/export protection; revoke/đổi account không gửi nhầm queue |
| TASK-018 | P2 / 5 | Export JSON/Markdown | Owner-only, rich content không mất ở JSON, tải bản pending để bảo vệ logout, lỗi/mạng chậm có trạng thái rõ |
| TASK-019 | P2 / 6 | Self deletion30ngày + admin immediate deletion | Hủy trước hạn không purge; job chạy lại an toàn; confirm/ownership/admin guard/email lỗi được kiểm; không đổi retention note30ngày |
| TASK-020 | P2 / trước bật xóa thật | Chốt vận hành và kiểm khôi phục | Backup/audit retention, email retry, giám sát job/sync và restore drill có bằng chứng; cập nhật Privacy đúng hành vi |

Đề xuất để sau, chưa giao code: phân trang hiển thị note khi dữ liệu lớn nhưng vẫn tải nền đủ, đồng bộ thứ tự label đa thiết bị, delta sync thay tải lại toàn bộ khi có số đo, lịch sử khôi phục phiên bản. Không refactor lớn/bỏ thư viện/thêm analytics hoặc attachments chỉ dựa trên phỏng đoán. Cloud đang được chủ dự án sử dụng trên Vercel/Render/Supabase; không lấy các dòng cloud TODO lịch sử làm lý do triển khai lại. Brevo có evidence live trong worklog; backup/restore/performance vẫn cần kiểm riêng.
