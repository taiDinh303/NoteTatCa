# Đo danh sách note lớn — 2026-10-27

## Phạm vi và cách chạy

- Dùng `tools/FrontendFixture` trên `127.0.0.1`, SQLite trong bộ nhớ, tài khoản và nội dung giả. Mỗi kịch bản thêm 1.000 note dài khoảng 400 ký tự vào 6 note mẫu. Không dùng database của chủ dự án, không gửi email thật, không đo production.
- Playwright Chromium, desktop 1440×900 và mobile emulation 393×852. Sau đăng nhập, reload `/notes`, tính `readyMs` đến khi card đầu tiên của dữ liệu giả hiển thị. Đếm mọi phản hồi `/api/v1/` đến hết phép cuộn. `apiBodyBytes` là kích thước body giải mã trong browser, không phải byte trên dây/gzip. Cho document cuộn thêm 8px mỗi `requestAnimationFrame` trong 120 khung; đo p95 khoảng cách khung và số khoảng trên 32ms. Không throttle CPU/mạng. File tái chạy: `ntc_react/e2e/performance-notes.spec.ts` với `NTC_PERF=1`.
- Bản đầu trước tối ưu đo cùng kịch bản; bản sau đo lại cùng máy/fixture. Số request/byte gồm các request nền tới labels/reminders/inbox/profile nên có thể thay đổi theo lịch trình; `readyMs` mới là mốc trang đầu sẵn sàng.

| Kịch bản | Trước: sẵn sàng | Trước: request / body | Sau: sẵn sàng | Sau: request / body | Sau: p95 khung / >32ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440×900 | 4.671ms | 20 / 871.458 B | 1.719ms | 9 / 99.362 B | 16,8ms / 0 |
| Mobile 393×852 | 3.857ms | 19 / 775.945 B | 1.593ms | 13 / 100.823 B | 16,7ms / 0 |

## Kết luận từ số đo

`WorkspacePreparation` trước đây tải tất cả 1.000 note theo các trang 100 và chặn mở màn hình. Đây là nguyên nhân rõ ràng của request/bytes và thời gian sẵn sàng cao. Đã đổi để chỉ trang đầu chặn mở màn hình; nút **Load more notes** vẫn dùng phân trang API khi người dùng cần xem thêm. Cơ chế cache không suy diễn một bộ lọc từ trang đầu chưa đầy đủ; lọc/search vẫn hỏi server. Không triển khai delta sync hoặc virtualization vì phép cuộn trang đầu chưa có khung trên 32ms trong phép đo này.

Đây là số đo tổng hợp trên Chromium local, không đại diện cho máy vật lý, mạng chậm, trình duyệt khác, thao tác kéo chuột thật, hoặc 1.000 card cùng xuất hiện sau khi người dùng tải mọi trang. Nếu phát sinh giật ở các điều kiện đó, cần đo riêng trước khi chọn virtualization hoặc delta sync. Không có đo bộ nhớ đáng tin cậy trong lượt này.

## Rerun 2026-10-31

Đo riêng sau build: desktop ready2078ms,15requests,100429B; mobile1892ms,13requests,196855B. p95frame16.8ms,1/0frames>32ms. Cùng fixture1.000note và giới hạn phương pháp như trên; request/body thay đổi theo background timing. Không suy ra phần trăm cải thiện/giảm tốc từ một lượt hoặc cam kết thiết bị thật.
