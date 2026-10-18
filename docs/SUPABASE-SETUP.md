# Supabase ntc — cấu hình local và tài khoản test

> 2026-10-18 | CURRENT: Supabase đã áp dụng đủ3EF migrations, pending0; đã tạo5Identity accounts,25notes và15labels. Kết nối VerifyFull giữ CA local; chi tiết bằng chứng ở worklog.

## Project và kiến trúc

Organization kunheo, project ntc, reference nxqupzwqawujtgeuvvcj; URL https://nxqupzwqawujtgeuvvcj.supabase.co theo người dùng cung cấp. Giữ .NET Identity, API .NET truy cập PostgreSQL bằng Npgsql; không chuyển auth sang Supabase Auth, không dùng publishable key cho DB connection. Publishable key người dùng cung cấp không cần đưa vào React cho kiến trúc này.

User cung cấp session pooler host aws-0-ap-northeast-1.pooler.supabase.com, port5432, database postgres, user postgres.nxqupzwqawujtgeuvvcj. Script dùng session mode cho backend lâu dài/IPv4, pool size10 và TLS VerifyFull. Connection string builder xử lý password có dấu chấm phẩy/quote/#, không cần URL-encode thủ công. Nếu direct IPv6 phù hợp thì provider đã hỗ trợ direct, nhưng script hiện giữ session endpoint do user cung cấp. Không dùng transaction port6543 cho EF schema setup.

## Cách chuẩn dùng chung với Marixa — User Secrets

Theo yêu cầu mới của người dùng, ưu tiên [lệnh chung .NET/Supabase](SUPABASE-DOTNET-COMMANDS.md). API NTC đã có UserSecretsId; dùng dotnet user-secrets init/set như Marixa. Chỉ đổi API csproj, host và user theo project. Profile/script riêng phía dưới vẫn là tùy chọn, không bắt buộc. User Secrets trong Development có ưu tiên cao hơn appsettings local; khi đã đặt provider PostgreSQL thì dotnet run thông thường cũng dùng PostgreSQL.

### Tạo schema và5test accounts khi dùng User Secrets

Sau khi lưu kết nối theo runbook chung, đặt thêm metadata target và chọn mật khẩu test riêng. Khối này dành riêng cho NTC, không phải seed chung cho Marixa:

```powershell
cd 'D:\My Project\NTC'
$Api = '.\ntc_aspnet\NTC.API\NTC.API.csproj'
dotnet user-secrets set 'Supabase:ProjectRef' 'nxqupzwqawujtgeuvvcj' --project $Api
dotnet user-secrets set 'Supabase:SessionPoolerHost' 'aws-0-ap-northeast-1.pooler.supabase.com' --project $Api
$DemoSecure = Read-Host 'Choose demo password, at least16characters (hidden)' -AsSecureString
$DemoPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DemoSecure)
try {
    @{ 'DemoAccounts:Password' = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($DemoPointer) } | ConvertTo-Json | dotnet user-secrets set --project $Api
    if ($LASTEXITCODE -ne 0) { throw 'Saving demo password failed.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($DemoPointer)
    $DemoSecure.Dispose()
}
$DemoPrevious = [Environment]::GetEnvironmentVariable('DemoAccounts__Enabled', 'Process')
try {
    $env:DemoAccounts__Enabled = 'true'
    dotnet run --project $Api --launch-profile https -- --initialize-supabase --seed-test-accounts
    if ($LASTEXITCODE -ne 0) { throw 'Supabase setup/seed failed.' }
} finally {
    if ($null -eq $DemoPrevious) { Remove-Item Env:DemoAccounts__Enabled -ErrorAction SilentlyContinue }
    else { $env:DemoAccounts__Enabled = $DemoPrevious }
}
```

Login5emails trong bảng dưới bằng password test vừa chọn. Dùng lại đúng password đó khi rerun để không reset account có sẵn. CLI chuẩn dùng password đã lưu User Secrets; đợt provisioning thực tế cũng đã ghi manifest private `artifacts/supabase/test-accounts.local.json` để chủ dự án xem thông tin đăng nhập. API config JWT/SMTP/Google vẫn theo config riêng hiện có, project mới cần cấu hình các key tương ứng.

## Tùy chọn script riêng NTC — copy chạy lần đầu

PowerShell từ bất kỳ thư mục nào trên máy hiện tại; cần .NET8 SDK và mạng ra endpoint Supabase:

```powershell
Set-Location 'D:\My Project\NTC'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Use-Supabase.ps1 -Configure -Initialize -SeedTestAccounts
```

Nhập **database password** vào dòng hỏi ẩn. Đây là password đã đặt khi tạo Supabase project, không phải publishable key, mật khẩu tài khoản website Supabase hay mật khẩu của 5 user test. Nếu quên, dùng Database Settings của project để đổi/reset sau khi kiểm consumer đang dùng; script không tự reset password.

Lệnh lưu profile riêng bị Git ignore, kiểm đúng project/user/port/TLS, kết nối và apply các EF migrations PostgreSQL hiện có vào schema ntc nếu schema mới. Nếu ntc đã có bảng nhưng còn migrations chưa apply, lệnh dừng để review bảo toàn dữ liệu. Không import/xóa/sửa dữ liệu SQL Server; không đổi các appsettings SQL Server/Razor local. Sau schema sẵn sàng, lệnh mới seed và ghi file mật khẩu test; không ghi nhận thành công nếu dotnet trả lỗi.

Nếu VerifyFull báo không tin cậy certificate, tải CA từ mục SSL của Database Settings project, lưu ở máy rồi chạy lại với `-CertificatePath 'C:\path\supabase-ca.crt'`. Không tắt TLS hoặc bật Trust Server Certificate để bỏ kiểm chứng. Script nhớ đường dẫn certificate đã lưu qua lần Configure sau.

## Năm tài khoản đăng nhập

| Email | Role |
| --- | --- |
| admin@ntc.example.test | Admin + User |
| user01@ntc.example.test | User |
| user02@ntc.example.test | User |
| user03@ntc.example.test | User |
| user04@ntc.example.test | User |

Password test sinh ngẫu nhiên trong profile local, dùng chung cho5account để tiện test; không hardcode trong Git và không tự đổi khi chạy lại Configure. Các email .test là dữ liệu giả, accounts được explicit operator xác minh để login ngay; không gửi email. Sau seeding thành công, đọc:

```powershell
Get-Content 'D:\My Project\NTC\artifacts\supabase\test-accounts.local.json'
```

Đây là accounts .NET Identity trong ntc.AspNetUsers, không hiển thị trong Supabase Authentication → Users. Script chỉ tạo tài khoản còn thiếu có marker Identity claim; account trùng email không thuộc seed hoặc khác password/locked/deleted sẽ dừng, không nhận làm demo hay reset/unlock/promote. Transaction + PostgreSQL advisory lock bảo vệ hai lần chạy đồng thời. Admin vẫn không xem được nội dung note tài khoản khác. Seed CLI yêu cầu Development/Testing và explicit DemoAccounts:Enabled=true; không có HTTP seed endpoint hoặc auto-seed startup.

## Ghi chú mẫu đã tạo

Mỗi account có4notes đang dùng và1note trong Trash: Welcome to NoteTatCa (ghim, rich text/màu chữ), Getting started checklist (checklist), Ideas for the weekend (plain text), note không tiêu đề và Restore me from Trash. Có3labels riêng Personal/Work/Ideas, mỗi note gắn1label cùng owner; tổng25notes/15labels/25links. Nội dung UI mẫu tiếng Anh. Không tạo lịch/email mẫu nên không phát sinh gửi mail.

Seeder ghi marker Identity claim riêng cho content, cùng transaction với tài khoản và advisory lock. Chạy lại không nhân bản hoặc khôi phục/ghi đè note đã được chủ tài khoản chỉnh sửa/xóa; tài khoản seed cũ chưa có content marker sẽ được bổ sung mẫu một lần. Không seed vào tài khoản thật trùng email.

## Chạy API và React sau setup

Terminal1:

```powershell
Set-Location 'D:\My Project\NTC'
$env:BackgroundJobs__Enabled = 'false'
dotnet run --project .\ntc_aspnet\NTC.API\NTC.API.csproj --launch-profile https
```

Terminal2:

```powershell
Set-Location 'D:\My Project\NTC'
npm --prefix ntc_react run dev
```

Mở http://127.0.0.1:5173; API Supabase ở HTTP localhost:5032 để Vite proxy dùng như hiện tại. Nếu5173/5032 đang được app khác dùng, dừng process đó trước. Muốn quay về SQL Server: dừng terminal API Supabase; nếu đã đặt PostgreSQL qua User Secrets thì remove hai key provider/connection theo runbook chung trước. Sau đó chạy `dotnet run --project ntc_aspnet/NTC.API --launch-profile https` như cũ. Profile chỉ set environment trong child process và restore caller environment khi kết thúc.

Với User Secrets hiện tại, chỉ kiểm lại kết nối/schema, không seed/migrate: `dotnet run --project .\ntc_aspnet\NTC.API\NTC.API.csproj --launch-profile https -- --check-supabase`. Script Use-Supabase tùy chọn cần profile local riêng đã Configure; không cần tạo thêm profile để dùng User Secrets.

## File private và giới hạn

- `ntc_aspnet/NTC.API/appsettings.Supabase.Local.json`: connection string/JWT key/demo password local; Git ignore `**/appsettings.*.Local.json`. Không publish hoặc gửi file này.
- `artifacts/supabase/test-accounts.local.json`: chỉ ghi sau seed thành công; nằm ngoài Git. Test harness dùng artifacts subfolder riêng và dotnet giả, không phải cloud accounts.
- Schema ntc giữ EF migration history riêng; setup thu hồi schema/table/sequence access của PUBLIC/anon/authenticated. Không thêm schema ntc vào exposed Data API; nếu bật Data API về sau phải review grants/RLS đúng kiến trúc, không dùng auth.uid() cho Identity JWT tùy tiện.
- Chưa đổi SQLServer→PostgreSQL data thật; giữ nguyên account/note cũ. Supabase demo accounts là dữ liệu mới, không thay migration bảo toàn dữ liệu.
- Backend hiện dùng owner database role do người dùng cung cấp cho setup/test; production cần runtime role quyền tối thiểu, migration credential riêng, backups và jobs/SMTP/Google review. BackgroundJobs vẫn false.
- Connector project lookup trước đây trả permission error; kết nối PostgreSQL trực tiếp bằng User Secrets hiện đã xác minh và provisioning thành công. Không deploy hoặc reset project trong tác vụ này.

Nguồn chính thức: [kết nối và session pooler](https://supabase.com/docs/guides/database/connecting-to-postgres), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [SSL](https://supabase.com/docs/guides/database/ssl-enforcement).

## Kết nối thực tế đã xác minh — 2026-10-18

User Secrets đã có password và target đúng. Máy Windows ban đầu không trust Supabase Root2021 CA nên VerifyFull thất bại trước authentication. Đã tải CA public, lưu %LOCALAPPDATA%/NoteTatCa/certificates/supabase-prod-ca-2021.crt, thêm Root Certificate vào MyCnn trong User Secrets và giữ VerifyFull; không cài trust store toàn máy. Kiểm lại --check-supabase bằng settings đã lưu PASS, còn3migrations pending. Giữ file CA này khi dọn artifacts/repo; máy khác cần tải/cấu hình đường dẫn CA riêng. MCP connector permission error cũ không phản ánh Npgsql credentials: kết nối DB trực tiếp hiện đã PASS. Kiểm tra này không apply migration/seed hoặc verify triển khai API/cloud/SMTP/Google.

Sau yêu cầu provisioning tiếp theo cùng ngày, cả3migrations đã apply/pending0 và5accounts/25notes/15labels đã tạo. HTTP API→Supabase đăng nhập/đọc dữ liệu5accounts và admin owner404 PASS; phiên verification đã thu hồi. Mốc3pending ở đoạn trước là trạng thái lịch sử của lần kiểm tra kết nối ban đầu.
