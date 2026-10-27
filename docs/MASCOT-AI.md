# Mascot AI — cấu hình và vận hành

Quyết định của chủ dự án 2026-10-27: OpenAI API do ứng dụng trả phí, một lượt AI/người/ngày và chỉ một nhân vật riêng miễn phí ngoài thư viện cho mỗi tài khoản. Có thể chỉnh sửa/thay thế nhân vật hiện có hoặc xóa để tạo mới; không có slot thứ hai hay giao diện trả phí. Xóa không hoàn lượt AI trong ngày. Một lượt gồm tối đa hai yêu cầu ảnh: atlas 9 hướng nhìn, sau đó atlas 9 biểu cảm dùng ảnh đầu làm tham chiếu. Model mặc định `gpt-image-2.5-flare`, PNG alpha 1024×1024, quality medium; không cho client đổi model, n hoặc quality. Tham số được đối chiếu [Images generation](https://developers.openai.com/api/reference/resources/images/methods/generate) và [Images edits](https://developers.openai.com/api/reference/resources/images/methods/edit).

## Trạng thái và phạm vi

- Code triển khai cho account khách hàng đăng nhập, không dành cho guest/admin. Dịch vụ mặc định tắt khi chưa cấu hình; frontend vẫn dùng đủ thư viện 53 nhân vật khi API cũ/chưa bật AI; bỏ giao diện tạo thêm ảnh riêng tĩnh để chỉ còn một slot riêng.
- Tạo mới là job trong database; không chạy tác vụ AI phụ thuộc vòng đời HTTP. Có thể rời trang/reload rồi quay lại xem trạng thái. Worker xử lý mỗi job tối đa một lần, claim nguyên tử; khởi động lại sau yêu cầu có thể đã bị tính phí không tự gửi lại. Job running quá12 phút chuyển failed, timeout toàn lượt10 phút. Render sleep/restart có thể làm lượt thất bại; không cam kết hoàn tất sau mọi lần restart.
- Hạn mức tính theo ngày UTC, reset00:00 UTC; UI hiển thị giờ reset theo thiết bị. Unique `(UserId,QuotaDay)` cưỡng chế một lượt kể cả request song song/nhiều server/restart; unique `(UserId,RequestId)` chống tạo trùng khi gửi lại. Lượt đã nhận vẫn tính khi provider lỗi/timeout/đứt giữa hai ảnh; không refund tự động vì lần gọi trước có thể đã bị tính phí. Xác nhận gửi mô tả/ảnh là bắt buộc trước POST; request không hợp lệ/chưa bật không giữ slot.
- Không tự đọc/gửi note. Chỉ mô tả tối đa1000ký tự và ảnh tham chiếu đã chọn; client bỏ metadata bằng canvas, giới hạn ảnh đầu vào5MB/4096px rồi thu về1024px; backend nhận PNG tối đa2MB/2048px, request tối đa3MB. OpenAI nhận user identifier hash, không email/tên tài khoản. Không lưu key ở frontend hoặc ghi prompt/ảnh/provider error body vào log.
- Khi xong/thất bại, xóa prompt và ảnh tham chiếu khỏi job. Result chỉ đọc trong7ngày và phải cùng owner; worker dọn bytes cũ, xóa record sau30ngày khi đang chạy. Cleanup chậm nếu worker bị tắt; GET result vẫn chặn quá7ngày. Xóa account thật cascade bảng job; account bị khóa/soft-delete không được bắt đầu queued job mới.
- Preview kéo hai ảnh khi người dùng nhấn xem trước. Canvas kiểm tra bố cục/alpha/cell, căn vai và đáy của18khung, xuất atlasWebP480px; không ghép/cắt ngang cổ. Từ chối hình lỗi mà không đổi mascot đang dùng. Chưa đo chất lượng đầu ra OpenAI thật; việc align không đảm bảo sửa được mọi ảnh sai bố cục.
- Chỉ áp dụng sau preview. Hai atlas WebP được lưu trên server theo owner, tồn tại đến khi thay/xóa; local cache theo userID chỉ giúp tải nhanh. Không hiện ảnh của account A ở account B. Chỉnh sửa giữ nhân vật cũ đến khi Apply thành công; transaction thay thế cùng unique index có filter bảo đảm chỉ một slot đang dùng. Xóa giải phóng slot, xóa ảnh và vô hiệu các bản sửa đang chờ; không hoàn quota. Lựa chọn bật/tắt/nhân vật vẫn theo trình duyệt, artwork riêng tải được trên thiết bị khác.

## Bật ở môi trường local hoặc cloud

Theo [CONFIGURATION-STANDARD](CONFIGURATION-STANDARD.md), không sửa appsettings local, không dùng `VITE_` để chứa secret.

| Cấu hình backend | Ý nghĩa |
| --- | --- |
| `MascotAi:Enabled` / `MASCOTAI__ENABLED` | Mặc địnhfalse; true chỉ sau review/apply migration và có key hợp lệ |
| `MascotAi:OpenAiApiKey` / `MASCOTAI__OPENAIAPIKEY` | Secret của OpenAI project do app trả phí, chỉ User Secrets hoặc Render Environment |
| `MascotAi:Model` / `MASCOTAI__MODEL` | Mặc định `gpt-image-2.5-flare`; whitelist thêm `gpt-image-2.5-sunburst`, `gpt-image-1.5` hỗ trợ transparent PNG |

Nhập key local không đưa vào command line/history:

```powershell
powershell.exe -NoProfile -File .\scripts\Set-MascotAiKey.ps1
```

Script chỉ merge key vào User Secrets hiện hữu của đúng API, không in giá trị, không bật server/AI. Sau review migration, cấu hình flagtrue bằng User Secrets hoặc environment của máy chạy API. Cloud nhập secret trực tiếp vào Render Environment; không gửi key qua chat/Git. Nên dùng OpenAI project riêng với mức chi tiêu phù hợp; quota app không thay thế giới hạn chi tiêu của provider. Chưa gọi API thật để kiểm tra quyền model/tính phí.

## Schema và rollout

Hai migration additive:

- SQL Server: `20261027152708_AddMascotGenerations`.
- PostgreSQL schema `ntc`: `20261027152721_AddMascotGenerations`.

Chỉ thêm bảng `MascotGeneration`, FK owner về AspNetUsers, unique quota/idempotency, unique owner có filter OccupiesSlot và index queue; không sửa/xóa dữ liệu note hoặc migration cũ. Review SQL và chạy trên instance tách biệt trước apply live. Không auto-migrate khi startup, không deploy từ task code. Chưa apply database chủ dự án.

## API

| Method/path | Hành vi |
| --- | --- |
| GET `/api/v1/mascot-ai/status` | enabled, quota, giờ reset, canCreate/canEdit và metadata job/slot hiện tại; không tải blob/prompt |
| POST `/api/v1/mascot-ai/generations` | `requestId`, `replacesId?` khi sửa slot hiện có, `description`, `referencePngBase64?`, `consentToSendToOpenAi`; trả201 jobqueued; 429 khi hết lượt; 503 khi chưa cấu hình |
| GET `/api/v1/mascot-ai/generations/{id}/result` | Hai PNGbase64 của jobready cùng owner; 404 khác owner, 409 chưaready/hết hạn |

Auth/customer policy và lỗi envelope dùng chung với API. Frontend không tự retry POST; HTTPprovider không retry các lần gọi có thể tính phí. Thử nghiệm tự động dùng SQLite/account tổng hợp/HTTPhandler giả, không gọi OpenAI thật.

| POST `/api/v1/mascot-ai/generations/{id}/apply` | Lưu atlas WebP đã preview; thay slot cũ trong transaction; cùng owner |
| GET `/api/v1/mascot-ai/slot/result` | Artwork WebP của slot đang áp dụng, kể cả khi AI bị tắt |
| DELETE `/api/v1/mascot-ai/slot/{id}` | Xóa slot của owner và bản sửa đang chờ, giữ quota ngày |

Khi chỉnh sửa không chọn ảnh mới, artwork hiện có được gửi làm tham chiếu sau khi người dùng xác nhận. Saved mascot không bị dọn sau7ngày/30ngày; thời hạn chỉ áp dụng cho kết quả chưa áp dụng và record không còn chiếm slot.
