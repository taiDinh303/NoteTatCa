# React NoteTatCa — triển khai 2026-10-18

> CURRENT: đã triển khai React tại ntc_react theo yêu cầu người dùng. Kiểm chứng local được ghi ở cuối; cloud/external providers chưa phát hành.

## Phạm vi và kiến trúc

User chỉ đường dẫn Razor cũ NoteTatCa/NTC.VIEW; thư mục đã được user đổi tên nên nguồn thực tế ntc_aspnet/NTC.VIEW. Giữ toàn bộ Razor, local config và database thật. React tại ntc_react theo yêu cầu mới, thay hướng NTC/ntc_react cũ. UI English. Không deploy, commit/push hoặc tự migrate dữ liệu thật.

React/TypeScript/Vite; React Router SPA; TanStack Query cache theo user, invalidation có mục tiêu; Tiptap schema tương thích backend; dnd-kit pointer/keyboard; Radix dialogs/menu. Domain model/types → HTTP repositories → application services → hooks/components/pages. Class/OOP cho session store, API client, repositories và autosave coordinator; React function components/hooks cho rendering, không dùng inheritance để chia sẻ UI.

Đọc43 Markdown và inventory Razor; ánh xạ landing/privacy/error/auth/login/register/OTP/forgot/reset/confirm-email-change/Google/password verification, notes/trash, profile edits và account/security. Bổ sung reminders/inbox/sessions/admin users/roles/audit/statistics theo API đã triển khai. Không thêm sharing/archive/attachments/AI vì ngoài phạm vi đã chốt.

## UX và an toàn dữ liệu

Sidebar desktop/mobile drawer, workspace search/grid/list, labels/filter/pinned, modal rich editor, label/reminder/confirmation dialogs, skeleton/empty/error/retry, toast và reduced-motion. Cache memory giữ dữ liệu khi chuyển trang; tải phân trang, không ép tải toàn bộ database trước khi dùng. Drag chỉ khi có toàn bộ nhóm và không filter làm sai neighbors; có phương án bàn phím/move controls. Optimistic actions rollback và xác nhận ACK; version409 giữ draft, không overwrite tự động.

Autosave single writer, debounce; serialize saves với version mới nhất, giữ snapshot create/idempotency key khi retry mất ACK. Save thủ công, trạng thái dirty/saving/saved/error/conflict; close/navigation bảo vệ draft. Markdown shortcuts/import/export có cảnh báo mất định dạng. Content cũ plain luôn chuyển bằng text nodes, không parse HTML tùy ý.

Access token memory; refresh token trong sessionStorage theo tab, không localStorage mặc định; một refresh request đang chạy được chia sẻ. Remember tab chỉ thay lifetime server, không hứa giữ phiên sau khi đóng browser. Cache không persist notes; clear khi logout/user đổi. Session expired vẫn giữ draft trong editor cho reauthentication, không mở note cached của account cũ cho account mới. Google client ID từ public env, không fake login khi thiếu config. Browser tabs không tự chia sẻ refresh family.

## Kiểm thử và ranh giới

Build/typecheck/lint/unit tests cho session refresh và autosave races; browser Playwright kiểm pointer/keyboard/modal, CRUD/autosave409/labels/pin/reorder/reminders/trash/restore/profile/account/session/admin, responsive/console. Fixture host riêng loopback dùng WebApplicationFactory + SQLite/fake Google/email; không sử dụng DB người dùng. E2E phải ghi rõ fixture khác external Google/SMTP thật. CSS/visual QA trên desktop/mobile; không coi screenshot hoặc build thay end-to-end.

Nguồn thư viện: [Tiptap StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [TanStack optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates), [dnd-kit accessibility](https://dndkit.com/legacy/guides/accessibility/).

## Ánh xạ Razor và module mới

Nguồn kiểm: toàn bộ Pages/*.cshtml và partials trong ntc_aspnet/NTC.VIEW. Razor được giữ nguyên; React không phụ thuộc jQuery/Bootstrap scripts của Razor.

| Razor / nghiệp vụ | Route React hiện hành | Chức năng |
| --- | --- | --- |
| Index, Privacy, Error | /, /privacy, /not-found | Landing, thông tin riêng tư, fallback 404/error |
| Auth/Login, Register | /login, /register | Email/password, Google GIS ID token, đăng ký OTP |
| Auth/ForgotPassword, SetPassword | /forgot-password, /auth/set-password | Recovery link, reset và xác nhận password |
| Email verification | /verify-email | Nhập mã, gửi lại có cooldown |
| Auth/ConfirmChangeEmail | /auth/confirm-change-email | Xác thực link đổi email, loại token khỏi URL sau thành công |
| Auth/VerifyPassword, Logout | /verify-password, /logout | Xác minh đúng tài khoản hiện tại, thu hồi phiên/clear cache |
| Auth/External/GoogleCallback | Alias /login | React GIS nhận credential rồi gọi API; không giả OAuth callback của Razor |
| Note/Index + create/edit/list/sidebar partials | /notes, /notes/:id | Note modal, rich editor, auto/manual save, pin, màu/icon, search, list/grid và reorder |
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

Không dùng owner DB, gửi SMTP thật, chạy Google OAuth thật, migrate dữ liệu hoặc deploy. Workflow frontend mới là cấu hình, chưa có GitHub run. Chưa commit/push thay đổi frontend. Razor cũ vẫn ở ntc_aspnet/NTC.VIEW.

Polish cuối: hiển thị ảnh profile HTTPS, fallback initials khi lỗi; clear URL không hồi ảnh cũ từ session metadata. Chạy lại lint/build sau chỉnh hiển thị.
