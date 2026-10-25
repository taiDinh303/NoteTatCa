# Hồ sơ NoteTatCa và phỏng vấn nghiệp vụ

> Cập nhật: 2026-10-17 | DRAFT | Áp dụng: YES | Người quyết định: chủ dự án


DEC-031 (chủ dự án2026-10-25): zoom bên ngoài chỉ phóng/thu danh sách note, header/sidebar/các controls và View/Edit giữ nguyên. Thay phạm vi zoom toàn giao diện DEC-021; giữ50–150%, preference cũ và content zoom riêng. Ctrl+wheel/pinch dùng transform với nội suy từng frame; theo bổ sung đã duyệt, khi zoom dừng Grid tự tính lại số cột/card chuẩn320px để lấp chiều ngang, List luôn một hàng vừa khung. Nhóm ghim/thường cùng chiều rộng card, không đổi thứ tự đã lưu, không reflow từng frame hoặc tải lại dữ liệu khi zoom. Chi tiết triển khai và kiểm chứng tại [frontend](FRONTEND-IMPLEMENTATION.md) và [worklog](worklog.md).

## Đầu vào đã biết

| Trường | Nội dung / nguồn |
| --- | --- |
| Sản phẩm | NoteTatCa, web app viết và quản lý ghi chú; người dùng xác nhận |
| Giá trị | Lưu, tìm lại và tổ chức note riêng cho nhiều tài khoản; không chia sẻ bản đầu |
| Chủ dự án | Người dùng cuộc trò chuyện; tài khoản repo taiDinh303; chưa suy ra đội ngũ |
| Hiện trạng | Tiếp quản code .NET 8, EF Core/SQL Server và Razor Pages |
| Workspace | `D:\My Project\NTC` |
| Repo | `D:\My Project\NTC`, main; backend trong ntc_aspnet; mốc khảo sát cũ `d8f854b` |
| GitHub | https://github.com/taiDinh303/NoteTatCa |
| Nhiệm vụ phiên này | Hoàn thiện docs theo Marixa, sau đó backend; đã triển khai và kiểm thử |
| Nhiệm vụ sau | React được giao triển khai 2026-10-18 tại ntc_react; cloud còn giai đoạn sau |
| Frontend | React tại ntc_react; Razor NTC.VIEW đã gỡ theo yêu cầu ngày 2026-10-21, xem DEC-020 |
| Ngôn ngữ | Docs tiếng Việt; UI mặc định tiếng Anh, chọn Việt/Anh/Trung/Nhật đổi toàn bộ giao diện theo yêu cầu 2026-10-23, DEC-024 bổ sung Q-025 |
| Thời gian | Timezone từng user, mặc định Asia/Ho_Chi_Minh; catch-up 24 giờ; ngày docs Asia/Bangkok; UTC storage đã triển khai |
| Dữ liệu | Nội dung note, email, hồ sơ, thông tin đăng nhập; phải giữ tài khoản và note cũ |
| Ngân sách / hạn | CHƯA XÁC ĐỊNH, chủ dự án trả lời Q-009/Q-011 |
| Thiết kế | Razor hiện tại là nguồn tham khảo; chưa có Figma được cung cấp |
| Thành công | Hướng public nhỏ đã chốt; đề xuất acceptance: luồng React→API→DB, không truy cập chéo owner, không mất note |

## Phạm vi

2026-10-25/DEC-030: chủ dự án yêu cầu thêm toàn bộ đề xuất vào kế hoạch và dự định liên kết AI chat để tự tạo note hoặc tạo nội dung theo lệnh, ví dụ từ vựng tiếng Anh chủ đề family. TASK-029/035–044 là PLANNED, chưa triển khai. Realtime/công thức/delta đã có ví dụ giải thích trong roadmap, chưa chốt thiết kế do user đang tìm hiểu. AI ở phạm vi lập kế hoạch YES, runtime vẫn chưa có; chưa chọn provider/model, chat nhúng trong app hay kết nối ngoài, quota/retention hay mặc định đọc note. Xem [32-ai-features](32-ai-features.md), Q-031–035.

2026-10-25 bổ sung DEC-029: sau giải thích, chủ dự án duyệt thêm vào docs bốn hạng mục mẫu ghi chú, tìm/lọc theo loại tệp, liên kết note và mục lục (TASK-031–034). Mục lục dùng heading bên trong note, label nhóm nhiều note; lọc file theo loại/metadata, chưa OCR hoặc nghe audio. Chỉ lập kế hoạch, chưa triển khai runtime.

2026-10-25/DEC-029: chủ dự án yêu cầu lập kế hoạch dài hạn cho ảnh/video/audio/bảng/vẽ bút, comment và mời người xem note như chia sẻ bảng tính. Chưa yêu cầu code các tính năng này. Xem [roadmap nội dung và cộng tác](ROADMAP-CONTENT-COLLABORATION.md); permission model, quota/storage và thứ tự phát hành chi tiết là đề xuất cần duyệt khi bắt đầu từng giai đoạn. Note private mặc định và admin không đọc nội dung được giữ.

2026-10-24/DEC-028: chủ dự án duyệt và giao thực hiện guest mode cho người xem CV: landing có nút Thử ngay/chế độ khách, vài note/label mẫu, dữ liệu lưu riêng trên trình duyệt. Đã đồng ý phương án đề xuất copy guest notes/labels vào tài khoản sau login với lựa chọn để sau và bảo toàn bản local khi lỗi. Guest không có tài khoản/credentials/server ownership, không cấp quyền API notes anonymous; reminders/email/security/admin cần tài khoản. Không hỏi lại ba quyết định này.

2026-10-24/DEC-025–027: chủ dự án chốt offline xem/tạo/sửa note đã tải trên thiết bị, tự đồng bộ khi có mạng và có Sync now; cảnh báo đăng xuất khi còn thay đổi chưa đồng bộ, cho ở lại hoặc tải bản dự phòng trước khi xóa dữ liệu máy. Người dùng tự yêu cầu xóa tài khoản với thời gian chờ30ngày; admin có thể xóa ngay với xác nhận riêng. Ưu tiên notes/labels trước khi mở workspace, dữ liệu phụ vẫn tải đủ ở nền. Đây là TARGET, chưa triển khai; xem backlog và tiêu chí tại [01-plan](01-plan.md#dec-025--offline-và-đồng-bộ-2026-10-24). Yêu cầu mới thay phần chặn toàn bộ workspace và cache chỉ memory của DEC-019 khi được triển khai; không khẳng định runtime đã đổi.

2026-10-23/DEC-024: chủ dự án yêu cầu Language có bốn lựa chọn Việt, Anh, Trung, Nhật và chọn là đổi ngay toàn bộ giao diện, ghi nhớ trên trình duyệt; không dịch nội dung ghi chú/nhãn/tên tài khoản do người dùng nhập. Privacy có nội dung phù hợp hành vi NoteTatCa và liên kết quản lý thực, tham khảo ứng dụng ghi chú khác. Đã chọn mobile Settings dùng header gọn với nút ← và tên trang, trang con quay về Settings, Settings quay về ghi chú; PC giữ header/sidebar. Quyết định này thay yêu cầu UI chỉ tiếng Anh trước đó; English vẫn mặc định.

2026-10-20/DEC-019: user yêu cầu tải đầy đủ notes/labels và dữ liệu workspace ngay khi đăng nhập để chuyển trang mượt; thêm animation khi đăng nhập/mất kết nối/chờ API Render khởi động. Chốt tải các trang trước khi mở workspace, cache memory riêng theo account, giữ draft khi lỗi và retry đọc có giới hạn; admin tiếp tục chỉ quản trị. Thiết kế chi tiết/giới hạn tại01-plan và FRONTEND-IMPLEMENTATION.

2026-10-20/DEC-018: yêu cầu mới thay phần Save thủ công của Q-023: editor chỉ autosave bình thường, Retry save khi lỗi. Mặc định toàn viewport, có nút phóng to/thu nhỏ theo yêu cầu bổ sung cùng ngày; title rỗng ẩn với Add title tùy chọn, chỉ Close để đóng, counter góc dưới; notes không header giải thích/nút tạo trùng, sidebar thu gọn, một điểm quản lý labels. Bổ sung: Reminders/Inbox không heading/mô tả đầu trang, Trash/label không heading nhìn thấy; nút sidebar desktop/mobile cùng icon ba gạch ngang, giữ cảnh báo và chức năng. Chủ dự án đã xác nhận bỏ cả Create your first note để chỉ giữ Take a note. Giữ báo lỗi/xung đột và draft protections; nội dung/ownership/API không đổi.

2026-10-19: chủ dự án chốt admin là tài khoản quản trị riêng, không dùng chức năng tạo/quản lý ghi chú như khách. Dùng chung login, tự điều hướng theo role; khu admin đầy đủ quản trị account/role/access/statistics/audit và bảo mật account của chính admin. Quyền Admin ưu tiên với dữ liệu role lịch sử hỗn hợp; không sửa account/note cloud tự động. Quyết định DEC-017 ở01-plan; privacy nội dung note vẫn giữ.

TARGET đã chốt: docs trước rồi hoàn thiện backend (giao 2026-10-17); giữ Razor và định hướng React. Backend source đã triển khai, evidence tại06/worklog.

TARGET bản đầu đã chốt: nhiều user, note riêng; email/mật khẩu + Google và xác minh email; nhãn, màu, ghim, kéo thả, tìm kiếm; editor rich text thống nhất có plain text/checklist/Markdown shortcuts/màu chữ/emoji và emoji đại diện note; autosave + nút Save; trash tự xóa sau 30 ngày; reminder trong app/email có lặp; admin quản lý/khóa user và thống kê nhưng không đọc nội dung note người khác.

TARGET tương lai: Supabase PostgreSQL chỉ làm database, giữ .NET Identity; Render cho API, Vercel cho React; giữ tài khoản/note cũ. React TS/Vite ở NTC/ntc_react. UI mặc định Anh, có Việt/Trung/Nhật theo DEC-024; public nhỏ. Git root đã gom lên NTC theo yêu cầu tiếp theo 2026-10-17; một docs duy nhất ở root, backend giữ ntc_aspnet và lịch sử/config được bảo toàn.

Ngoài phạm vi đã giao: triển khai production, mua dịch vụ, xóa database, tạo frontend. Backend đã được giao trong phiên2026-10-17. Các mục optional ở [danh mục](00-README.md) giữ NO/UNDECIDED với lý do riêng.

## Cách trả lời

Hai vòng phỏng vấn đã được chủ dự án trả lời ngày 2026-10-16. Cột lựa chọn giữ lại lịch sử; cột cuối là quyết định hiện hành. Các câu mở phía dưới chỉ hỏi khi hạng mục tương ứng cần triển khai.

| ID | Câu hỏi | A — khuyến nghị | B | C | D | Chặn bước / trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| Q-001 | Đối tượng và chia sẻ? | Nhiều tài khoản, note riêng | Thêm link chỉ đọc | Nhóm cùng sửa | Chỉ chủ dự án dùng | A — đã xác nhận |
| Q-002 | Đăng nhập? | Email/mật khẩu + Google; xác minh email | Như A, bỏ xác minh | Chỉ Google | Chỉ email/mật khẩu | A — đã xác nhận |
| Q-003 | Loại nội dung? | Văn bản thường + checklist | Văn bản thường | Rich text | Markdown | ABCD + màu chữ/icon; cụ thể Q-020/021 |
| Q-004 | Phạm vi ngoài CRUD? | Nhãn, màu, ghim, kéo thả, tìm kiếm, trash, nhắc lịch | Như A + archive | Như B + ảnh/tệp | Nhãn, ghim, tìm kiếm, trash | A — đã xác nhận, chưa archive/attachments |
| Q-005 | Kênh nhắc lịch? | Trong app + email, có lặp | Trong app, không lặp | Trong app + browser notification, có lặp | Chưa làm | A — đã xác nhận |
| Q-006 | Thời gian giữ trash? | 30 ngày, có xóa sớm | 7 ngày, có xóa sớm | Đến khi tự xóa | Không dùng | A — cập nhật30ngày, chủ dự án2026-10-24 |
| Q-007 | Admin? | Chưa cần trang admin | Khóa user/thống kê, không đọc note | Được xem/sửa mọi note | Không dùng | B — đã xác nhận |
| Q-008 | Stack và chỗ đặt frontend? | React + TS + Vite ở NTC/ntc_react; giữ .NET/SQL Server | Như A dùng JavaScript | React + TS + Vite, đổi DB (ghi rõ) | Không dùng | A + Supabase/Render/Vercel tương lai; Q-019 |

## Kết quả phỏng vấn vòng hai

Số câu hiển thị trong UI là 9–15; ID tài liệu là Q-019–025 để giữ ID câu hỏi dự kiến đã tạo trước đó.

| ID | Câu hỏi / lựa chọn đã chốt | Nguồn / ngày | Ảnh hưởng |
| --- | --- | --- | --- |
| Q-019 | A: Supabase chỉ PostgreSQL, giữ .NET Identity; API Render quản lý dữ liệu | Chủ dự án 2026-10-16 | Không dùng Supabase Auth/Data API trực tiếp từ browser |
| Q-020 | A: Một rich editor có checklist/màu chữ/emoji/Markdown shortcuts; chuyển Markdown cảnh báo mất định dạng | Chủ dự án 2026-10-16 | Canonical document là đề xuất lưu trữ, không hai nguồn chuẩn |
| Q-021 | A: Emoji trong nội dung + một emoji/icon đại diện note | Chủ dự án 2026-10-16 | Không thêm upload ảnh/thư viện icon riêng |
| Q-022 | A: Phải giữ tài khoản và ghi chú hiện có | Chủ dự án 2026-10-16 | Backup/migration bảo toàn, không reset |
| Q-023 | A: Autosave + nút Save, có đang lưu/đã lưu/lỗi | Chủ dự án 2026-10-16 | Version/conflict/idempotency và UX phục hồi |
| Q-024 | A: Timezone từng user, mặc định Việt Nam; gửi bù một lần trong 24 giờ, bỏ cũ hơn | Chủ dự án 2026-10-16 | Lưu IANA zone, tính occurrence/catch-up |
| Q-025 | A nhưng UI tiếng Anh: public nhỏ, kế hoạch gom Git root NTC khi bắt đầu React | Chủ dự án 2026-10-16 | Docs tiếng Việt; .git đã chuyển lên NTC theo yêu cầu tiếp theo 2026-10-17 |

## Câu hỏi dự kiến còn lại và mục đã được giải đáp

| ID | Câu hỏi / lựa chọn | Khuyến nghị | Chặn bước | Trả lời / người phụ trách |
| --- | --- | --- | --- | --- |
| Q-009 | Hosting và ngân sách/tháng? | Supabase DB/Render API/Vercel React đã chọn | Plan/region/chi phí lúc deploy | Hosting ĐÃ CHỐT Q-008/019; ngân sách CHƯA XÁC ĐỊNH / chủ dự án |
| Q-010 | Có dữ liệu SQL hiện tại cần giữ? | Giữ dữ liệu | EF migration | ĐÃ CHỐT Yes tại Q-022 |
| Q-011 | Quy mô sử dụng và hạn dự kiến? | Public nhỏ | Tải/lịch/nhân lực | Quy mô ĐÃ CHỐT Q-025; hạn CHƯA XÁC ĐỊNH / chủ dự án |
| Q-012 | UI tiếng Việt/Anh/cả hai? | Việt/Anh/Trung/Nhật | Nội dung UI | ĐÃ CHỐT bổ sung 2026-10-23, DEC-024; mặc định Anh |
| Q-013 | Nút Save/tự lưu/cả hai? | Cả hai | Xung đột/idempotency/UX | ĐÃ CHỐT Q-023 |
| Q-014 | Có export note và xóa tài khoản? Yes / No / làm sau | Làm sau khi MVP ổn | Vòng đời dữ liệu | ĐÃ CHỐT2026-10-24: có export (format còn đề xuất), tự yêu cầu xóa chờ30ngày, admin xóa ngay; DEC-027 |
| Q-015 | Offline/realtime: A online, tải lại khi cần; B đồng bộ nhiều tab; C sửa offline; D cộng tác realtime? | A bản đầu | Client storage, concurrency | ĐÃ CHỐT2026-10-24: C xem/tạo/sửa offline, auto-sync + Sync now, bảo vệ draft khi logout; không mở cộng tác realtime; DEC-025 |
| Q-016 | Hạn mức tiêu đề/nội dung/nhãn | Title 150, tag 50, content 100.000 ký tự, rich JSON 1 MiB, 20 tag/note, 5 active reminder/note | Validation/quota | ĐÃ CHỐT 2026-10-17; ý nghĩa Priority còn legacy |
| Q-017 | Chuyển Git root lên NTC khi bắt đầu React? | Lập kế hoạch giữ lịch sử/config rồi chuyển | Quản lý source React/docs | ĐÃ THỰC HIỆN theo yêu cầu trực tiếp 2026-10-17; docs duy nhất tại root |
| Q-018 | Đăng nhập email hay username? | Email theo lựa chọn Q-002 | Login DTO/chuyển dữ liệu | ĐÃ TRIỂN KHAI email v1; legacy username fallback |
| Q-026 | Session SPA: A access ngắn hạn + refresh rotation/revoke; B cookie session cùng domain; C phương án khác sau thử cookie cross-site? | A bearer + opaque refresh rotation/revoke; không cookie API hiện tại | Auth session, logout/lock user | IMPLEMENTED technical choice 2026-10-17 theo phạm vi backend; client token storage/multi-tab cần chốt khi React |
| Q-027 | Lịch tháng không có ngày tương ứng | Ngày cuối tháng; giữ ngày anchor cho lần sau | Recurrence engine và TC-010 | ĐÃ CHỐT A, chủ dự án 2026-10-17; DST theo lựa chọn kỹ thuật có test |
| Q-028 | Nhiều lần nhắc quá hạn/restore | Một bản gần nhất mỗi lịch trong 24 giờ; restore chỉ lịch tương lai | Catch-up/restore rule | ĐÃ CHỐT A, chủ dự án 2026-10-17 |
| Q-029 | Nhãn trùng tên và note không tiêu đề | **Cho nhãn trùng tên**, note không tiêu đề | Validation/index/title migration | ĐÃ CHỐT C, chủ dự án 2026-10-17 |

## Ma trận áp dụng và nguồn còn thiếu

Đủ 39 file gốc được giữ tên; ma trận cho từng file nằm tại [00-README](00-README.md#danh-mục), là nguồn chuẩn duy nhất.

Nguồn kỹ thuật: source local ở mốc worklog; backend fixture runtime đã kiểm theo 06; database thật/hosting/restore/cloud vẫn NOT VERIFIED; React local xem FRONTEND-IMPLEMENTATION. Chủ dự án đã chốt hai vòng lựa chọn; không hỏi lại. Session backend, lịch cuối tháng/DST và quota đã ghi ở15/ADR. Chỉ hỏi backup retention, budget/deadline, offline/export và client token handling khi công việc phụ thuộc.

## Rà soát và triển khai 2026-10-17

Nhiệm vụ hiện tại được mở rộng: dùng Marixa làm nguồn phong cách/engineering, hoàn thiện docs trước và backend sau. DEC-012–015 là nguồn quyết định mới; không hỏi lại tag duplicate/title optional/100.000 text/catch-up đã chốt.

## Yêu cầu rà entities tiếp theo

2026-10-17 chủ dự án cho phép bổ sung entities/trường/ràng buộc cần thiết cho các chức năng và trường hợp hiện hành. Đã triển khai theo ENTITY-REVIEW; đây là quyết định kỹ thuật trong scope, không mở sharing/attachments/team tự động. Q-030: retention/anonymization nhật ký quản trị CHƯA XÁC ĐỊNH, chủ dự án/operator chốt trước khi bật xóa audit hoặc hard delete account; hiện không có job purge audit.
