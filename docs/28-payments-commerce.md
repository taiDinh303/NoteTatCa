# 28 — Thanh toán và thương mại

> Cập nhật: 2026-10-17 | Áp dụng: NO | Đặc tả làm việc, xem trạng thái từng mục.

## Hiện trạng và hướng dẫn hiện hành

NO vẫn giữ: chưa payment/subscription/checkout/plan enforcement. Không nhập commerce từ Marixa hoặc chọn nhà cung cấp tính phí trong đợt backend.

NoteTatCa hiện chưa có yêu cầu gói trả phí, checkout, hóa đơn, subscription, quảng cáo hoặc bán sản phẩm. Không thêm payment provider/schema/webhook hay khóa tính năng theo billing.

Public nhỏ không tự đồng nghĩa có thu phí. Nếu chủ dự án mở phạm vi thương mại, cần chốt gói/hạn mức, currency/tax, quyền sau hủy, webhook/idempotency/refund, dữ liệu và acceptance riêng trước triển khai. Chưa có tài nguyên thanh toán hoặc test cần chạy.
