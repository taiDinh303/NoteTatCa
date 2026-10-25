# 32 — Tính năng AI

> Cập nhật: 2026-10-25 | Áp dụng: YES cho KẾ HOẠCH | PLANNED, CHƯA TRIỂN KHAI | DEC-030 / REQ-013 / TASK-043.

## Nguồn yêu cầu và hiện trạng

Chủ dự án muốn sau này liên kết AI chat để tự tạo note hoặc sinh nội dung theo lệnh, ví dụ: “Hãy tạo note cho tôi có nội dung các từ vựng tiếng anh về chủ để family”. Lượt này chỉ cập nhật kế hoạch. Trạng thái NO/chưa có yêu cầu AI trong bản2026-10-17 đã được thay thế; runtime hiện tại vẫn chưa tích hợp provider/model/API key/chat AI.

Chưa chốt chat nhúng trong NoteTatCa hay kết nối với một dịch vụ chat bên ngoài. Không mặc định chọn OpenAI, một model, SDK, database vector hoặc cơ chế đăng nhập/billing nào. Việc có tài khoản chat không được coi là đã cấp quyền API hoặc ngân sách cho ứng dụng.

## Mục tiêu đã được yêu cầu

- Nhận yêu cầu bằng ngôn ngữ tự nhiên và tạo một note mới hoặc sinh nội dung note theo chủ đề/định dạng người dùng muốn.
- Ví dụ family: đề xuất tiêu đề “Family — Từ vựng tiếng Anh”, danh sách từ/ nghĩa tiếng Việt/ ví dụ câu. Số từ, phiên âm, trình độ và cấu trúc do prompt hoặc tùy chọn sau này quyết định; không coi ví dụ là quota/tập trường đã chốt.
- Không cần đọc note cũ để tạo nội dung từ một yêu cầu độc lập. Nếu cần dựa trên note hiện có, phạm vi note/đoạn văn được gửi phải được user chủ động chọn và có quyền đọc.
- Kết quả khi được lưu phải đi qua document schema/validation, owner và autosave/version/idempotency của app. Không đưa HTML/script tùy ý từ model vào editor.

## Luồng bản đầu đề xuất — cần chốt trước code

1. User mở AI chat và nhập chủ đề, ví dụ từ vựng tiếng Anh về family, kèm số lượng/mức độ nếu muốn.
2. AI sinh bản nháp; hiện trạng thái đang tạo, hủy, lỗi hoặc giới hạn. Khi lỗi không mất prompt/bản nháp hiện tại.
3. Đề xuất preview để chọn **Tạo note mới**, hoặc **Chèn vào note đang mở**. Chế độ tạo thẳng sau lệnh rõ ràng là lựa chọn khác, chưa chốt. Thay toàn bộ nội dung cũ là thao tác riêng, không mặc định khi user chỉ nói “tạo nội dung”.
4. Nếu user yêu cầu sửa kết quả, chat tiếp trong phạm vi bản nháp đã chọn. Sau lệnh ghi, chỉ báo lưu khi app/server xác nhận; có thể View/Edit bình thường.

Luồng preview này là PROPOSED, không phải quyết định user đã duyệt. Bản đầu có thể dùng heading/paragraph/list/checklist hiện được hỗ trợ; bảng cấu trúc phụ thuộc TASK-024. Sinh ảnh/audio/video, tóm tắt/viết lại toàn workspace, chat tìm kiếm mọi note/RAG, tự chia sẻ/xóa/gửi email là mở rộng riêng chưa được yêu cầu trong TASK-043.

## Dữ liệu, quyền và chi phí phải thiết kế

- AI không có quyền đọc vượt user, không dùng quyền admin để lấy nội dung note, không tự đọc mọi note/file hoặc nhãn. Note/chat/tệp đưa vào model là dữ liệu, không phải lệnh cấp thêm quyền cho tool.
- Chốt thông tin gửi ra ngoài: prompt, đoạn/note được chọn, lịch sử chat và metadata; thông báo rõ trước khi gửi nội dung riêng. Mặc định tối thiểu dữ liệu là đề xuất, phải xác định theo luồng đã chọn.
- Chọn provider/model, kết nối do app trả phí hay user tự cấu hình, quota theo account, giới hạn output/thời gian/token/chi phí, hủy/timeout/rate-limit và cách đo usage. Không nhúng secret vào frontend, logs hoặc export.
- Chốt lưu chat bao lâu, user có xóa/xuất được không, dữ liệu/log phía provider và khả năng xử lý yêu cầu xóa. Không cam kết dữ liệu không được lưu/huấn luyện nếu chưa kiểm chính sách/cấu hình của dịch vụ được chọn.
- Output AI có thể sai; đánh giá từ vựng/nghĩa/ví dụ và cấu trúc với bộ prompt thử. Nội dung là bản sinh để user kiểm tra/sửa, không bảo đảm chính xác tuyệt đối.
- Nếu note thay đổi trong lúc AI đang sinh, kiểm version trước ghi; giữ bản user/bản AI và xử lý conflict, không âm thầm ghi đè. Retry sau mất ACK không tạo note trùng; không báo đồng bộ hoàn tất trước server ACK.
- Offline có thể giữ prompt/bản nháp local sau khi thiết kế storage phù hợp; chưa hứa gọi AI offline. Guest AI, copy lịch sử chat và billing/quota guest chưa chốt.

## Acceptance đề xuất

- Prompt family tạo đúng chủ đề và cấu trúc được chọn; có thể hủy/sửa prompt, lỗi giữ dữ liệu.
- Tạo note mới, chèn hoặc thay nội dung tuân theo lựa chọn đã chốt; sửa trong app được và dữ liệu sống qua reload sau ACK.
- Chặn đọc/ghi note khác owner hoặc quyền đã thu hồi; không lấy title/snippet từ note ngoài phạm vi; không thực thi chỉ dẫn trong note để tự gọi công cụ ngoài lệnh user.
- Output sai schema/quá100.000 ký tự text hoặc1MiB rich JSON bị xử lý rõ ràng theo giới hạn hiện hành, không lặng lẽ cắt mất nội dung đã lưu. Bất kỳ thay đổi quota nào cần quyết định riêng.
- Test timeout, provider lỗi, quota, hủy stream, retry/mất ACK, conflict, logout/account switch, ngôn ngữ giao diện và bàn phím/mobile. Kiểm luồng xem/sửa sau tạo; unit/eval không thay kiểm flow UI→API→lưu note.
- Dùng dữ liệu tổng hợp và provider giả trong test; không gửi nội dung note thật hoặc phát sinh phí thật từ test tự động.

## Câu hỏi để chốt khi bắt đầu TASK-043

| ID | Cần quyết định | Trạng thái / người quyết định |
| --- | --- | --- |
| Q-031 | Chat nhúng trong app hay tích hợp dịch vụ chat ngoài; cách truy cập trên PC/mobile? | CHƯA CHỐT — chủ dự án trước thiết kế UI/kết nối |
| Q-032 | Preview rồi tạo hay tạo thẳng; bản đầu có chèn/thay note hiện có hay chỉ tạo note mới? | CHƯA CHỐT — chủ dự án trước contract ghi |
| Q-033 | Provider/model, phương thức xác thực/thanh toán và quota/ngân sách? | CHƯA CHỐT — chủ dự án trước gọi dịch vụ thật |
| Q-034 | Chỉ gửi prompt hay cả đoạn/note được chọn, opt-in và dữ liệu/log/retention phía dịch vụ? | CHƯA CHỐT — chủ dự án trước gửi dữ liệu ngoài app |
| Q-035 | Lưu chat/bản nháp bao lâu; guest/offline hỗ trợ mức nào? | CHƯA CHỐT — chủ dự án trước thiết kế persistence |

Xem [roadmap](ROADMAP-CONTENT-COLLABORATION.md), [plan](01-plan.md), REQ-013 tại [nghiệp vụ](02-business-analysis.md), ADR-019 và risk tại34. Chưa có lịch phát hành, thay schema, migration, deploy hoặc dữ liệu gửi ra ngoài trong lượt lập kế hoạch này.
