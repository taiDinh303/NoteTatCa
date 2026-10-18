# 19 — CI/CD

> 2026-10-17 | CURRENT workflow đã tạo; GitHub run/deploy NOT RUN.

`../.github/workflows/backend.yml` tại root NTC chạy push/PR theo backend/docs/scripts/Docker/filter/tool config và workflow_dispatch. Quyền contents:read; actions pin commit SHA, runner Ubuntu, SDK8, PostgreSQL 17 service dữ liệu giả tách biệt. Không dùng prod secrets/database.

Pipeline: restore strict → Release build NTC.Backend.slnf warn-as-error → xUnit HTTP/provider tests + TRX → Python docs links → publish API → Docker build → upload TestResults dù fail. PostgreSQL fixture được cấp loopback admin conn, tự tạo/drop DB tên duy nhất. SQLLocalDB tests skip trên Linux. Artifact openapi export dùng NTC_ARTIFACT_DIR; không upload config local.

Chạy local đã có evidence ở [06](06-testing.md); chưa push workflow mới nên không ghi GitHub CI xanh. Docker CLI không có ở máy hiện tại nên Docker build chưa được xác minh; CI là cổng kiểm tiếp theo. Không có automatic deploy. render.yaml autoDeployTrigger=off, operator review release/migration rồi mới chọn deploy.

Khi sửa contract: export Swagger → regenerate scripts/update_api_inventory.py → cập nhật root docs duy nhất → check diff. Frontend workflow riêng frontend.yml đã thêm type/lint/unit/build/Chromium E2E và fixture .NET/SQLite; GitHub run chưa thực hiện. Preview/staging/prod tách DB và credentials. Không chạy migration phá dữ liệu trong PR workflow.

## Sau khi chuyển Git root

Workflow trigger ntc_aspnet/**, docs/**, scripts/** và root tool/Docker/workflow files. Restore/build/test/publish dùng ntc_aspnet/ prefix từ root; dotnet tool restore đọc .config ở root, artifacts/TestResults dùng đường dẫn root. Dockerfile build ntc_aspnet/NTC.API; .dockerignore loại ntc_aspnet/NTC.VIEW, ntc_aspnet/NTC.Tests, frontend/react và nested artifacts/config local. render.yaml giữ Docker context root. Chỉ kiểm source/local build/test trong task; chưa có Docker CLI hoặc GitHub run để xác nhận pipeline thật.
