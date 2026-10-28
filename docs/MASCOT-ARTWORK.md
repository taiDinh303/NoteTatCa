# Bộ nhân vật riêng NoteTatCa — 2026-10-28

CURRENT: Appearance dùng 8 preset riêng: Cat, Fox, Owl, Bear, Bunny, Otter,
Notebook robot và Paper pal. Đây là bộ thử đầu tiên theo yêu cầu chủ dự án;
đầu giữ đặc điểm/tỷ lệ của từng nhân vật, không ép cùng kích thước.

## Hình và hình học

- Hình gốc và prompt cuối: `assets/mascots/ntc-v1/`. Tạo bằng công cụ
  built-in `image_gen` với `transparent_background: true`, không dùng API key
  của project. `prompts.json` giữ prompt đầy đủ và vai trò ảnh tham chiếu.
- Runtime: `ntc_react/public/mascots/ntc-v1/`, mỗi con có directions và
  reactions WebP lossless 960×960, mỗi ô 320×320. Runtime/các thứ tự trạng thái
  tiếp tục theo port MIT của nilbuild/page-mascot; license cũ được giữ.
- Mỗi nguồn là 6 cột × 3 hàng; nửa trái là 9 hướng, nửa phải là 9 biểu cảm.
  Không thay sprite bằng cùng một ảnh lặp: các hướng/biểu cảm giữ hình riêng.
- Khi ghép, loại các mảnh nhỏ rời/viền từ hàng bên cạnh, đo cổ và thân,
  giữ một scale đầu cho cả 18 frame của một con. Lấy thân từ frame trung tâm,
  đặt một lần rồi dùng lại đúng phần thân đó trong mọi frame.
- Vùng thân cố định bắt đầu tại y=244, đường đáy y=300 (pixel cuối y=299),
  rộng 144px trên tile 320. Cả 8 nhân vật dùng cùng hệ tọa độ này; đầu có
  thể khác kích thước. Vùng dưới đường đáy trong suốt, không dùng fade để
  che sai lệch. WebP lossless bảo toàn pixel thân giữa hai atlas.
- `geometry.json` lưu anchor thực tế của từng frame và scale của từng con;
  `preview.png` xem 8 frame trung tâm. Cú có đầu nhỏ hơn các con còn lại để
  giữ nối cổ/thân từ hình gốc; đây là khác biệt tạo hình, không đổi baseline.

## Ghép lại và kiểm tra

Chạy từ root với Node và các package `sharp`, `@napi-rs/canvas` có trong
workspace image runtime (có thể cung cấp đường dẫn package qua `NODE_PATH`):

```powershell
node scripts/build-project-mascots.cjs
```

Script chỉ xử lý nguồn đã lưu; không gọi AI/network và không cần secret.
Không cần các package này cho build/runtime React. Nếu đổi hình gốc hoặc
logic ghép, chạy lại browser regression, đặc biệt `mascot-artwork.spec.ts`:

```powershell
node ntc_react/node_modules/@playwright/test/cli.js test --config ntc_react/playwright.config.ts ntc_react/e2e/mascot-artwork.spec.ts ntc_react/e2e/mascot-settings.spec.ts ntc_react/e2e/note-mascot.spec.ts ntc_react/e2e/view-mascot.spec.ts --timeout 120000
```

Fixture chỉ dùng dữ liệu synthetic và captured mail. Cần .NET 8 trong PATH
cho fixture; không dùng connection string của chủ dự án. Test pixel kiểm
thân của 18 frame giống nhau, rộng 142–146px (cho ngưỡng alpha/resampling),
baseline chính xác và không có pixel đặc chạm cạnh tile. Test runtime kiểm
chọn/lưu/bật-tắt, neo trên note, desktop/mobile và timer xuyên View/Edit.
Kiểm pixel không thay thế xem ảnh thực tế: đã xem preview và screenshot
Appearance desktop/mobile; các bản cú giống mèo và thỏ có viền thừa đã bị loại.

## Preference và giới hạn

Các tên cat/fox/owl/bear/bunny/otter tiếp tục dùng ID cũ, nhưng URL có `ntc-v1`
để không nhận artwork cũ từ cache. Hai ID mới là notebook và paper.
Các preset đã bỏ khỏi gallery chuyển về Bunny khi đọc preference, giữ
trạng thái off nếu người dùng đã tắt. Custom/generated và slot AI riêng
của tài khoản giữ nguyên. Không bật hoặc thay provider AI trong app.

Asset legacy vẫn giữ trong repository để bảo toàn lịch sử/fixture hiện có,
không còn hiện trong danh sách 8 preset mới. Chưa kiểm thiết bị vật lý hoặc
rollout production; kết quả chạy và publication xem `worklog.md`.
