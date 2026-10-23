# React NoteTatCa — triển khai 2026-10-18

> CURRENT: đã triển khai React tại ntc_react theo yêu cầu người dùng. Kiểm chứng local được ghi ở cuối; cloud/external providers chưa phát hành.

## Phạm vi và kiến trúc

### Settings ứng dụng và tài khoản — 2026-10-23

Theo yêu cầu chủ dự án, sidebar Settings mở `/settings` với ba hàng Language, Privacy và Appearance. `/settings/language` có radio English/Tiếng Việt/中文/日本語, đổi ngay giao diện ứng dụng và định dạng ngày giờ/số, mặc định English. `shared/i18n.ts` dùng external store với một storage listener chung, lưu `ntc.language.v1`, gán `html.lang`, giữ lựa chọn trong memory nếu storage bị chặn. `shared/messages.ts` có 756 source messages cùng bản Việt/Trung/Nhật; dịch ở render, không sửa DOM text hay remount editor. Menu/form/editor/auth/startup/admin được nối vào store, dữ liệu note/nhãn/tên tài khoản vẫn nguyên văn; lỗi API/provider không có trong catalog được giữ nguyên thay vì đoán nghĩa.

`/settings/privacy` hiển thị nội dung đúng chức năng NoteTatCa: quyền truy cập note theo owner, tài khoản/phiên, browser storage, email nhắc và thời hạn khôi phục; liên kết thực tới account/sessions/trash và `/privacy`. Tham khảo cách tổ chức từ [Joplin](https://joplinapp.org/privacy/), [Notion](https://www.notion.com/help/privacy), [Standard Notes](https://standardnotes.com/help/1/who-can-read-my-private-notes), không sao chép các cam kết E2EE/chứng nhận/chính sách bên thứ ba. Operator contact/legal notice/backup retention vẫn chưa chốt, không biến trang này thành chính sách pháp lý đã phê duyệt.

`/settings/appearance` có switch Dark mode chung `ntc.theme.v1` với nút desktop. Mobile Settings dùng header ← + tên trang, ẩn search/avatar/hamburger và breadcrumb nội dung; trang con quay về `/settings`, trang chính quay về `/notes`. PC giữ header/sidebar và breadcrumb. Mobile drawer không còn nút theme. Avatar Account settings tiếp tục mở `/settings/profile`, các tab Profile, Account & security, Active sessions giữ luồng riêng; mobile account pages cũng có header quay lại. Admin có App settings tại `/admin/preferences/{language,privacy,appearance}`, link security/session vào `/admin/settings/*`, không có link Trash khách. Các alias `/settings` ứng dụng của admin chuyển vào `/admin/preferences`, alias account/profile cũ vẫn vào `/admin/settings`. Backend/API/schema/config không đổi. Bằng chứng kiểm tra tại worklog.

### Màu ghi chú và màu chữ tự động — 2026-10-23

Theo yêu cầu chủ dự án, NoteColorPicker bỏ dãy preset: có một hàng native picker dạng ô vuông bo góc cùng kiểu saved swatch → mã hex → nút icon lưu → nút icon Apply (✓), hai nút cùng kiểu/kích thước. Default nằm cùng danh sách Saved colors, hiển thị ngắn là Default, tiếp theo là mã màu đã lưu và nút xóa. Bỏ dòng mô tả lưu màu trên trình duyệt; chỉ hiện lỗi lưu nếu thực sự xảy ra. Mã 3/6 chữ số được chuẩn hóa thành #RRGGBB, không lưu trùng; `shared/savedColors.ts` lưu theo userId tại `ntc.saved-note-colors.v1:{userId}` trên trình duyệt, không gọi API hoặc sửa note khi chỉ xóa màu đã lưu. Có listener storage và cảnh báo nếu browser không lưu được; không hứa đồng bộ màu giữa thiết bị.

Menu Text color có Automatic và Custom color. Automatic dùng unsetColor để bỏ đúng thuộc tính màu của đoạn đang chọn hoặc stored marks cho lần gõ tiếp; giữ font size/bold/italic và các marks khác. Chữ không có màu thủ công kế thừa notePalette theo nền note trong editor/viewer. Để reset toàn note, chọn toàn bộ nội dung rồi Text color → Automatic. Đổi nền không tự ghi đè các màu chữ thủ công.

PROPOSED, chưa triển khai: card preview cùng màu nền và giữ màu chữ/đậm/nghiêng để nhận diện nội dung, nhưng giới hạn cỡ chữ và số dòng; note mở hiển thị đầy đủ định dạng gốc. CURRENT card vẫn dùng plain-text projection và typography card riêng. Phần đánh giá ảnh 1–3 chưa được biến thành yêu cầu sửa preview.

### Khu quản trị độc lập — 2026-10-19

Theo DEC-017, `/login` dùng chung; `homePath` chọn `/admin/overview` khi có role Admin, còn lại `/notes`. Admin+User lịch sử vẫn là quản trị. Router có hai layout/guards riêng: AdminShell chỉ tải metadata account/admin modules, AppShell chỉ dành non-Admin. Direct links `/notes`, `/trash`, `/labels/*`, `/reminders`, `/notifications` của admin chuyển về overview; non-admin vào `/admin/*` chuyển về notes. `/admin` có index, deep-link reload dùng session refresh; `/settings/*` cũ của admin chuyển sang `/admin/settings/*` giữ query.

Admin có overview/tổng hợp + shortcuts, accounts tìm kiếm/phân trang/create/detail/lock/unlock/deactivate/restore, role/membership CRUD theo API, audit filter/action/target link, hồ sơ/bảo mật/phiên tại `/admin/settings/{profile,account,sessions}`. Không có sidebar nhãn, tìm note, inbox, nút tạo note hay polling dữ liệu cá nhân trong AdminShell. Layout mobile có drawer riêng, dark theme/account menu/reauth dialog dùng thành phần chung. Admin không thể tự khóa/deactivate hoặc bỏ role Admin của mình; built-in roles/audit giữ bảo vệ phía API.

Khi cùng user thay đổi nhóm Admin/non-Admin qua login/refresh, AuthService clear cache và đổi request identity để bỏ response cũ đang bay; quyền server vẫn đọc role hiện tại từ DB mỗi request. Frontend guard không thay authorization: API workspace v1/legacy áp dụng CustomerWorkspace policy, từ chối Admin403 kể cả có thêm User; self profile/security/sessions và admin metadata vẫn dùng được. Dữ liệu note cũ được bảo toàn, chưa triển khai lên cloud trong tác vụ này. Kết quả kiểm mới ghi trong worklog.

User chỉ đường dẫn Razor cũ NoteTatCa/NTC.VIEW; thư mục đã được user đổi tên nên nguồn thực tế ntc_aspnet/NTC.VIEW. Yêu cầu giữ Razor ban đầu đã được thay bởi DEC-020 ngày 2026-10-21: gỡ NTC.VIEW khỏi repo/solution; giữ bản khôi phục local ngoài repo và không thay database thật. React tại ntc_react theo yêu cầu mới, thay hướng NTC/ntc_react cũ. UI English. Không deploy, commit/push hoặc tự migrate dữ liệu thật.

React/TypeScript/Vite; React Router SPA; TanStack Query cache theo user, invalidation có mục tiêu; Tiptap schema tương thích backend; dnd-kit pointer/keyboard; Radix dialogs/menu. Domain model/types → HTTP repositories → application services → hooks/components/pages. Class/OOP cho session store, API client, repositories và autosave coordinator; React function components/hooks cho rendering, không dùng inheritance để chia sẻ UI.

Đọc43 Markdown và inventory Razor; ánh xạ landing/privacy/error/auth/login/register/OTP/forgot/reset/confirm-email-change/Google/password verification, notes/trash, profile edits và account/security. Bổ sung reminders/inbox/sessions/admin users/roles/audit/statistics theo API đã triển khai. Không thêm sharing/archive/attachments/AI vì ngoài phạm vi đã chốt.

## UX và an toàn dữ liệu

DEC-023/2026-10-22: note đã lưu mặc định View note chỉ đọc, chỉ nút Edit bật editor; note mới vào editor ngay. DEC-018/2026-10-20: editor desktop mặc định khung nhỏ cho cả tạo/mở note, có nút Enter full screen/Exit full screen; từ2026-10-22 mobile (container≤800px) luôn toàn màn hình và ẩn nút chuyển kích thước, giữ nguyên draft/editor khi đổi kích thước. Không có dấu×đóng trùng Close. Title rỗng không hiện ô nhập/Untitled; Add title mở và focus ô nhập, xóa title rồi blur sẽ thu lại mà không mất content. Cards không in Untitled khi title rỗng (nút mở vẫn có accessible name). Counter ở footer cố định góc dưới, không chạy theo content scroll. Save thường được bỏ; lỗi mới hiện Retry save; Close chờ flush bản đang sửa, nếu lỗi/conflict giữ draft và hỏi tiếp. Không hạ guard409/idempotency/unsaved navigation.

Notes chỉ có Take a note, không Your personal space/Your notes/câu mô tả/New note/Create your first note; heading Notes/Trash/label/Reminders/Your inbox giữ dạng screen-reader-only; các tiêu đề/mô tả đầu trang lặp với sidebar không hiển thị. Search/reminder-filter vẫn có ngữ cảnh ngắn. Desktop sidebar ẩn/hiện bằng nút topbar và nhớ ntc.sidebar.hidden.v1; mobile có drawer riêng; cả desktop và mobile dùng icon Menu ba gạch ngang. Nút Mark all as read và cảnh báo giữ note trong Trash bảy ngày vẫn hiển thị. YOUR LABELS/icon là cùng một button/cursor quản lý labels, không Create a label trong sidebar. Bỏ routine success toasts của note/editor/label/reminder; lỗi/info hướng dẫn, self-security/admin acknowledgements giữ nguyên. Lưu preferences không chứa nội dung note/token.

Sidebar desktop/mobile drawer, workspace search/grid/list, labels/filter/pinned, modal rich editor, label/reminder/confirmation dialogs, skeleton/empty/error/retry, toast và reduced-motion. DEC-019 thay cơ chế chỉ tải trang khi mở bằng preparation tải đủ workspace riêng của account ngay sau login/restore. Cache memory giữ dữ liệu khi chuyển trang; API vẫn phân trang, không tải dữ liệu user khác. Drag chỉ khi có toàn bộ nhóm và không filter làm sai neighbors; có phương án bàn phím/move controls. Optimistic actions rollback và xác nhận ACK; version409 giữ draft, không overwrite tự động.

Autosave single writer, debounce; serialize saves với version mới nhất, giữ snapshot create/idempotency key khi retry mất ACK. Trạng thái dirty/saving/saved/error/conflict; Retry save chỉ khi lỗi, close/navigation bảo vệ draft. Markdown shortcuts/import/export có cảnh báo mất định dạng. Content cũ plain luôn chuyển bằng text nodes, không parse HTML tùy ý.

Access token memory; refresh token lưu localStorage để mở lại browser vẫn đăng nhập (DEC-022). Có fallback sessionStorage nếu persistent storage bị chặn; chuyển phiên tab cũ còn hợp lệ khi đọc. Web Locks tuần tự refresh/logout giữa tabs; một refresh request trong tab được chia sẻ. Cache không persist notes; clear khi logout/user đổi. Session expired vẫn giữ draft trong editor cho reauthentication, không mở note cached của account cũ cho account mới. Google client ID từ public env, không fake login khi thiếu config. Browser tabs chia sẻ phiên đã lưu; storage event xóa private cache khi logout/đổi account. Web Locks cần browser hỗ trợ; fallback không bảo đảm đồng bộ rotation liên tab trên browser không có Web Locks.

## Kiểm thử và ranh giới

Build/typecheck/lint/unit tests cho session refresh và autosave races; browser Playwright kiểm pointer/keyboard/modal, CRUD/autosave409/labels/pin/reorder/reminders/trash/restore/profile/account/session/admin, responsive/console. Fixture host riêng loopback dùng WebApplicationFactory + SQLite/fake Google/email; không sử dụng DB người dùng. E2E phải ghi rõ fixture khác external Google/SMTP thật. CSS/visual QA trên desktop/mobile; không coi screenshot hoặc build thay end-to-end.

Nguồn thư viện: [Tiptap StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [TanStack optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates), [dnd-kit accessibility](https://dndkit.com/legacy/guides/accessibility/).

## Chuẩn bị workspace và kết nối — DEC-019

`WorkspacePreparation` (application) tải notes active/trash, labels, reminders, inbox qua toàn bộ pages, kèm unread count/me. Bốn luồng song song, từng page theo thứ tự; QueryClient chia sẻ kết quả và giữ đúng InfiniteData/pageParams để các hooks hiện có dùng lại. Chi tiết note/reminders được seed từ dữ liệu đã tải; `WorkspaceService.cachedNotes` tạo danh sách label/pin/search ban đầu từ master list hoàn chỉnh, không tạo request theo số label. Nếu master incomplete/invalidated, dùng API thay vì suy diễn một danh sách rỗng/thiếu.

`WorkspaceReady` chờ preparation và các module workspace chính trước khi mở layout; editor/label dialog được warm background. Progress là số collection/trang thực nhận, không phần trăm theo thời gian giả. Resource lỗi giữ màn hình retry/sign-out, retry dùng lại collection đã tải thành công. Không tải personal content cho Admin: chỉ me/admin-stats và module quản trị. Module tải lỗi cho phép reload chủ động để lấy bundle mới; điều hướng thông thường vẫn SPA.

Bổ sung UI theo ảnh2026-10-20: `PreparationSnapshot.tasks` mô tả resource và waiting/loading/ready/error; UI hiện Loading notes…, Loading labels…, Loading account details… hoặc trạng thái đã xong/chờ/lỗi đúng lifecycle. Khi collection thất bại, các tác vụ bị hủy ngừng icon chạy; reset/retry/đổi account xóa trạng thái cũ. Tổng phần trăm là completed/total collections, không tỷ lệ byte tải. Admin chỉ có hai tác vụ của mình. `ConnectionSpinner` animate wrapper bằng connection-turn, kể cả reconnect còn giữ problem cũ; `ConnectionProgress` là indeterminate khi đợi server/session/application, không aria-valuenow giả. Banner có mô tả bước kết nối/attempt và đặt cao hơn ở trang login để không che heading; reduced-motion dừng chuyển động theo CSS chung.

Cache memory (gcTime Infinity trong phiên), mặc định fresh5phút; labels giữ staleTime2phút, inbox/unread tiếp tục polling foreground60giây. Inbox/Reminders luôn revalidate nền khi mount để thông báo/lịch mới không bị giữ ở snapshot lúc login; cached content vẫn hiển thị trong lúc GET đang chờ. Khi stale hoặc mutation, làm mới nền/invalidations mà không xóa dữ liệu đang hiển thị. Logout/account/nhóm quyền đổi hủy preparation/query, clear private cache; generation và request identity bỏ response cũ, bootstrap cũ không ghi đè phiên login mới. Refresh cùng account không remount editor. Danh sách lớn dùng nhiều RAM/băng thông và kéo dài bước chuẩn bị; không có live snapshot transaction, realtime đồng bộ nhiều tab hoặc offline durable storage. Profile/sessions/security và các trang admin ngoài overview vẫn tải chi tiết theo nhu cầu.

`ServerConnection` probe GET `/health/live` tại API origin trước login/Google/refresh. Dùng một promise chung, timeout mỗi probe≤15giây, tổng120giây, backoff1/2/4/8giây; chỉ nhận JSON status live, không coi trang HTML wake-up là API sẵn sàng. Dev Vite proxy `/health` cùng API target; fixture bridge chuyển tiếp endpoint health thật. Không gửi credentials/bearer/cookie trong probe, không replay POST/mutations và không tạo idle keep-alive. Theo [Render Free](https://render.com/docs/free), cold start là trạng thái hosting cần chờ; frontend không cam kết bỏ được thời gian khởi động. Cách seed/freshness dựa trên [TanStack prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching).

`ConnectionNotice` theo dõi request thật: sau1.5giây có animation kết nối, lỗi/offline có Reconnect. Online/explicit retry kiểm health rồi invalidates các GET query đang dùng; không tự gửi lại lưu note. Editor/draft không bị unmount do banner. Bootstrap outage giữ refresh session và Retry connection;401/403/400 auth không hợp lệ vẫn yêu cầu đăng nhập. Không lưu password, nội dung note hoặc access token thêm vào browser storage. Các animation tôn trọng reduced-motion.

## Ánh xạ Razor và module mới

Nguồn đối chiếu ban đầu: toàn bộ Pages/*.cshtml và partials của ntc_aspnet/NTC.VIEW trong Git trước DEC-020. Razor đã gỡ ngày 2026-10-21; React không phụ thuộc jQuery/Bootstrap scripts của Razor.

| Razor / nghiệp vụ | Route React hiện hành | Chức năng |
| --- | --- | --- |
| Index, Privacy, Error | /, /privacy, /not-found | Landing, thông tin riêng tư, fallback 404/error |
| Auth/Login, Register | /login, /register | Email/password, Google GIS ID token, đăng ký OTP |
| Auth/ForgotPassword, SetPassword | /forgot-password, /auth/set-password | Recovery link, reset và xác nhận password |
| Email verification | /verify-email | Nhập mã, gửi lại có cooldown |
| Auth/ConfirmChangeEmail | /auth/confirm-change-email | Xác thực link đổi email, loại token khỏi URL sau thành công |
| Auth/VerifyPassword, Logout | /verify-password, /logout | Xác minh đúng tài khoản hiện tại, thu hồi phiên/clear cache |
| Auth/External/GoogleCallback | Alias /login | React GIS nhận credential rồi gọi API; không giả OAuth callback của Razor |
| Note/Index + create/edit/list/sidebar partials | /notes, /notes/:id | Editor toàn viewport, title tùy chọn, autosave/Retry save khi lỗi, pin, màu/icon, search, list/grid và reorder |
| Note tags/manage-tag partials | /labels/:tagId + label dialogs | CRUD nhãn, nhãn trùng theo ID, gán tối đa20/note |
| Reminder partial | Editor reminder dialog, /reminders | Tạo/sửa/xóa/pause/resume, lặp ngày/tuần/tháng/năm, kết thúc/count/timezone/email |
| Note/Trash + trash partial | /trash | Đọc nội dung riêng đã xóa, restore, xóa hẳn, hạn7ngày |
| Settings/Index, Profile/Index | /settings, /settings/profile | Hồ sơ, ảnh URL HTTPS, address/locale/timezone; create profile thiếu |
| Profile/Edit/Name, Gender, Birthday | /settings/profile?edit=... | Form tích hợp, focus trường tương ứng, nullable clear/version |
| Account/Index, Edit/Email, Password | /settings/account?edit=... | Phone/email/password, liên kết/gỡ Google, xác minh link và đăng nhập lại sau thay đổi bảo mật |
| Module API bổ sung | /settings/sessions | Phân trang phiên, thu hồi một phiên/toàn bộ |
| Module API bổ sung | /notifications | Inbox, unread/count polling, đọc riêng/tất cả, mở note còn quyền |
| Module API bổ sung | /admin/overview, /admin/users | Aggregate statistics, tìm/create/lock/deactivate/restore tài khoản, quản lý memberships |
| Module API bổ sung | /admin/roles, /admin/audit | CRUD vai trò, lịch sử metadata/phân trang; không đọc note người khác |

Các alias URL Razor trong router giữ query parameters và dẫn về route tương ứng. Legacy /Note/Trash, /Auth/*, /Settings/Profile/Edit/* và /Settings/Account/Edit/* được hỗ trợ. Router xử lý lazy loading và guards; quyền thật luôn do API kiểm tra.

## Cách chạy và cấu hình

Xem [frontend README](../ntc_react/README.md), [local setup](10-setup-local.md), [environment](17-environment-config.md). Từ root: `npm --prefix ntc_react ci`, `npm --prefix ntc_react run dev`; API chạy terminal riêng bằng `dotnet run --project ntc_aspnet/NTC.API --launch-profile https` trên DB đã chuẩn bị. Browser http://127.0.0.1:5173, /api proxy mặc định localhost:5032. Không tự migrate/seed DB thật khi chạy React.

Tất cả VITE_* là public build config. Vercel tương lai dùng Root Directory ntc_react, output dist, API URL HTTPS có /api/v1 và CORS exact origin; vercel.json xử lý deep links. AppSettings__ClientUrl của API phải là React origin để email links dùng đúng route. Workflow frontend.yml chỉ kiểm thử, không deploy.

## Giới hạn phát hành còn lại

- Browser tests dùng SQLite/captured email/synthetic clock qua API .NET thật; không thay SQL Server/PostgreSQL runtime trên môi trường triển khai.
- Google client ID/audience, SMTP delivery và email-link origin thật cần cấu hình/kiểm riêng. UI vô hiệu hóa Google nếu thiếu public client ID.
- BackgroundJobs mặc định tắt trong backend; frontend tạo lịch không đồng nghĩa worker đang gửi thông báo. Muốn dùng lịch thật cần operator review jobs/uptime/SMTP/purge như docs backend.
- Không có durable offline cache, service worker, collaborative editing, attachments, full account export/hard-delete. Editor giữ draft trong memory và cảnh báo rời trang; đóng tab/reload có thể mất thay đổi chưa lưu.
- Chưa có Figma, pháp nhân/operator/contact/retention chính thức cho public privacy notice; trang privacy hiển thị giới hạn cấu hình này. Không coi bản UI là legal approval.
- CI workflow đã thêm nhưng remote GitHub run, Vercel/Render/Supabase deployment và load test chưa chạy.

## Bằng chứng local — 2026-10-18

Windows/PowerShell, cwd root NTC; Node24.21/npm11.19/.NET8 target/Chromium Playwright. Các lệnh npm dùng prefix ntc_react từ root hoặc chạy cwd ntc_react theo README.

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| TypeScript strict | npm run typecheck PASS |
| ESLint/hooks | npm run lint -- --max-warnings 0 PASS, không warning |
| Vitest | 4 files / 14 tests PASS: session vault/rotation/account-change/absolute API origin, autosave ACK/idempotency/version/conflict/StrictMode/oversize, document canonical/UTF8, private partial-page/trash cache |
| Production bundle | npm run build PASS; routes/editor lazy chunks, self-hosted fonts; RichEditor ~159kB gzip, initial JS ~161kB gzip, chưa có network performance budget/load test |
| Chromium E2E | 12 PASS (1.5 phút): SPA/mobile, rich autosave/labels/trash/restore,409 draft/copy, label CRUD/reorder menu, reminder dispatch/inbox, profile/session revoke, OTP/recovery, admin lock/role/audit, pointer+keyboard drag, Markdown checklist/import/export, network loss/retry/close guard, search/pin/theme/account isolation |
| Focused sau chỉnh copy/save | Conflict/save-as-new 1 PASS (8.3s), lại type/lint/unit/build PASS; dùng cùng autosave coordinator để chống tạo bản sao lặp khi mất ACK |
| Backend Release | dotnet build ntc_aspnet/NTC.Backend.slnf -c Release --no-restore -warnaserror PASS,0warning/0error |
| Backend regression |80PASS/0FAIL/1SKIP PostgreSQL,total81;36s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_09_48_48.trx |
| Dependency audit | npm audit --omit=dev --audit-level=moderate:0 vulnerabilities tại thời điểm chạy |
| Docs |44Markdown/136local links/0errors sau cập nhật worklog và bàn giao cuối |
| Preservation |384backend/Razor/config hashes trùng backup trước rename; index giữ287baseline R100; HEAD/main/remote không đổi |

Ảnh kiểm đã xem: artifacts/frontend/workspace-desktop.png (1280px), workspace-mobile.png (390px), workspace-dark.png. Đã tăng độ đọc secondary text/chip/date và chọn foreground theo luminance cho custom note background. Screenshot không thay các browser assertions. Chưa kiểm đầy đủ browser khác, screen reader hoặc chứng nhận WCAG.

Script kiểm rename cũ .git/verify_backend_rename.py dừng ở assertion toàn bộ refs vì Codex app tự đổi refs/codex/turn-diffs. Đã đối chiếu riêng: chỉ refs/codex thay đổi, HEAD/main/branch/remotes và staged entries giữ nguyên;384backend source/config hashes nguyên byte. Không reset hoặc sửa các app refs để làm assertion xanh.

Không dùng owner DB, gửi SMTP thật, chạy Google OAuth thật, migrate dữ liệu hoặc deploy. Workflow frontend mới là cấu hình, chưa có GitHub run. Chưa commit/push thay đổi frontend. Tại mốc kiểm ban đầu Razor còn ở ntc_aspnet/NTC.VIEW; đã gỡ theo DEC-020 ngày 2026-10-21.

Polish cuối: hiển thị ảnh profile HTTPS, fallback initials khi lỗi; clear URL không hồi ảnh cũ từ session metadata. Chạy lại lint/build sau chỉnh hiển thị.

## Display preferences — 2026-10-21 / DEC-021

DisplayPreferences ở root giữ app zoom50–150% nguyên, localStorage ntc.interface.zoom.v1. Giá trị cũ25–49 được nâng lên50; ngoài biên được clamp, không hợp lệ/lỗi storage về100%. Không có nút zoom riêng hoặc slider. ShellAccountMenu dùng useDisplayZoom/DisplayZoomContext để thêm mục Zoom (x%) cho customer/admin; ZoomDialog có number input draft, nút−/+ bước10%, Reset/Done. Nhập áp dụng Enter/blur, clamp50–150 và round; nút ở biên bị disable. Draft null hiển thị percent từ gesture theo thời gian thực; ô đang gõ được giữ. Dialog inverse scale, nút44px, đóng trả focus về avatar. Listener capture wheel passive:false chỉ xử lý Ctrl/Cmd+wheel, chuẩn hóa deltaMode; touchstart/move hai ngón tính tỷ lệ khoảng cách, touchend/cancel xóa gesture. Safari gesture events có adapter dự phòng, runtime Safari chưa kiểm. Native zoom gesture được preventDefault để không nhân đôi app zoom; một ngón/cuộn thường không chặn. Pointermove touch trong pinch không chuyển tiếp vào drag sensor để tránh vừa pinch vừa reorder.

RAF gộp các update gesture theo frame, target lưu trong ref để không mất delta nhỏ; listeners/timer/RAF cleanup trong StrictMode. Root CSS zoom/viewport container giữ responsive và viewport units bù scale cho modal/editor. HUD portal ở body, pointer-events:none, role status, vị trí giữa dưới và inverse zoom; tự ẩn sau1.2giây. Context value memoized chỉ cho control hiển thị; không remount workspace/editor, không request API mới, không lưu dữ liệu tài khoản trong preference. Setter manual dùng cùng change/bounds/HUD nhưng áp dụng ngay, hủy frame gesture cũ để Enter/blur rồi bấm−/+ dùng đúng giá trị mới. Gesture vẫn gộp RAF như trước. Popup menu khác giữ wrapper screen-pixel/content scale cũ. Đã bỏ sidebar tip theo yêu cầu; browser keyboard zoom vẫn riêng. Evidence/giới hạn mới ở worklog.

## Nút ghim trong editor — 2026-10-21

Theo ảnh/yêu cầu chủ dự án, editor hiển thị Pin khi chưa ghim và PinOff (Unpin note) khi đã ghim, đồng nhất note card. Bỏ nền active tối; nút trong suốt, màu icon theo foreground tương phản của heading, hover nhẹ từ currentColor và focus outline rõ. aria-pressed phản ánh trạng thái; giữ nguyên update/autosave/version/ownership. Không đổi nút/tag/reminder active khác. Evidence và giới hạn kiểm thử ở worklog.

## Editor: nút đồng nhất và căn giữa — 2026-10-21

Add title, Pin/Unpin và fullscreen dùng chung nền trong suốt, hover nhẹ theo foreground và focus outline; vẫn giữ trạng thái ghim qua icon/aria-pressed. Toolbar có một nút Text alignment, mở menu radio4 lựa chọn Align left/Align center/Align right/Justify. Icon phản ánh căn lề hiện tại; menu đánh dấu lựa chọn, hỗ trợ bàn phím, đóng trả focus editor/giữ vùng chọn. Áp dụng cho paragraph/heading trong vùng chọn. TextAlign cùng phiên bản Tiptap3.32.0; canonical document và API chỉ nhận textAlign left/center/right/justify trên paragraph/heading, không nhận CSS tùy ý. Dữ liệu cũ không có thuộc tính vẫn giữ nguyên. Markdown export cảnh báo mất alignment. Bộ đếm cuối editor hiển thị x / 100,000, giữ nhãn trợ năng Character count. Không cần migration. Evidence thực tế ở worklog.

## Bảng màu note thu gọn — 2026-10-21

Thanh editor chỉ có một nút cọ vẽ Note background color. Radix Popover mở lên phía trên, tránh mép viewport; bảng4 cột, ô44px, đánh dấu màu hiện tại. Chọn preset hoặc Default note color đóng bảng; Custom color mở bộ pha màu native và cập nhật autosave. Escape/click ngoài đóng bảng, trả focus trigger. Lazy editor không lấy focus từ bảng màu/menu đang mở. Không thêm hình nền hoặc đổi API/dữ liệu màu.

## Settings xem trước, Edit mới mở form (2026-10-21)

SettingsPage dùng read view cho profile/contact/password, không render input/select khi vào trang (kể cả query legacy edit). Edit là thao tác rõ ràng; Cancel unmount form, reset picture draft và error; Save thành công đóng edit, thất bại giữ form. Profile tiếp tục dùng version/cache update; email confirmation, phone update, password sign-out và connected provider/session flows giữ nguyên API. Chung component cho admin/customer, CSS riêng settings.css tránh thay style editor/workspace.

## Header editor một hàng, menu icon — 2026-10-21

Icon note, input tiêu đề tùy chọn, ghim và fullscreen nằm cùng một hàng; input co theo chiều ngang, tiêu đề vẫn tối đa150 ký tự. Chọn icon mở Radix Popover (preset/Remove icon/custom emoji), không thêm hàng vào editor; chọn preset đóng bảng, Escape/click ngoài đóng. Trạng thái autosave thường chỉ thông báo trợ năng, không hiển thị dòng All changes saved; lỗi/409/Retry save vẫn hiện và giữ draft theo quy tắc cũ. Không đổi API/schema.

## Tiêu đề luôn hiện, không placeholder — 2026-10-21

Bỏ Add title và cơ chế ẩn input khi blur rỗng. Luôn hiện input Note title trên hàng icon/ghim/fullscreen, không có placeholder, giữ aria-label trợ năng; cho để trống và giới hạn150 ký tự như cũ. Mở note vẫn ưu tiên focus content; người dùng bấm ô title để nhập. Không đổi API/dữ liệu/autosave.

Access token chỉ đồng bộ trong memory giữa tabs qua BroadcastChannel sau rotation, không persist vào localStorage. Chỉ nhận message nếu userId/refreshToken khớp credential đang lưu. Web Locks tuần tự login/Google/refresh/logout; chưa kiểm browser thiếu Web Locks/BroadcastChannel.

## Cỡ chữ thay nút Heading — 2026-10-21

Toolbar bỏ nút H2/Heading và thay bằng Font size. Menu radio có Default cùng8/9/10/11/12/14/18/24/30/36/48/60/72/96px (mặc định 11px); trigger hiện cỡ tại con trỏ/vùng chọn. Chọn cỡ áp dụng textStyle.fontSize trên văn bản đang chọn hoặc nội dung gõ tiếp, Default bỏ fontSize và giữ marks khác. Dùng FontSize từ package Tiptap text-style3.32.0 sẵn có; không thêm dependency. Canonical/API cùng allowlist preset px, từ chối giá trị CSS tùy ý. Heading cũ và Markdown headings vẫn tương thích, không migrate. Export Markdown cảnh báo mất font size.

### Note editor compact default — 2026-10-21

Desktop: EditorSession khởi tạo fullscreen=false cho cả note mới và note đã lưu; modal chờ tải note cũng khung nhỏ. Từ2026-10-22, CSS container≤800px buộc cả modal chờ tải và editor toàn màn hình, ẩn nút thu/phóng; resize không remount hoặc mất draft. Autosave lần đầu không tự phóng to vì không khởi tạo lại state từ snapshot. Giữ các nút chuyển kích thước và toàn bộ autosave/draft protections.

### Kéo thẻ khác chiều cao không co giãn — 2026-10-21

NoteCard chỉ áp dụng translate từ sortable transform, bỏ scaleX/scaleY khi rectSortingStrategy đổi chỗ thẻ có chiều cao khác nhau. Giữ kích thước/chữ/icon của cả thẻ đang kéo và các thẻ đang nhường chỗ; opacity thẻ đang kéo0.95 để đọc rõ. Không thay reorder/ownership/pinned-group/keyboard hoặc API.

## Tiêu đề cạnh icon và màu nền toàn editor — 2026-10-21

Thẻ note ngoài danh sách đặt icon và title trong cùng note-card-identity ở hàng đầu, title có thể wrap dài; cả identity và nội dung vẫn mở note, ghim/drag riêng. Không tự thêm Untitled hiển thị cho note rỗng title. Modal nhận style tùy chọn để NoteEditor truyền backgroundColor, surface và foreground theo notePalette: màu áp dụng cả header/body/toolbar/footer, default bỏ override và trở về theme. Inline màu chữ người dùng vẫn giữ. Không đổi dữ liệu/API/schema.

### Drawer mobile sát đáy — 2026-10-22

Selector .modal.navigation-drawer có độ ưu tiên cao hơn responsive .modal: giữ top/left0, height100dvh/interface-scale, max-height none và radius0 ở mọi mức zoom. Tránh rule modal≤480px giới hạn94dvh gây khoảng hở dưới drawer. Nội dung vẫn overflow-y auto để cuộn khi màn hình thấp.

### View note / Edit và card shortcuts — DEC-023 / 2026-10-22

NoteEditor tách NoteViewer không tạo AutosaveCoordinator khỏi EditorSession: saved note mặc định View note, chỉ Edit mount EditorSession; create note vẫn mount editor ngay. ReadOnlyContent dùng cùng extensions rich text với editable=false, bỏ placeholder và không onUpdate/writer; giữ title/icon/màu/font/checklist. Không content-click-to-edit. Mobile dùng cùng note-editor-modal full viewport; desktop viewer compact. Card identity accessible name View thay Edit; nội dung card vẫn Open để xem.

Card menu bỏ Open note và Pin/Unpin note, thêm Add label/Add reminder. Add label mở NoteLabelsDialog riêng, giữ snapshot/version khi mở và lựa chọn khi lỗi; Save labels dùng setLabels chỉ PATCH tagIds/version (không gửi lại nội dung), rồi workspace.commit, không bật content editor. Cancel không lưu. Add reminder mở ReminderDialog của note trước; đóng về viewer. Chỉ mount một modal khi vào reminder shortcut để tránh hai Dialog cùng mount gây aria-hidden sai. Ghim trực tiếp và reorder/trash giữ nguyên; query/cache riêng account và API ownership không đổi.

### Editor → View — 2026-10-22

EditorSession có View cạnh Close, gọi save/flush(true) hiện có; chỉ gọi onView(note) sau lưu thành công. viewing/busy chặn đóng và bấm chuyển lặp; lỗi vẫn giữ coordinator/draft/banner/conflict. NoteEditor dùng resolvedId=noteId hoặc createdId sau View của note mới, đọc note đã commit từ cache rồi chuyển về viewer; Edit lại mount session với version mới. Không đổi API/backend/ownership hoặc autosave protocol.


## Settings gọn hơn — 2026-10-22

CURRENT theo yêu cầu chủ dự án: Profile dùng một thẻ chung chứa avatar/tên/email và thông tin cá nhân; bỏ sidebar trang trí và Profile picture URL cả read/edit, giữ nguyên URL ảnh hiện có khi lưu. Desktop rộng chia thông tin ba cột, mobile một cột. Account & security gom contact/password/Google vào một khung có đường phân cách, email chỉ hiện một lần cùng trạng thái xác minh; desktop tiêu đề cạnh nội dung, mobile xếp dọc với input/nút đồng đều. Active sessions và nghiệp vụ auth/ownership/API không đổi. Áp dụng cả settings self của admin. Evidence và giới hạn tại worklog.


### Settings trải hết chiều ngang — 2026-10-22

Theo yêu cầu bổ sung với ảnh Active sessions làm chuẩn: bỏ max-width1050px của Profile/Account & security, dùng toàn chiều ngang vùng nội dung và cùng mép với settings tabs. Bỏ heading Personal details, mô tả và icon UserRound; giữ avatar/tên/email và thông tin hồ sơ. Các cột đều theo grid hiện có; mobile một cột. Active sessions không đổi. Evidence tại worklog.


### Settings: các thao tác bên phải — 2026-10-22

Theo ảnh/yêu cầu mới: bỏ heading/eyebrow/description đầu trang Settings, giữ navigation tabs. Edit profile căn dưới phải; Sign out everywhere căn dưới phải cả mobile. Account email/phone/password đã có dùng nút Change bên phải nội dung; tài khoản chưa có password bỏ câu No password is set... và thay bằng Set your password, mở luồng gửi password setup link hiện có. Google liên kết bỏ dòng Connected, giữ Disconnect/confirmation. Account contact xếp từng hàng trước khi xuống mục tiếp theo trên desktop/mobile; mobile có divider, grid nội dung co được và nút cùng mép phải. Tabs≤480px thu gap/font để đủ tên tại320px. Không đổi backend/API/auth/ownership; evidence tại worklog.
