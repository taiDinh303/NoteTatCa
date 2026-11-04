# Độ phản hồi mở note — 2026-11-03

> Bổ sung2026-11-04: chủ dự án yêu cầu chuyển tải editor vào chuẩn bị workspace và thêm tùy chọn mở thẳng Edit. Xem [báo cáo mới](NOTE-RESPONSIVENESS-2026-11-04.md); chính sách warm nền bên dưới là lịch sử.

## Bổ sung: đọc trực tiếp cache danh sách, không dựng Tiptap khi View

Yêu cầu tiếp theo của chủ dự án: mở note bằng dữ liệu đã có ở danh sách, giảm việc tải/dựng lại như cảm nhận từ Keep. Ảnh Keep cũng cho thấy một lớp note nổi; không đủ chứng minh họ dùng cùng DOM card hay biết thuật toán nội bộ. Modal không đồng nghĩa tải một trang/dataset mới. NoteTatCa vốn đã seed cache từ danh sách; phần còn dư là khởi tạo Tiptap ở View và detail query luôn stale.

- View mới render rich JSON từ cache thành React elements theo đủ13node/8mark của schema hiện hành, không dựng Editor/EditorView/Tiptap. Giữ heading/mục lục, alignment, font/color/highlight, code/list/checklist và zoom/pan. Chỉ dựng bộ soạn thảo khi Edit; module editing vẫn được warm một lần ở nền để không chuyển khoảng chờ sang lần bấm Edit đầu. Không render raw HTML, không dùng tag/attrs/style tùy ý; URL chỉ http/https/mailto và text được React escape.
- Detail cache mới dùng30giây freshness. Mở lặp khi còn mới không GET lại; quá hạn hoặc invalidate vẫn đọc nền. Khi list snapshot mới hơn detail cache thì chọn ngay bản list mới; metadata version và coordinator/pending protection vẫn giữ. Không dùng cache khác owner/trash, không bỏ version conflict hoặc chờ local commit trước Close/View. Tham khảo [TanStack defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).
- Note overlay chỉ dim nền, bỏ blur desktop tương tự ảnh tham khảo; không thay gesture/card width, View/Edit hay engine soạn thảo. Vẫn có khung note nổi và DOM hiển thị riêng, dùng chung dữ liệu nguồn; không tuyên bố tái sử dụng nguyên DOM card hoặc đạt latency giống Keep.
- Gói NoteEditor từ546KB trước tách còn khoảng30KB +14KB shared NoteTools; RichEditor506KB tách riêng. Đây là kích thước JS build chưa gzip, không phải tổng tải app. Offline worker vẫn có thể precache thư viện ở nền; View không cần đợi thư viện đó.

Production local cuối: desktop note ngắn mở112→62ms,90k/450paragraph174→77ms, View→Edit ngắn88→75ms,90kEdit118→134ms, reopen39→35ms. Viewport393 sau sửa mở33ms/90k65ms. Từng sample click→DOM/RAF, không median/p95 INP/điện thoại thật/production cloud/Keep. First Edit tài liệu lớn chưa nhanh hơn; không claim mọi thao tác đều cải thiện. Drag200card cuối p9533,4ms/5gaps>32ms, không thay thuật toán drag. Raw `artifacts/direct-note-baseline`, `direct-note-core`, `direct-note-final`, `direct-note-final-cache`.

Browser kiểm mới giữ RichEditor chunk không trả về (serviceWorkers:block riêng ca này để tránh precache vượt qua route) nhưng3lần View vẫn hiện từ cache,0detailGET; Sync now cập nhật list mới thì View lấy bản mới dù detail cache cũ; fast-forward31giây kiểm1GETnền; Edit mới chờ chunk, release→gõ→View giữ nội dung. Chế độ offline vẫn được kiểm bằng suite riêng, không tắt worker của sản phẩm.

Validation:42ca Chromium khác nhau PASS qua3zoom-core +39regressions về màu/font/geometry/TOC/readonly/zoom/pan/cache/offline/mascot; sau chỉnh chọn snapshot mới và background warm chạy lại14/14cache/interaction/offline PASS. Thêm4workspace focus/conflict/reminder→Inbox/account isolation PASS. Unit143/143 và environment4/4PASS;3unit mới kiểm định dạng, text/URL/style injection và duplicate-heading focus/update. React build/lint và .NET Release strict0warnings/errors PASS. Lượt đầu3zoom FAIL thiếu attribute contenteditable=false (đã giữ lại contract); ca gate đầu bị worker precache nên harness block worker riêng và chạy lại PASS. Hai lệnh Vitest đầu sai root/config không chạy test; dev warning spread-key đã sửa giữ nguyên key. Không coi các lượt lỗi/dừng sớm là PASS.

Không DB thật/mail thật/migration/manual deploy hoặc sửa nội dung note cũ. Kiểm production sau push sẽ ghi worklog local. Khi schema mở rộng, cập nhật renderer cùng schema/format regression tests.

## Lượt trước: giảm khoảng chờ lazy và công việc chuột

Theo yêu cầu chủ dự án, kiểm lại mở note và chuột trong note; bổ sung kiểm web production bằng tài khoản mẫu được cung cấp. Có độ trễ có thể giảm ở lần mở đầu, không phải mọi thao tác đều chờ API.

- Trước sửa, editor đã được import ở nền nhưng mỗi route vẫn khai báo `React.lazy`. Lần render đầu vẫn qua Promise/Suspense; React DOM đang cài có nhánh `globalMostRecentFallbackTime + 300 - now()`. Số đo phù hợp với nhánh chờ này, không phải bằng chứng toàn bộ thời gian thuộc network. Loader mới giữ module đã resolve để render đồng bộ khi đã warm; nếu còn tải thì hiện tiến trình, render khi resolve và chuyển lỗi vào error boundary. Startup/Notes/Reminders/Inbox dùng cùng Promise có retry; không thêm dependency hoặc tải note trước quyền owner.
- Mascot trước sửa gọi `getBoundingClientRect` ngay mỗi pointermove. Giữ tọa độ mới nhất và gom bằng requestAnimationFrame: tối đa một lần đọc/vẽ mỗi frame, có hủy callback/listener khi unmount và cập nhật khi scroll/resize. Giữ hướng nhìn, hysteresis, phản ứng và timer qua View/Edit.
- Không đổi gesture kéo thả, rich editor, autosave/local queue, API, dữ liệu hay config. Chưa đổi blur desktop vì chưa tách được chi phí GPU bằng profiler.

## Phép đo production build local

Chromium1440×900 và viewport393×900, Vite preview4173, SQLite/captured-mail fixture5199; không owner DB, mail hoặc AI thật. Click→requestAnimationFrame đầu thấy DOM đích, không phải hardware input→pixel/INP. Đây là từng sample, không phải median/p95 người dùng thật hoặc Keep. Bản build có thay đổi mascotBodyFloor có sẵn ngoài scope; giữ nguyên giữa các lượt và không đưa vào commit.

| Thao tác desktop | Trước sửa | Sau sửa, các sample |
| --- | ---: | ---: |
| Mở lần đầu note đã cache, detail GET còn bị giữ | 391ms | 97/102/88ms |
| Mở lần đầu note90.000ký tự/450paragraph | 416ms | 134/170/148ms |
| View→Edit note ngắn | 68ms | 77/71/57ms |
| Mở lại note ngắn | 38ms | 54/49/52ms |
| 120pointer events đồng bộ, số đọc hình học mascot | 120 | 1 |

Lợi ích rõ ở lần mở đầu; không kết luận mở lại hoặc mọi phím nhanh hơn. Note90k vẫn có beforeinput→RAF tối đa71ms/13sample desktop trong acceptance, mobile28ms. Drag200card p95frame33,2ms/5khoảng>32ms trong89sample ở acceptance; lượt trước16,8ms/3khoảng. Tải máy/điều khiển browser khác nhau; không chứng nhận60FPS hoặc đã giải hết độ nặng của tài liệu lớn. Không có CPU/network throttle hay thiết bị vật lý.

## Web production

Đăng nhập qua IAB vào đúng production bằng một tài khoản mẫu do chủ dự án cấp. Bản trước publication có Opening editor… ở lần mở đầu. Tạo riêng note `NTC responsiveness check 2026-11-03`,180dòng, sau gõ thêm có11.426ký tự. Cuộn5947→4179px bằng chuột; chuyển Edit giữ4179px. Nhập thêm, chờ All changes saved, View/Close/reload/mở lại xác nhận nội dung kiểm thử còn đủ. Không sửa note cũ, đổi account settings hay gửi email/reminder. Note thử được giữ để người dùng đối chiếu.

Các tool roundtrip/snapshot không phải đồng hồ browser event→paint; không gán số391/88ms cho production. Chưa đo Keep trực tiếp: điều khiển cửa sổ Chrome không xác minh chắc URL đã dừng, không truy cập nội dung Keep bằng đường khác. Ảnh Keep không đủ xác nhận độ trễ hay thuật toán nội bộ. Chưa có so sánh latency hai ứng dụng trên cùng hardware/session/network.

## Validation

- 35/35 production-local browser acceptance: cold module bị giữ nhưng workspace dùng được; release→note; cache trang sau không chờ GET; View/Edit/scroll/pin/zoom/pan/geometry/opaque backdrop; storage lỗi vẫn giữ draft; mascot phản ứng/timer/fullscreen và pointer budget.
- 3/3 dev browser workspace: title focus sau deferred startup; rich create/autosave/labels/trash restore; reminder→Inbox mở note chung. Tổng38ca khác nhau PASS, không cộng rerun.
- 140/140Vitest,4/4environment checks, fullESLint và scoped test lint PASS. TypeScript/Vite production build PASS; .NET solution Release -warnaserror -m:1 PASS0warnings/errors; NoteTests HTTP12/12PASS trên fixture riêng.
- Test pointer mới trước sửa FAIL đúng120reads; lượt acceptance đầu đo1read nhưng assertion hướng không tính ánh xạ atlas bunny, đã sửa expected theo mascotDirectionFrame hiện có rồi acceptance35/35PASS. Không sửa mapping sản phẩm hoặc giảm assertion số đọc.
- Raw: `artifacts/note-response-acceptance`, `artifacts/note-response-workspace`, `artifacts/note-response-loader-only`; baseline ban đầu ở thư mục sibling `../artifacts/note-response-baseline`, pointer baseline `../artifacts/pointer-baseline` do --output tương đối cwd. Không chứa credentials trong source/report/test artifacts.

## Nguồn kỹ thuật và giới hạn tiếp theo

[React lazy](https://react.dev/reference/react/lazy) mô tả việc gọi load ở lần render đầu; [React reconciler](https://github.com/react/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js) và bản react-dom local có fallback throttle. [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) được dùng để gom công việc theo paint. [Tiptap performance](https://tiptap.dev/docs/guides/performance) hỗ trợ editor isolation/useEditorState; code đã dùng các biện pháp đó từ audit trước, không thay toàn bộ editor chỉ từ suy đoán.

Nếu tài liệu lớn vẫn nặng sau bản này, bước tiếp theo là CPU/GPU profile selection, serialization/validation mỗi edit và backdrop; cân nhắc View nhẹ hơn hoặc giữ instance editor sau khi có số đo. Không bỏ lưu bền vững/kiểm quota để tạo cảm giác nhanh. Xem [audit trước](NOTE-INTERACTION-AUDIT-2026-10-30.md).
