# Mascot artwork — whole source frames, 2026-10-28

CURRENT theo yêu cầu mới nhất: giữ nguyên toàn bộ đầu, cổ, thân và biểu cảm
trong từng frame của55nhân vật. Bỏ hoàn toàn cách ghép thân canonical,
mask/cắt ngang cổ, blend đường nối và scale ngang đầu ở các bảnv1–v3.
Các bản đó chỉ còn lịch sử, không được runtime chọn.

- Nguồn chuẩn:55PNG trong assets/mascots/ntc-v1, mỗi nguồn6cột×3hàng.
  Ba cột trái là9hướng, ba cột phải là9biểu cảm. Không vẽ lại hình nguồn.
- Runtime:110WebP lossless trong ntc_react/public/mascots/ntc-v4.
  Chỉ tách các ô sprite từ nguồn rồi đặt nguyên ô lên atlas3×3, tile320.
- Mỗi nhân vật dùng duy nhất một hệ số scale đồng đều cả chiều ngang/dọc
  và chung cho18frame. X giữ tâm ô nguồn, không chạy theo đầu hoặc biểu tượng.
  Y chỉ dịch nguyên ảnh để mép alpha nằm tại baseline300. Không lấy pixel
  của frame khác, không xóa mảnh hình/biểu tượng, không làm mờ hoặc thay màu.
- geometry-v4.json lưu scale/dx/dy/tọa độ mỗi frame; preview-v4.webp xem mẫu.
  Nguồn có mảnh từ ô cạnh, khoảng trắng hoặc chi tiết đã cắt ngay trong PNG
  thì bản xuất vẫn giữ đúng nguồn; không tự sửa bằng cắt/ghép. Độ rộng thân
  hoặc tư thế thay đổi vốn có trong nguồn cũng được giữ.
- Note dùng nguyên chiều cao300/320, không còn bù vị trí từng phần dựa
  trên dải thân giữa ảnh. Giữ3nhóm Animals/People/Robots,55ID/preference và
  slot custom/generated. Không thay nguồn/flow AI riêng của tài khoản.

Chạy từ root với sharp và @napi-rs/canvas trong workspace image runtime:

```powershell
node scripts/build-project-mascots.cjs
node scripts/verify-project-mascots.cjs
```

Verifier dựng lại nguyên990frame từ PNG và transform khai báo rồi so pixel
với atlas xuất: alpha và màu, không dùng tiêu chí thân các frame phải giống nhau.
Browser regression kiểm Appearance, preference, note và View/Edit.
Nguồn/prompt sinh ảnh lịch sử giữ trong prompts.json, expansion-prompts.json,
expansion-revisions.json; không gọi image generation cho lần sửa xuất ảnh này.
Actual validation/publication/giới hạn tại worklog.md.
