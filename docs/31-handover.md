# 31 — Bàn giao và bảo trì

> 2026-10-17 | CURRENT backend implementation; chưa phát hành cloud.

## Tài sản

| Tài sản | Vị trí / trạng thái |
| --- | --- |
| Git root | D:\My Project\NTC; .git giữ history/remote cũ |
| Docs duy nhất | D:\My Project\NTC\docs;44 Markdown trong cùng repo |
| Backend | D:\My Project\NTC\ntc_aspnet; HEAD 176a968 + thay đổi đợt backend chưa commit/push |
| API | Legacy adapters + /api/v1, [131 operations](api-inventory.md) và health |
| Tests | NTC.Tests; evidence [06](06-testing.md), lệnh [10](10-setup-local.md) |
| Deploy assets | Dockerfile,.env.example,render.yaml,GitHub workflow; chưa deploy |
| Razor | NTC.VIEW đã gỡ khỏi repo/solution theo DEC-020 ngày 2026-10-21; source lịch sử còn trong Git |
| React | NTC/ntc_react SPA; UI English, xem FRONTEND-IMPLEMENTATION |
| Cloud | Supabase PostgreSQL/Render/Vercel đã chọn; chưa tạo tài nguyên trong phiên |

Đọc [hồ sơ](PROJECT-INTAKE.md), [implementation](BACKEND-IMPLEMENTATION.md), [API](15-api-contract.md), [security](16-security-privacy.md), [worklog](worklog.md). Giữ private owner/admin no-content, Identity, accounts/notes và migration lịch sử; nhãn trùng, untitled, quotas100k đã chốt. Không nhập nghiệp vụ HR từ Marixa.

## Việc tiếp theo

Backend source hoàn tất phạm vi đợt hiện tại; còn cổng phát hành: PostgreSQL runtime/SQL→PG dry run bảo toàn dữ liệu, Docker/CI thật, SMTP/Google thật, keyring/proxy/CORS/backup/uptime review. React đã có editor/Markdown/session/autosave409; phạm vi kiểm thực tế tại FRONTEND-IMPLEMENTATION. Không coi backend tests thay browser hoặc production verification.

Hai appsettings local khác Git từ trước được bảo toàn, không stage chúng. Database thật chưa apply migration/reset; jobs mặc định tắt. Git root đã là NTC; backend giữ ntc_aspnet.287 baseline renames đã stage; thay đổi nội dung backend/config vẫn unstaged và chưa commit/push. Các quyết định export/xóa account, offline, budget/region/deadline chưa chốt. Không hỏi lại các lựa chọn đã ghi.

## Bàn giao rà entities

Đọc ENTITY-REVIEW, migrations EnforceEntityIntegrity mới của2 provider và preflight report trước apply. Canonical email ở Identity; legacy profile.Email giữ nhưng không dùng làm quyền. Audit retention còn Q-030, no-op lock/grant-admin không tạo lịch sử trùng. Database thật/config/Razor không thay đổi;67testsPASS/1PGskip trên suite68 test.

## Bàn giao services/controllers hiện hành

Đọc [SERVICE-CONTROLLER-REVIEW](SERVICE-CONTROLLER-REVIEW.md) và API15 trước tích hợp React: tag/reminder/profile PATCH cần version, omission/null có ý nghĩa rõ; me account/profile/session và admin roles/lifecycle/inbox bulk đã có. Histories4SQL/3PG với SupportAccountReactivation nối tiếp.80PASS/1PGskip,total81; build0warnings/0errors/publishPASS.43docs tại root duy nhất,131controlleroperations. Chưa commit/push; config/Razor/database thật giữ nguyên. Các số cũ trong entries rà entities là lịch sử.

## Bàn giao cấu trúc root

Chủ dự án yêu cầu NTC là root. Đã chuyển Git/tool/CI/scripts/deploy files lên root và archive docs dư trong Git recovery backup. HEAD/main/refs/remote giữ nguyên; không có nested repository.441filehash trước chuyển đối chiếu PASS; source .NET/Razor/local config không đổi byte. Đọc root README và10 để chạy từ root. Backup riêng .git/root-relocation-backup/20261017-232836 gồm bundle/index/patch/manifest/docs; không upload hoặc coi backup này là docs dùng hằng ngày. Không commit/push trong task.

Kiểm sau chuyển root:80PASS/1PGskip,total81; Release strict0warnings/0errors, tool restore/restore/publish/SQL export PASS.43rootdocs/123links/0errors; Git fsck/bundle verify và384backend/config hashes PASS. Docker/remoteCI/cloud chưa chạy. Các file local appsettings có chỉnh sửa từ trước vẫn giữ ngoài staged content; staged287rename chỉ chứa blob baseline Git, không đưa config hiện tại vào index.

## Đổi tên thư mục backend

Theo yêu cầu chủ dự án 2026-10-17: backend hiện là ntc_aspnet, Git root/docs root không đổi. Source/config/history giữ nguyên; CI/Docker/scripts và lệnh trong docs đã cập nhật. Bằng chứng kiểm sau đổi tên tại worklog. Không đổi tên sản phẩm/remote hoặc scaffold frontend trong tác vụ này.

## Bàn giao React hiện hành — 2026-10-18

Đọc [FRONTEND-IMPLEMENTATION](FRONTEND-IMPLEMENTATION.md), [React README](../ntc_react/README.md), latest worklog. Frontend ở ntc_react, dev5173/proxy API5032, UI English; type/lint/build,14unit và12Chromium E2E PASS local. Không đọc các số frontend TODO ở entries cũ như hiện trạng. Browser fixture tools/FrontendFixture chỉ loopback/SQLite/email giả, không deploy hoặc dùng DB thật. Native/offline/realtime/full account export/attachments chưa nằm trong phạm vi đã chốt. Cấu hình thật Google/SMTP/client-origin/CORS, enable jobs/uptime, privacy operator notice và cloud release vẫn riêng.
