# Lệnh chung .NET + Supabase để dùng lại

> Cập nhật 2026-10-18. Một quy trình development cho NTC và Marixa: User Secrets + Npgsql keyword/value + Session pooler + TLS VerifyFull. Các lệnh cấu hình không migrate/seed; việc khởi động API có tác động riêng theo từng project.

## 1. Hai project, một cách cấu hình

| Thuộc tính | NTC | Marixa |
| --- | --- | --- |
| Root | D:/My Project/NTC | D:/My Project/marixa_aspnet_react |
| API | ntc_aspnet/NTC.API/NTC.API.csproj | marixa_aspnet/M.API/M.API.csproj |
| Project ref | nxqupzwqawujtgeuvvcj | zphqfcwrwitrqdeueonu |
| Session host | aws-0-ap-northeast-1.pooler.supabase.com | aws-0-ap-northeast-2.pooler.supabase.com |
| Username | postgres.nxqupzwqawujtgeuvvcj | postgres.zphqfcwrwitrqdeueonu |
| Database / port | postgres / 5432 | postgres / 5432 |
| CA local | %LOCALAPPDATA%/NoteTatCa/certificates/supabase-prod-ca-2021.crt | %LOCALAPPDATA%/Marixa/certificates/supabase-prod-ca-2021.crt |

Cả hai đọc `Database:Provider=PostgreSQL` và `ConnectionStrings:MyCnn`. Dùng dạng `Host=...;Port=...;Database=...;Username=...;Password=...;SSL Mode=VerifyFull;Root Certificate=...;Maximum Pool Size=10`. Không cần dùng URI PostgreSQL cho cấu hình mới; adapter URI cũ vẫn được giữ để tương thích.

Session pooler 5432 phù hợp API chạy lâu dài và mạng IPv4. Copy host/user từ Connect của đúng Supabase project; không suy host theo region. Mật khẩu database của hai project độc lập, không lấy password NTC cho Marixa hoặc ngược lại.

## 2. Khối lệnh duy nhất — chọn Marixa hoặc NTC

Đổi đúng dòng `$TargetName` thành `Marixa` hoặc `NTC`, rồi chạy cả khối trong PowerShell. Nhập database password khi được hỏi; password không nằm trong lịch sử câu lệnh hay command arguments của dotnet. User Secrets vẫn là file development ngoài repo, không mã hóa at-rest.

CA phải có trước khi chạy. Hai file CA trên máy hiện tại đã dùng để xác minh kết nối tương ứng. Máy khác: tải CA từ Database Settings của đúng project, lưu đúng đường dẫn trong bảng hoặc sửa `Ca` bên dưới; không tắt certificate validation để chữa lỗi.

```powershell
$TargetName = 'Marixa' # Đổi thành 'NTC' khi cấu hình NTC.
$Targets = @{
    Marixa = @{
        Root = 'D:\My Project\marixa_aspnet_react'
        Api = 'marixa_aspnet\M.API\M.API.csproj'
        Host = 'aws-0-ap-northeast-2.pooler.supabase.com'
        User = 'postgres.zphqfcwrwitrqdeueonu'
        Ca = Join-Path $env:LOCALAPPDATA 'Marixa\certificates\supabase-prod-ca-2021.crt'
    }
    NTC = @{
        Root = 'D:\My Project\NTC'
        Api = 'ntc_aspnet\NTC.API\NTC.API.csproj'
        Host = 'aws-0-ap-northeast-1.pooler.supabase.com'
        User = 'postgres.nxqupzwqawujtgeuvvcj'
        Ca = Join-Path $env:LOCALAPPDATA 'NoteTatCa\certificates\supabase-prod-ca-2021.crt'
    }
}
if (-not $Targets.ContainsKey($TargetName)) { throw 'Chọn Marixa hoặc NTC.' }
$Target = $Targets[$TargetName]
$Api = Join-Path $Target.Root $Target.Api
if (-not (Test-Path -LiteralPath $Api -PathType Leaf)) { throw 'Không tìm thấy API project.' }
if (-not (Test-Path -LiteralPath $Target.Ca -PathType Leaf)) { throw 'Cần tải CA của Supabase trước.' }

dotnet user-secrets init --project $Api
if ($LASTEXITCODE -ne 0) { throw 'Không khởi tạo được User Secrets.' }
$DbSecure = Read-Host 'Database password (hidden)' -AsSecureString
$DbPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbSecure)
$DbBuilder = New-Object System.Data.Common.DbConnectionStringBuilder
$PreviousOutputEncoding = $OutputEncoding
try {
    $DbBuilder['Host'] = $Target.Host
    $DbBuilder['Port'] = '5432'
    $DbBuilder['Database'] = 'postgres'
    $DbBuilder['Username'] = $Target.User
    $DbBuilder['Password'] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($DbPointer)
    $DbBuilder['SSL Mode'] = 'VerifyFull'
    $DbBuilder['Root Certificate'] = $Target.Ca
    $DbBuilder['Maximum Pool Size'] = '10'
    $Settings = @{
        'Database:Provider' = 'PostgreSQL'
        'ConnectionStrings:MyCnn' = $DbBuilder.ConnectionString
    }
    if ($TargetName -eq 'Marixa') {
        $Settings['DatabaseInitialization:Enabled'] = 'false'
        $Settings['Seed:Enabled'] = 'false'
    }
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $Settings | ConvertTo-Json | dotnet user-secrets set --project $Api
    if ($LASTEXITCODE -ne 0) { throw 'Không lưu được User Secrets.' }
} finally {
    $OutputEncoding = $PreviousOutputEncoding
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($DbPointer)
    $DbSecure.Dispose()
    $DbBuilder.Clear()
    $Settings = $null
}
```

`init` giữ UserSecretsId đã có; `set` cập nhật các key được gửi, giữ JWT/SMTP/Google/Storage và secret khác. Builder xử lý password có dấu chấm phẩy, quote, ký tự đặc biệt; không tự ghép password vào URI.

Marixa Development mặc định có thể initialize/seed. Vì vậy khối chung tắt `DatabaseInitialization:Enabled` và `Seed:Enabled` khi trỏ cloud. NTC hiện dùng explicit operator CLI cho initialize/seed, xem [setup NTC](SUPABASE-SETUP.md). Không có lệnh migration/seed chung cho mọi repo. Đặc biệt không chạy `dotnet ef database update` trần với giả định design-time factory tự đọc owner secrets.

## 3. Sau khi lưu và khi deploy

- User Secrets được WebApplication.CreateBuilder đọc trong Development. Chạy API bằng launch profile Development của từng repo; không bật Development trên production chỉ để đọc secrets.
- Environment/command-line có thể ghi đè User Secrets. Nếu terminal đã đặt biến provider/connection khác, dùng terminal mới hoặc xử lý đúng override trước khi chạy. Không dùng connection cloud cho unit/integration tests.
- Lưu cấu hình không tạo schema/tài khoản. Khởi động API lại có thể chạy nghiệp vụ nền: Marixa có worker áp hồ sơ đến ngày hiệu lực. Lần chuẩn hóa này chỉ mở Npgsql trong transaction read-only, không khởi động API.
- Render/container dùng `Database__Provider`, `ConnectionStrings__MyCnn` và config riêng của hosting. Cùng dạng keyword/value, nhưng `Root Certificate` phải trỏ file CA có trong container; không copy đường dẫn C:/Users/... từ máy Windows sang Render. Lần này không sửa env hoặc deploy hosting.
- Không in/share `dotnet user-secrets list`: nó chứa password/JWT/secret. Không dùng `user-secrets clear` để chuyển DB vì sẽ xóa cả config không liên quan. Muốn quay SQL Server, chọn cấu hình local riêng và xử lý các key override cùng hai cờ init/seed theo mục đích.

## 4. Database, API key và Storage là các phần khác nhau

Publishable key `sb_publishable_...` không phải database password và không dùng để đăng nhập Npgsql. Cả hai ứng dụng vẫn dùng .NET Identity/JWT. NTC dùng Supabase làm PostgreSQL cho notes; Marixa còn có Storage ảnh public `marixa-photos`, cần cấu hình server `Supabase:Url`/`Supabase:ServiceKey` riêng. Không dùng publishable key thay ServiceKey upload; không đưa secret/service-role key vào React. Tài liệu HR của Marixa vẫn private, không đưa vào bucket ảnh public.

Lệnh Node migration cũ trong Marixa_Workforce/react và ref `lasdnfytejntonjfkspv` không thuộc NTC hoặc marixa001. Không dùng nó để cập nhật hai project trong bảng. Migration phải theo đúng source, provider và quyền đã cấp, giữ lịch sử/dữ liệu cũ.

## 5. Bằng chứng và phạm vi

NTC: đã xác minh kết nối Npgsql read-only với VerifyFull + CA theo worklog; không suy ra migrations/accounts đã tạo. Cấu hình NTC và các thay đổi code đang có được giữ nguyên trong lượt chuẩn hóa Marixa.

Marixa 18/10/2026: chuyển connection local hiện hữu từ URI sang keyword/value, giữ host/user/database/password, dùng VerifyFull/CA riêng/pool 10 và tắt auto initialize/seed. Đọc lại secrets đã lưu và mở kết nối thành công, truy vấn metadata trong transaction read-only; các secret khác giữ nguyên. Có backup User Secrets bằng DPAPI ngoài Git. Không migrate/seed, sửa dữ liệu, chạy API hoặc deploy từ bước cấu hình này. Khối PowerShell được parse/kiểm builder bằng dữ liệu giả; không nhập lại password thật để chạy toàn khối tương tác.

Nguồn: [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [Npgsql TLS](https://www.npgsql.org/doc/security.html), [Microsoft User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-8.0). CA public riêng không được cài vào trust store toàn máy.