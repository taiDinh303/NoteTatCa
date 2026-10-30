# Kiểm tra độ mượt tương tác note — 2026-10-30

## Triển khai sau audit theo yêu cầu chủ dự án

Đã sửa runtime sau khi chủ dự án giao thực hiện toàn bộ đề xuất theo thứ tự, giữ thay đổi nhỏ và bảo toàn chức năng. Phần khảo sát bên dưới được giữ làm baseline trước sửa, không phải trạng thái hiện hành.

- View chỉ dựng lại tài liệu khi nội dung thay đổi, không dựng lại vì pin/version metadata. Pin và unpin giữ nguyên instance và scroll600px. ContentZoom giữ scroll trong phiên note qua View↔Edit, chờ kích thước tài liệu có thật trước khi khôi phục và clamp khi nội dung ngắn hơn. Focus dùng `ProseMirror.EditorView.focus()` đồng bộ để cập nhật DOM selection, tránh native focus khiến con trỏ/cửa sổ cuộn nhảy về đầu.
- Detail query dùng `initialData` từ bất kỳ trang notes nào đã tải trong cache của đúng owner, kèm `initialDataUpdatedAt` nguồn; vẫn GET mới ở nền và không dùng note đã trash/owner khác. Cách này theo [TanStack Query: initial data from cache](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data). Read bắt đầu trước một local save phải overlay bản pending mới trước khi trả về, không ghi đè draft bằng phản hồi cũ.
- Create/PATCH ghi vào hàng đợi IndexedDB hiện có trước rồi trả về; sync có khóa, version chain, create idempotency key và conflict review tiếp tục chạy nền. Close/View vẫn await ghi local, không đóng trước transaction commit. Storage lỗi thì giữ draft; chỉ fallback server khi xác định an toàn, không bypass pending không đọc được. Cơ sở chờ giao dịch thành công là [IndexedDB transaction complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event); không tuyên bố bảo đảm chống mất điện ngoài cơ chế trình duyệt.
- Metadata/action cần server (pin/labels/trash/history/reminder mới) đồng bộ pending trước khi cần thiết và giải alias local→server. Reminder của note tạo local đợi server ID hợp lệ; lịch sử lấy version server trước restore. Local ID không được gửi làm ID note cho API reminders.
- Editor parse initial JSON một lần mỗi instance, memo component với callback ổn định, đọc text một lần mỗi update, dùng `useEditorState` và `shouldRerenderOnTransaction:false`. Autosave so sánh trực tiếp các trường bất biến và copy mảng tag thay stringify/clone toàn draft nhiều lần mỗi phím. Vẫn canonicalize/validate dữ liệu trước lưu và giữ quota. Đây là áp dụng [Tiptap: integration performance](https://tiptap.dev/docs/guides/performance), không thay editor/schema hoặc thêm framework.
- Loader editor dùng chung Promise có thể retry khi preload lỗi; hover/focus/touch intent bắt đầu tải trước trên card/New. Background warm sẵn trong Startup được giữ. [React lazy](https://react.dev/reference/react/lazy) vẫn làm Suspense/error boundary bình thường. Không khẳng định loại hết chi phí cold open: số đo vẫn khoảng0,37giây.
- Giữ/adopt thay đổi performance có sẵn trong working tree: workspace chỉ đợi trang notes đầu, trang sau qua Load more. Lưu từng trang đã tải vào cache offline nhưng không giả là dataset đầy đủ. Sửa offline hydration/notes/labels để100note đã tải vẫn dùng được khi server còn trang khác. Search/filter online không suy ra kết quả toàn bộ từ một trang. Giữ guard reorder khi chưa tải hết nhóm, không đổi thuật toán thứ tự trên dữ liệu thiếu.
- Kéo thả giữ dnd-kit, optimistic order, debounce400ms và FLIP/transform hiện có; không thêm virtualization hoặc thay gesture khi phép đo200card chưa cho thấy cần đánh đổi chức năng.

### Đo sau sửa

Production build local, cùng phương pháp click→RAF có DOM đích và viewport như baseline. Mỗi ô vẫn chỉ một sample, không phải median/p95 INP. Kết quả cuối6/6PASS: `artifacts/note-smooth-release-audit`. Các lượt trước tại `artifacts/note-smooth-production-verified` và `artifacts/note-smooth-drag-scale` được giữ để đối chiếu độ biến thiên.

| Thao tác | Desktop trước → sau | Mobile viewport trước → sau |
| --- | ---: | ---: |
| Mở lần đầu, note đã cache | 398 → 384 ms | 385 → 384 ms |
| Mở lại | 40 → 30 ms | 46 → 36 ms |
| View → Edit, note ngắn | 68 → 47 ms | 48 → 45 ms |
| Clean Edit → View | 59 → 53 ms | 45 → 40 ms |
| Dirty Edit → View, giữ PATCH thêm1.200ms | 1.432 → 82 ms | 1.314 → 63 ms |
| Dirty Close, giữ PATCH thêm1.200ms | 1.334 → 124 ms | 1.283 → 42 ms |
| Đóng View | 18 → 54 ms | 15 → 17 ms |
| View pin scroll | 600→0 → 600→600 px | 600→0 → 600→600 px |

Clean Close desktop có sample chậm hơn; không lấy một sample để khẳng định mọi thao tác đều nhanh hơn. Lợi ích rõ ràng là tách chờ server khỏi Close/View sau khi có bản local đã commit, bỏ chờ detail GET của note đã tải, giữ vị trí cuộn và giảm công việc React/JSON dư.

Note90.000ký tự/450paragraph lượt cuối: mở440/426ms, View→Edit107/90ms, Edit→View sau gõ116/86ms (desktop/mobile viewport).13sample beforeinput→RAF khi gõ: max67/29ms; lượt trước max53/27ms. Đây gồm scheduling/layout và tải máy (có build check riêng trong lượt cuối), không phải CPU profiler hoặc chứng nhận mọi phím<16ms. Đã lưu screenshot View và xem bản393px; nội dung/controls không tràn viewport. Drag200card lượt cuối:89khoảng frame, p95=16,8ms,2khoảng>32ms (lượt trước3khoảng); không chứng nhận60FPS mọi khung, không đại diện thiết bị yếu hoặc1.000card hiện cùng lúc. Chưa có số đo memory đáng tin cậy.

Tham khảo nguồn trên để chọn kỹ thuật, không thay các dependency/package lock, quyền owner, API production, backend schema hoặc dữ liệu thật. Chưa chạy production cloud/thiết bị vật lý/CPU throttle; những giới hạn này vẫn còn sau tối ưu. Evidence validation cuối cùng và scope publication được ghi trong worklog.

## Phạm vi và bằng chứng

Baseline khảo sát working tree tại `D:\My Projects\NoteTatCa`, giữ nguyên các thay đổi backend/archive/performance/mascot có sẵn. Ở thời điểm audit ban đầu chỉ bổ sung phép đo và tài liệu, chưa sửa runtime; phần triển khai hiện hành nằm ở đầu tài liệu. Không dùng đường dẫn workspace cũ trong docs để chạy lệnh.

Chromium, production Vite build chạy local qua preview, fixture SQLite in-memory `127.0.0.1:5199`, dữ liệu và tài khoản giả; không owner DB/email thật. Desktop 1440×900 và viewport mobile 393×900, không CPU/network throttle. Mobile là viewport trình duyệt desktop, không phải thiết bị thật. Mỗi ô là một quan sát, không phải median/p95 hay chỉ số INP. Thời gian tính từ sự kiện click đến requestAnimationFrame đầu tiên thấy DOM đích; không chứng minh pixel đã được compositor vẽ. Lần mở đầu chưa tải module note trong page session, nhưng không chứng minh mọi HTTP cache đều lạnh.

## Kết quả đo production local

| Thao tác | Desktop | Mobile viewport |
| --- | ---: | ---: |
| Mở lần đầu, note trang đầu có cache | 398 ms | 385 ms |
| Mở lại sau khi mã đã tải | 40 ms | 46 ms |
| View → Edit, note ngắn | 68 ms | 48 ms |
| Edit → View, không có thay đổi | 59 ms | 45 ms |
| Edit → View vừa sửa, giữ PATCH thêm 1.200 ms | 1.432 ms | 1.314 ms |
| Đóng View | 18 ms | 15 ms |
| Đóng Edit vừa sửa, giữ PATCH thêm 1.200 ms | 1.334 ms | 1.283 ms |
| Vị trí cuộn trước → sau ghim ở View | 600 → 0 px | 600 → 0 px |

Các phép sửa dùng note khoảng 8.000 ký tự/180 dòng. Không suy ra hiệu năng của note 100.000 ký tự hoặc tài liệu nhiều bảng/checklist từ số đo này.

## Phát hiện và đề xuất

1. **Ưu tiên cao: ghim làm mất vị trí đang đọc.** Cả hai viewport xác nhận node nội dung cũ bị tháo và scroll về 0 sau PATCH pin thành công. `NoteEditor.tsx` đặt `ReadOnlyContent key={note.version}`; API thay version khi đổi pin nên toàn bộ Tiptap/ContentZoom bị dựng lại dù nội dung không đổi. Đề xuất giữ instance khi chỉ metadata đổi, chỉ cập nhật tài liệu khi nội dung thực sự đổi; bảo toàn scroll/zoom và kiểm cả pin/unpin, cập nhật nền, restore lịch sử. Không chỉ bỏ key mà bỏ qua cập nhật nội dung thật.

2. **Ưu tiên cao: mở note ở trang sau còn chờ GET dư thừa trên đường hiển thị.** `WorkspacePreparation` seed detail cache cho trang notes đầu; `useNotes` tải trang tiếp theo nhưng không seed detail. Phép thử seed thêm 110 note, Load more, mở card cuối và giữ GET chi tiết xác nhận spinner “Opening your note…” chặn nội dung tới lúc thả request. Ngược lại note trang đầu vẫn mở được trong khi GET bị giữ. Đề xuất dùng bản note đã có trong danh sách làm dữ liệu ban đầu có kiểm tra owner và trạng thái trash/pending, tiếp tục revalidate nền. GET nền hiện tại không phải luôn chặn mở note.

3. **Chờ lưu khi vừa sửa rồi đóng/chuyển View là hiện trạng đã xác nhận.** `requestClose`/nút View gọi `AutosaveCoordinator.flush`; repository ưu tiên PATCH server rồi mới fallback lưu IndexedDB khi lỗi kết nối. Giữ PATCH thêm 1,2 giây khiến thao tác mất khoảng 1,3–1,4 giây. Autosave debounce 750 ms không phải thời gian bắt buộc chờ khi bấm Close/View: flush bỏ timer, nhưng phải chờ request đang chạy hoặc request lưu mới. HTTP timeout hiện tại 30 giây mỗi request nên mạng treo có thể khiến chờ lâu hơn nhiều; chưa đo tình huống timeout thật. Đề xuất lưu bền vững local trước, sau đó cho chuyển/đóng và đồng bộ nền bằng hàng đợi hiện có; phải giữ owner, phiên bản, conflict, lỗi storage và phân biệt “đã lưu trên thiết bị” với “đã đồng bộ”. Không bỏ await đơn thuần hoặc đóng trước khi có bản lưu an toàn.

4. **Lần mở đầu còn phí tải/khởi tạo editor.** `NotesPage` lazy-import `NoteEditor`; module này static-import `RichEditor` và `ReadOnlyContent` cùng hệ Tiptap. Build có chunk RichEditor 516,70 kB / gzip 164,65 kB, chưa gồm các chunk phụ thuộc khác. Phép mở đầu ~0,39 giây so với mở lại ~0,04 giây phù hợp với chi phí khởi tạo/tải mã, nhưng chưa tách riêng network/parse/layout để quy toàn bộ chênh lệch cho một nguyên nhân. Đề xuất preload có điều kiện sau workspace sẵn sàng hoặc khi hover/focus/touch-intent, đo lại cold cache và mạng chậm; cân nhắc tách phần View nhẹ hơn. Không tải mọi note/module nặng ngay lúc login.

5. **View ↔ Edit hiện dựng hai instance khác nhau.** `NoteViewer` và `EditorSession` thay nhau mount, mỗi bên tạo Tiptap riêng. Với note ngắn, các quan sát 45–68 ms chưa cho thấy chậm nghiêm trọng. Đề xuất đo tài liệu gần quota, kiểm scroll/caret/undo trước khi chọn giữ chung editor instance và đổi `editable`; đây là thay đổi cần hồi quy dữ liệu/focus, không chỉ thêm animation.

6. **Kéo thả và pin trên danh sách đã có phản hồi cục bộ.** Pin commit optimistic, drag dùng overlay thứ tự và ghi nền debounce 400 ms; drop/đổi vị trí dùng transform khoảng 220 ms. Mouse kích hoạt sau 7 px, touch chờ 220 ms để phân biệt cuộn; đây là ngưỡng thao tác, không phải đợi mạng. Regression 6 ca card cao thấp/zoom/touch và 2 ca guest release đều PASS, gồm không méo card và không bay lần hai. Chưa đo FPS/p95 kéo liên tục với hàng trăm card; chưa chứng nhận “mượt nhất có thể”. `canDrag` tắt khi còn `hasNextPage` và khi search/label/reminder/trash; người dùng phải tải hết trang mới reorder trong danh sách thường. Nếu muốn reorder ngay trang đầu, cần thiết kế thứ tự trên dữ liệu phân trang, không bỏ guard tùy tiện.

7. **Rủi ro với tài liệu lớn, chưa xác nhận là nghẽn runtime.** `RichEditor.onUpdate` đọc toàn văn, canonicalize/serialize JSON; coordinator clone draft và serialize để kiểm dirty nhiều lần. Đề xuất profile typing/paste ở gần 100.000 ký tự, sau đó giảm serialize/clone dư bằng revision/dirty tracking và gom công việc không cần đồng bộ với từng phím. Không kéo dài debounce lưu hoặc thêm virtualization khi chưa có số đo chứng minh cần thiết.

## Validation và tái chạy

- `npm --prefix ntc_react run build`: PASS TypeScript/Vite production build.
- `D:/dotnet/dotnet.exe build ntc_aspnet/NTC.sln -c Release -warnaserror -m:1`: PASS, 0 warnings/errors.
- Focused Vitest autosave/noteOrder/workspace: 19/19 PASS.
- Focused HTTP `NTC.Tests.Integration.NoteTests`, Release `--no-build`: 12/12 PASS, SQLite/captured mail riêng.
- Chromium `note-view-toggle.spec.ts drag-shape.spec.ts guest-drag-motion.spec.ts`: 13/13 PASS.
- Production audit: 3/3 PASS, kết quả trong `artifacts/interaction-audit-20261030-verified`. Hai lượt audit trước chưa PASS do lỗi harness: unroute khi handler đang giữ GET và đo nhầm `.editor-scroll` thay vì `.content-zoom-viewport`. Đã sửa harness, không sửa ứng dụng để lấy PASS.
- Scoped ESLint test/config mới PASS. Lệnh ESLint đầu thiếu `--config` từ root không chạy được; lệnh có config rõ ràng PASS.

Test opt-in lưu tại `ntc_react/e2e/interaction-audit.spec.ts`; bật bằng `$env:NTC_INTERACTION_AUDIT='1'`. Bản production audit đã chạy bằng cấu hình tạm ignored `artifacts/interaction-audit.config.ts`. Cấu hình tương đương được giữ tại `ntc_react/playwright.interaction-audit.config.ts`; sau build, chạy từ root:

```powershell
$env:PATH = 'D:\dotnet;' + $env:PATH
$env:NTC_INTERACTION_AUDIT = '1'
node ntc_react/node_modules/@playwright/test/cli.js test --config=ntc_react/playwright.interaction-audit.config.ts interaction-audit.spec.ts --output=artifacts/interaction-audit --reporter=list
```

Không chạy chồng các suite cùng reset fixture cổng 5199. Audit này ghi nhận một số vấn đề hiện có; sau khi tối ưu cần cập nhật phép chẩn đoán tương ứng, đặc biệt ca tái hiện chờ GET trang sau. Chưa chạy fullsuite, production cloud, thiết bị thật, CPU throttle, cold-network hoặc profiling note gần quota. Không commit/push/deploy/migrate trong lượt kiểm tra này.
