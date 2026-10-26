# React NoteTatCa — triển khai 2026-10-18

> CURRENT: đã triển khai React tại ntc_react theo yêu cầu người dùng. Kiểm chứng local được ghi ở cuối; cloud/external providers chưa phát hành.

## Phạm vi và kiến trúc

### Zoom danh sách, giữ nguyên giao diện — DEC-031, 2026-10-25

Theo yêu cầu mới, thay phạm vi zoom toàn giao diện của DEC-021: chỉ scale các nhóm/danh sách/card note, kể cả list view và Trash. Header, sidebar, New/filter/view mode, Load more, menu và hộp View/Edit giữ nguyên. Settings gọi là “Notes zoom” với4ngôn ngữ. Giữ range50–150% và key `ntc.interface.zoom.v1` để không mất preference cũ; giá trị lưu cũ nay áp dụng danh sách. Mức zoom nội dung note vẫn độc lập và reset100% khi đóng/mở.

Bổ sung theo phương án chủ dự án duyệt cùng ngày: Grid tự đổi số cột sau khi zoom dừng, tận dụng hết chiều ngang thay vì để khoảng trống lớn ở50% hoặc tràn ngang ở150%. Với W là chiều rộng viewport danh sách, s là scale, card chuẩn320px và gap20px, số cột là max(1, floor((W/s+20)/340)). Layer rộng W/s để sau transform luôn vừa W; CSS repeat với minmax(0,1fr) chia đều phần dư. Cột không phụ thuộc số note trong nhóm; nhóm ghim/nhóm thường dùng cùng số cột và chiều rộng, hàng thiếu note vẫn căn trái. Ví dụ browser1920px thực đo9/4/3cột tại50/100/150%; mobile393px2/1/1cột. List giữ một note/hàng và vừa toàn bộ chiều ngang ở cả ba mức; không phóng layer vượt viewport sau khi dừng.

Trong lúc wheel/pinch đang chuyển động, `NotesZoomViewport` scale liên tục và kiểm ngưỡng số cột mỗi frame; chỉ khi vượt ngưỡng mới fit/retarget ngay, không đợi gesture dừng rồi mới đổi hàng. Settled sau ít nhất160ms ngừng input và nội suy hoàn tất chỉ dùng để căn chiều ngang cuối cùng. Reflow chuyển vị trí và kích thước240ms, bỏ khi prefers-reduced-motion. Khi Dnd active vẫn hoãn fit. Reflow không sửa thứ tự sortOrder hoặc lưu note; mode/resize/sidebar vẫn fit như trước. Giữ note đầu tiên đang thấy ở vị trí đọc khi có thể, ngang về0 khi fit; danh sách chỉ cuộn dọc. Vùng này focus được bằng bàn phím.

Khung danh sách chỉ có một vùng cuộn dọc: customer-shell khi có data-notes-zoom dùng flex column cao100dvh; header giữ chiều cao tự nhiên, main-column/workspace-main min-height0, danh sách flex nhận phần còn lại. Bỏ tính height bằng JS theo window.innerHeight rồi cộng padding ngoài (gây page dư20px mobile/50px desktop khi đo trước sửa). Đệm đáy main còn20px; banner/notice/toolbar/pagination là siblings không co lại, thêm/bỏ chúng tự điều chỉnh chiều cao danh sách bằng flex/ResizeObserver. Không che scrollbar bằng body overflow:hidden; document thực sự vừa viewport, có thể cuộn đến note cuối trong danh sách. Quy tắc chỉ kích hoạt khi có viewport danh sách, không khóa các trang khác.

2026-10-26: scrollport danh sách mở rộng qua phần đệm phải của main tới mép cửa sổ; canvas note vẫn nằm trong đệm cũ. Lấy paddingRight thực tế theo responsive qua ResizeObserver để đặt biến inset, tăng width/margin âm và padding phải tương ứng. Tính số cột theo clientWidth trừ inset, không tính khoảng trống cạnh scrollbar vào vùng card. Root scrollbar-gutter chuyển auto chỉ khi có data-notes-zoom (root không cuộn); bỏ khoảng dành sẵn10px từng khiến thanh cuộn vẫn cách mép cửa sổ. Các trang khác giữ gutter stable, View/Edit vẫn dùng viewport nội dung riêng.

Bổ sung2026-10-26 theo ảnh Keep: scrollbar hiển thị native ở rail fixed top0/right0/bottom0, rộng12px, z-index30 trên header nhưng dưới modal. List vẫn ở dưới toolbar để chrome đứng yên; ẩn riêng scrollbar nội bộ bằng scrollbar-width:none, root không cuộn. Rail aria-hidden/tabIndex−1 chỉ là đại diện cho cùng offset, không thêm mục đọc cho screen reader; viewport All notes vẫn focus/cuộn bàn phím và touch/wheel bình thường. Spacer rail có chiều cao bằng chiều cao rail + scroll range của list, scrollTop đồng bộ2chiều có guard tránh vòng lặp; cập nhật sau zoom/fit/ResizeObserver/scroll, cleanup observer/listeners khi unmount. Rail ẩn khi không có overflow. Browser tests bật native scrollbar trong headless Chromium bằng ignoreDefaultArgs --hide-scrollbars để kiểm thật thao tác kéo thumb, không chỉ synthetic event.

2026-10-26 đối chiếu video chủ dự án: bản translate+scaleX/Y280ms còn hai nhịp phóng rồi xếp và làm chữ co kéo. Bản mới WAAPI translate3d kèm width/height thực,240ms cubic-bezier(.4,0,.2,1), không có scale riêng trên card (zoom cha vẫn uniform). Chụp box đang hiển thị trước cancel để retarget mượt; khóa grid-template-rows theo layout đích trong lúc card chuyển động để chiều cao card không kéo các hàng khác lần nữa. Width/height được browser nội suy và layout nội bộ card thay đổi, không React render từng frame; không tuyên bố đây là compositor-only. Khi hoàn tất/hủy/unmount giải phóng các hàng đã khóa, tính lại chiều cao stage/range scrollbar. Pointer/key press giải phóng transform trước sortable sensors. Chỉ fit khi đổi cột hoặc settled, không tính lại toàn bộ grid mỗi frame. Video tham chiếu là browser zoom của Keep, không suy ra mã nguồn/cơ chế nội bộ của Keep; header/sidebar app vẫn giữ nguyên theo yêu cầu trước.

Ctrl/Meta+wheel trong danh sách dùng exponential target, chuẩn hóa deltaMode và giới hạn mỗi impulse80px để tránh một nấc nhảy quá xa; requestAnimationFrame tiến dần tới target với time constant55ms. Transform dùng phần lẻ liên tục, không làm tròn từng frame. Context/localStorage chỉ ghi khi đã dừng ít nhất160ms và animation hoàn tất; HUD cập nhật trực tiếp. Hint compositor được bỏ sau khi dừng để chữ vẽ lại rõ ở mức cuối. Không fetch/refetch hoặc sửa dữ liệu trong zoom. Ctrl+wheel trên chrome khi đang có danh sách không đổi zoom; không chặn content zoom riêng. Cleanup đầy đủ frame/timer/listener/observer. Dnd translations và drop FLIP chia theo scale danh sách, giữ hình dáng card.

Đã kiểm Chromium local, không coi số liệu local là cam kết FPS mọi máy; chưa đo thiết bị vật lý/iOS Safari hoặc hàng nghìn card. Chưa triển khai virtualized canvas/board tự do. Evidence actual tại worklog.

### Tạo/xóa nhãn phản hồi ngay — 2026-10-25

Your labels hiện nhãn mới ngay khi Add, xóa trắng form và đưa danh sách về đầu; nút Add không chờ request hoặc tải lại workspace. Nhãn tạm chỉ có trong manager, aria-busy và khóa sửa/xóa tới khi nhận ID/version thật, không gửi ID tạm qua API gán nhãn. Sidebar/chooser nhận nhãn đã được server xác nhận. Xác nhận Delete đóng ngay, overlay ẩn nhãn trong mọi useLabels; request xóa chạy nền. Hoạt động đang chờ tồn tại ngoài modal nên đóng/mở manager không làm nhãn tạm biến mất hoặc nhãn đang xóa xuất hiện lại.

Xác nhận xóa nằm ngay trong dòng nhãn, thay popup chồng lên Your labels. Dòng đang chọn ẩn icon sửa/xóa, hiện tên/câu hỏi, Hủy/Xóa và hint; bản Việt đúng câu chủ dự án chọn: “Gỡ khỏi các ghi chú; Yours note vẫn được giữ.”, giữ nguyên cụm Yours note khi dịch4ngôn ngữ. Mỗi lúc chỉ một dòng xác nhận; chọn nhãn khác chuyển dòng, Hủy/Escape không gửi DELETE. Focus mặc định vào Hủy; Escape chỉ hủy dòng đang xác nhận, giữ manager mở, thông qua optional native onEscapeKeyDown của Modal. Trên mobile controls xuống hàng ngay trong dòng, không tràn ngang. Bấm Xóa mới ẩn dòng/xử lý nền, lỗi phục hồi như trước.

`LabelMutations` giữ từng thao tác riêng: lỗi tạo bỏ đúng dòng tạm, lỗi xóa bỏ overlay để phục hồi nhãn; không restore snapshot toàn danh sách làm mất thao tác thành công khác. Lỗi có toast4ngôn ngữ kể cả manager đã đóng. Cache đầy đủ cập nhật trực tiếp bằng phản hồi create/delete, không refetch labels toàn bộ mỗi lần; cache thiếu/chưa tải hết trang và lỗi kết quả chưa chắc chắn được reconcile ở nền. Xóa thành công invalidate notes để đồng bộ tag/version. Cached list vẫn hiện khi background refetch lỗi. Hộp Edit label hiện hữu giữ save/version behavior.

Mọi cache key được chụp theo account, auth identity thay đổi reset overlay/generation; trước gửi và sau ACK kiểm lại identity để không gửi thao tác đã chờ sang account mới hoặc ghi kết quả cũ vào account mới. Giữ guest repository, API ownership/backend/migrations. Đây là phản hồi lạc quan khi trang còn mở, không thêm hàng đợi ghi bền/offline hoặc tự replay tạo nhãn sau khi đóng tab. Không báo đã lưu trước ACK và không cho thao tác với ID tạm. Evidence9unit mới và2browser account tại worklog.

### Zoom riêng nội dung note — 2026-10-25

Tinh chỉnh cùng ngày: input zoom rộng28px, số căn giữa, nút−rộng24px để sát input hơn. Reset và dấu+ dùng SVG14px. View mở popup phía trên kính lúp, Edit mở inline sang phải và đẩy các công cụ sau.

Trong Edit PC, thứ tự đầu toolbar là bàn tay → kính lúp → controls zoom khi mở, nên kính lúp sát dấu−. Input kích cỡ chữ riêng thu từ40px còn30px, padding ngang2px, giữ căn giữa và hành vi đổi font size.

View có kính lúp cùng hàng cạnh Edit/Close; bấm mở popup−/input phần trăm/+/Reset phía trên, collision boundary theo modal, không chiếm chiều ngang footer hoặc che ngày Edited. Popup dùng backgroundColor và notePalette của note, mặc định dùng surface của theme. PC có bàn tay hiện sẵn cạnh kính lúp ở cả View/Edit, không cần mở zoom; mặc định tắt, bật mới giữ chuột trái kéo nội dung hai trục. Khi tắt vẫn chọn/copy chữ hoặc sửa bình thường. Pan không sửa document JSON/autosave; input/link không bị chặn. Touch vẫn cuộn/pinch như trước. View có nút Enter/Exit full screen ở góc trên phải PC kể cả note không title/icon; mobile vẫn toàn màn hình và ẩn nút này như Edit.

Edit có icon kính lúp ở đầu thanh định dạng; PC/mobile đều bấm để mở/đóng −/input/+/Reset100% ngay cùng hàng và đẩy các công cụ phía sau qua phải. Thanh định dạng tiếp tục cuộn ngang, không có popup hoặc thanh zoom dưới nội dung. Controls trong toolbar cao29px như nút định dạng để mở/đóng không làm tăng chiều cao. Enter hoặc rời input áp dụng giá trị, Escape hủy phần nhập chưa áp dụng. `ContentZoomOutlet` giữ target riêng cho zoom và bàn tay; controls zoom hiển thị inline trong Edit hoặc popup trong View, hand luôn ở thanh công cụ PC. Context giữ ref phần trăm và callback target ổn định, đóng popup không khởi tạo lại viewport/gesture/hand state. View popup phân biệt event controls portal bên trong với click ra ngoài.

Phạm vi50–300%, bước nút10%; Reset100% có ở cả View/Edit. Pinch hai ngón hoặc Ctrl/Meta+wheel trong nội dung zoom quanh điểm chạm, vuốt một ngón/cuộn bình thường để đọc và kéo ngang khi phóng lớn. Tiêu đề/icon, toolbar định dạng, labels và footer không thuộc lớp được scale. Zoom là trạng thái hiển thị, không đổi font size/document JSON/version hay tự tạo autosave. Giữ mức khi chuyển View↔Edit cùng phiên note; đóng/mở hoặc đổi note reset100%, không persist mức content zoom. View chuyển full screen/khung nhỏ cũng giữ mức zoom nội dung.

`ContentZoom` giữ chiều rộng tài liệu gốc và scale bằng transform, tính kích thước vùng cuộn riêng bằng ResizeObserver; gesture gom qua requestAnimationFrame, React chỉ cập nhật phần trăm sau khi dừng hoặc bấm nút. Cleanup observer/listener/frame/timer đầy đủ. Chọn transform để tránh reflow đoạn văn khi zoom theo [hướng dẫn hiệu năng trình duyệt](https://web.dev/articles/animations-and-performance). Zoom bên ngoài hiện chỉ áp dụng danh sách note50–150% theo DEC-031 bên dưới; gesture trong nội dung không đi vào handler danh sách. Menu/settings vẫn áp dụng và lưu ngay.

Giới hạn: không cam kết FPS hay mượt như PDF native trên mọi thiết bị. Chưa đo điện thoại vật lý/iOS Safari, bàn phím ảo hoặc tài liệu100k ký tự. Nội dung phóng lớn giữ dòng gốc và có thể cần kéo ngang. Evidence và hồi quy tại worklog; không thay API/DB/ownership.

### Sửa cache phân trang khi preload nền — 2026-10-25

WorkspacePreparation dùng fetchInfiniteQuery với queryFn trả từng Page, sau đó InfiniteQueryObserver.fetchNextPage tải các trang còn lại; không dùng fetchQuery trả sẵn InfiniteData trên key mà useInfiniteQuery cũng quan sát. Cách cũ có thể lồng pages trong pages khi background gặp query đã bị invalidated/đang có infinite observer: flatMap(page.items) sinh undefined, NotesPage lỗi isPinned và workspace.commit sau Save labels lỗi id dù server đã lưu. Root errorElement hiển thị NotFound nên trông như mất route Trash; route vẫn tồn tại. Regression giữ cả Trash rỗng/có note, invalidate/refetch và commit sau preload; phiên/account guard, cancellation và critical/background được giữ. Sau rollout cần tải lại app để thay bundle/cache memory cũ, không yêu cầu xóa local drafts/IndexedDB.

### Chế độ khách cho người xem CV — 2026-10-24

- Landing thêm Try guest mode, `/guest` mở workspace mẫu3notes/3labels hoặc tiếp tục bản đã lưu. Database `ntc.guest.v1` riêng hoàn toàn với `ntc.offline.v1` của account. Guest có trạng thái local `guest`/owner sentinel `guest-local`, không token/refresh credential và không tạo Identity account. API client chặn authenticated requests trong guest; repositories điều hướng rõ theo mode, API/backend policies không đổi. Vào `/guest` khi đã đăng nhập giữ workspace/role hiện tại.
- Dùng chung NotesPage/editor/labels/pin/search/reorder/trash30ngày và cache; mutation guest commit IDB transaction rồi mới báo Saved on this device. CRUD idempotency/version phát hiện stale local editor, reset cần confirm và chỉ thay dữ liệu guest. Banner Guest mode giải thích local-only, có đổi ngôn ngữ/Sign in/Reset demo; theme/zoom giữ như app. Account security/settings/reminders/inbox/admin routes được chặn cho guest, không preload account data hoặc gọi health khi reconnect guest. Leave guest mode về landing, không xóa dữ liệu guest.
- Login/Google customer thực tế kích hoạt modal copy nếu chọn Sign in từ guest. Keep guest data for later không nhập tự động; sau đó vẫn có Copy guest notes trong menu avatar. Copy chạy API có xác thực đúng owner, tạo note mới, không patch note hiện có. Reconcile label theo đầy đủ name/color/icon trong cùng account, không gộp các guest labels trùng nhau; map ID trước khi copy note.
- Transfer progress per account lưu trong guest DB: note-version slots có create key/payload bất biến và ACK ID, retry không tạo lại slot đã hoàn tất. Label create mất ACK được đối chiếu thuộc tính để tránh tạo lại khi retry. Web Locks serialize copy giữa tabs. Revalidate identity trước requests/ACK/progress writes; đổi account thì dừng và giữ nguồn. Replayed create trả note đã bị đổi thì giữ guest và báo lỗi, không ghi đè. Guest trash copy vào account Trash, bắt đầu hạn30ngày mới; reminder không có trong guest. Chỉ clear guest sau toàn bộ snapshot ACK và revision vẫn khớp; nếu có edit guest mới, giữ local và lần sau chỉ copy phiên bản chưa hoàn tất.
- Hạn chế: guest là dữ liệu của browser/profile đang dùng, không có bảo vệ tài khoản trên máy dùng chung, không mã hóa đầu cuối/backup và browser có thể xóa storage. Không sync guest giữa thiết bị, gửi email, PWA native hoặc upload ảnh note. Xóa/reset browser làm mất guest chưa copy. Copy lỗi giữ dữ liệu, không rollback các mục đã copy thành công trên server; progress hỗ trợ tiếp tục. Trường hợp server thay đổi/xóa item giữa transfer có thể cần xử lý thủ công, không hứa transaction xuyên mạng. Không tự seed/reset DB thật hoặc dùng shared demo account.

Retention hiện hành2026-10-24: trash note giữ30ngày theo yêu cầu mới. Backend restore/purge cutoff30ngày, card tính thời gian còn lại30ngày và các thông báo Trash/Help/Privacy4ngôn ngữ đồng bộ. Các mốc7ngày trong lịch sử triển khai dưới đây đã được thay thế; không thay hạn hoặc triển khai xóa tài khoản trong lượt này.

### Notes ưu tiên và offline — 2026-10-24

Bổ sung UI cùng ngày: khi sync bình thường, ẩn toàn bộ toolbar để không chiếm một hàng trên notes; “Notes synced” chỉ giữ ở status cho screen reader. Sync now chuyển thêm vào menu avatar customer, không thêm vào admin. Toolbar chỉ hiện khi pending/offline/kết nối có vấn đề/lỗi hoặc thao tác cần chú ý; pending Sync now/Review sync giữ luồng hiện có. Kiểm tra queue rỗng không làm toolbar chớp lên.

CURRENT source theo yêu cầu mới DEC-025/026: customer chỉ chờ active notes/labels và module AppShell/NotesPage để mở workspace. Trash/reminders/inbox/unread/me và module phụ tiếp tục tải nền; lỗi nguồn phụ không đẩy notes về màn lỗi khởi động. Admin giữ luồng cũ và chưa làm vòng đời xóa account. Các mô tả DEC-019 tải7nguồn trước khi mở ở phía dưới là lịch sử.

- IndexedDB `ntc.offline.v1` lưu snapshot active notes/labels, metadata nhận diện customer và outbox riêng theo userId. Không persist toàn bộ TanStack Query, hồ sơ bảo mật/admin hoặc response auth. Static shell/chunks/fonts được precache bởi worker do Vite build tạo; chỉ GET same-origin thuộc asset manifest và navigation shell, không cache API. Cài worker sau critical-ready lúc browser idle; update chờ tab cũ đóng, không ép reload draft.
- Có snapshot hoàn chỉnh và refresh credential đã lưu còn hợp lệ thì mở notes local ngay, không chờ health/refresh. Mạng có lại xác minh phiên/quyền với server trước khi gửi queue, rồi revalidate notes/labels nền. Offline mode không cấp access token; API authenticated khác bị chặn trên client trong mode này. Server vẫn kiểm quyền thật; 400/401/403 xác nhận phiên sai kết thúc truy cập local của phiên, không xóa draft pending để tránh mất dữ liệu. Không hỗ trợ đăng nhập lần đầu offline hoặc tự chuyển account offline.
- Xem/tạo/sửa note hoạt động offline; trạng thái riêng “Saved on this device; waiting to sync”, khác ACK server. Autosave chỉ báo local-saved sau COMMIT IndexedDB; storage/quota lỗi giữ editor dirty/error và bảo vệ unload. Card pin/labels/order/trash/delete riêng cần online và note đã sync; editor note draft vẫn có metadata đi kèm. Settings, inbox, lịch reminder và admin không có offline snapshot. Không hứa gửi reminder từ máy đang offline.
- Queue giữ create key/payload gốc, local-ID→server-ID, expected version và ACK mappings. Chỉ coalesce các patch chưa từng gửi; payload đã thử/in-flight giữ nguyên để replay an toàn. Web Locks khóa sync theo account giữa các tab; readwrite transaction bảo vệ edits local. Local version phát hiện editor tab khác đã cũ và giữ draft qua conflict. 409 chỉ ACK nếu draft server đúng payload đã gửi; ngược lại giữ bản local, cho lưu bản sao mới hoặc xác nhận dùng bản online. Replayed create trả note đã đổi cũng không được đè follow-up patch lên nó.
- Auto-sync khi online/focus và mỗi30giây khi app đang mở, còn pending; Sync now hỗ trợ thao tác chủ động. Không có daemon/service-worker background sync khi app đóng. Toolbar kết nối/sync nằm trong flow workspace, thay banner phủ các nút trên mobile; startup/auth/admin giữ ConnectionFeedback. BroadcastChannel báo tab khác refresh, không gửi nội dung note qua channel.
- Logout hỏi khi có pending: ở lại hoặc download JSON chứa nội dung/queue; xác nhận file đã lưu mới xóa cache account trên máy, queue đổi thì cần backup mới. File backup không có token; hiện chưa có UI import JSON/restore tự phục vụ, giữ như backlog. Logout offline chỉ xóa phiên trên thiết bị, không thể khẳng định đã revoke server khi mất mạng. Draft chưa COMMIT vẫn dùng guard editor hiện có; browser force-close, xóa site data hoặc tab khác logout đúng lúc draft chưa persist không được coi là đã bảo vệ tuyệt đối.

Giới hạn: phải mở online và hoàn tất cache shell trước khi đóng/mở lại không mạng. Browser có thể xóa storage; đây không phải backup/mã hóa đầu cuối. Không thể revoke ngay dữ liệu đã tải trên thiết bị offline. Chưa stress account rất lớn (state IndexedDB hiện theo account), đo production, Safari/Firefox/thiết bị thật hoặc PWA install. Tham khảo cơ chế chuẩn: [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API). Bằng chứng kiểm thử và phạm vi publication xem worklog.

Kiểm production shell local: build từ root bằng `npm.cmd --prefix ntc_react run build`, rồi đặt PATH tới .NET local, `NTC_TEST_OFFLINE_SHELL=1` và chạy `npm.cmd --prefix ntc_react run test:e2e -- --config playwright.offline.config.ts`. Fixture SQLite/captured-email5199 và preview4173; không dùng DB/token/email của chủ dự án.

Duration sidebar hiện hành (2026-10-24): theo yêu cầu mới, mọi reveal mở/đóng, desktop margin và overlay từ400ms→200ms (0.2s). Giữ sửa flash/clip/inert. Regression motion3zoom và desktop6chu kỳ4/4 PASS; React/.NET Release PASS. Các mốc400ms bên dưới là lịch sử trước cập nhật này.

Sửa flash cuối đóng desktop (2026-10-24): video chủ dự án có full-width flash một frame ở1.800s/7.467s. Bỏ visibility:hidden/delay ở desktop, chỉ transition clip-path400ms tới100%, giữ inert/aria-hidden/pointer-events:none khi ẩn. Không đổi cơ chế mobile hoặc data loading. Quay6chu kỳ sau sửa, dò345frame không có lại mẫu flash (video gốc328frame có2); regression13ca PASS. Chi tiết/phạm vi môi trường trong worklog.

Ổn định cuối reveal (2026-10-24): giữ400ms; drawer có clip-path mặc định khớp keyframe kết thúc, isolation và will-change:clip-path; desktop giữ will-change để tránh đổi lớp vẽ sau transition. Live rAF kiểm5frame cuối x/opacity/clip ổn định và mobile mở lại2lần ở cả2media PASS; chưa tái hiện/đo raster flicker trên GPU/thiết bị thật. Xem worklog.

Sidebar reveal (2026-10-24): chủ dự án yêu cầu mở như rèm/PowerPoint, thay slide/fade bằng clip-path inset: mép phải quét trái→phải, nội dung/sidebar và nền mobile không di chuyển; đóng thu ngược lại.400ms linear/delay0/fill both, desktop margin đồng bộ400ms. Yêu cầu chuyển động rõ ràng này áp dụng cả media reduced-motion, override scoped sidebar/overlay; không đổi Windows hoặc animation modal khác.12ca Chromium PASS gồm live rAF393/1440px với cả2media, mốc25/50/75% và nền/scroll ở3zoom, dismiss và label-scroll; build React/.NET Release và ESLint PASS. Xem worklog.

Sidebar layout (2026-10-23): desktop customer/mobile workspace drawer chỉ label-nav cuộn; logo/menu chính/Manage labels và sidebar-bottom giữ cố định trong flex layout. Notifications mobile là NavLink/settings-link cùng font/màu/padding/icon/chiều cao với Settings, Help & feedback, giữ badge và đóng drawer sau điều hướng. Chromium9ca header/dismiss/scroll PASS (38labels ở320/393/1440px); build React/.NET Release, ESLint PASS. Xem worklog.

Note labels modal (2026-10-23): ẩn tiêu đề/X, giữ tên dialog cho screen reader; label là toggle button aria-pressed, xếp ngang/wrap, selected có nền/viền/tick rõ, chưa chọn mờ và disabled khi đủ20. Tên dài wrap trong nút; chỉ vùng label cuộn, footer Cancel/Save cố định. Regression Chromium320dark/1440light với40labels và viewer393/1280 PASS (scroll, save/cancel, cap20, keyboard, lỗi/retry); build React/.NET Release và ESLint PASS. Chi tiết worklog.

Lịch sử sidebar motion2026-10-23: translate/fade theo media đã thay bằng reveal ngày2026-10-24 ở trên. Giữ inert/aria-hidden, Radix Presence/unmount sau animation, overlay không blur và nền mobile đứng yên.

Card footer (2026-10-23): label bên trái và menu bên phải cùng một hàng ở grid/list. CardLabels đo chiều rộng chip thực tế bằng ResizeObserver, dành chỗ cho +N và cụm thao tác không co; label không vừa được gộp vào +N, tooltip và screen reader giữ tên label bị ẩn. Tự tính lại khi resize/đổi view/font; không thay dữ liệu hay thứ tự label. Build React/.NET Release, ESLint và Chromium 320/393/1440px cùng regression reorder PASS. Chi tiết và giới hạn trong worklog.

### Settings ứng dụng và tài khoản — 2026-10-23

Theo yêu cầu chủ dự án, sidebar Settings mở `/settings` với ba hàng Language, Privacy và Appearance. `/settings/language` có radio English/Tiếng Việt/中文/日本語, đổi ngay giao diện ứng dụng và định dạng ngày giờ/số, mặc định English. `shared/i18n.ts` dùng external store với một storage listener chung, lưu `ntc.language.v1`, gán `html.lang`, giữ lựa chọn trong memory nếu storage bị chặn. `shared/messages.ts` có 756 source messages cùng bản Việt/Trung/Nhật; dịch ở render, không sửa DOM text hay remount editor. Menu/form/editor/auth/startup/admin được nối vào store, dữ liệu note/nhãn/tên tài khoản vẫn nguyên văn; lỗi API/provider không có trong catalog được giữ nguyên thay vì đoán nghĩa.

`/settings/privacy` hiển thị nội dung đúng chức năng NoteTatCa: quyền truy cập note theo owner, tài khoản/phiên, browser storage, email nhắc và thời hạn khôi phục; liên kết thực tới account/sessions/trash và `/privacy`. Tham khảo cách tổ chức từ [Joplin](https://joplinapp.org/privacy/), [Notion](https://www.notion.com/help/privacy), [Standard Notes](https://standardnotes.com/help/1/who-can-read-my-private-notes), không sao chép các cam kết E2EE/chứng nhận/chính sách bên thứ ba. Operator contact/legal notice/backup retention vẫn chưa chốt, không biến trang này thành chính sách pháp lý đã phê duyệt.

`/settings/appearance` có switch Dark mode chung `ntc.theme.v1` với nút desktop. Mobile Settings dùng header ← + tên trang, ẩn search/avatar/hamburger và breadcrumb nội dung; trang con quay về `/settings`, trang chính quay về `/notes`. PC giữ header/sidebar và breadcrumb. Mobile drawer không còn nút theme. Avatar Account settings tiếp tục mở `/settings/profile`, các tab Profile, Account & security, Active sessions giữ luồng riêng; mobile account pages cũng có header quay lại. Admin có App settings tại `/admin/preferences/{language,privacy,appearance}`, link security/session vào `/admin/settings/*`, không có link Trash khách. Các alias `/settings` ứng dụng của admin chuyển vào `/admin/preferences`, alias account/profile cũ vẫn vào `/admin/settings`. Backend/API/schema/config không đổi. Bằng chứng kiểm tra tại worklog.

### Màu ghi chú và màu chữ tự động — 2026-10-23

Theo yêu cầu chủ dự án, NoteColorPicker bỏ dãy preset: có một hàng native picker dạng ô vuông bo góc cùng kiểu saved swatch → mã hex → nút icon lưu → nút icon Apply (✓), hai nút cùng kiểu/kích thước. Default nằm cùng danh sách Saved colors, hiển thị ngắn là Default, tiếp theo là mã màu đã lưu và nút xóa. Bỏ dòng mô tả lưu màu trên trình duyệt; chỉ hiện lỗi lưu nếu thực sự xảy ra. Mã 3/6 chữ số được chuẩn hóa thành #RRGGBB, không lưu trùng; `shared/savedColors.ts` lưu theo userId tại `ntc.saved-note-colors.v1:{userId}` trên trình duyệt, không gọi API hoặc sửa note khi chỉ xóa màu đã lưu. Có listener storage và cảnh báo nếu browser không lưu được; không hứa đồng bộ màu giữa thiết bị.

Menu Text color có Automatic và Custom color. Automatic dùng unsetColor để bỏ đúng thuộc tính màu của đoạn đang chọn hoặc stored marks cho lần gõ tiếp; giữ font size/bold/italic và các marks khác. Chữ không có màu thủ công kế thừa notePalette theo nền note trong editor/viewer. Để reset toàn note, chọn toàn bộ nội dung rồi Text color → Automatic. Đổi nền không tự ghi đè các màu chữ thủ công.

PROPOSED, chưa triển khai: card preview cùng màu nền và giữ màu chữ/đậm/nghiêng để nhận diện nội dung, nhưng giới hạn cỡ chữ và số dòng; note mở hiển thị đầy đủ định dạng gốc. CURRENT card vẫn dùng plain-text projection và typography card riêng. Phần đánh giá ảnh 1–3 chưa được biến thành yêu cầu sửa preview.

### Khu quản trị độc lập — 2026-10-19

Theo DEC-017, `/login` dùng chung; `homePath` chọn `/admin/overview` khi có role Admin, còn lại `/notes`. Admin+User lịch sử vẫn là quản trị. Router có hai layout/guards riêng: AdminShell chỉ tải metadata account/admin modules, AppShell chỉ dành non-Admin. Direct links `/notes`, `/trash`, `/labels/*`, `/reminders`, `/notifications` của admin chuyển về overview; non-admin vào `/admin/*` chuyển về notes. `/admin` có index, deep-link reload dùng session refresh; `/settings/*` cũ của admin chuyển sang `/admin/settings/*` giữ query.

Admin có overview/tổng hợp + shortcuts, accounts tìm kiếm/phân trang/create/detail/lock/unlock/deactivate/restore, role/membership CRUD theo API, audit filter/action/target link, hồ sơ/bảo mật/phiên tại `/admin/settings/{profile,account,sessions}`. Không có sidebar nhãn, tìm note, inbox, nút tạo note hay polling dữ liệu cá nhân trong AdminShell. Layout mobile có drawer riêng, dark theme/account menu/reauth dialog dùng thành phần chung. Admin không thể tự khóa/deactivate hoặc bỏ role Admin của mình; built-in roles/audit giữ bảo vệ phía API.

Khi cùng user thay đổi nhóm Admin/non-Admin qua login/refresh, AuthService clear cache và đổi request identity để bỏ response cũ đang bay; quyền server vẫn đọc role hiện tại từ DB mỗi request. Frontend guard không thay authorization: API workspace v1/legacy áp dụng CustomerWorkspace policy, từ chối Admin403 kể cả có thêm User; self profile/security/sessions và admin metadata vẫn dùng được. Dữ liệu note cũ được bảo toàn, chưa triển khai lên cloud trong tác vụ này. Kết quả kiểm mới ghi trong worklog.

User chỉ đường dẫn Razor cũ NoteTatCa/NTC.VIEW; thư mục đã được user đổi tên nên nguồn thực tế ntc_aspnet/NTC.VIEW. Yêu cầu giữ Razor ban đầu đã được thay bởi DEC-020 ngày 2026-10-21: gỡ NTC.VIEW khỏi repo/solution; giữ bản khôi phục local ngoài repo và không thay database thật. React tại ntc_react theo yêu cầu mới, thay hướng NTC/ntc_react cũ. UI English. Không deploy, commit/push hoặc tự migrate dữ liệu thật.

React/TypeScript/Vite; React Router SPA; TanStack Query cache theo user, invalidation có mục tiêu; Tiptap schema tương thích backend; dnd-kit pointer/keyboard; Radix dialogs/menu. Domain model/types → HTTP repositories → application services → hooks/components/pages. Class/OOP cho session store, API client, repositories và autosave coordinator; React function components/hooks cho rendering, không dùng inheritance để chia sẻ UI.

Đọc43 Markdown và inventory Razor; ánh xạ landing/privacy/error/auth/login/register/OTP/forgot/reset/confirm-email-change/Google/password verification, notes/trash, profile edits và account/security. Bổ sung reminders/inbox/sessions/admin users/roles/audit/statistics theo API đã triển khai. Không thêm sharing/archive/attachments/AI vì ngoài phạm vi đã chốt.

## UX và an toàn dữ liệu

DEC-023/2026-10-22: note đã lưu mặc định View note chỉ đọc, chỉ nút Edit bật editor; note mới vào editor ngay. DEC-018/2026-10-20: editor desktop mặc định khung nhỏ cho cả tạo/mở note, có nút Enter full screen/Exit full screen; từ2026-10-22 mobile (container≤800px) luôn toàn màn hình và ẩn nút chuyển kích thước, giữ nguyên draft/editor khi đổi kích thước. Không có dấu×đóng trùng Close. Title rỗng không hiện ô nhập/Untitled; Add title mở và focus ô nhập, xóa title rồi blur sẽ thu lại mà không mất content. Cards không in Untitled khi title rỗng (nút mở vẫn có accessible name). Counter ở footer cố định góc dưới, không chạy theo content scroll. Save thường được bỏ; lỗi mới hiện Retry save; Close chờ flush bản đang sửa, nếu lỗi/conflict giữ draft và hỏi tiếp. Không hạ guard409/idempotency/unsaved navigation.

Notes chỉ có Take a note, không Your personal space/Your notes/câu mô tả/New note/Create your first note; heading Notes/Trash/label/Reminders/Your inbox giữ dạng screen-reader-only; các tiêu đề/mô tả đầu trang lặp với sidebar không hiển thị. Search/reminder-filter vẫn có ngữ cảnh ngắn. Desktop sidebar ẩn/hiện bằng nút topbar và nhớ ntc.sidebar.hidden.v1; mobile có drawer riêng; cả desktop và mobile dùng icon Menu ba gạch ngang. Nút Mark all as read và cảnh báo giữ note trong Trash bảy ngày vẫn hiển thị. YOUR LABELS/icon là cùng một button/cursor quản lý labels, không Create a label trong sidebar. Bỏ routine success toasts của note/editor/label/reminder; lỗi/info hướng dẫn, self-security/admin acknowledgements giữ nguyên. Lưu preferences không chứa nội dung note/token.

Sidebar desktop/mobile drawer, workspace search/grid/list, labels/filter/pinned, modal rich editor, label/reminder/confirmation dialogs, skeleton/empty/error/retry, toast và reduced-motion. DEC-019 thay cơ chế chỉ tải trang khi mở bằng preparation tải đủ workspace riêng của account ngay sau login/restore. Cache memory giữ dữ liệu khi chuyển trang; API vẫn phân trang, không tải dữ liệu user khác. Drag chỉ khi có toàn bộ nhóm và không filter làm sai neighbors; có phương án bàn phím/move controls. Optimistic actions rollback và xác nhận ACK; version409 giữ draft, không overwrite tự động.

Autosave single writer, debounce; serialize saves với version mới nhất, giữ snapshot create/idempotency key khi retry mất ACK. Trạng thái dirty/saving/saved/error/conflict; Retry save chỉ khi lỗi, close/navigation bảo vệ draft. Markdown shortcuts/import/export có cảnh báo mất định dạng. Content cũ plain luôn chuyển bằng text nodes, không parse HTML tùy ý.

Access token memory; refresh token lưu localStorage để mở lại browser vẫn đăng nhập (DEC-022). Có fallback sessionStorage nếu persistent storage bị chặn; chuyển phiên tab cũ còn hợp lệ khi đọc. Web Locks tuần tự refresh/logout giữa tabs; một refresh request trong tab được chia sẻ. Cache không persist notes; clear khi logout/user đổi. Session expired vẫn giữ draft trong editor cho reauthentication, không mở note cached của account cũ cho account mới. Google client ID từ public env, không fake login khi thiếu config. Browser tabs chia sẻ phiên đã lưu; storage event xóa private cache khi logout/đổi account. Web Locks cần browser hỗ trợ; fallback không bảo đảm đồng bộ rotation liên tab trên browser không có Web Locks.

## Kiểm thử và ranh giới

Build/typecheck/lint/unit tests cho session refresh và autosave races; browser Playwright kiểm pointer/keyboard/modal, CRUD/autosave409/labels/pin/reorder/reminders/trash/restore/profile/account/session/admin, responsive/console. Fixture host riêng loopback dùng WebApplicationFactory + SQLite/fake Google/email; không sử dụng DB người dùng. E2E phải ghi rõ fixture khác external Google/SMTP thật. CSS/visual QA trên desktop/mobile; không coi screenshot hoặc build thay end-to-end.

Nguồn thư viện: [Tiptap StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [TanStack optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates), [dnd-kit accessibility](https://dndkit.com/legacy/guides/accessibility/).

## Chuẩn bị workspace và kết nối — DEC-019

`WorkspacePreparation` (application) tải notes active/trash, labels, reminders, inbox qua toàn bộ pages, kèm unread count/me. Bốn luồng song song, từng page theo thứ tự; QueryClient chia sẻ kết quả và giữ đúng InfiniteData/pageParams để các hooks hiện có dùng lại. Chi tiết note/reminders được seed từ dữ liệu đã tải; `WorkspaceService.cachedNotes` tạo danh sách label/pin/search ban đầu từ master list hoàn chỉnh, không tạo request theo số label. Nếu master incomplete/invalidated, dùng API thay vì suy diễn một danh sách rỗng/thiếu.

`WorkspaceReady` chờ preparation và các module workspace chính trước khi mở layout; editor/label dialog được warm background. Progress là số collection/trang thực nhận, không phần trăm theo thời gian giả. Resource lỗi giữ màn hình retry/sign-out, retry dùng lại collection đã tải thành công. Không tải personal content cho Admin: chỉ me/admin-stats và module quản trị. Module tải lỗi cho phép reload chủ động để lấy bundle mới; điều hướng thông thường vẫn SPA.

Bổ sung UI theo ảnh2026-10-20: `PreparationSnapshot.tasks` mô tả resource và waiting/loading/ready/error; UI hiện Loading notes…, Loading labels…, Loading account details… hoặc trạng thái đã xong/chờ/lỗi đúng lifecycle. Khi collection thất bại, các tác vụ bị hủy ngừng icon chạy; reset/retry/đổi account xóa trạng thái cũ. Tổng phần trăm là completed/total collections, không tỷ lệ byte tải. Admin chỉ có hai tác vụ của mình. `ConnectionSpinner` animate wrapper bằng connection-turn, kể cả reconnect còn giữ problem cũ; `ConnectionProgress` là indeterminate khi đợi server/session/application, không aria-valuenow giả. Banner có mô tả bước kết nối/attempt và đặt cao hơn ở trang login để không che heading; reduced-motion dừng chuyển động theo CSS chung.

Cache memory (gcTime Infinity trong phiên), mặc định fresh5phút; labels giữ staleTime2phút, inbox/unread tiếp tục polling foreground60giây. Inbox/Reminders luôn revalidate nền khi mount để thông báo/lịch mới không bị giữ ở snapshot lúc login; cached content vẫn hiển thị trong lúc GET đang chờ. Khi stale hoặc mutation, làm mới nền/invalidations mà không xóa dữ liệu đang hiển thị. Logout/account/nhóm quyền đổi hủy preparation/query, clear private cache; generation và request identity bỏ response cũ, bootstrap cũ không ghi đè phiên login mới. Refresh cùng account không remount editor. Danh sách lớn dùng nhiều RAM/băng thông và kéo dài bước chuẩn bị; không có live snapshot transaction, realtime đồng bộ nhiều tab hoặc offline durable storage. Profile/sessions/security và các trang admin ngoài overview vẫn tải chi tiết theo nhu cầu.

`ServerConnection` probe GET `/health/live` tại API origin trước login/Google/refresh. Dùng một promise chung, timeout mỗi probe≤15giây, tổng120giây, backoff1/2/4/8giây; chỉ nhận JSON status live, không coi trang HTML wake-up là API sẵn sàng. Dev Vite proxy `/health` cùng API target; fixture bridge chuyển tiếp endpoint health thật. Không gửi credentials/bearer/cookie trong probe, không replay POST/mutations và không tạo idle keep-alive. Theo [Render Free](https://render.com/docs/free), cold start là trạng thái hosting cần chờ; frontend không cam kết bỏ được thời gian khởi động. Cách seed/freshness dựa trên [TanStack prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching).

`ConnectionNotice` theo dõi request thật: sau1.5giây có animation kết nối, lỗi/offline có Reconnect. Online/explicit retry kiểm health rồi invalidates các GET query đang dùng; không tự gửi lại lưu note. Editor/draft không bị unmount do banner. Bootstrap outage giữ refresh session và Retry connection;401/403/400 auth không hợp lệ vẫn yêu cầu đăng nhập. Không lưu password, nội dung note hoặc access token thêm vào browser storage. Các animation tôn trọng reduced-motion.

## Ánh xạ Razor và module mới

Nguồn đối chiếu ban đầu: toàn bộ Pages/*.cshtml và partials của ntc_aspnet/NTC.VIEW trong Git trước DEC-020. Razor đã gỡ ngày 2026-10-21; React không phụ thuộc jQuery/Bootstrap scripts của Razor.

| Razor / nghiệp vụ | Route React hiện hành | Chức năng |
| --- | --- | --- |
| Index, Privacy, Error | /, /privacy, /not-found | Landing, thông tin riêng tư, fallback 404/error |
| Auth/Login, Register | /login, /register | Email/password, Google GIS ID token, đăng ký OTP |
| Auth/ForgotPassword, SetPassword | /forgot-password, /auth/set-password | Recovery link, reset và xác nhận password |
| Email verification | /verify-email | Nhập mã, gửi lại có cooldown |
| Auth/ConfirmChangeEmail | /auth/confirm-change-email | Xác thực link đổi email, loại token khỏi URL sau thành công |
| Auth/VerifyPassword, Logout | /verify-password, /logout | Xác minh đúng tài khoản hiện tại, thu hồi phiên/clear cache |
| Auth/External/GoogleCallback | Alias /login | React GIS nhận credential rồi gọi API; không giả OAuth callback của Razor |
| Note/Index + create/edit/list/sidebar partials | /notes, /notes/:id | Editor toàn viewport, title tùy chọn, autosave/Retry save khi lỗi, pin, màu/icon, search, list/grid và reorder |
| Note tags/manage-tag partials | /labels/:tagId + label dialogs | CRUD nhãn, nhãn trùng theo ID, gán tối đa20/note |
| Reminder partial | Editor reminder dialog, /reminders | Tạo/sửa/xóa/pause/resume, lặp ngày/tuần/tháng/năm, kết thúc/count/timezone/email |
| Note/Trash + trash partial | /trash | Đọc nội dung riêng đã xóa, restore, xóa hẳn, hạn7ngày |
| Settings/Index, Profile/Index | /settings, /settings/profile | Hồ sơ, ảnh URL HTTPS, address/locale/timezone; create profile thiếu |
| Profile/Edit/Name, Gender, Birthday | /settings/profile?edit=... | Form tích hợp, focus trường tương ứng, nullable clear/version |
| Account/Index, Edit/Email, Password | /settings/account?edit=... | Phone/email/password, liên kết/gỡ Google, xác minh link và đăng nhập lại sau thay đổi bảo mật |
| Module API bổ sung | /settings/sessions | Phân trang phiên, thu hồi một phiên/toàn bộ |
| Module API bổ sung | /notifications | Inbox, unread/count polling, đọc riêng/tất cả, mở note còn quyền |
| Module API bổ sung | /admin/overview, /admin/users | Aggregate statistics, tìm/create/lock/deactivate/restore tài khoản, quản lý memberships |
| Module API bổ sung | /admin/roles, /admin/audit | CRUD vai trò, lịch sử metadata/phân trang; không đọc note người khác |

Các alias URL Razor trong router giữ query parameters và dẫn về route tương ứng. Legacy /Note/Trash, /Auth/*, /Settings/Profile/Edit/* và /Settings/Account/Edit/* được hỗ trợ. Router xử lý lazy loading và guards; quyền thật luôn do API kiểm tra.

## Cách chạy và cấu hình

Xem [frontend README](../ntc_react/README.md), [local setup](10-setup-local.md), [environment](17-environment-config.md). Từ root: `npm --prefix ntc_react ci`, `npm --prefix ntc_react run dev`; API chạy terminal riêng bằng `dotnet run --project ntc_aspnet/NTC.API --launch-profile https` trên DB đã chuẩn bị. Browser http://127.0.0.1:5173, /api proxy mặc định localhost:5032. Không tự migrate/seed DB thật khi chạy React.

Tất cả VITE_* là public build config. Vercel tương lai dùng Root Directory ntc_react, output dist, API URL HTTPS có /api/v1 và CORS exact origin; vercel.json xử lý deep links. AppSettings__ClientUrl của API phải là React origin để email links dùng đúng route. Workflow frontend.yml chỉ kiểm thử, không deploy.

## Giới hạn phát hành còn lại

- Browser tests dùng SQLite/captured email/synthetic clock qua API .NET thật; không thay SQL Server/PostgreSQL runtime trên môi trường triển khai.
- Google client ID/audience, SMTP delivery và email-link origin thật cần cấu hình/kiểm riêng. UI vô hiệu hóa Google nếu thiếu public client ID.
- BackgroundJobs mặc định tắt trong backend; frontend tạo lịch không đồng nghĩa worker đang gửi thông báo. Muốn dùng lịch thật cần operator review jobs/uptime/SMTP/purge như docs backend.
- Không có durable offline cache, service worker, collaborative editing, attachments, full account export/hard-delete. Editor giữ draft trong memory và cảnh báo rời trang; đóng tab/reload có thể mất thay đổi chưa lưu.
- Chưa có Figma, pháp nhân/operator/contact/retention chính thức cho public privacy notice; trang privacy hiển thị giới hạn cấu hình này. Không coi bản UI là legal approval.
- CI workflow đã thêm nhưng remote GitHub run, Vercel/Render/Supabase deployment và load test chưa chạy.

## Bằng chứng local — 2026-10-18

Windows/PowerShell, cwd root NTC; Node24.21/npm11.19/.NET8 target/Chromium Playwright. Các lệnh npm dùng prefix ntc_react từ root hoặc chạy cwd ntc_react theo README.

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| TypeScript strict | npm run typecheck PASS |
| ESLint/hooks | npm run lint -- --max-warnings 0 PASS, không warning |
| Vitest | 4 files / 14 tests PASS: session vault/rotation/account-change/absolute API origin, autosave ACK/idempotency/version/conflict/StrictMode/oversize, document canonical/UTF8, private partial-page/trash cache |
| Production bundle | npm run build PASS; routes/editor lazy chunks, self-hosted fonts; RichEditor ~159kB gzip, initial JS ~161kB gzip, chưa có network performance budget/load test |
| Chromium E2E | 12 PASS (1.5 phút): SPA/mobile, rich autosave/labels/trash/restore,409 draft/copy, label CRUD/reorder menu, reminder dispatch/inbox, profile/session revoke, OTP/recovery, admin lock/role/audit, pointer+keyboard drag, Markdown checklist/import/export, network loss/retry/close guard, search/pin/theme/account isolation |
| Focused sau chỉnh copy/save | Conflict/save-as-new 1 PASS (8.3s), lại type/lint/unit/build PASS; dùng cùng autosave coordinator để chống tạo bản sao lặp khi mất ACK |
| Backend Release | dotnet build ntc_aspnet/NTC.Backend.slnf -c Release --no-restore -warnaserror PASS,0warning/0error |
| Backend regression |80PASS/0FAIL/1SKIP PostgreSQL,total81;36s; TRX artifacts/test-results/Admin_DESKTOP-DVT_2026-10-18_09_48_48.trx |
| Dependency audit | npm audit --omit=dev --audit-level=moderate:0 vulnerabilities tại thời điểm chạy |
| Docs |44Markdown/136local links/0errors sau cập nhật worklog và bàn giao cuối |
| Preservation |384backend/Razor/config hashes trùng backup trước rename; index giữ287baseline R100; HEAD/main/remote không đổi |

Ảnh kiểm đã xem: artifacts/frontend/workspace-desktop.png (1280px), workspace-mobile.png (390px), workspace-dark.png. Đã tăng độ đọc secondary text/chip/date và chọn foreground theo luminance cho custom note background. Screenshot không thay các browser assertions. Chưa kiểm đầy đủ browser khác, screen reader hoặc chứng nhận WCAG.

Script kiểm rename cũ .git/verify_backend_rename.py dừng ở assertion toàn bộ refs vì Codex app tự đổi refs/codex/turn-diffs. Đã đối chiếu riêng: chỉ refs/codex thay đổi, HEAD/main/branch/remotes và staged entries giữ nguyên;384backend source/config hashes nguyên byte. Không reset hoặc sửa các app refs để làm assertion xanh.

Không dùng owner DB, gửi SMTP thật, chạy Google OAuth thật, migrate dữ liệu hoặc deploy. Workflow frontend mới là cấu hình, chưa có GitHub run. Chưa commit/push thay đổi frontend. Tại mốc kiểm ban đầu Razor còn ở ntc_aspnet/NTC.VIEW; đã gỡ theo DEC-020 ngày 2026-10-21.

Polish cuối: hiển thị ảnh profile HTTPS, fallback initials khi lỗi; clear URL không hồi ảnh cũ từ session metadata. Chạy lại lint/build sau chỉnh hiển thị.

## Display preferences — 2026-10-21 / DEC-021

DisplayPreferences ở root giữ app zoom50–150% nguyên, localStorage ntc.interface.zoom.v1. Giá trị cũ25–49 được nâng lên50; ngoài biên được clamp, không hợp lệ/lỗi storage về100%. Không có nút zoom riêng hoặc slider. ShellAccountMenu dùng useDisplayZoom/DisplayZoomContext để thêm mục Zoom (x%) cho customer/admin; ZoomDialog có number input draft, nút−/+ bước10%, Reset/Done. Nhập áp dụng Enter/blur, clamp50–150 và round; nút ở biên bị disable. Draft null hiển thị percent từ gesture theo thời gian thực; ô đang gõ được giữ. Dialog inverse scale, nút44px, đóng trả focus về avatar. Listener capture wheel passive:false chỉ xử lý Ctrl/Cmd+wheel, chuẩn hóa deltaMode; touchstart/move hai ngón tính tỷ lệ khoảng cách, touchend/cancel xóa gesture. Safari gesture events có adapter dự phòng, runtime Safari chưa kiểm. Native zoom gesture được preventDefault để không nhân đôi app zoom; một ngón/cuộn thường không chặn. Pointermove touch trong pinch không chuyển tiếp vào drag sensor để tránh vừa pinch vừa reorder.

RAF gộp các update gesture theo frame, target lưu trong ref để không mất delta nhỏ; listeners/timer/RAF cleanup trong StrictMode. Root CSS zoom/viewport container giữ responsive và viewport units bù scale cho modal/editor. HUD portal ở body, pointer-events:none, role status, vị trí giữa dưới và inverse zoom; tự ẩn sau1.2giây. Context value memoized chỉ cho control hiển thị; không remount workspace/editor, không request API mới, không lưu dữ liệu tài khoản trong preference. Setter manual dùng cùng change/bounds/HUD nhưng áp dụng ngay, hủy frame gesture cũ để Enter/blur rồi bấm−/+ dùng đúng giá trị mới. Gesture vẫn gộp RAF như trước. Popup menu khác giữ wrapper screen-pixel/content scale cũ. Đã bỏ sidebar tip theo yêu cầu; browser keyboard zoom vẫn riêng. Evidence/giới hạn mới ở worklog.

## Nút ghim trong editor — 2026-10-21

Theo ảnh/yêu cầu chủ dự án, editor hiển thị Pin khi chưa ghim và PinOff (Unpin note) khi đã ghim, đồng nhất note card. Bỏ nền active tối; nút trong suốt, màu icon theo foreground tương phản của heading, hover nhẹ từ currentColor và focus outline rõ. aria-pressed phản ánh trạng thái; giữ nguyên update/autosave/version/ownership. Không đổi nút/tag/reminder active khác. Evidence và giới hạn kiểm thử ở worklog.

## Editor: nút đồng nhất và căn giữa — 2026-10-21

Add title, Pin/Unpin và fullscreen dùng chung nền trong suốt, hover nhẹ theo foreground và focus outline; vẫn giữ trạng thái ghim qua icon/aria-pressed. Toolbar có một nút Text alignment, mở menu radio4 lựa chọn Align left/Align center/Align right/Justify. Icon phản ánh căn lề hiện tại; menu đánh dấu lựa chọn, hỗ trợ bàn phím, đóng trả focus editor/giữ vùng chọn. Áp dụng cho paragraph/heading trong vùng chọn. TextAlign cùng phiên bản Tiptap3.32.0; canonical document và API chỉ nhận textAlign left/center/right/justify trên paragraph/heading, không nhận CSS tùy ý. Dữ liệu cũ không có thuộc tính vẫn giữ nguyên. Markdown export cảnh báo mất alignment. Bộ đếm cuối editor hiển thị x / 100,000, giữ nhãn trợ năng Character count. Không cần migration. Evidence thực tế ở worklog.

## Bảng màu note thu gọn — 2026-10-21

Thanh editor chỉ có một nút cọ vẽ Note background color. Radix Popover mở lên phía trên, tránh mép viewport; bảng4 cột, ô44px, đánh dấu màu hiện tại. Chọn preset hoặc Default note color đóng bảng; Custom color mở bộ pha màu native và cập nhật autosave. Escape/click ngoài đóng bảng, trả focus trigger. Lazy editor không lấy focus từ bảng màu/menu đang mở. Không thêm hình nền hoặc đổi API/dữ liệu màu.

## Settings xem trước, Edit mới mở form (2026-10-21)

SettingsPage dùng read view cho profile/contact/password, không render input/select khi vào trang (kể cả query legacy edit). Edit là thao tác rõ ràng; Cancel unmount form, reset picture draft và error; Save thành công đóng edit, thất bại giữ form. Profile tiếp tục dùng version/cache update; email confirmation, phone update, password sign-out và connected provider/session flows giữ nguyên API. Chung component cho admin/customer, CSS riêng settings.css tránh thay style editor/workspace.

## Header editor một hàng, menu icon — 2026-10-21

Icon note, input tiêu đề tùy chọn, ghim và fullscreen nằm cùng một hàng; input co theo chiều ngang, tiêu đề vẫn tối đa150 ký tự. Chọn icon mở Radix Popover (preset/Remove icon/custom emoji), không thêm hàng vào editor; chọn preset đóng bảng, Escape/click ngoài đóng. Trạng thái autosave thường chỉ thông báo trợ năng, không hiển thị dòng All changes saved; lỗi/409/Retry save vẫn hiện và giữ draft theo quy tắc cũ. Không đổi API/schema.

## Tiêu đề luôn hiện, không placeholder — 2026-10-21

Bỏ Add title và cơ chế ẩn input khi blur rỗng. Luôn hiện input Note title trên hàng icon/ghim/fullscreen, không có placeholder, giữ aria-label trợ năng; cho để trống và giới hạn150 ký tự như cũ. Mở note vẫn ưu tiên focus content; người dùng bấm ô title để nhập. Không đổi API/dữ liệu/autosave.

Access token chỉ đồng bộ trong memory giữa tabs qua BroadcastChannel sau rotation, không persist vào localStorage. Chỉ nhận message nếu userId/refreshToken khớp credential đang lưu. Web Locks tuần tự login/Google/refresh/logout; chưa kiểm browser thiếu Web Locks/BroadcastChannel.

## Cỡ chữ thay nút Heading — 2026-10-21

Toolbar bỏ nút H2/Heading và thay bằng Font size. Menu radio có Default cùng8/9/10/11/12/14/18/24/30/36/48/60/72/96px (mặc định 11px); trigger hiện cỡ tại con trỏ/vùng chọn. Chọn cỡ áp dụng textStyle.fontSize trên văn bản đang chọn hoặc nội dung gõ tiếp, Default bỏ fontSize và giữ marks khác. Dùng FontSize từ package Tiptap text-style3.32.0 sẵn có; không thêm dependency. Canonical/API cùng allowlist preset px, từ chối giá trị CSS tùy ý. Heading cũ và Markdown headings vẫn tương thích, không migrate. Export Markdown cảnh báo mất font size.

### Note editor compact default — 2026-10-21

Desktop: EditorSession khởi tạo fullscreen=false cho cả note mới và note đã lưu; modal chờ tải note cũng khung nhỏ. Từ2026-10-22, CSS container≤800px buộc cả modal chờ tải và editor toàn màn hình, ẩn nút thu/phóng; resize không remount hoặc mất draft. Autosave lần đầu không tự phóng to vì không khởi tạo lại state từ snapshot. Giữ các nút chuyển kích thước và toàn bộ autosave/draft protections.

### Kéo thẻ khác chiều cao không co giãn — 2026-10-21

NoteCard chỉ áp dụng translate từ sortable transform, bỏ scaleX/scaleY khi rectSortingStrategy đổi chỗ thẻ có chiều cao khác nhau. Giữ kích thước/chữ/icon của cả thẻ đang kéo và các thẻ đang nhường chỗ; opacity thẻ đang kéo0.95 để đọc rõ. Không thay reorder/ownership/pinned-group/keyboard hoặc API.

Cập nhật2026-10-23: kéo từ thân card, title, preview, labels hoặc footer; nút ghim/menu độc lập. Chuột vượt7px mới kéo; cảm ứng giữ220ms, tolerance6px để cuộn một ngón vẫn dùng được. Handle giữ cho bàn phím Space/arrows/Space. Khoảng translate chia cho --interface-scale để card nhường chỗ khớp mép ô grid ở app zoom khác100%. Chỉ animate transform160ms ease-out; card đang kéo theo con trỏ trực tiếp, không scale hoặc animate kích thước; tôn trọng prefers-reduced-motion hiện có. Các giới hạn pinned-group, search/filter/pagination và API reorder giữ nguyên.

## Tiêu đề cạnh icon và màu nền toàn editor — 2026-10-21

Thẻ note ngoài danh sách đặt icon và title trong cùng note-card-identity ở hàng đầu, title có thể wrap dài; cả identity và nội dung vẫn mở note, ghim/drag riêng. Không tự thêm Untitled hiển thị cho note rỗng title. Modal nhận style tùy chọn để NoteEditor truyền backgroundColor, surface và foreground theo notePalette: màu áp dụng cả header/body/toolbar/footer, default bỏ override và trở về theme. Inline màu chữ người dùng vẫn giữ. Không đổi dữ liệu/API/schema.

### Drawer mobile sát đáy — 2026-10-22

Selector .modal.navigation-drawer có độ ưu tiên cao hơn responsive .modal: giữ top/left0, height100dvh/interface-scale, max-height none và radius0 ở mọi mức zoom. Tránh rule modal≤480px giới hạn94dvh gây khoảng hở dưới drawer. Nội dung vẫn overflow-y auto để cuộn khi màn hình thấp.

### View note / Edit và card shortcuts — DEC-023 / 2026-10-22

NoteEditor tách NoteViewer không tạo AutosaveCoordinator khỏi EditorSession: saved note mặc định View note, chỉ Edit mount EditorSession; create note vẫn mount editor ngay. ReadOnlyContent dùng cùng extensions rich text với editable=false, bỏ placeholder và không onUpdate/writer; giữ title/icon/màu/font/checklist. Không content-click-to-edit. Mobile dùng cùng note-editor-modal full viewport; desktop viewer compact. Card identity accessible name View thay Edit; nội dung card vẫn Open để xem.

Card menu bỏ Open note và Pin/Unpin note, thêm Add label/Add reminder. Add label mở NoteLabelsDialog riêng, giữ snapshot/version khi mở và lựa chọn khi lỗi; Save labels dùng setLabels chỉ PATCH tagIds/version (không gửi lại nội dung), rồi workspace.commit, không bật content editor. Cancel không lưu. Add reminder mở ReminderDialog của note trước; đóng về viewer. Chỉ mount một modal khi vào reminder shortcut để tránh hai Dialog cùng mount gây aria-hidden sai. Ghim trực tiếp và reorder/trash giữ nguyên; query/cache riêng account và API ownership không đổi.

### Editor → View — 2026-10-22

EditorSession có View cạnh Close, gọi save/flush(true) hiện có; chỉ gọi onView(note) sau lưu thành công. viewing/busy chặn đóng và bấm chuyển lặp; lỗi vẫn giữ coordinator/draft/banner/conflict. NoteEditor dùng resolvedId=noteId hoặc createdId sau View của note mới, đọc note đã commit từ cache rồi chuyển về viewer; Edit lại mount session với version mới. Không đổi API/backend/ownership hoặc autosave protocol.


## Settings gọn hơn — 2026-10-22

CURRENT theo yêu cầu chủ dự án: Profile dùng một thẻ chung chứa avatar/tên/email và thông tin cá nhân; bỏ sidebar trang trí và Profile picture URL cả read/edit, giữ nguyên URL ảnh hiện có khi lưu. Desktop rộng chia thông tin ba cột, mobile một cột. Account & security gom contact/password/Google vào một khung có đường phân cách, email chỉ hiện một lần cùng trạng thái xác minh; desktop tiêu đề cạnh nội dung, mobile xếp dọc với input/nút đồng đều. Active sessions và nghiệp vụ auth/ownership/API không đổi. Áp dụng cả settings self của admin. Evidence và giới hạn tại worklog.


### Settings trải hết chiều ngang — 2026-10-22

Theo yêu cầu bổ sung với ảnh Active sessions làm chuẩn: bỏ max-width1050px của Profile/Account & security, dùng toàn chiều ngang vùng nội dung và cùng mép với settings tabs. Bỏ heading Personal details, mô tả và icon UserRound; giữ avatar/tên/email và thông tin hồ sơ. Các cột đều theo grid hiện có; mobile một cột. Active sessions không đổi. Evidence tại worklog.


### Settings: các thao tác bên phải — 2026-10-22

Theo ảnh/yêu cầu mới: bỏ heading/eyebrow/description đầu trang Settings, giữ navigation tabs. Edit profile căn dưới phải; Sign out everywhere căn dưới phải cả mobile. Account email/phone/password đã có dùng nút Change bên phải nội dung; tài khoản chưa có password bỏ câu No password is set... và thay bằng Set your password, mở luồng gửi password setup link hiện có. Google liên kết bỏ dòng Connected, giữ Disconnect/confirmation. Account contact xếp từng hàng trước khi xuống mục tiếp theo trên desktop/mobile; mobile có divider, grid nội dung co được và nút cùng mép phải. Tabs≤480px thu gap/font để đủ tên tại320px. Không đổi backend/API/auth/ownership; evidence tại worklog.


### Thời gian chỉ trong View và toolbar cỡ chữ đồng bộ — 2026-10-23

Card thường không hiển thị lastUpdatedTime; Trash giữ retention. View đặt Edited + ngày/giờ ở trái footer, Edit/Close ở phải. Nhấn thời gian mở popover Created/Last edited theo locale và timezone tài khoản; không thêm thời gian vào Edit. Menu card giữ bên phải. Cụm cỡ chữ bỏ border/nền bao riêng, nút± và ô nhập cao29px như các nút toolbar, nền hover/focus và màu chữ theo theme/note; giữ hành vi nhập/tăng/giảm hiện có.


### Labels Manager: header/form/footer cố định — 2026-10-23

Modal labels-manager dùng flex cột và overflow hidden; header, form thêm/sửa label, thông báo lỗi và footer Done ở ngoài vùng cuộn. Chỉ labels-manager-scroll (danh sách, trạng thái loading/error/empty, Load more) có overflow-y auto, min-height0 và overscroll contain. Max-height theo viewport/zoom của Modal hiện có; các modal khác giữ nguyên. Không đổi API/CRUD/pagination.


### Help & feedback có nội dung — 2026-10-23

/help thay placeholder bằng3hướng dẫn (viết/sửa, sắp xếp, tùy chỉnh),5FAQ bám source (lỗi lưu/offline, trash7ngày, reminders/inbox, Markdown, ngày note/account), link Notes/Reminders/Settings và composer phản hồi3loại. Copy clipboard có catch/fallback download.txt; nút disabled khi chỉ whitespace, giới hạn5000ký tự. Nội dung4ngôn ngữ; grid3cột desktop/1cột mobile, details/summary hỗ trợ keyboard. Không có kênh nhận phản hồi được cấu hình nên không thêm Send/email giả hay ghi dữ liệu backend; trang nêu rõ chỉ soạn/copy/download, không tự gửi. Draft chỉ ở bộ nhớ trang, không tự đính kèm note/account/device.


### Gửi phản hồi trực tiếp — 2026-10-23

Chủ dự án xác nhận lmht016847@gmail.com nhận. Help thêm Send feedback gọi POST /feedback bằng ApiClient authenticated; disabled khi trắng/loading, khóa input/type khi gửi, giữ bản nhập khi lỗi và chỉ xóa sau200. UI4ngôn ngữ nêu account email gửi kèm để trả lời. Giữ Copy/Download dự phòng. Backend dùng IFeedbackService/BaseService/ICurrentUser/TimeProvider và IEmailSender hiện có (Brevo ở hosting), recipient không lấy từ client. Các đoạn Help trước nói chưa gửi tự động là lịch sử trước yêu cầu này.


### Reorder lưu ngầm, không khóa thao tác — 2026-10-23

Workspace giữ NoteOrderCoordinator theo tài khoản, snapshot thứ tự mong muốn theo pinned group; NotesPage dùng useSyncExternalStore để áp dụng thứ tự ngay, không setPending cho reorder. Debounce400ms trước batch; một worker gửi tuần tự theo thứ tự server, chọn move ít hơn cho thao tác đầu→cuối. Đọc canonical group đầu batch, lấy version mới của card trước từng POST /notes/reorder; không invalidate/refetch toàn bộ notes mỗi lần drop. Trong lúc lưu vẫn nhận target mới và hội tụ về target cuối; chỉ publish canonical notes/version khi batch xong. Query refetch không đè layout đang pending. Lỗi giữ target và banner Try again; retry đọc server trước để tránh lặp khi response mất. Không auto retry write, không API/schema mới. Queue tồn tại khi điều hướng SPA nhưng chỉ trong bộ nhớ, reload/đóng tab trước khi lưu xong không bảo đảm giữ target. Identity guard không gửi tiếp/publish/expose order của tài khoản trước. Membership mới được đối chiếu với server; thay đổi cạnh tranh có thể yêu cầu retry. Giữ translate/zoom160ms, keyboard/mobile, pinned-group/filter/pagination giới hạn hiện có.

### Animation kéo/thả note — 2026-10-24

Sortable chuyển các thẻ nhường chỗ trong220ms, easing cubic-bezier(0.2,0.8,0.2,1); thẻ đang kéo vẫn theo con trỏ tức thì và không scale theo kích thước thẻ đích. Khi thả/hủy, noteMotion đo vị trí trước/sau commit rồi dùng Web Animations API để đưa thẻ về chỗ bằng transform trong220ms (140ms khi reduced motion), bù interface zoom. Bắt đầu kéo mới hủy animation cũ; guard thẻ đã unmount/đang kéo và cleanup trạng thái khi animation kết thúc. Không overlay nhân đôi sortable, không thay coordinator/debounce/API/pinned-group/ownership. Quy tắc này thay duration160ms của đoạn lịch sử phía trên. Tham khảo API transition của [dnd-kit useSortable](https://dndkit.com/legacy/presets/sortable/use-sortable/).

Pinned và normal dùng chung SortableContext theo đúng thứ tự render. Strategy chỉ nhường chỗ khi active/over/card cùng nhóm; kéo qua nhóm khác vẫn giữ transform của thẻ đang cầm, không xê dịch các thẻ còn lại. Chỉ khi thả ở nhóm kia mới báo Move notes within the same pinned group và animate về chỗ cũ, không gọi reorder hoặc đổi pin. Hai context riêng trước đây làm useSortable trả transform=null khi overIndex không thuộc nhóm nguồn, khiến thẻ bật về ngay lúc vẫn giữ chuột.

### Chuyển vào thùng rác không xác nhận — 2026-10-24

Theo yêu cầu chủ dự án, Move to trash ở card/editor chạy ngay, không mở modal xác nhận. Editor vẫn flush autosave trước, khóa action lúc đang xử lý, giữ editor và ErrorBanner nếu save/trash lỗi; chỉ đóng khi thành công. Card dùng pending và toast lỗi hiện có. Khôi phục/retention7ngày/API giữ nguyên; Delete permanently trong Trash vẫn cần xác nhận và hỗ trợ Cancel.

### Thứ tự label trên sidebar — 2026-10-24

SidebarLabels dùng DndContext riêng, vertical sortable200ms, MouseSensor7px, touch giữ220ms/tolerance6px; kéo trên cả hàng hoặc tay nắm, click bình thường vẫn mở label. Tay nắm có tên accessible Move {label}, Space→ArrowUp/Down→Space để sắp xếp, Escape hủy. Chặn native click phát sinh sau drag ở document capture vì dnd-kit chặn propagation nhưng không prevent default của anchor; listener chỉ trong nav tương ứng và có cleanup. Transform bù interface zoom, chỉ translate dọc.

Thứ tự lưu localStorage ntc.sidebar-label-order.v1:{userId}, theo tài khoản/trình duyệt, chưa đồng bộ thiết bị hoặc đổi thứ tự API/Labels Manager. useSyncExternalStore nghe storage/custom event đồng bộ drawer/desktop và tab khác. Dữ liệu sai định dạng bỏ qua, ID đã xóa không được render; label mới chưa có rank giữ thứ tự API và nằm cuối. Storage ghi lỗi báo Could not save, giữ thứ tự cũ. Chỉ vùng label vẫn cuộn, không thay primary/footer/sidebar motion/backend/schema.

### Cài đặt chung trên một thanh tab — 2026-10-24

Settings dùng chung danh sách route theo thứ tự Profile, Account & security, Appearance, Language, Privacy và Active sessions. Desktop giữ sáu tab hiện có; mobile (viewport logic≤800px, có tính interface zoom) ẩn tab và mở SettingsIndex gồm sáu hàng toàn chiều ngang, icon/chevron, cuộn dọc theo trang. Sidebar drawer customer Settings vào /settings; PC sidebar vẫn vào /settings/account. /settings, /admin/settings và /admin/preferences render index trên mobile, redirect account trên PC. Back từ trang con về index, từ index về notes/admin overview; avatar vẫn vào profile trực tiếp. Root index nghe resize có cleanup và context zoom để khớp breakpoint. Admin preference route vẫn /admin/preferences/{section}, header mobile bổ sung tên cho profile/account/sessions. Không thay save/profile/session/theme/language/privacy/API; hướng dẫn mobile tab cuộn ngang của entry trước được thay bằng yêu cầu danh sách dọc.

Account & security che local-part email (giữ tối đa2ký tự đầu, luôn che ít nhất1) và chỉ hiện4số cuối điện thoại; số ngắn≤4chỉ hiện số cuối. Không gắn giá trị gốc vào title/aria-label của phần đọc; form sửa điện thoại vẫn dùng dữ liệu gốc và API không đổi. Đây là che hiển thị ở trang account, không thay dữ liệu trả về hoặc phần email định danh ở Profile. Google đã liên kết có badge G/Google nhỏ dùng màu theme, outer provider label vẫn flex-grow để Disconnect giữ cùng mép phải và căn giữa với badge; Google sign-in thật/confirmation unlink không thay.

### Avatar lưu theo tài khoản và chọn múi giờ — 2026-10-24

Profile Edit có Change avatar/Remove avatar và preview; chọn PNG/JPG/WebP≤5MiB, decode bằng trình duyệt, crop giữa thành128×128, canvas PNG loại metadata/animation rồi gửi qua picture của PATCH me hiện có khi Save profile. Cancel khôi phục ảnh cũ; chặn submit/cancel khi xử lý ảnh, giữ preview khi save lỗi. Avatar shared hiển thị HTTPS hoặc PNG data URI, fallback initials khi không tải được. Backend lưu ảnh nhỏ trong UserInfo.Picture text hiện có, giới hạn100000ký tự, kiểm PNG signature/IHDR dimensions/IEND; không file server tạm/localStorage-only/bucket/schema mới. Profile/GET me/auth session đọc ảnh này, nên đăng xuất/đăng nhập và máy khác vẫn nhận ảnh đã lưu. Google login chỉ lấy ảnh Google lúc tạo profile mới, không đè avatar đã sửa của tài khoản hiện có.

Remove avatar mở ConfirmDialog có Cancel/xác nhận trước khi xóa preview; mô tả rõ vẫn cần Save profile để ghi việc bỏ ảnh. Hủy xác nhận giữ ảnh; xác nhận rồi Cancel hồ sơ vẫn giữ ảnh trên máy chủ. Timezone dùng chevron riêng cách phải12px và select padding-right40px, native appearance none; Use device timezone cùng hàng nhãn Timezone, Locale/select cùng đường căn desktop. Hành vi chọn múi giờ/lưu hồ sơ không đổi.

Timezone thay input/datalist bằng select IANA từ Intl.supportedValuesOf cộng UTC, múi giờ hiện tại và thiết bị; tên bỏ underscore và kèm GMT offset theo thời điểm hiện tại. Use device timezone chỉ chọn giá trị, vẫn cần Save profile. Có mô tả ngắn nhắc giờ/ngày, không yêu cầu user tự gõ mã. Backend giữ ReminderSchedule.Zone validation; không thay lịch reminder cũ tự động. UI/action/error mới có4ngôn ngữ. Tài khoản legacy chưa có profile cần tạo profile trước khi đổi avatar như luồng hiện hành.
