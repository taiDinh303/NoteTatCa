# Hồ sơ NoteTatCa và phỏng vấn nghiệp vụ

> Cập nhật: 2026-10-16 | DRAFT | Áp dụng: YES | Người quyết định: chủ dự án

## Đầu vào đã biết

| Trường | Nội dung / nguồn |
| --- | --- |
| Sản phẩm | NoteTatCa, web app viết và quản lý ghi chú; người dùng xác nhận |
| Giá trị | Lưu, tìm lại và tổ chức note riêng cho nhiều tài khoản; không chia sẻ bản đầu |
| Chủ dự án | Người dùng cuộc trò chuyện; tài khoản repo taiDinh303; chưa suy ra đội ngũ |
| Hiện trạng | Tiếp quản code .NET 8, EF Core/SQL Server và Razor Pages |
| Workspace | `D:\My Project\NTC` |
| Repo | `D:\My Project\NTC\NoteTatCa`, main, mốc khảo sát `d8f854b` |
| GitHub | https://github.com/taiDinh303/NoteTatCa |
| Nhiệm vụ phiên này | Khảo sát sơ bộ; tạo đủ các file của docs_mau, cá nhân hóa; hỏi nghiệp vụ |
| Nhiệm vụ sau | Hoàn thiện API khi được giao; sau đó frontend React |
| Frontend | Chuyển sang React trong workspace NTC; giữ nguyên NTC.VIEW tạm thời |
| Ngôn ngữ | Docs tiếng Việt; UI tiếng Anh đã được chủ dự án xác nhận ở Q-025 |
| Thời gian | Timezone từng user, mặc định Asia/Ho_Chi_Minh; catch-up 24h; ngày docs Asia/Bangkok; UTC storage đề xuất |
| Dữ liệu | Nội dung note, email, hồ sơ, thông tin đăng nhập; phải giữ tài khoản và note cũ |
| Ngân sách / hạn | CHƯA XÁC ĐỊNH, chủ dự án trả lời Q-009/Q-011 |
| Thiết kế | Razor hiện tại là nguồn tham khảo; chưa có Figma được cung cấp |
| Thành công | Hướng public nhỏ đã chốt; đề xuất acceptance: luồng React→API→DB, không truy cập chéo owner, không mất note |

## Phạm vi

TARGET đã chốt: tạo docs, định hướng React, giữ Razor và chưa thực hiện sửa API trong phiên này.

TARGET bản đầu đã chốt: nhiều user, note riêng; email/mật khẩu + Google và xác minh email; nhãn, màu, ghim, kéo thả, tìm kiếm; editor rich text thống nhất có plain text/checklist/Markdown shortcuts/màu chữ/emoji và emoji đại diện note; autosave + nút Save; trash tự xóa sau 7 ngày; reminder trong app/email có lặp; admin quản lý/khóa user và thống kê nhưng không đọc nội dung note người khác.

TARGET tương lai: Supabase PostgreSQL chỉ làm database, giữ .NET Identity; Render cho API, Vercel cho React; giữ tài khoản/note cũ. React TS/Vite ở NTC/frontend. UI tiếng Anh, public nhỏ. Gom Git root lên NTC là kế hoạch cho giai đoạn React, chưa có thao tác di chuyển Git trong phiên docs.

Ngoài phạm vi đã giao: triển khai production, mua dịch vụ, xóa database, tạo frontend hoặc sửa API. Các mục optional ở [danh mục](00-README.md) giữ NO/UNDECIDED với lý do riêng.

## Cách trả lời

Hai vòng phỏng vấn đã được chủ dự án trả lời ngày 2026-10-16. Cột lựa chọn giữ lại lịch sử; cột cuối là quyết định hiện hành. Các câu mở phía dưới chỉ hỏi khi hạng mục tương ứng cần triển khai.

| ID | Câu hỏi | A — khuyến nghị | B | C | D | Chặn bước / trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| Q-001 | Đối tượng và chia sẻ? | Nhiều tài khoản, note riêng | Thêm link chỉ đọc | Nhóm cùng sửa | Chỉ chủ dự án dùng | A — đã xác nhận |
| Q-002 | Đăng nhập? | Email/mật khẩu + Google; xác minh email | Như A, bỏ xác minh | Chỉ Google | Chỉ email/mật khẩu | A — đã xác nhận |
| Q-003 | Loại nội dung? | Văn bản thường + checklist | Văn bản thường | Rich text | Markdown | ABCD + màu chữ/icon; cụ thể Q-020/021 |
| Q-004 | Phạm vi ngoài CRUD? | Nhãn, màu, ghim, kéo thả, tìm kiếm, trash, nhắc lịch | Như A + archive | Như B + ảnh/tệp | Nhãn, ghim, tìm kiếm, trash | A — đã xác nhận, chưa archive/attachments |
| Q-005 | Kênh nhắc lịch? | Trong app + email, có lặp | Trong app, không lặp | Trong app + browser notification, có lặp | Chưa làm | A — đã xác nhận |
| Q-006 | Thời gian giữ trash? | 30 ngày, có xóa sớm | 7 ngày, có xóa sớm | Đến khi tự xóa | Không dùng | B — đã xác nhận, 7 ngày |
| Q-007 | Admin? | Chưa cần trang admin | Khóa user/thống kê, không đọc note | Được xem/sửa mọi note | Không dùng | B — đã xác nhận |
| Q-008 | Stack và chỗ đặt frontend? | React + TS + Vite ở NTC/frontend; giữ .NET/SQL Server | Như A dùng JavaScript | React + TS + Vite, đổi DB (ghi rõ) | Không dùng | A + Supabase/Render/Vercel tương lai; Q-019 |

## Kết quả phỏng vấn vòng hai

Số câu hiển thị trong UI là 9–15; ID tài liệu là Q-019–025 để giữ ID câu hỏi dự kiến đã tạo trước đó.

| ID | Câu hỏi / lựa chọn đã chốt | Nguồn / ngày | Ảnh hưởng |
| --- | --- | --- | --- |
| Q-019 | A: Supabase chỉ PostgreSQL, giữ .NET Identity; API Render quản lý dữ liệu | Chủ dự án 2026-10-16 | Không dùng Supabase Auth/Data API trực tiếp từ browser |
| Q-020 | A: Một rich editor có checklist/màu chữ/emoji/Markdown shortcuts; chuyển Markdown cảnh báo mất định dạng | Chủ dự án 2026-10-16 | Canonical document là đề xuất lưu trữ, không hai nguồn chuẩn |
| Q-021 | A: Emoji trong nội dung + một emoji/icon đại diện note | Chủ dự án 2026-10-16 | Không thêm upload ảnh/thư viện icon riêng |
| Q-022 | A: Phải giữ tài khoản và ghi chú hiện có | Chủ dự án 2026-10-16 | Backup/migration bảo toàn, không reset |
| Q-023 | A: Autosave + nút Save, có đang lưu/đã lưu/lỗi | Chủ dự án 2026-10-16 | Version/conflict/idempotency và UX phục hồi |
| Q-024 | A: Timezone từng user, mặc định Việt Nam; gửi bù một lần trong 24h, bỏ cũ hơn | Chủ dự án 2026-10-16 | Lưu IANA zone, tính occurrence/catch-up |
| Q-025 | A nhưng UI tiếng Anh: public nhỏ, kế hoạch gom Git root NTC khi bắt đầu React | Chủ dự án 2026-10-16 | Docs tiếng Việt; chưa di chuyển .git trong phiên docs |

## Câu hỏi dự kiến còn lại và mục đã được giải đáp

| ID | Câu hỏi / lựa chọn | Khuyến nghị | Chặn bước | Trả lời / người phụ trách |
| --- | --- | --- | --- | --- |
| Q-009 | Hosting và ngân sách/tháng? | Supabase DB/Render API/Vercel React đã chọn | Plan/region/chi phí lúc deploy | Hosting ĐÃ CHỐT Q-008/019; ngân sách CHƯA XÁC ĐỊNH / chủ dự án |
| Q-010 | Có dữ liệu SQL hiện tại cần giữ? | Giữ dữ liệu | EF migration | ĐÃ CHỐT Yes tại Q-022 |
| Q-011 | Quy mô sử dụng và hạn dự kiến? | Public nhỏ | Tải/lịch/nhân lực | Quy mô ĐÃ CHỐT Q-025; hạn CHƯA XÁC ĐỊNH / chủ dự án |
| Q-012 | UI tiếng Việt/Anh/cả hai? | Tiếng Anh | Nội dung UI | ĐÃ CHỐT Q-025 |
| Q-013 | Nút Save/tự lưu/cả hai? | Cả hai | Xung đột/idempotency/UX | ĐÃ CHỐT Q-023 |
| Q-014 | Có export note và xóa tài khoản? Yes / No / làm sau | Làm sau khi MVP ổn | Vòng đời dữ liệu | CHƯA XÁC ĐỊNH / chủ dự án |
| Q-015 | Offline/realtime: A online, tải lại khi cần; B đồng bộ nhiều tab; C sửa offline; D cộng tác realtime? | A bản đầu | Client storage, concurrency | CHƯA XÁC ĐỊNH / chủ dự án |
| Q-016 | Hạn mức tiêu đề/nội dung/nhãn và Priority: A giữ title 150, tag 50; content 50.000 ký tự; 20 tag/note; chưa dùng Priority; B tùy chỉnh? | A là đề xuất, chưa policy | Validation/quota | CHƯA XÁC ĐỊNH / chủ dự án |
| Q-017 | Chuyển Git root lên NTC khi bắt đầu React? | Lập kế hoạch giữ lịch sử/config rồi chuyển | Quản lý source React/docs | HƯỚNG ĐÃ CHỐT Q-025; chưa thực hiện |
| Q-018 | Đăng nhập email hay username? | Email theo lựa chọn Q-002 | Login DTO/chuyển dữ liệu | TARGET email; source hiện username, cần adapter/mapping |
| Q-026 | Session SPA: A access ngắn hạn + refresh rotation/revoke; B cookie session cùng domain; C phương án khác sau thử cookie cross-site? | A, test domain/CORS/CSRF trước code | Auth session, logout/lock user | CHƯA XÁC ĐỊNH / chủ dự án và API implementer |
| Q-027 | Lịch tháng không có ngày tương ứng: A ngày cuối tháng; B bỏ tháng đó? DST trùng/thiếu giờ và đổi timezone xử lý ra sao? | A cho cuối tháng; đề xuất giờ thiếu chuyển tới giờ hợp lệ, giờ trùng gửi một lần | Recurrence engine và TC-010 | CHƯA XÁC ĐỊNH / chủ dự án |
| Q-028 | Khi có nhiều lần nhắc quá hạn trong 24h: A gửi một bản gần nhất mỗi lịch; B gộp thành một bản mỗi note? Khi restore có gửi bù? | A; restore chỉ tính lần tới, không replay lịch lúc ở trash | Catch-up/restore rule, không thay cửa sổ 24h đã chốt | CHƯA XÁC ĐỊNH / chủ dự án |
| Q-029 | Nhãn trùng tên cùng user: A không cho trùng sau trim/normalize; B cho trùng? Note không tiêu đề: A hiện Untitled, cho lưu nếu có nội dung; B bắt nhập title? | A ở cả hai câu | Validation/index/title migration | CHƯA XÁC ĐỊNH / chủ dự án |

## Ma trận áp dụng và nguồn còn thiếu

Đủ 39 file gốc được giữ tên; ma trận cho từng file nằm tại [00-README](00-README.md#danh-mục), là nguồn chuẩn duy nhất.

Nguồn kỹ thuật: source local ở mốc worklog; runtime, database thực tế, hosting live, restore backup và hành vi React đều NOT VERIFIED. Chủ dự án đã chốt hai vòng lựa chọn; không hỏi lại. Các chi tiết session/token, rule lịch cuối tháng/DST, quota, backup retention, budget/deadline, offline/export chỉ hỏi khi hạng mục phụ thuộc đến bước thực hiện.
