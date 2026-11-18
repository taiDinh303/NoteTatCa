# NoteTatCa — Đặc tả từng luồng

[Mở mục lục tương tác](index.html) · [Coverage API](API-COVERAGE.md) · [Chênh lệch và kế hoạch](GAPS.md) · [Kết quả kiểm tra](VALIDATION.md)

Ngày: 2026-11-05 (Asia/Bangkok). Nguồn: commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e` — [repository](https://github.com/taiDinh303/NoteTatCa/tree/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e).

## Phạm vi

37 luồng runtime được chia theo tác nhân và kết quả nghiệp vụ. Một luồng có thể gom các biến thể CRUD cùng bất biến; đây không phải37endpoint độc lập. Mỗi luồng có điều kiện trước, đầu vào, các bước, nhánh lỗi/khôi phục, hậu điều kiện, API, tiêu chí nghiệm thu và dòng mã nguồn. Sơ đồ workflow Archify đi kèm từng đặc tả; candidate JSON là nguồn sửa lại sơ đồ.

CURRENT chỉ có nghĩa có trong source được đối chiếu. Không khẳng định deployment, provider, worker hoặc schema production đang bật/đã migrate. TARGET/PLANNED được tách ở GAPS, không vẽ như chức năng hiện có. Các đoạn WF-001–005 trong tài liệu cũ giữ mã truy vết; FLOW-001–037 là decomposition mới, không đổi mã nghiệp vụ cũ.

Nội dung chính và các nút cơ bản bằng tiếng Việt. Một số công cụ nâng cao của Archify vẫn dùng tiếng Anh do catalog vi chưa đầy đủ; receipt ghi cảnh báo translation-coverage, không che cảnh báo này.

## Danh mục

| Mã | Đặc tả | Sơ đồ | Nhóm |
| --- | --- | --- | --- |
| FLOW-001 | [Đăng ký và xác minh email](01-dang-ky-xac-minh/spec.md) | [Mở](01-dang-ky-xac-minh/01-dang-ky-xac-minh.html) | Tài khoản |
| FLOW-002 | [Đăng nhập mật khẩu và phân luồng quyền](02-dang-nhap/spec.md) | [Mở](02-dang-nhap/02-dang-nhap.html) | Tài khoản |
| FLOW-003 | [Đăng nhập Google](03-google-dang-nhap/spec.md) | [Mở](03-google-dang-nhap/03-google-dang-nhap.html) | Tài khoản |
| FLOW-004 | [Quên, đặt mới và đổi mật khẩu](04-khoi-phuc-mat-khau/spec.md) | [Mở](04-khoi-phuc-mat-khau/04-khoi-phuc-mat-khau.html) | Tài khoản |
| FLOW-005 | [Khôi phục phiên, refresh và đồng bộ nhiều tab](05-khoi-phuc-refresh/spec.md) | [Mở](05-khoi-phuc-refresh/05-khoi-phuc-refresh.html) | Tài khoản |
| FLOW-006 | [Đăng xuất và thu hồi phiên](06-dang-xuat-phien/spec.md) | [Mở](06-dang-xuat-phien/06-dang-xuat-phien.html) | Tài khoản |
| FLOW-007 | [Liên kết và gỡ Google khỏi tài khoản](07-lien-ket-google/spec.md) | [Mở](07-lien-ket-google/07-lien-ket-google.html) | Tài khoản |
| FLOW-008 | [Vào guest, dùng dữ liệu mẫu và reset](08-guest-local/spec.md) | [Mở](08-guest-local/08-guest-local.html) | Workspace & thiết bị |
| FLOW-009 | [Sao chép guest vào tài khoản sau đăng nhập](09-copy-guest/spec.md) | [Mở](09-copy-guest/09-copy-guest.html) | Workspace & thiết bị |
| FLOW-010 | [Tải workspace và phân tách dữ liệu nền](10-chuan-bi-workspace/spec.md) | [Mở](10-chuan-bi-workspace/10-chuan-bi-workspace.html) | Workspace & thiết bị |
| FLOW-011 | [Danh sách, tìm kiếm và lọc ghi chú](11-danh-sach-tim-loc/spec.md) | [Mở](11-danh-sach-tim-loc/11-danh-sach-tim-loc.html) | Workspace & thiết bị |
| FLOW-012 | [Lưu note trên thiết bị khi offline](12-luu-offline/spec.md) | [Mở](12-luu-offline/12-luu-offline.html) | Workspace & thiết bị |
| FLOW-013 | [Tự đồng bộ, Sync now và giải quyết xung đột](13-dong-bo-xung-dot/spec.md) | [Mở](13-dong-bo-xung-dot/13-dong-bo-xung-dot.html) | Workspace & thiết bị |
| FLOW-014 | [Tạo/sửa note, autosave và đóng an toàn](14-tao-autosave-dong/spec.md) | [Mở](14-tao-autosave-dong/14-tao-autosave-dong.html) | Ghi chú |
| FLOW-015 | [Mở note, chuyển View/Edit, fullscreen và zoom](15-mo-view-edit-zoom/spec.md) | [Mở](15-mo-view-edit-zoom/15-mo-view-edit-zoom.html) | Ghi chú |
| FLOW-016 | [Định dạng rich text, checklist, mẫu, mục lục và Markdown](16-rich-markdown-template/spec.md) | [Mở](16-rich-markdown-template/16-rich-markdown-template.html) | Ghi chú |
| FLOW-017 | [Xung đột online và khôi phục phiên bản note](17-revision-conflict/spec.md) | [Mở](17-revision-conflict/17-revision-conflict.html) | Ghi chú |
| FLOW-018 | [Tạo, sửa và xóa nhãn](18-quan-ly-label/spec.md) | [Mở](18-quan-ly-label/18-quan-ly-label.html) | Ghi chú |
| FLOW-019 | [Gán hoặc bỏ nhãn của một note](19-gan-label/spec.md) | [Mở](19-gan-label/19-gan-label.html) | Ghi chú |
| FLOW-020 | [Ghim, bỏ ghim và sắp xếp note](20-ghim-sap-xep/spec.md) | [Mở](20-ghim-sap-xep/20-ghim-sap-xep.html) | Ghi chú |
| FLOW-021 | [Đưa vào Trash, khôi phục và xóa hẳn](21-trash-khoi-phuc/spec.md) | [Mở](21-trash-khoi-phuc/21-trash-khoi-phuc.html) | Ghi chú |
| FLOW-022 | [Tạo, sửa, tắt và xóa lịch nhắc](22-tao-sua-reminder/spec.md) | [Mở](22-tao-sua-reminder/22-tao-sua-reminder.html) | Nhắc lịch & thông báo |
| FLOW-023 | [Worker tạo occurrence, nhắc bù và inbox](23-dispatch-reminder/spec.md) | [Mở](23-dispatch-reminder/23-dispatch-reminder.html) | Nhắc lịch & thông báo |
| FLOW-024 | [Gửi email nhắc, lease và retry](24-delivery-email/spec.md) | [Mở](24-delivery-email/24-delivery-email.html) | Nhắc lịch & thông báo |
| FLOW-025 | [Xem inbox, mở note và đánh dấu đã đọc](25-inbox/spec.md) | [Mở](25-inbox/25-inbox.html) | Nhắc lịch & thông báo |
| FLOW-026 | [Hồ sơ cá nhân, timezone và đổi email có xác nhận](26-profile-doi-email/spec.md) | [Mở](26-profile-doi-email/26-profile-doi-email.html) | Cài đặt & dữ liệu |
| FLOW-027 | [Xuất bản sao lưu workspace JSON](27-export-workspace/spec.md) | [Mở](27-export-workspace/27-export-workspace.html) | Cài đặt & dữ liệu |
| FLOW-028 | [Nhập workspace JSON thành bản sao](28-import-workspace/spec.md) | [Mở](28-import-workspace/28-import-workspace.html) | Cài đặt & dữ liệu |
| FLOW-029 | [Ngôn ngữ, theme, zoom và mascot có sẵn](29-tuy-chon-hien-thi/spec.md) | [Mở](29-tuy-chon-hien-thi/29-tuy-chon-hien-thi.html) | Cài đặt & dữ liệu |
| FLOW-030 | [Yêu cầu AI tạo hoặc sửa mascot](30-ai-mascot-tao/spec.md) | [Mở](30-ai-mascot-tao/30-ai-mascot-tao.html) | Mascot & phản hồi |
| FLOW-031 | [Xem kết quả, áp dụng và xóa mascot tùy chỉnh](31-ai-mascot-ap-dung/spec.md) | [Mở](31-ai-mascot-ap-dung/31-ai-mascot-ap-dung.html) | Mascot & phản hồi |
| FLOW-032 | [Gửi phản hồi hoặc báo lỗi](32-gui-phan-hoi/spec.md) | [Mở](32-gui-phan-hoi/32-gui-phan-hoi.html) | Mascot & phản hồi |
| FLOW-033 | [Admin quản lý tài khoản, khóa và vô hiệu hóa](33-admin-tai-khoan/spec.md) | [Mở](33-admin-tai-khoan/33-admin-tai-khoan.html) | Quản trị |
| FLOW-034 | [Admin quản lý role và gán quyền](34-admin-role/spec.md) | [Mở](34-admin-role/34-admin-role.html) | Quản trị |
| FLOW-035 | [Thống kê tổng hợp và nhật ký quản trị](35-admin-thong-ke-audit/spec.md) | [Mở](35-admin-thong-ke-audit/35-admin-thong-ke-audit.html) | Quản trị |
| FLOW-036 | [Ủy quyền request và adapter routes legacy](36-phan-quyen-adapter/spec.md) | [Mở](36-phan-quyen-adapter/36-phan-quyen-adapter.html) | Hạ tầng ứng dụng |
| FLOW-037 | [Khởi động API, health và bảo trì định kỳ](37-maintenance-health/spec.md) | [Mở](37-maintenance-health/37-maintenance-health.html) | Hạ tầng ứng dụng |

## Quy tắc chung

- Note/label/reminder/notification private theo owner; Admin không đọc nội dung của customer, kể cả user có cả hai role.
- API trong spec tính từ /api/v1 trừ health, local và job. Request/response envelope, field DTO và inventory đầy đủ vẫn tra15-api-contract/api-inventory; spec không tự thay hợp đồng đã xác nhận.
- Lưu server ACK, lưu thiết bị và đồng bộ pending là ba trạng thái phân biệt. Không tự nâng version để overwrite, không dùng retry create với key/payload khác.
- Giao dịch database và thao tác ngoại vi không phải một transaction chung. Email/provider có thể đã nhận trước khi ACK mất.
- Tiêu chí AC là danh sách cần kiểm; đợt tài liệu không chạy lại toàn bộ acceptance hay kiểm production.

## Giới hạn dữ liệu chung

Title150 ký tự, content100.000 ký tự, rich JSON1MiB; label name50 ký tự,20labels/note,5reminder active/note. Emoji đại diện là một grapheme hợp lệ; rich document chỉ dùng schema/whitelist.

## Liên kết bộ docs

- [Luồng WF gốc](../../05-workflow.md)
- [Contract API](../../15-api-contract.md) và [inventory](../../api-inventory.md)
- [Frontend implementation](../../FRONTEND-IMPLEMENTATION.md)
- [Backend implementation](../../BACKEND-IMPLEMENTATION.md)
- [Security/privacy](../../16-security-privacy.md)
- [Worklog](../../worklog.md)
