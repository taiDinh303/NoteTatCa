# Mascot artwork — chuẩn Fox cho v6, 2026-10-30

## Hiệu chỉnh sau phản hồi trực quan — 2026-10-30

Chủ dự án bác bỏ nhận định bộ v6 đã đồng đều: test cỡ thân/neo không chứng minh
cỡ đầu. Hiện tại hiệu chỉnh phóng/thu đồng dạng cả nhân vật bằng
`ntc_react/src/features/mascot/mascotCalibration.ts`, lấy Fox=1, giữ tỉ lệ đầu
nguyên bản; không ép mọi đầu vào cùng W/H. Các con lớn/nhỏ được chỉnh riêng,
Grandpa/Granny được cân lại. Bald và Wizard dùng bản nguồn trước các lần làm
xẹp/bè đầu. Hệ số là hiệu chỉnh quang học thủ công, không phải phép nhận dạng
đầu tự động hoặc chứng nhận mọi landmark bằng pixel tuyệt đối.

Gallery cố định hướng trung tâm để so sánh công bằng; trên note vẫn theo chuột.
Gear bot/Knight đảo mapping cột ngang của9frame, dùng cùng index cho ảnh và
điểm neo; không lật bitmap hoặc phụ kiện. URL có revision để tránh cache cũ.
Bảng so hiện hành: `assets/mascots/ntc-v6/calibration-preview.png`.
Các target188×120/thân140 bên dưới mô tả lịch sử xuất ảnh; không còn dùng
thân35CSSpx cho mọi con làm bằng chứng đồng đều đầu. Runtime áp dụng hệ số
cho cả hai trục, nên cỡ thân hiển thị có thể khác nhau để giữ giải phẫu tự nhiên.

CURRENT: toàn bộ 55 preset dùng `ntc-v6`. Chuẩn chung từ
`assets/mascots/ntc-v6/fox-size-reference.png`: đầu chính target188×120,
thân140×54, không đổi cỡ theo loài/tuổi hoặc động vật/người/robot.
Tai, mũ, sừng, anten dùng phần đệm; riêng Wizard loại cả mũ và râu khỏi
phép so đầu, tăng phần mặt thật và giữ râu che miệng ở mọi biểu cảm.

- Nguồn55PNG trong `assets/mascots/ntc-v6/raw`; Fox giữ bản được chọn,
  54nhân vật khác vẽ lại/chỉnh bằng built-in image_gen. Prompt và các lần
  chỉnh ở `prompts/fox-uniform/`; bản nguồn trước đợt sửa được giữ local.
- 55PNG chuẩn hóa3840×1920 và55WebP cùng bộ trong `ntc-v6/`.
  Runtime110WebP1920×1920, ô640×640, center320/baseline576.
  Mỗi ảnh chứa đủ18frame,9hướng và9biểu cảm theo mapping cũ.
- Một scale đồng dạng chung cho18frame/con; dịch nguyên frame theo thân.
  Không ghép đầu/thân, mask cổ hoặc co giãn từng bộ phận bằng code.
  Script ưu tiên gutter trống, hỗ trợ hình so le bằng rectangle nguyên
  component; từ chối mép nguồn/rectangle chồng pixel có alpha>96.
- Renderer dùng artSize=2×size, giữ mật độ cũ: thân140px thành35CSSpx
  ở size80. Gallery dành headroom theo canvas mới; custom/generated giữ
  flow cũ. Điểm neo tiếp tục được đo/cache, không xử lý pixel trong pointermove.
- Đầu được rà trực quan theo guide; các target không phải kết quả nhận
  dạng giải phẫu tự động hoặc bảo đảm mọi nét đầu giống pixel giữa55con.
  Verifier kiểm990frame từ nguồn+transform, coverage pixel hiển thị,
  alpha và màu, PNG chuẩn hóa so atlas. RGB dưới alpha0 không có ý nghĩa
  hiển thị nên không dùng làm điều kiện lỗi; alpha và màu pixel có alpha>0
  của PNG/WebP chuẩn hóa được so chính xác. Verifier chạy từng con trong
  tiến trình riêng và tái sử dụng canvas để giới hạn bộ nhớ.

Validation:12/12Chromium (10hồi quy +2Wizard View/Edit ở393/1440),
990/990verifier,5Vitest neo thân,3test tách frame,4config,ESLint,
React production build và.NET Release strict/9focused mascot tests PASS.
Chi tiết/giới hạn/publication ở worklog; chưa xác minh hosting rollout.

## Lịch sử v5 — 2026-10-29

CURRENT theo yêu cầu mới nhất: giữ nguyên toàn bộ đầu, cổ, thân và biểu cảm
trong từng frame của55nhân vật. Bỏ hoàn toàn cách ghép thân canonical,
mask/cắt ngang cổ, blend đường nối và scale ngang đầu ở các bảnv1–v3.
Các bản đó chỉ còn lịch sử, không được runtime chọn.

- Nguồn mới:55PNG vẽ bằng built-in image_gen trong assets/mascots/ntc-v5/raw.
  prompts.json lưu prompt gốc và các lần sửa tỉ lệ, miệng/râu.
  Ba cột trái là9hướng, ba cột phải là9biểu cảm. Hướng nhìn dùng mắt mở,
  nét mặt trung tính dễ chịu; cúi xuống không thay bằng buồn hoặc nhắm mắt.
- Bản chuẩn hóa để xem cùng tỉ lệ:55WebP2688×1344 ngay trong ntc-v5.
  Runtime110WebP lossless trong ntc_react/public/mascots/ntc-v5:
  atlas1344×1344, tile448×448 chung cho tất cả động vật/người/robot.
- Chuẩn cỡ thân trung tâm140px, baseline384, center224. Một hệ số scale
  đồng dạng duy nhất cho18frame/con; không scale riêng đầu/thân hoặc từng hướng.
  Tai/sừng/mũ dùng headroom của khung lớn, không làm mặt và thân bị thu nhỏ.
  Tỉ lệ đầu/thân được sửa bằng vẽ lại nguyên hình khi cần, không ghép pixel.
- Bảng gốc có gutter không luôn nằm đúng1/6hoặc1/3. Script tìm đường alpha
  trống gần ranh giới lưới để chia nguyên frame: không xóa pixel, không lấy
  mảnh của hàng bên cạnh, không cắt ngang cổ. geometry.json lưu sourceX/Y,
  sourceWidth/Height, scale/dx/dy để kiểm ngược toàn ảnh nguồn.
- Wizard có râu dài che kín miệng ở mọi trạng thái; biểu cảm qua mắt/mày/má.
  Các mẫu râu ngắn/ria giữ ria khi mở miệng, miệng đúng dưới ria và râu
  theo hàm; không dùng lỗ miệng nổi phía trên hoặc thay mất ria.
- Cập nhật2026-10-29: Note và gallery đo riêng đáy nhân vật chính của18frame
  từ các vùng alpha liên thông, bỏ qua mảnh/symbol nhỏ rời bên dưới và nhận
  thân robot tách đầu khi đủ lớn/gần. Đo thêm tâm thân ở dải chân thân,
  không dùng tâm đầu đang quay. Dịch nguyên frame theoX/Y để đáy thân nằm
  đúng mép note và tâm thân không chạy theo ánh nhìn. Không đo lại khi rê
  chuột; cache theoURLvà đọc kết quả đồng bộ khi View/Edit remount.
  Canvas448 được hiển thị với cùng mật độ điểm ảnh như canvas320 cũ
  (artSize=1.4×size); gallery dành thêm headroom cho tai/sừng/mũ.
  Giữ3nhóm Animals/People/Robots,55ID/preference và
  slot custom/generated. Không thay nguồn/flow AI riêng của tài khoản.

Chạy từ root với sharp và @napi-rs/canvas trong workspace image runtime:

```powershell
node scripts/build-mascot-redraw.cjs
node scripts/verify-mascot-redraw.cjs
```

Verifier dựng lại nguyên990frame từ PNG và transform khai báo rồi so pixel
với atlas xuất và bảng chuẩn hóa: alpha và màu. Kiểm tổng diện tích ô bằng
toàn ảnh nguồn. Browser regression dùng chuột thật4hướng/trung tâm cho55con,
kiểm anchorX/Y, cỡ thân trung tâm,110atlas cùng resolution/alpha; thêm
55×9hướng×desktop/mobile, Appearance/preference và View/Edit.
V1–v4 được giữ cho lịch sử; không sửa ảnh nguồn lịch sử.
Actual validation/publication/giới hạn tại worklog.md.
