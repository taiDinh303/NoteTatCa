# Settings: tải nền và trạng thái chờ — 2026-10-30

## Hiện trạng

- Sau khi workspace mở, AppShell/AdminShell bắt đầu warm Settings sau500ms ở nền. Hover/focus link Settings hoặc các tab cũng warm ngay. Các module SettingsIndex/SettingsPage/PreferencesPage, connected accounts và trang đầu sessions dùng cache/dedup hiện có; không chặn notes/labels hoặc tự lưu form/gọi tạo AI. Dữ liệu tài khoản vẫn theo query key owner hiện hành và kiểm session của ApiClient.
- `RouteContent` đặt Suspense trong khung nội dung, key theo pathname. Khi route mới cần JavaScript chưa có, URL/tab chuyển và hiện **Loading settings…**, giữ header/sidebar/tab hoạt động thay vì giữ trang cũ tới khi chunk tải xong. Profile, linked accounts và sessions có nhãn loading riêng theo request thật. Không thêm delay giả hoặc minimum splash.
- Gallery có placeholder loading thật cho từng cặp atlas. Chỉ hiện hình sau cả directions/reactions tải và decode thành công; lỗi có **Retry** tại ô đó. Cache Promise dùng chung, tối đa4image flight; FIFO trong cùng mức ưu tiên, request foreground được ưu tiên trước background, có timeout20s và xóa strong image reference sau decode. Ảnh công khai được warm vào cache trình duyệt; không cam kết cache sống vĩnh viễn hoặc hoạt động offline lần đầu.

## Bỏ quét pixel trên luồng giao diện

Trước đây mỗi preview gọi useMascotFloor, tải2atlas1920×1920, drawImage/getImageData và tìm connected components cho18frame.50preset đồng thời có thể tạo100lượt decode/scan lớn; hình bị visibility:hidden tới khi đo xong, gây các ô trống giống ảnh phản hồi.

`mascotAnchors.generated.json` giữ floor/center của900frame đo từ100atlas gốc, kèm SHA-256. `presetAnchors` chỉ áp dụng cho đúng đường dẫn/version/revision đã biết. Preset hiện hành lấy geometry đồng bộ, không canvas scan runtime; custom/generated/legacy hoặc revision khác vẫn đo theo thuật toán hiện có. Hình trên note, PNG nguồn, calibration, hướng nhìn Bunny và18state không đổi. Unit kiểm đủ900frame và hash tất cả nguồn để asset thay đổi không âm thầm dùng anchor cũ.

Gallery dùng100atlas nhỏ480×480, vẫn đủ9hướng và9reaction mỗi preset, scale đồng dạng cả hình. Tổng body file2.513.990B, so với49.694.660B của100atlas gốc1920×1920; đây là kích thước file, không phải đo network tổng hay memory. Preview tải nhẹ hơn khoảng95%; ảnh gốc trên note vẫn1920px. Không sửa pixel/source gốc hoặc resize riêng đầu/thân. Mapping hướng Bunny được áp dụng cả đường dẫn preview.

## Tạo lại sau khi đổi artwork

Từ root, dùng Node24 và `@napi-rs/canvas` trong toolchain như các script pack mascot hiện có:

```powershell
node scripts/build-mascot-previews.mjs
npm --prefix ntc_react run build
node ntc_react/node_modules/vitest/vitest.mjs run --root ntc_react src/features/mascot/presetAnchors.test.ts
```

Trong môi trường Codex hiện tại, canvas được cung cấp qua `NODE_PATH` tới bundled node_modules; không thêm native dependency vào production package. Script đọc danh sách50preset, tạo100WebP preview và metadata; không thay100atlas gốc. Khi đổi revision, cập nhật revision của generator/URL cùng nhau. Nếu revision không khớp metadata, runtime fallback measurement thay vì dùng sai điểm neo. Các output được commit nên build Vercel bình thường không cần chạy generator/native canvas.

## Verification

- Production local Chromium, opt-in `NTC_SETTINGS_LOADING=1`, chạy `settings-loading.spec.ts` bằng `playwright.interaction-audit.config.ts`. Giữ chunk PreferencesPage và GET logins: URL chuyển, loading Settings/connected accounts hiện và tab Profile vẫn dùng được. Giữ thumbnail: tối đa4request, loading thật, chuyển Language ngay; thả request thì đủ50preview.503ởảnh Fox có Retry và hồi phục. Instrument getImageData xác nhận0lượt scan trong luồng notes→settings→appearance của preset.
- Final2/2PASS26.1s tại `artifacts/settings-loading-final`; đã xem screenshot gallery loading và gallery ready sau cuộn tới Animals. FullReact build/lint và138Vitest PASS; .NET Release strict PASS0warnings/errors. Profile/settings view7viewport/role, mascot select/reload/fallback và original atlas/anchors regression PASS; xem worklog để phân biệt lượt có fail/rerun.
-3ca settings-actions có assertion mép label Google bằng mép nút Disconnect fail. Chạy1440trên snapshot HEAD trước sửa cũng fail cùng assertion; baseline có warning font bị Vite fs allowlist chặn nên không dùng số pixel để so chính xác. Không đổi Account markup/layout hoặc sửa/nới test ngoài phạm vi loading. Không coi cả E2E suite là PASS.
- Không production cloud/thiết bị vật lý/CPU throttle, không đo heap thực tế; không migration/manual deploy, owner DB/email/AI thật. Cache trình duyệt vẫn có thể bị evict. Scope/commit được ghi tại worklog.
