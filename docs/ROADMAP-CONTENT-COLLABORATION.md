# Roadmap nội dung và cộng tác — NoteTatCa

> 2026-10-25 | KẾ HOẠCH, CHƯA TRIỂN KHAI | Nguồn: yêu cầu chủ dự án.

## Định hướng đã được yêu cầu

NoteTatCa phát triển thành nơi ghi chép nhiều loại nội dung: chữ, hình ảnh, video, audio, bảng và nét vẽ bằng bút. Người dùng có thể bình luận và mời người khác xem note theo cách chia sẻ tài liệu/bảng tính. Đây là phạm vi tương lai; không khẳng định các chức năng này đang có.

Note mặc định vẫn riêng tư. Chia sẻ sau này là quyền được chủ note cấp rõ ràng, không biến toàn bộ tài khoản thành công khai. Admin vẫn không được đọc nội dung note. Các quy tắc ownership hiện hành tiếp tục áp dụng cho tới khi có thiết kế quyền chia sẻ, API và kiểm thử được duyệt. Giữ .NET 8/Identity và frontend hiện có; không cần viết lại project.

## Thứ tự đề xuất

Mỗi giai đoạn có thể phát hành riêng. Ưu tiên hoàn thiện khả năng giữ dữ liệu trước khi mở upload và cộng tác; không làm tất cả trong một đợt.

| Giai đoạn / task | Phạm vi | Điều kiện hoàn thành |
| --- | --- | --- |
| 0 — TASK-022 | Củng cố offline/sync hiện có, version history và export/import có phiên bản | Khôi phục bản trước mà không mất bản hiện tại; export có thể nhập lại; lỗi quota/mất mạng/đổi tài khoản không mất draft; phân biệt cache với backup |
| 1 — TASK-023 | Ảnh và tệp đính kèm trước | Upload có tiến độ/hủy/thử lại, resize ảnh/alt text/caption, giới hạn loại và dung lượng; kiểm quyền tải/xóa; thay tên file không vượt kiểm loại; dọn upload mồ côi an toàn |
| 2 — TASK-024 | Bảng trong note | Thêm/xóa hàng cột, header, resize và cuộn ngang trong bảng trên mobile; copy/paste, undo/redo, view/edit/offline/export không mất dữ liệu. Bản đầu là bảng đơn giản, chưa phải bảng tính có công thức |
| 3 — TASK-025 | Audio và video | Đính kèm/phát/tua với trạng thái xử lý/lỗi; tải theo yêu cầu, không preload toàn bộ media. Ghi âm cần xin quyền mic khi bấm, có preview trước lưu. Upload file và nhúng link là hai luồng riêng; chưa hứa chuyển mã/ghi hình trực tiếp |
| 4 — TASK-026 | Vẽ bằng chuột/bút/cảm ứng | Canvas trong note: nét/màu/độ dày, tẩy, undo/redo, pan/zoom; lưu dữ liệu nét để sửa tiếp và ảnh preview. Không biến mọi nét thành ảnh duy nhất; thử thiết bị thật và tương tác cuộn trang |
| 5 — TASK-027 | Mời xem note có kiểm soát | Owner mời bằng email, người nhận đăng nhập đúng tài khoản để chấp nhận; xem danh sách quyền, pending/đã nhận, hủy lời mời và thu hồi quyền. Bản đầu chỉ Viewer, chưa link công khai hoặc sửa chung |
| 6 — TASK-028 | Bình luận | Vai trò Commenter được cấp riêng; thread ở cấp note trước, resolve/reopen và thông báo. Owner quản lý; tác giả sửa/xóa comment của mình theo chính sách đã chốt; Viewer không comment. Thu hồi quyền chặn cả nội dung/comment/attachment |
| 7 — TASK-029 | Sửa chung thời gian thực — đề xuất mở rộng | Chỉ bắt đầu khi owner duyệt Editor. Thiết kế đồng bộ nhiều người, conflict/undo, reconnect và lịch sử attribution; test cùng sửa/offline/thu hồi quyền. Không dùng last-write-wins để giả lập cộng tác |
| Xuyên suốt — TASK-030 | Quota, an toàn, hiệu năng và khả năng tiếp cận | Giới hạn theo tài khoản/note/file, test quyền mọi đường truy cập, keyboard/screen reader, mobile, i18n; đo tải note và bytes trước/sau; cập nhật Privacy đúng hành vi thực |

## Những điểm cần thiết kế trước khi code

### Nội dung và lưu trữ

- Giữ rich document có phiên bản schema; node mới có migration/compatibility và viewer fallback. Không tự tăng giới hạn JSON hiện tại để nhét video/base64 vào note. Nội dung binary lưu riêng, note tham chiếu attachment ID; nhà cung cấp storage và chi phí chưa chốt.
- Attachment có owner/note/status/dung lượng/type; kiểm quyền phía server trước tải hoặc cấp URL có hạn. Preview/thumbnail cũng riêng tư. Không coi URL khó đoán là phân quyền; URL đã cấp có thể còn hiệu lực đến khi hết hạn.
- Xóa block không xóa ngay binary còn được history, pending edit hoặc note khác tham chiếu. Soft delete note giữ khả năng restore trong 30 ngày; purge attachment theo tham chiếu và retention được chốt. Không hứa backup biến mất cùng thời điểm xóa dữ liệu chính.
- Quota/loại file phải kiểm server, không chỉ UI; tên, metadata và định dạng nguy hiểm cần xử lý. Đo chi phí storage/bandwidth/preview trước bật video cho mọi người.

### Offline và guest

- Note text và cấu trúc tiếp tục dùng outbox/version. Media pending là hàng đợi riêng, có local ID và ánh xạ server ID, retry không tạo bản đính kèm trùng; chỉ báo đã đồng bộ khi cả nội dung và attachment đã ACK.
- Cache media theo lựa chọn/dung lượng, không tải video tự động. Có media chưa tải thì hiện placeholder khi offline; hết quota không được báo lưu thành công. Xóa dữ liệu trình duyệt có thể mất upload local chưa đồng bộ.
- Đề xuất guest hỗ trợ ảnh/vẽ local trong quota nhỏ trước; upload cloud, share và comment yêu cầu tài khoản. Copy guest sang account phải chuyển cả attachment rồi mới được xóa nguồn. Các khả năng guest này chưa có và cần triển khai cùng media.

### Quyền chia sẻ

- Note owner là người quyết định quyền; label cá nhân, account settings, session và reminder của owner không tự chia sẻ. Người nhận chỉ thấy nội dung/tệp được cấp, không thấy toàn bộ workspace.
- Đề xuất bản đầu: Owner / Viewer; sau đó Commenter; Editor là bước riêng. Không cho người nhận tự mời thêm, xóa note gốc hoặc chuyển ownership trong bản đầu.
- Hạn chế tải offline note được chia sẻ trong bản đầu. Thu hồi quyền chỉ chặn truy cập tiếp theo, không thể thu lại ảnh chụp/bản đã xuất/tải trước đó. Nếu cho cache offline phải chốt chính sách và giải thích giới hạn này rõ ràng.
- Cần test không truy cập chéo bằng ID note/comment/attachment/preview/search/export, không lộ dữ liệu qua thông báo, không cấp quyền bằng email chưa xác minh. Mọi lời mời/email chỉ gửi khi người dùng chủ động yêu cầu; tests dùng fixture, không email thật.

## Bổ sung đã duyệt vào kế hoạch — 2026-10-25

Chủ dự án đã hiểu và duyệt bốn mục dưới đây sau khi giải thích. Trạng thái là PLANNED, chưa triển khai; thứ tự chi tiết vẫn là đề xuất, không cam kết lịch phát hành.

| Task | Phạm vi và ví dụ | Acceptance / phụ thuộc |
| --- | --- | --- |
| TASK-031 — Mẫu ghi chú | Chọn mẫu học tập, nhật ký, kế hoạch hoặc biên bản họp để tạo note có sẵn cấu trúc, tiêu đề phần và checklist | Mỗi lần dùng tạo note độc lập, không sửa mẫu gốc hoặc note đã tạo khác; có preview/hủy; tương thích autosave/offline/guest/i18n. Không dịch nội dung user khi đổi ngôn ngữ. Mẫu do user tự thiết kế/chia sẻ là phần mở rộng chưa chốt |
| TASK-032 — Lọc và tìm theo loại tệp | Lọc note có ảnh, video, audio, PDF hoặc tệp khác; kết hợp từ khóa và label, ví dụ Học tập + có PDF + tiếng Anh | Phụ thuộc TASK-023/025; phân loại bằng metadata type đã xác minh, không chỉ đuôi tên. Bản đầu mỗi lần chọn một loại, một note có nhiều tệp vẫn chỉ xuất hiện một lần; tìm theo tên tệp/caption được hỗ trợ và nội dung text hiện có. Không OCR/đọc nội dung PDF/nghe audio; không hiện file/note ngoài quyền truy cập. Offline chỉ tìm metadata đã tải và báo phạm vi local |
| TASK-033 — Liên kết giữa các note | Trong note Kế hoạch học đặt liên kết mở note Từ vựng; chọn note thay vì phải nhớ ID hoặc URL | Lưu note ID ổn định, đổi tên note đích không làm mất link; guest/offline copy sang account phải remap ID cho các note được copy. Note bị xóa/mất quyền/chưa tải offline có trạng thái phù hợp, không lộ title/snippet ngoài quyền. Không tự cấp quyền note đích. Backlinks/đồ thị liên kết là mở rộng chưa chốt |
| TASK-034 — Mục lục trong một note | Tự sinh từ Heading 1/2/3; bấm Ngữ pháp cuộn tới phần Ngữ pháp trong note Học tiếng Anh | Có bật/tắt, phân cấp đúng, heading trùng tên vẫn có anchor riêng; cập nhật khi thêm/đổi/xóa heading, hoạt động ở View/Edit/mobile/keyboard, không đổi note version chỉ vì đọc mục lục. Hỗ trợ offline; phụ thuộc thiết kế heading/anchor của rich document |

**Phân biệt:** label phân nhóm nhiều note (Học tập/Công việc); mục lục điều hướng các phần bên trong một note (Từ vựng/Ngữ pháp/Luyện nghe); liên kết note đi từ note này sang note khác; bộ lọc loại tệp tìm note có chứa loại đính kèm cần tìm. Bốn chức năng bổ sung nhau, không thay label hiện có.

**Ưu tiên đề xuất:** mẫu note và mục lục sau nền tảng bảo toàn dữ liệu TASK-022, có thể làm trước media; liên kết note tiếp theo sau khi chốt ID/remap/offline; lọc loại tệp làm cùng đợt attachment, mở rộng audio/video khi các loại đó được hỗ trợ. Chưa cần chờ chia sẻ/realtime để triển khai bốn mục này, nhưng mọi đường truy cập phải sẵn sàng kiểm quyền.

## Đề xuất bổ sung còn cần duyệt chi tiết

1. **Lịch sử phiên bản và khôi phục**: ưu tiên trước chia sẻ để sửa nhầm không mất dữ liệu; cần giới hạn retention/dung lượng riêng, không dùng trash thay history.
2. Mẫu note đã được duyệt tại TASK-031; chức năng tự thiết kế/chia sẻ mẫu chưa chốt.
3. Lọc theo loại tệp đã được duyệt tại TASK-032; OCR ảnh, đọc nội dung tài liệu và chuyển audio thành chữ chưa chốt vì cần xác định xử lý riêng tư, nhà cung cấp và chi phí. Không mặc định gửi nội dung cho AI.
4. **Export/import trọn bộ**: JSON + media manifest/archive; Markdown cho phần tương thích, thông báo nội dung không thể chuyển đổi. Kiểm import lỗi, archive quá lớn và phục hồi tham chiếu.
5. **Thông báo cộng tác có kiểm soát**: lời mời/comment/mention và tùy chọn tắt email; gom thông báo tránh spam, không đưa nguyên nội dung riêng tư vào email mặc định.
6. Liên kết note và mục lục đã được duyệt tại TASK-033/034; backlinks/đồ thị chưa chốt. Liên kết không cấp thêm quyền truy cập note đích.

## Các lựa chọn để phỏng vấn trước từng giai đoạn

Không cần chốt toàn bộ ngay. Trước TASK-023: dung lượng/file và tổng tài khoản, loại file, storage/ngân sách, guest có media hay không. Trước TASK-024: bảng đơn giản có đủ hay cần công thức (đề xuất đơn giản). Trước TASK-025: ưu tiên audio hay video, upload hay nhúng, có ghi âm không. Trước TASK-026: canvas trong note hay bảng vẽ toàn màn hình (đề xuất canvas trong note). Trước TASK-027/028: chỉ mời người đã đăng ký hay có onboarding từ email; quyền mặc định Viewer; có link công khai/hạn chia sẻ hay không; retention comment/history và ai được xóa. Trước TASK-029: có thực sự cần Editor cùng lúc hay chỉ xem/comment.

## Cách dùng worklog về sau

Mỗi đợt chọn một task, ghi rõ yêu cầu/thiết kế đã duyệt, scope, thay đổi schema/API nếu có, kiểm thử thực tế và giới hạn; kết thúc ghi phần còn lại. Task chỉ DONE khi có bằng chứng, chưa có ngày phát hành cam kết. Trước thay đổi dữ liệu thật/storage/billing/deploy phải review cấu hình, migration và phương án khôi phục theo quy định repo.
