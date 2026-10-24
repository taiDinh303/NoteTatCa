# 33 — Analytics và thống kê

> Cập nhật: 2026-10-17 | Áp dụng: YES | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

CURRENT admin statistics aggregate và account metadata đã triển khai/test; không title/content/preview hoặc content analytics. Không tracking frontend/warehouse/BI/PII event pipeline trong scope. Alert vận hành khác với analytics sản phẩm; xem20.

Q-007 đã chọn admin quản lý user và xem thống kê, không đọc note. Chưa có data warehouse, click tracking, session replay hoặc phân tích nội dung/AI. Thống kê đích phải lấy aggregate metadata và không trả title/content/document/search term cho admin.

| Metric PROPOSED | Định nghĩa ban đầu | Dữ liệu / privacy | Kiểm tra |
| --- | --- | --- | --- |
| Total accounts | Số account tồn tại, tách active/locked/deactivated | Identity metadata tối thiểu | Không đếm user đã loại sai policy |
| Active users | User có hoạt động đã định trong 7/30 ngày | Cần định nghĩa event/retention, chưa có pipeline | Không gọi total accounts là active users |
| Note counts | Active/trash, tổng số theo môi trường | Aggregate không nội dung | Scope/state/cutoff 30 ngày |
| Delivery health | Due/sent/retry/fail/dedup | Operational metrics không body/email đầy đủ | Counter/idempotency |

Chốt metric chính xác, timezone bucket, exclusion test users và quyền admin trước endpoint statistics. Đề xuất trả aggregate toàn hệ thống, metadata từng user chỉ trong quản lý tài khoản; không thêm drill-down nội dung note. Rà query/raw SQL/cache/response để không vô tình trả preview.

Không có benchmark hoặc dashboard runtime. Kịch bản TC-011 kiểm user không gọi statistics và admin không có content field; file 20 là nguồn chuẩn về operational monitoring.
