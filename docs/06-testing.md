# 06 — Kiểm thử và bằng chứng

> 2026-10-16 | DRAFT | Áp dụng: YES

## Chiến lược

Ưu tiên integration API với DB test tách biệt và hai user A/B; bổ sung unit cho lịch lặp/validation, contract cho React, E2E cho auth→note→trash. Admin C chỉ quản lý tài khoản/thống kê, không đọc nội dung ghi chú. Mọi ca dưới đây NOT RUN trong phiên tài liệu.

| ID | REQ/WF | Thiết lập / thao tác | Kết quả mong đợi | Mức |
| --- | --- | --- | --- | --- |
| TC-001 | REQ-001/WF-001 | OTP đúng/sai/hết hạn/tái sử dụng; đăng ký trùng email | Xác minh đúng, mã dùng một lần, duplicate được xử lý | Integration |
| TC-002 | REQ-001 | Login email/password; Google token sai audience; token hết hạn | Phiên đúng; token sai bị từ chối; lỗi ổn định | Integration |
| TC-003 | REQ-002 | A gọi mọi list/detail/mutation với ID note/tag/reminder của B | Không dữ liệu hoặc tác động của B; anonymous 401 | Security integration |
| TC-004 | REQ-003 | Tạo/sửa note, title 150/151; rỗng/null; màu không hợp lệ | Lưu đúng hoặc 400 theo rule đã chốt; không 500 do schema lệch | Integration |
| TC-005 | REQ-004 | Gán lại nhãn, gán tag B, xóa nhãn đang dùng | Không trùng; từ chối chéo owner; note còn nguyên | Integration |
| TC-006 | REQ-005 | Pin/unpin rồi tải lại | Nhóm/thứ tự/PinnedAt đúng, server quản lý audit | Integration/E2E |
| TC-007 | REQ-005 | Reorder neighbor khác owner/nhóm/self; hai request đồng thời | Không sửa dữ liệu khác; thứ tự ổn định hoặc conflict rõ | Integration |
| TC-008 | REQ-006 | Soft delete→trash→restore→hard delete | Active/trash nhất quán; graph được xử lý nguyên tử | Integration/E2E |
| TC-009 | REQ-006 | Trash 6d23h59m và đúng 7 ngày, job chạy lặp, race restore | Chỉ purge đủ 7 ngày; không xóa note active; retry an toàn | Integration với clock giả |
| TC-010 | REQ-008/WF-005 | Tới hạn/lặp/timezone; restart; gửi trùng; note trash; SMTP lỗi | Không mất lịch/nhắc note xóa; dedup; retry và tín hiệu lỗi | Worker integration |
| TC-011 | REQ-009/012 | User sửa profile B; user gọi admin; admin mở note A; khóa A khi còn token | Từ chối; admin không đọc nội dung; khóa có hiệu lực theo policy phiên | Security integration |
| TC-012 | REQ-011 | Plain/checklist/rich/Markdown; màu chữ/emoji/icon; HTML script/link nguy hiểm | Round-trip đúng format hỗ trợ; không XSS; conversion không âm thầm mất dữ liệu | Contract/E2E |
| TC-013 | REQ-007 | Search title/content, dấu tiếng Việt, pagination, lọc tag, note trash/B | Chỉ kết quả đúng scope và thứ tự ổn định | Integration |
| TC-014 | REQ-010 | React login→tạo/sửa→search→trash→restore; mobile/keyboard | Luồng đầy đủ, focus đúng, lỗi lưu giữ dữ liệu nhập | E2E |
| TC-015 | REQ-003 | Ghi thành công mất ACK; autosave hai tab | Không tạo trùng vô ý; conflict rõ, giữ bản nhập | Integration/E2E, Q-013 |
| TC-016 | File 23 | Dry run SQL Server→Postgres; owner/ID/audit/format | Count/quan hệ/instant đúng; account login đúng theo phương án auth | Migration |
| TC-017 | File 22 | Restore backup vào DB biệt lập | Đăng nhập/đọc note/owner/reminder đúng, đo RPO/RTO | Recovery |
| TC-018 | File 16 | Nếu bật Supabase Data API: thử anon/user A/user B và grants/RLS | Không có đường vòng đọc/sửa note hoặc Identity | Security integration |

## Cách chạy hiện tại

Chưa tìm thấy project test, package.json hoặc CI workflow trong source được khảo sát. Không đưa lệnh `dotnet test`/`npm test` như suite hiện hữu. Khi tạo test trong phiên API, ghi đúng project, fixture DB, lệnh và kết quả vào bảng evidence.

Build kiểm tra chuẩn bị, chưa chạy trong phiên docs (PowerShell):

```powershell
# cwd: D:\My Project\NTC\NoteTatCa
dotnet restore .\NTC.API\NTC.API.csproj
dotnet build .\NTC.API\NTC.API.csproj --no-restore
```

Không chạy integration bằng database chứa dữ liệu thật. Dọn dữ liệu fixture theo ID test và database test đã xác minh, không reset production.

## Bằng chứng phiên này

| Ngày / mốc | Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- | --- |
| 2026-10-16 / d8f854b | Đọc source controllers/services/models/DbContext/csproj | Khảo sát hoàn thành, worklog | Không chứng minh runtime |
| 2026-10-16 | `dotnet --list-sdks` | Có SDK 9.0.317 | Runtime .NET 8/SQL chưa kiểm |
| 2026-10-16 | Bộ docs: tên file/link/placeholder | Kết quả cuối ở worklog | Kiểm tra tài liệu |
| 2026-10-16 | Build/API/DB/E2E/load/restore | NOT RUN | Phiên chỉ docs, không sửa API |

Điều kiện API được nghiệm thu: ca thuộc phạm vi PASS, không còn lỗi truy cập chéo owner/admin đọc note, contract nhất quán, migration an toàn. Không tuyên bố production-ready từ build.
