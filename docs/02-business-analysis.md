# 02 — Nghiệp vụ app ghi chú

> 2026-10-17 | WORKING SPEC | Áp dụng: YES | Nghiệp vụ đã chốt; CURRENT backend theo cột hiện trạng, UX React còn TARGET

## Mục tiêu và actor

Giúp nhiều user lưu/tìm/tổ chức note riêng, ghim/nhãn, khôi phục khi xóa nhầm và nhắc lịch. Bản đầu không chia sẻ/team/archive/attachments. Actor: khách, user, admin quản lý/khóa user và thống kê nhưng không đọc note người khác. UI tiếng Anh, public nhỏ.

## Yêu cầu và nghiệm thu

| ID | Nhu cầu / ưu tiên | Hiện trạng source | Phạm vi TARGET / acceptance chi tiết đề xuất | Quyết định liên quan |
| --- | --- | --- | --- | --- |
| REQ-001 | Đăng ký/đăng nhập, P0 | Email/password, OTP DB, Google proof, JWT + refresh rotation | Với thông tin hợp lệ và xác minh cần thiết, login trả phiên hợp lệ; sai/hết hạn bị từ chối | Q-002/018 |
| REQ-002 | Riêng tư theo owner, P0 | Owner/self guard + fallback auth; HTTP legacy/v1 A/B/admin tests | A biết ID của B vẫn không đọc, sửa, xóa, restore, gán nhãn hay nhắc lịch của B | Q-001/007 |
| REQ-003 | Tạo/xem/sửa note, P0 | Title rỗng hợp lệ, document/icon/version/idempotency; quota đã chốt | Tạo note hợp lệ rồi mở lại giữ đúng nội dung; owner lấy từ phiên; lỗi lưu không xóa bản nhập | Q-003/013/016 |
| REQ-004 | Nhãn, P1 | Tag trùng tên được phép; NoteTag composite/owner, max20 | Gán nhiều nhãn của chính mình; gán lại không trùng; xóa nhãn không xóa note | Q-004/016 |
| REQ-005 | Ghim/màu/sắp xếp, P1 | IsPinned, PinnedAt, BackgroundColor, SortOrder | Ghim nằm trước nhóm thường; reorder chỉ thay nhóm và owner hợp lệ; thứ tự còn sau tải lại | Q-004 |
| REQ-006 | Thùng rác, P0 | Soft delete/restore/hard delete | Xóa mềm ẩn khỏi danh sách chính; trash cho xem/restore/xóa hẳn; không nhắc note đã xóa | Q-006 |
| REQ-007 | Tìm kiếm, P1 | Query title/plain content/tag/state trong owner scope | Tìm title/content của chính user, kết hợp tag/trạng thái; phân trang ổn định | Q-004/016 |
| REQ-008 | Nhắc lịch, P1 | Recurrence engine + persisted inbox/email worker; mặc định tắt | Trong app + email, có lặp; timezone từng user mặc định Việt Nam; gửi bù một lần trong 24 giờ, bỏ cũ hơn; trash ngừng nhắc | Q-005/024 |
| REQ-009 | Tài khoản/hồ sơ, P0 | Profile, đổi email/password, external login CRUD | Chỉ sửa hồ sơ của mình; đổi email/mật khẩu xác minh phù hợp; không lấy userId client làm quyền | Q-002/007/014 |
| REQ-010 | React, P1 | Razor Pages hiện tại | Consumer React gọi API trực tiếp hoặc theo cơ chế auth đã chốt; bảo toàn Razor | DEC-002/003, Q-008 |
| REQ-011 | Unified rich editor, P1 | DocumentJson schema 1 whitelist + plain projection; UI editor chưa làm | Plain/checklist/rich/Markdown shortcuts, màu chữ/emoji/emoji đại diện; round-trip đúng, sanitizer; conversion Markdown có cảnh báo mất format | Q-003/020/021 |
| REQ-012 | Admin tài khoản/thống kê, P1 | Admin metadata/statistics/lock, không bypass note content | Admin khóa/quản lý user và aggregate; không title/content/preview note khác owner; khóa ngừng phiên theo policy | Q-007 |

## Quy tắc nghiệp vụ

| ID | Quy tắc hiện hành | Biên / kết quả | Nguồn |
| --- | --- | --- | --- |
| RULE-001 | Owner do server suy ra từ subject đã xác thực | Bỏ/không tin UserId truyền từ UI; owner sai trả 404 để không lộ tồn tại | REQ-002; Q-001 |
| RULE-002 | Note hoạt động có DeletedTime null; trash tự xóa sau 7 ngày | Restore/xóa sớm bởi owner; note trash không chỉnh/sắp xếp/nhắc; cutoff UTC đề xuất | REQ-006; Q-006 đã chốt |
| RULE-003 | Title ≤150, tag name ≤50 theo model hiện tại | Title lưu chuỗi rỗng, UI Untitled; plain100.000/rich1 MiB | Q-003/016; ISSUE-005 |
| RULE-004 | Ghim và không ghim là hai nhóm sắp xếp | Không chấp nhận neighbor khác owner/nhóm hoặc chính draggedId | REQ-005 |
| RULE-005 | Gán tag phải cùng owner, tag chưa bị xóa | Composite PK tránh trùng; thao tác nhiều bước có transaction | REQ-004 |
| RULE-006 | Nhắc lịch cần note hoạt động; interval >0 | Until/Count không đồng thời, max5 active, month clamp/catch-up đã chốt | Q-005 |
| RULE-007 | Xóa nhãn giữ nội dung note | Chỉ gỡ quan hệ; soft delete tag phải thống nhất các danh sách | REQ-004 |
| RULE-008 | Hard delete chỉ từ trash và phải xác nhận | Mất note, quan hệ nhãn, reminder và dữ liệu phụ theo transaction | Q-006 |
| RULE-009 | Login và liên kết Google xác minh danh tính server | Không tin providerKey/email từ client; cùng email không tự mặc định đủ quyền link | REQ-001/009 |

Các RULE đã triển khai backend và có regression tests tại file 06; UX/React evidence tách riêng tại FRONTEND-IMPLEMENTATION. Retention, email login, rich schema, version, quota100k, untitled, nhãn trùng và month-end đã chốt/triển khai (DEC-013–015). Phải giữ account/note cũ khi thêm schema hoặc chuyển PostgreSQL. Export/xóa tài khoản và offline chưa chốt.

## Phi chức năng đề xuất

| Nhóm | Mục tiêu ban đầu | Đo / điều kiện |
| --- | --- | --- |
| Bảo vệ dữ liệu | 0 đường truy cập chéo owner trong suite đã định | Hai tài khoản, test list/detail/mutation/bulk |
| Hiệu năng | p95 read <500ms, write <800ms ở tải test đề xuất | File 25; chưa benchmark, chưa cam kết SLA |
| Khôi phục | RPO 24 giờ, RTO 4h đề xuất cho public nhỏ | Q-009/011 và restore drill ở file 22 |
| UX | Hoàn thành luồng bằng bàn phím; mobile không tràn ngang | File 09; runtime NOT RUN |
| Thời gian | API ISO-8601 có offset; lưu UTC đã triển khai | Chuyển dữ liệu UTC+7 phải giữ instant, file 23 |

Không có yêu cầu thanh toán, native mobile, AI hoặc analytics nội dung trong phạm vi hiện được giao.

## Rà soát và triển khai 2026-10-17

REQ-003/004: title có thể rỗng, nhãn trùng tên hợp lệ theo ID (DEC-013). Limit content tăng 100.000 ký tự; document JSON 1 MiB, tối đa 20 nhãn và 5 active reminders/note (DEC-015). Admin không có quyền nội dung. API được giao triển khai, không còn chỉ nhiệm vụ docs.
