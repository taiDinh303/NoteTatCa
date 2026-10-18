# Hướng dẫn làm việc với docs NoteTatCa

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

Nhiệm vụ code được giao 2026-10-17 đã triển khai theo BACKEND-IMPLEMENTATION. Đọc source/evidence mới; không dùng baseline docs-only làm hiện trạng. Docs duy nhất ở root NTC/docs; giữ owner/private/Identity, quotas100k, duplicate label/untitled và quyết định lịch đã chốt. Không tự deploy/migrate DB thật hoặc sửa Razor/config local.

Phạm vi chỉ thư mục `docs`. Chỉ dẫn người dùng có ưu tiên; file này không tự giao nhiệm vụ sửa code, deploy hay thay đổi dữ liệu.

1. Đọc 00-README, PROJECT-INTAKE, 01-plan và snapshot worklog trước khi cập nhật.
2. Phân biệt CURRENT, TARGET, PROPOSED và NOT VERIFIED. Code là hiện trạng; không dùng lỗi code để hợp thức hóa nghiệp vụ.
3. Ghi câu trả lời bằng ID Q và nguồn/ngày; cập nhật REQ/RULE/ADR/API/TC liên quan. Không hỏi lại điều đã được chốt.
4. Giữ `ntc_aspnet/NTC.VIEW` đến khi chủ dự án yêu cầu khác. React TS/Vite ở NTC/ntc_react, UI tiếng Anh; decisions Q-001–008 và Q-019–025 đã chốt, không hỏi lại.
5. Git root đã chuyển lên NTC theo yêu cầu chủ dự án 2026-10-17. NTC/docs là nguồn tài liệu duy nhất trong repo; không tạo lại ntc_aspnet/docs hoặc nested .git. Backend giữ trong ntc_aspnet; Git/tool/CI/scripts/deploy files ở root. Lệnh hiện hành chạy từ root, dùng prefix ntc_aspnet/ cho project .NET. Chỉ xác nhận push sau khi kiểm remote.
6. Không ghi secret, connection string thật, token, email cá nhân hay nội dung note thật. Ví dụ dùng `example.test` và dữ liệu giả.
7. Nhiệm vụ tài liệu hoàn tất bằng kiểm tra nội dung/link/trạng thái. Nhiệm vụ code sau này cần nghiệm thu đầu cuối phù hợp; build không thay thế test ownership/runtime.
8. Trước code, chốt phạm vi phần được giao, quyền server, dữ liệu, lỗi và tiêu chí chấp nhận. Phần không phụ thuộc câu hỏi vẫn tiếp tục được.
9. Lệnh ghi shell/cwd/môi trường; lệnh chưa chạy ghi NOT RUN. Không tự chạy migration/xóa dữ liệu từ runbook.
10. UTF-8; link tương đối trong docs; ID ổn định; không để placeholder mẫu. Thông tin chưa biết phải có Q, người quyết định và bước bị chặn.
11. Cập nhật worklog và file chủ quản cùng thay đổi. Không ghi APPROVED/PASS/DONE cho nội dung chưa được duyệt hoặc kiểm tra.
