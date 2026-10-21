# NoteTatCa

Cấu hình local/Production và quy ước dùng chung NTC/Marixa: [CONFIGURATION-STANDARD](docs/CONFIGURATION-STANDARD.md). Public deployment targets: [deploy/project.json](deploy/project.json).

Private note web app with an ASP.NET Core 8 API and .NET Identity.
Read [project docs](docs/00-README.md) and [architecture](ARCHITECTURE.md).

## Repository layout

Repository root: `D:\My Project\NTC`. There is one Git repository and one
maintained documentation directory. The React/TypeScript/Vite SPA lives in `ntc_react/`.
See [frontend implementation](docs/FRONTEND-IMPLEMENTATION.md).

```text
NTC/
  .git/
  .github/workflows/
  .config/dotnet-tools.json
  docs/                    # single documentation source
  scripts/
  ntc_aspnet/               # .NET projects and solutions
    NTC.sln
    NTC.Backend.slnf
    NTC.API/
    NTC.Repositories/
    NTC.Services/
    NTC.Tests/
    ...
  ntc_react/               # React TypeScript SPA
  Dockerfile
  render.yaml
  .env.example
  .gitignore
```

Do not recreate `ntc_aspnet/docs` or `ntc_aspnet/.git`. Git history and the original
remote are retained. Backend project references and solution paths stay relative
to `ntc_aspnet/`.

## Build and test

PowerShell from the repository root:

```powershell
dotnet tool restore
dotnet restore ntc_aspnet/NTC.Backend.slnf
dotnet build ntc_aspnet/NTC.Backend.slnf -c Release --no-restore -warnaserror
dotnet test ntc_aspnet/NTC.Tests/NTC.Tests.csproj -c Release --no-build
python scripts/verify_docs.py
```

Tests use synthetic SQLite and SQL Server LocalDB fixtures. Optional PostgreSQL
tests require `NTC_TEST_POSTGRES` pointing to a loopback `postgres` administration
database; the fixture creates and drops a unique `ntc_test_<guid>` database.
The backend solution filter excludes retained Razor from the strict build.

## Database and API

For local Development, set `Database:Provider` (`SqlServer` or `PostgreSQL`) and
`ConnectionStrings:MyCnn` in `ntc_aspnet/NTC.API/appsettings.Development.json` or
environment variables. Provider defaults to SQL Server. See [configuration](docs/17-environment-config.md).
`.env.example` lists environment keys; ASP.NET does not automatically load .env.

```powershell
# Generate scripts for review; these commands do not apply a migration.
dotnet ef migrations script --context DatabaseContext --project ntc_aspnet/NTC.Repositories --startup-project ntc_aspnet/NTC.API --output artifacts/sqlserver-migrations.sql
dotnet ef migrations script --context PostgreSqlDatabaseContext --project ntc_aspnet/NTC.Repositories --startup-project ntc_aspnet/NTC.API --output artifacts/postgresql-migrations.sql
# Start only against a separately prepared database:
dotnet run --project ntc_aspnet/NTC.API --launch-profile https
```

API profile: HTTPS 5033, HTTP 5032. Swagger is available in Development.
Startup does not migrate, seed or enable maintenance automatically.
SQL Server to PostgreSQL data transfer requires a separate preservation plan.

On a prepared database, explicit operator commands can bootstrap roles or grant
Admin to a verified account; see [local setup](docs/10-setup-local.md). No default
administrator password is created. `BackgroundJobs__Enabled=false` remains default.
Local configurations, accounts and notes must be preserved.

## Deployment

Dockerfile, .dockerignore, render.yaml and .github/ live at the repository root;
build Docker from here. API image builds `ntc_aspnet/NTC.API` and excludes all
appsettings files, retained Razor, tests, frontend and local artifacts.
Supply DB/JWT/Google/SMTP settings through the hosting secret store. Actual Docker,
cloud deployment and external-provider verification remain separate release checks.

## Run React

```powershell
npm --prefix ntc_react ci
# Start API in another terminal against a separately prepared local DB.
npm --prefix ntc_react run dev
```

Open http://127.0.0.1:5173; development proxy targets API HTTP5032.
See [React setup, architecture and synthetic browser tests](ntc_react/README.md).

## Shared Supabase configuration commands

For the same dotnet user-secrets workflow as Marixa and future .NET projects,
see [shared commands and concrete examples](docs/SUPABASE-DOTNET-COMMANDS.md).
NTC.API now has its own UserSecretsId. Development secrets override local JSON;
remove the provider/connection secret keys to return to the existing SQL Server
configuration. Schema setup and test-account provisioning remain explicit NTC
operator commands documented in [Supabase setup](docs/SUPABASE-SETUP.md).

## Render and Vercel

See [dashboard configuration and rollout limits](docs/RENDER-VERCEL-SETUP.md).
Render uses the root Dockerfile/context and a public Supabase CA; Vercel uses
ntc_react, Node24 and the production API endpoint ending in /api/v1.
Export private values with scripts/Export-CloudEnvironment.ps1; outputs stay
under ignored artifacts/deployment. Saving settings does not deploy new source.
