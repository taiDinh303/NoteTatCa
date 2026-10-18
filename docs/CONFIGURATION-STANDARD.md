# Chuẩn cấu hình chung — ASP.NET Core và React

> 2026-10-18 | CURRENT trong source của NTC và Marixa; dashboard đã lưu các thay đổi theo worklog, chưa deploy source mới. Tài liệu này quản lý quy ước; [17](17-environment-config.md) liệt kê chính sách riêng, [worklog](worklog.md) ghi bằng chứng chạy.

## 1. Phong cách được chọn

Dùng **JSON an toàn + biến môi trường theo nơi triển khai + User Secrets cho máy lập trình**. Số biến Render phụ thuộc tính năng; không cố ép mọi ứng dụng có đúng bốn biến.

| Nơi | Chứa gì | Không chứa gì |
| --- | --- | --- |
| API appsettings.Production.json | Logging, issuer/audience, TTL và cờ tính năng an toàn theo nghiệp vụ | Mật khẩu DB, JWT signing key, SMTP/Storage secret, URL giả |
| API User Secrets | Provider/kết nối local, JWT và credential dùng khi Development | Secret của dự án khác |
| Render Environment | Sáu biến triển khai cơ bản; thêm biến cho tính năng bật | Secret frontend hoặc cấu hình dev |
| React .env.local | VITE_API_BASE_URL public, API_PROXY_TARGET chỉ dev server | DB/JWT/SMTP/Storage key |
| Vercel Production Config | VITE_API_BASE_URL tuyệt đối HTTPS | Secret backend; Preview không tự dùng production DB/API |
| deploy/project.json | Project paths, URL public, service/team/project/ref đúng repo | Credential; file này không tự cấu hình tài nguyên cloud |
| artifacts/ | Bản xuất private và bằng chứng kiểm thử, bị Git ignore | File cần commit/chia sẻ công khai |

Thứ tự ASP.NET từ thấp đến cao: appsettings.json → appsettings theo environment → User Secrets chỉ Development → environment → command line. Backend không tự đọc .env. Tên env chuẩn UPPERCASE, hai dấu gạch dưới thay dấu hai chấm, ví dụ JWTSETTINGS__KEY tương ứng JwtSettings:Key. Chỉ giữ một casing cho mỗi key trên Linux.

Development hiện hữu vẫn dùng file local của chủ dự án; không ghi đè file đó khi áp chuẩn. Khi tạo project mới: base JSON chỉ có mặc định an toàn, secret để trống; cấu hình máy bằng User Secrets. dotnet publish và Docker của hai API chỉ mang appsettings.Production.json, loại các appsettings khác. Production không vô tình nhận credential local.

## 2. Biến cơ bản trên Render

| Key | Loại / giá trị |
| --- | --- |
| ASPNETCORE_ENVIRONMENT | Production |
| DATABASE__PROVIDER | SqlServer hoặc PostgreSQL; Supabase dùng PostgreSQL |
| CONNECTIONSTRINGS__MYCNN | Secret đúng provider/project, Production Supabase dùng VerifyFull |
| JWTSETTINGS__KEY | Secret riêng tối thiểu 32 byte UTF-8; giữ key cloud hợp lệ hiện có |
| CORS__ALLOWEDORIGINS__0 | Origin HTTPS frontend chính xác; thêm __1 nếu có frontend khác được phép |
| APPSETTINGS__CLIENTURL | URL HTTPS frontend dùng trong liên kết ứng dụng/email |

Chủ dự án chốt thêm BACKGROUNDJOBS__ENABLED=true cho cả hai và chuẩn bị Storage NTC. Bộ mẫu hiện có chín key khi đã có credential: sáu key nền ở bảng trên + BACKGROUNDJOBS__ENABLED + SUPABASE__URL + SUPABASE__SERVICE_KEY. Marixa đang dùng Storage; NTC chỉ dự phòng cho upload ảnh note sau này (reserveSupabaseStorage=true, supabaseStorage=false trong manifest), chưa có adapter/endpoint/bucket note được tạo bởi thay đổi cấu hình này.

Tên Render thống nhất SUPABASE__SERVICE_KEY; code Marixa vẫn hỗ trợ Supabase:ServiceKey và Supabase:Service_Key để giữ credential hiện hữu. Không tạo hai biến trỏ hai key khác nhau. NTC chưa có key thì không thêm env rỗng hoặc key giả; exporter chỉ xuất URL, cảnh báo và bỏ secret chưa có. Có thể lưu key NTC hợp lệ ngay trên Render để chuẩn bị, chưa được runtime upload sử dụng. Publishable key không thay DB password hoặc backend secret.

JWT issuer/audience/ExpirationMinutes, Swagger và cờ tạo dữ liệu mẫu lấy từ Production JSON ở cả hai repo; không khai báo lặp trên Render theo chuẩn mới. Giữ giá trị theo từng app (NTC NoteTatCa/NoteTatCa.Web/15; Marixa API/APIUser/60/remember10080). NTC DemoAccounts=false; Marixa dùng DatabaseInitialization/Seed=false cho cơ chế riêng. Không thêm DemoAccounts giả vào Marixa. Env chỉ ghi đè khi có quyết định override rõ; không đặt các key này thành rỗng. Swagger Production=false nên có thể bỏ SWAGGER__ENABLED khỏi dashboard. Với issuer/audience/TTL, chờ image mới có JSON trước khi bỏ env cũ.

Mẫu trong [render.env.example](../deploy/render.env.example), [vercel.env.example](../deploy/vercel.env.example), target trong [project.json](../deploy/project.json). render.yaml chỉ là tham chiếu service hiện hữu; sync Blueprint là một thao tác triển khai riêng, không suy rằng push Git tự sửa dashboard. Không dùng Blueprint để tạo thêm service hoặc chọn gói trả phí khi chỉ cần sửa cấu hình.

## 3. SQL Server, PostgreSQL và TLS

Đổi đồng thời Database:Provider và ConnectionStrings:MyCnn. SQL Server test dùng DB local riêng; PostgreSQL test dùng fixture loopback/container riêng. Dữ liệu thật và migration history được giữ nguyên; chuyển provider không đồng nghĩa tự chuyển dữ liệu/schema.

Supabase: Session pooler cổng 5432, đúng host/ref/user từ project.json; ưu tiên keyword/value để mật khẩu có ký tự đặc biệt được builder quote đúng. Production dùng SSL Mode=VerifyFull và CA public đã review. Docker copy CA đến /app/certificates/supabase-prod-ca-2021.crt; đường dẫn Windows chỉ dùng local. Không chữa TLS bằng cách tắt kiểm tra chứng chỉ. URI cũ vẫn có adapter tương thích; URI SSL Require không đạt yêu cầu Production mới.

Các lịch sử migration của mỗi app giữ nguyên; quy trình nâng schema/backup ở [23](23-data-migration.md). Server Production không tự initialize/seed. Khởi tạo dữ liệu là thao tác riêng có quyền và kiểm tra đúng đích.

## 4. Kiểm tra và chẩn đoán

Chạy cùng một lệnh PowerShell từ root của từng repo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Configuration.ps1
```

Mặc định Development, đọc User Secrets của đúng API theo manifest. API hỗ trợ --check-config: kiểm provider, connection syntax, JWT/options, URL/CORS và cờ môi trường rồi thoát; không mở DB, chạy worker, migration, seed hoặc gửi email. CONFIGURATION_OK chỉ xác nhận cấu hình tĩnh, không xác nhận password/DB/schema/email hoạt động. Testing là environment dành riêng cho fixture cô lập, không dùng để bỏ qua kiểm tra Production.

Production có thể kiểm bằng -Environment Production sau khi cung cấp biến của máy kiểm; script publish bản sạch rồi chạy check-config, không nạp User Secrets Development. CA phải tồn tại trên máy đang chạy. Không đem connection string của chủ dự án vào bộ test.

CONFIGURATION_INVALID liệt kê tên biến cần sửa, không in giá trị. CONFIGURATION_WARNING chỉ ra thiếu nơi lưu Data Protection keys bền; phải cấu hình keyring được bảo vệ trước recovery flow qua nhiều container/redeploy. --check-config còn chạy options validator hiện hữu; không sửa TTL/policy để làm kiểm tra qua.

Khi lỗi: kiểm environment → tên key/casing → nguồn ghi đè → URL/TLS/provider → health/live → health/ready → trace/correlation ID của request. Không dump toàn bộ config/env, không đưa token/query email vào log. Liveness chỉ xác nhận process; readiness mới chạm DB và vẫn không thay nghiệm thu tính năng.

Frontend dùng chung validator ở config/environment.mjs khi Vite khởi động/build. Báo đúng VITE_API_BASE_URL hoặc API_PROXY_TARGET khi sai scheme, API suffix, credentials/query/fragment. Vercel bắt buộc URL tuyệt đối HTTPS; build cùng origin vẫn hỗ trợ /api hoặc /api/v1. VITE_* được ghi vào bundle tại build, đổi Vercel env cần deployment mới. API_PROXY_TARGET không được xuất vào browser; tên NTC_API_PROXY_TARGET/VITE_API_PROXY_TARGET cũ chỉ giữ để chuyển tiếp local.

## 5. Các chính sách giữ riêng

| Chính sách | NTC | Marixa |
| --- | --- | --- |
| API suffix | /api/v1 | /api |
| JWT issuer / audience | NoteTatCa / NoteTatCa.Web | API / APIUser |
| Access TTL | 15 phút, refresh theo policy hiện hữu | 60 phút; remember 10080 phút |
| BackgroundJobs Production | true theo chủ dự án; reminder/email/purge/prune | true; worker ngày hiệu lực hiện hữu |
| Swagger Production | false | false |
| Auto init / seed Production | Không tự chạy; thao tác CLI tường minh | DatabaseInitialization/Seed false |
| Storage | URL/key dự phòng; upload ảnh note chưa triển khai | Ảnh attendance Supabase; tài liệu HR private vẫn cần storage bền |

Muốn đổi SMTP, Google, job, Swagger, keyring hoặc rate limit: dùng key đã được app hỗ trợ trong [17](17-environment-config.md), cập nhật ví dụ/docs và test tương ứng. Bật flag không tự tạo credential/hạ tầng. Không bật init/seed trong Production để chữa lỗi schema. Không để TEST environment hoặc preview dùng dịch vụ thật.

Phân tầng code giữ Core độc lập HTTP/EF, contracts độc lập persistence, business service dùng ICurrentUser/TimeProvider/repository; composition, validation và adapter cấu hình ở API. Dùng BaseService/BaseApiController cho phần dùng chung, service tường minh cho tính năng. Root .editorconfig chung dùng UTF-8/LF, C# bốn space, JS/TS/JSON hai space; áp dần khi sửa file, không reformat hàng loạt hoặc sửa cấu hình local của chủ dự án. CI và package engines cùng Node24, .NET8 giữ nguyên. Mỗi API giữ envelope/error code/route hiện hữu để frontend tương thích; lỗi vận hành dùng thông báo tổng quát và trace ID, chi tiết ở log đã che secret. Không đổi policy auth, role hoặc nghiệp vụ chỉ để hai repo giống tên.

## 6. Chuẩn bị file cloud riêng tư

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CloudEnvironment.ps1
```

Script đọc target public từ manifest, private PostgreSQL profile từ User Secrets, kiểm host/ref/5432/VerifyFull rồi xuất artifacts/deployment/render.env.local và các bản JSON. Không gọi DB/dashboard/deploy. Linux CA path được đặt riêng cho image; export signing key được giữ ổn định trong render-export-profile.local.json khi chạy lại. Nếu cloud đã có JWT hợp lệ khác, giữ cloud key; không import giá trị mới làm xoay khóa ngoài ý muốn.

Password có quote phức tạp: giữ JSON chính xác và bỏ .env cũ thay vì đoán escaping. Marixa chưa có Storage key trong User Secrets thì exporter cảnh báo, operator giữ key cloud hợp lệ hiện có. Không bắt buộc copy secret cloud về máy chỉ để xuất file. Local profile có thể dùng password khác cloud: exporter không tự biết điều đó; khi chỉnh TLS cho service đang có phải giữ credential cloud, không import đè connection/JWT từ profile local chưa đối chiếu. Mẫu và test script không chứa credential thật.

## 7. Chuyển từ cấu hình cũ và dùng làm mẫu

1. Review source/tests và production JSON; giữ nguyên giá trị secret cloud hợp lệ, backup cấu hình ngoài Git.
2. Bổ sung sáu biến nền, job=true và Storage URL/key riêng mỗi project (NTC key có thể để chưa khai báo khi chưa dùng). Giữ biến dư hiện tại để image cũ vẫn chạy. Không xóa chúng trước khi deploy image mới có production JSON/CA.
3. Khi được giao rollout: build/publish/image sạch → kiểm config trên target → nâng schema riêng nếu release cần → deploy API → kiểm live/ready/CORS/login/module/job → build frontend đúng API → browser smoke. Không tự chạy migration/seed từ --check-config.
4. Sau khi image mới hoạt động: bỏ env issuer/audience/TTL/demo/Swagger để dùng JSON defaults đã chốt. So giá trị trước khi bỏ; giữ Google flag nếu có chủ đích. Giữ BACKGROUNDJOBS__ENABLED=true và Storage key đúng mỗi project. Cleanup dashboard là thao tác riêng, chưa thực hiện ở đợt code.
5. Project mới: thay manifest, namespace, API suffix, issuer/audience, CA path nếu khác và policy tính năng; dùng cùng tên key, script và cách phân tầng. Không copy password/JWT/project ref mù quáng. Mỗi thay đổi phải cập nhật docs chủ quản và worklog với pass/fail/skip thực tế.

Kiểm thử: backend strict Release và HTTP/provider fixture cô lập; frontend npm test/build/lint; Test-CloudEnvironmentExport.ps1 dùng APPDATA giả, password giả, kiểm quoting/TLS path/stable key; Test-ProductionConfiguration.ps1 publish sạch rồi kiểm valid/invalid config với DB loopback giả, không kết nối. Evidence và phần chưa chạy ở worklog; build local không chứng minh hosting đã rollout.

Nguồn quy ước: [Microsoft configuration .NET 8](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-8.0), [Render environment variables](https://render.com/docs/configure-environment-variables), [Vite env and mode](https://vite.dev/guide/env-and-mode).

## 8. Job và ảnh note sau quyết định bổ sung

Bật job NTC tác động đến dispatch reminder, gửi email, purge note trong trash quá bảy ngày và prune identity; không chỉ là cờ giao diện. SMTP vẫn phải cấu hình để email gửi thành công, Free service ngủ không bảo đảm chạy đúng giờ. Đợt sửa source này không chạy API/job vào DB của chủ dự án hoặc gửi email thật. Khi được giao deploy, kiểm SMTP/timezone/dedup/catch-up/purge và monitoring theo nghiệp vụ hiện hữu; không suy bật true đồng nghĩa đã nghiệm thu.

Upload ảnh note là phạm vi tương lai đã được yêu cầu chuẩn bị cấu hình. Thiết kế phải giữ note private: bucket private, API kiểm owner, giới hạn file/signature/dung lượng, URL đọc có thời hạn hoặc stream qua API có quyền, vòng đời ảnh theo note/trash/xóa hẳn. Không copy bucket ảnh attendance public của Marixa. Chưa có migration/schema/endpoint/frontend upload trong đợt cấu hình này.
