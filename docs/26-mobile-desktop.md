# 26 — Mobile và desktop native

> Cập nhật: 2026-10-17 | Áp dụng: NO | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

NO native vẫn giữ. React responsive/keyboard nằm trong ntc_react, evidence browser ở FRONTEND-IMPLEMENTATION; không có native mobile/desktop package. Backend bearer API không tự tạo offline capability.

Phạm vi hiện được chốt là web React. Không có yêu cầu iOS/Android native, Windows installer, signing, store distribution hoặc native offline DB. Không tạo ứng dụng native chỉ để hoàn thành mẫu.

Mobile browser/responsive vẫn nằm trong [UI](09-ui-design.md) và TC-014: editor thao tác touch, menu phù hợp màn hình nhỏ, bàn phím ảo, focus, không tràn ngang, kéo thả có phương án thay thế. PWA/install/offline chưa được chọn; mở lại tài liệu nếu chủ dự án giao phạm vi đó.
