# Mascot artwork — đồng bộ toàn bộ 55 nhân vật, 2026-10-29

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
