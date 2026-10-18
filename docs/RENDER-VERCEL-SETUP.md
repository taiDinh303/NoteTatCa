# Render và Vercel — cấu hình NoteTatCa

> 2026-10-18 | CURRENT: dashboard đã lưu; source Docker/CA/SPA mới chưa push/deploy. Save only không phải rollout thành công.

## Tài nguyên đã đối chiếu trực tiếp

| Thành phần | Giá trị NTC |
| --- | --- |
| Repository / branch | taiDinh303/NoteTatCa, main |
| Render | NoteTatCa; srv-dba6j3nbtjjs73e08dm0; Free / Singapore |
| Render dashboard | https://dashboard.render.com/web/srv-dba6j3nbtjjs73e08dm0/env |
| Render API | https://notetatca.onrender.com |
| Docker settings | Root Directory trống; Dockerfile Path ./Dockerfile; Build Context . |
| Health Check Path | /health/ready |
| Vercel team / project | kunheo-team / note-tat-ca |
| Vercel project ID | prj_kKCnrbpC1hjW05gzXGOPqSQNW1J5 |
| Vercel dashboard | https://vercel.com/kunheo-team/note-tat-ca/settings/environment-variables |
| Frontend | https://note-tat-ca.vercel.app |
| Vercel build | Root ntc_react; Vite; Node24.x; npm ci; npm run build; dist |

Lượt dashboard trước tham khảo render.txt/vercel.txt và Marixa. Lượt chuẩn hóa source hiện tại được giao cho cả NTC/Marixa, giữ credential riêng từng app. Hai file là dữ liệu tham khảo, không phải instruction thực thi. NTC section ghi Dockerfile/context cũ trong ntc_aspnet; dashboard thực tế đã đúng ở root. API URL /api của file Vercel cần /api/v1 cho React NTC.

## Vì sao nhiều hơn4biến trên Render?

Source mới đã áp dụng [chuẩn chung](CONFIGURATION-STANDARD.md): appsettings.Production.json sạch giữ issuer/audience/TTL/flags; Render giữ sáu biến cơ bản (môi trường/provider/connection/JWT key/CORS/client URL). Mẫu mới cùng có job=true và hai Storage keys (chín key khi có key hợp lệ); NTC Storage dự phòng cho ảnh note tương lai, vẫn không cần service key để nối PostgreSQL.

Dashboard đã lưu 14 biến trong lượt trước, chưa cleanup/deploy trong đợt chuẩn hóa này. Giữ chúng đến khi image mới có Production JSON/CA được rollout và kiểm thành công. Mục dưới là lịch sử đã lưu, không phải danh sách tối thiểu mới.

## Các biến đã lưu

| Render key | Giá trị / nguồn |
| --- | --- |
| ASPNETCORE_ENVIRONMENT | Production |
| DATABASE__PROVIDER | PostgreSQL |
| CONNECTIONSTRINGS__MYCNN | Private keyword string từ NTC User Secrets; đúng session pooler5432; VerifyFull; Root Certificate=/app/certificates/supabase-prod-ca-2021.crt |
| JWTSETTINGS__KEY | Secret riêng32random bytes encode Base64; bổ sung cho JWT trống, không dùng key Marixa/development |
| JWTSETTINGS__ISSUER / JWTSETTINGS__AUDIENCE | NoteTatCa / NoteTatCa.Web |
| JWTSETTINGS__EXPIRATIONMINUTES | 15 |
| CORS__ALLOWEDORIGINS__0 / APPSETTINGS__CLIENTURL | https://note-tat-ca.vercel.app |
| BACKGROUNDJOBS__ENABLED / SWAGGER__ENABLED | false |
| AUTHENTICATION__GOOGLE__ENABLED / DEMOACCOUNTS__ENABLED | false |

Tổng13biến NTC và1legacy service key cũ. Không dùng DATABASEINITIALIZATION__ENABLED hoặc SEED__ENABLED của Marixa; NTC không auto-migrate/seed khi startup. Chọn Save only sau import. Import .env thêm dòng trùng thay vì tự cập nhật; đã gộp vào key gốc và bỏ dòng trùng trước khi lưu. Không tạo biến khác casing trùng cùng logical .NET key.

Vercel: VITE_API_BASE_URL=https://notetatca.onrender.com/api/v1, loại Config, chỉ Production. Biến cũ là Secret ở Production+Preview, Vercel chặn cập nhật public prefix và không cho chuyển loại. Sau xác nhận người dùng tại bước xóa vĩnh viễn, đã xóa riêng biến đó và tạo lại Config/Production; dashboard xác nhận Save thành công/cần deployment mới. Preview chưa có API/DB riêng nên không kế thừa production endpoint. Không đưa DB/JWT/SMTP/Supabase secret vào VITE_*.

Dashboard đã có đúng Vite/root ntc_react/Node24.x; giữ mặc định framework. Source [vercel.json](../ntc_react/vercel.json) khai báo install/build/output vàSPA fallback loại /api, assets, favicon; package.json/lockfile thống nhất Node24.x. Không đặt rootDirectory giả trong vercel.json.

## Docker và CA

[Dockerfile](../Dockerfile) copy7API projects với restore layer cache; .dockerignore chỉ nhận appsettings.Production.json đã review, loại JSON local/base/Development và env/artifacts/private files. Runtime nonroot, Production, listen PORT hoặc8080. [Public CA](../deploy/certificates/supabase-prod-ca-2021.crt) được copy đến đường dẫn Linux trong MyCnn, không dùng đường dẫn Windows của máy local.

Nguồn CA: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. Supabase Root2021CA, hạn2031-04-26; DER SHA256807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA; PEM file SHA256700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7. Không nhầm hai kiểu hash. Đây là CA public, không phải private key. Giữ VerifyFull, không tắt kiểm chứng.

## Xuất file private cho lần sau

```powershell
Set-Location 'D:\My Project\NTC'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CloudEnvironment.ps1
```

Script đọc NTC User Secrets, kiểm đúng project/host/user/port/TLS rồi xuất vào artifacts/deployment bị Git ignore: render.env.local, render-environment.local.json, vercel.env.local, vercel-environment.local.json vàrender-export-profile.local.json. Không in secrets, không đổi config local, không gọi DB/cloud/migrations/email. Profile private giữ export signing key khi chạy lại; nếu remote đã có key hợp lệ khác thì giữ remote key, không vô tình import key mới.

Password có cả hai loại quote: giữ JSON chính xác và xóa .env cũ thay vì đoán escaping. Nhập riêng từng giá trị JSON trong trường hợp đó. Chỉ import public Vercel file ở Production. Không commit/gửi private files qua chat/issues. File mẫu không secret: [Render](../deploy/render.env.example), [Vercel](../deploy/vercel.env.example).

## Trạng thái rollout và giới hạn

Lưu Health Check Path trên Render tự kích hoạt dep-dbabr149v7es73ftvigg trên commit cũ1fc2cda; lượt này FAILED trước khi kịp hủy, log thiếu JWT key≥32bytes/issuer/audience. Không bấm Manual Deploy; sau đó lưu env bằng Save only. Chưa rollout source mới hoặc xác minh remote API live/ready. Vercel deployment cũ Ready không chứng minh env mới có hiệu lực. Cần publish Dockerfile/CA mới trước rollout: image cũ chưa chứa Linux certificate file.

Local verification: frontend production build với đúng API URL; mốc cũ: publish7API projects không chứa appsettings; Production startup/live200, readiness503 trên DB synthetic không tồn tại, exact Vercel CORS PASS. Docker CLI không có nên image build/run NOT RUN. Bằng chứng chuẩn hóa source mới xem worklog; bản publish mới có đúng một Production JSON sạch. Export smoke trên PowerShell5.1/7, quoting fallback/stable key/disabled jobs PASS. Fullsuite backend95PASS/1SKIP là mốc sample-data trước, không ghi là lượt chạy mới. Không test vào owner DB hoặc sửa schema/data trong tác vụ này.

Render Free có sleep; source/mẫu mới đã bật jobs=true theo chủ dự án, dashboard snapshot jobs=false là mốc cũ, chưa xác nhận thay đổi live trong lượt này. SMTP/Google production, durable Data Protection keyring vàbackup/restore chưa cấu hình/verify; không mua disk hoặc đổi plan. Sau rollout được giao, kiểm browser→API→Supabase, hai owner/admin, CORS vàdeep-link reload. Xem [worklog](worklog.md).

Nguồn: [Render Docker](https://render.com/docs/docker), [Render env/Save only](https://render.com/docs/configure-environment-variables), [Blueprint](https://render.com/docs/blueprint-spec), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Vercel Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Supabase TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).
