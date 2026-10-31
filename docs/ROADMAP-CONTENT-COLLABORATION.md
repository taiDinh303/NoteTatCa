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

**Tiến độ 2026-10-27:** lịch sử phiên bản nội dung và archive JSON schema1 đã triển khai local, có diễn tập import qua hai SQLite fixture độc lập; xem [worklog](worklog.md). Lịch sử của pin/label/reminder, media manifest khi có media, import hơn giới hạn hiện tại và phép thử migration trên provider thật vẫn là phần mở rộng/kiểm chứng còn lại. Đo1.000note dẫn tới chỉ tải trang đầu khi mở app; chưa triển khai delta sync hoặc virtualization vì số đo hiện tại chưa chứng minh cần, xem [báo cáo đo tải](PERFORMANCE-NOTES-2026-10-27.md).
| 1 — TASK-023 | Ảnh và tệp đính kèm trước | Upload có tiến độ/hủy/thử lại, resize ảnh/alt text/caption, giới hạn loại và dung lượng; kiểm quyền tải/xóa; thay tên file không vượt kiểm loại; dọn upload mồ côi an toàn |
| 2 — TASK-024 | Bảng trong note | Thêm/xóa hàng cột, header, resize và cuộn ngang trong bảng trên mobile; copy/paste, undo/redo, view/edit/offline/export không mất dữ liệu. Bản đầu là bảng đơn giản, chưa phải bảng tính có công thức |
| 3 — TASK-025 | Audio và video | Đính kèm/phát/tua với trạng thái xử lý/lỗi; tải theo yêu cầu, không preload toàn bộ media. Ghi âm cần xin quyền mic khi bấm, có preview trước lưu. Upload file và nhúng link là hai luồng riêng; chưa hứa chuyển mã/ghi hình trực tiếp |
| 4 — TASK-026 | Vẽ bằng chuột/bút/cảm ứng | Canvas trong note: nét/màu/độ dày, tẩy, undo/redo, pan/zoom; lưu dữ liệu nét để sửa tiếp và ảnh preview. Không biến mọi nét thành ảnh duy nhất; thử thiết bị thật và tương tác cuộn trang |
| 5 — TASK-027 | Mời xem note có kiểm soát | Owner mời bằng email, người nhận đăng nhập đúng tài khoản để chấp nhận; xem danh sách quyền, pending/đã nhận, hủy lời mời và thu hồi quyền. Bản đầu chỉ Viewer, chưa link công khai hoặc sửa chung |
| 6 — TASK-028 | Bình luận | Vai trò Commenter được cấp riêng; thread ở cấp note trước, resolve/reopen và thông báo. Owner quản lý; tác giả sửa/xóa comment của mình theo chính sách đã chốt; Viewer không comment. Thu hồi quyền chặn cả nội dung/comment/attachment |
| 7 — TASK-029 | Sửa chung thời gian thực — PLANNED theo DEC-030 | Đã đồng ý đưa vào kế hoạch; chốt thiết kế quyền Editor trước khi triển khai. Thiết kế đồng bộ nhiều người, conflict/undo, reconnect và lịch sử attribution; test cùng sửa/offline/thu hồi quyền. Không dùng last-write-wins để giả lập cộng tác |
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
| TASK-031 — Mẫu ghi chú | Chọn mẫu học tập, nhật ký, kế hoạch hoặc biên bản họp để tạo note có sẵn cấu trúc, tiêu đề phần và checklist | Mỗi lần dùng tạo note độc lập, không sửa mẫu gốc hoặc note đã tạo khác; có preview/hủy; tương thích autosave/offline/guest/i18n. Không dịch nội dung user khi đổi ngôn ngữ. Mẫu do user tự thiết kế/chia sẻ thuộc TASK-036 theo DEC-030; cơ chế xuất bản/chia sẻ chưa chốt |
| TASK-032 — Lọc và tìm theo loại tệp | Lọc note có ảnh, video, audio, PDF hoặc tệp khác; kết hợp từ khóa và label, ví dụ Học tập + có PDF + tiếng Anh | Phụ thuộc TASK-023/025; phân loại bằng metadata type đã xác minh, không chỉ đuôi tên. Bản đầu mỗi lần chọn một loại, một note có nhiều tệp vẫn chỉ xuất hiện một lần; tìm theo tên tệp/caption được hỗ trợ và nội dung text hiện có. Không OCR/đọc nội dung PDF/nghe audio; không hiện file/note ngoài quyền truy cập. Offline chỉ tìm metadata đã tải và báo phạm vi local |
| TASK-033 — Liên kết giữa các note | Trong note Kế hoạch học đặt liên kết mở note Từ vựng; chọn note thay vì phải nhớ ID hoặc URL | Lưu note ID ổn định, đổi tên note đích không làm mất link; guest/offline copy sang account phải remap ID cho các note được copy. Note bị xóa/mất quyền/chưa tải offline có trạng thái phù hợp, không lộ title/snippet ngoài quyền. Không tự cấp quyền note đích. Backlinks/đồ thị được đưa vào TASK-037 theo DEC-030; chi tiết thiết kế chưa chốt |
| TASK-034 — Mục lục trong một note | Tự sinh từ Heading 1/2/3; bấm Ngữ pháp cuộn tới phần Ngữ pháp trong note Học tiếng Anh | Có bật/tắt, phân cấp đúng, heading trùng tên vẫn có anchor riêng; cập nhật khi thêm/đổi/xóa heading, hoạt động ở View/Edit/mobile/keyboard, không đổi note version chỉ vì đọc mục lục. Hỗ trợ offline; phụ thuộc thiết kế heading/anchor của rich document |

**Phân biệt:** label phân nhóm nhiều note (Học tập/Công việc); mục lục điều hướng các phần bên trong một note (Từ vựng/Ngữ pháp/Luyện nghe); liên kết note đi từ note này sang note khác; bộ lọc loại tệp tìm note có chứa loại đính kèm cần tìm. Bốn chức năng bổ sung nhau, không thay label hiện có.

**Ưu tiên đề xuất:** mẫu note và mục lục sau nền tảng bảo toàn dữ liệu TASK-022, có thể làm trước media; liên kết note tiếp theo sau khi chốt ID/remap/offline; lọc loại tệp làm cùng đợt attachment, mở rộng audio/video khi các loại đó được hỗ trợ. Chưa cần chờ chia sẻ/realtime để triển khai bốn mục này, nhưng mọi đường truy cập phải sẵn sàng kiểm quyền.

## Bổ sung toàn bộ đề xuất và AI chat — DEC-030, 2026-10-25

Nguồn: chủ dự án yêu cầu “Thêm luôn các đề xuất của bạn vào đi” và nêu ý tưởng AI chat tự tạo note/nội dung theo yêu cầu. Tất cả mục dưới là **PLANNED — đã đồng ý đưa vào kế hoạch, chưa triển khai**. Người dùng đang tìm hiểu realtime, công thức và delta/pagination; việc đưa vào danh sách không có nghĩa đã chốt cơ chế, quyền, chi phí hay lịch phát hành. Chỉ có tài liệu thay đổi ở lượt này.

TASK-022 tiếp tục bao gồm lịch sử phiên bản/khôi phục và export/import trọn bộ (JSON + media manifest/archive khi có media); cần chốt retention, giới hạn, round-trip và phục hồi tham chiếu. TASK-029 được đưa từ đề xuất vào kế hoạch; chỉ bật quyền Editor và cùng sửa khi thiết kế/kiểm thử đã hoàn tất.

| Task | Phạm vi dự kiến / ví dụ | Acceptance và phụ thuộc cần chốt trước khi làm |
| --- | --- | --- |
| TASK-035 — Chia sẻ bằng link, quyền và thời hạn | Link xem note, quyền Viewer/Commenter/Editor và thời điểm hết hạn | Thiết kế riêng chế độ yêu cầu đăng nhập và link công khai; owner chủ động chọn/cấp/thu hồi. Không mở mặc định toàn workspace, không tự cấp Editor. Phụ thuộc TASK-027/028/029; kiểm mọi đường tải note/file/comment/export, không hứa thu hồi bản đã tải |
| TASK-036 — Tự tạo/chia sẻ mẫu | User lưu cấu trúc note thành mẫu cá nhân, có thể chia sẻ mẫu | Phân biệt mẫu cá nhân với mẫu chia sẻ/public; preview phần dữ liệu được chia sẻ, tránh đưa nội dung riêng tư vào mẫu ngoài ý muốn. Sử dụng mẫu tạo note độc lập; phụ thuộc TASK-031 |
| TASK-037 — Backlinks và đồ thị liên kết | Note Family liên kết note Vocabulary; note Vocabulary hiện những note đang liên kết tới nó, có sơ đồ nếu cần | Không lộ tên/nội dung note ngoài quyền, xử lý xóa/thu hồi và remap guest; phụ thuộc TASK-033. Chốt UI danh sách backlinks trước hay cùng đồ thị |
| TASK-038 — OCR, đọc tài liệu và audio thành chữ | Tìm chữ trong ảnh/PDF, chuyển audio thành văn bản | Phụ thuộc media TASK-023/025; chốt hỗ trợ định dạng, opt-in gửi dữ liệu, xử lý local/cloud, provider, quota/chi phí và kiểm chất lượng. Không tự gửi tệp/note cho AI vì đã upload. OCR/transcript là bước riêng với AI tạo nội dung TASK-043 |
| TASK-039 — Bảng có công thức | Bảng chi tiêu tự cộng SUM, tính trung bình AVERAGE và tham chiếu ô | Là giai đoạn sau bảng đơn giản TASK-024. Chốt tập hàm/kiểu dữ liệu/locale, hiển thị lỗi và vòng tham chiếu, tính lại khi đổi ô, offline/import/export. Không mặc định tương thích toàn bộ Excel hoặc chạy JavaScript tùy ý trong công thức |
| TASK-040 — Mở rộng offline và đồng bộ thứ tự label | Thao tác nhãn, ghim/sắp xếp/trash offline; thứ tự nhãn nhất quán giữa thiết bị | Mở rộng TASK-016/017, không coi optimistic create/delete label hiện tại là offline queue. Chốt từng loại thao tác, operation ID/idempotency/version, lỗi/quyền thu hồi và xử lý xung đột nhiều tab/thiết bị; không tự xóa vĩnh viễn offline |
| TASK-041 — Đồng bộ phần thay đổi (delta sync) | Có1.000note, sửa2note thì lần sync chỉ lấy phần thay đổi và thông tin xóa | Mở rộng TASK-015/017, không phải kiểu tìm kiếm mới. Chốt cursor/revision, tombstone, reset cursor/full resync, phân quyền/thu hồi, offline và đo request/bytes. Chỉ cập nhật chỉ mục tìm kiếm tương ứng nếu đã có index cần cập nhật, không mặc định semantic search |
| TASK-042 — Phân trang hiển thị note | Ví dụ chỉ dựng30card đầu, tải/hiện thêm khi cuộn thay vì dựng1.000card cùng lúc | Kích thước30 chỉ là ví dụ, chưa chốt. Phân biệt phân trang UI/virtualization với phân trang API và cache offline; giữ search/filter/count/pin/reorder/keyboard/scroll position đúng. Đo theo TASK-014/015 trước chọn kỹ thuật; không mất dữ liệu đã tải |
| TASK-043 — AI chat tạo note/nội dung | “Hãy tạo note cho tôi có nội dung các từ vựng tiếng anh về chủ để family” | Tạo note mới hoặc sinh nội dung theo lệnh; không mặc định AI được đọc toàn bộ notes. Luồng preview/ghi, dữ liệu gửi, provider/model/quota và chat trong app hay kết nối ngoài chưa chốt. Chi tiết tại [32-ai-features](32-ai-features.md) |
| TASK-044 — Thông báo cộng tác có kiểm soát | Lời mời, comment, mention; tắt/bật email và gom thông báo | Phụ thuộc chia sẻ/comment; chống spam, không lộ nội dung/metadata ngoài quyền, kiểm thu hồi và giới hạn tần suất; không thay chính sách reminder hiện tại |

### Ba khái niệm giải thích bằng ví dụ

- **Sửa chung thời gian thực (TASK-029):** hai người mở cùng note được cấp Editor. A gõ danh sách từ vựng, B thêm nghĩa; thay đổi hiện dần ở cả hai máy mà không cần gửi file qua lại. Khác Viewer chỉ xem và Commenter chỉ bình luận. Cần giải quyết cùng sửa một đoạn, mất mạng và thu hồi quyền; chưa có trong runtime.
- **Bảng có công thức (TASK-039):** bảng thường chỉ chứa dữ liệu; bảng công thức có ô tự tính, ví dụ số tiền100+200+50 cho tổng350. Sửa200 thành300 thì tổng tự thành450. Bản bảng đơn giản TASK-024 vẫn làm trước; chức năng này không đồng nghĩa xây toàn bộ Excel.
- **Delta/pagination/đo tải:** delta là chỉ đồng bộ dữ liệu mới đổi; pagination là chỉ hiện một phần danh sách mỗi lần. TASK-014/015 đo thời gian mở app/note, số request, bytes, số card, bộ nhớ và độ mượt trên dữ liệu ít/nhiều, mạng chậm, mobile rồi mới chọn cách tối ưu. Cụm “tìm kiếm delta” trong trao đổi trước là cách gọi chưa chính xác, được sửa thành “đồng bộ phần thay đổi”; không lập một chức năng tìm kiếm delta độc lập.

### Thứ tự còn là đề xuất

Giữ nền tảng bảo toàn dữ liệu TASK-022 trước; mẫu/mục lục/liên kết có thể làm trước media. Công thức sau bảng thường, OCR/audio transcript sau upload, realtime sau quyền chia sẻ/history. Delta/pagination chỉ ưu tiên khi số đo cho thấy cần. AI chat tạo note mới có thể là đợt độc lập sau nền tảng lưu an toàn, không cần chờ video/cộng tác; nếu AI xuất bảng cấu trúc thì phụ thuộc TASK-024. Provider, quota/chi phí và lịch cụ thể chưa quyết định.

## Các lựa chọn để phỏng vấn trước từng giai đoạn

Không cần chốt toàn bộ ngay. Trước TASK-023: dung lượng/file và tổng tài khoản, loại file, storage/ngân sách, guest có media hay không. Trước TASK-024/039: bảng đơn giản làm trước, chốt tập công thức giai đoạn sau. Trước TASK-025: ưu tiên audio hay video, upload hay nhúng, có ghi âm không. Trước TASK-026: canvas trong note hay bảng vẽ toàn màn hình (đề xuất canvas trong note). Trước TASK-027/028: chỉ mời người đã đăng ký hay có onboarding từ email; quyền mặc định Viewer; có link công khai/hạn chia sẻ hay không; retention comment/history và ai được xóa. Trước TASK-029: chốt vai trò Editor, cơ chế cùng sửa/offline/undo, không hỏi lại việc đã đồng ý đưa realtime vào kế hoạch. Trước TASK-043: chốt các câu hỏi Q-031–035 trong32-ai-features.

## Cách dùng worklog về sau

Mỗi đợt chọn một task, ghi rõ yêu cầu/thiết kế đã duyệt, scope, thay đổi schema/API nếu có, kiểm thử thực tế và giới hạn; kết thúc ghi phần còn lại. Task chỉ DONE khi có bằng chứng, chưa có ngày phát hành cam kết. Trước thay đổi dữ liệu thật/storage/billing/deploy phải review cấu hình, migration và phương án khôi phục theo quy định repo.
