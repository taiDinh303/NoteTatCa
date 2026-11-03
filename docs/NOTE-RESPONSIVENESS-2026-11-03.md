# Độ phản hồi mở note — 2026-11-03

## Kết quả và thay đổi

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
