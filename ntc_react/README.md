# NoteTatCa React

English SPA for the .NET 8 API in `../ntc_aspnet`. Retained Razor remains unchanged. The maintained project specification is [root docs](../docs/FRONTEND-IMPLEMENTATION.md).

One login serves two separate areas. Administrators open `/admin/overview` with accounts, roles, audit, statistics and their own profile/security/session settings. The Admin role takes precedence over User; administrators have no personal notes workspace, labels, reminders or inbox. Ordinary accounts use `/notes`. Matching API policies enforce this boundary; update the backend alongside this frontend. Existing data is retained.

## Run locally

Node.js 24 and .NET 8 SDK are used for verification. From repository root in PowerShell:

```powershell
npm --prefix ntc_react ci
Copy-Item ntc_react/.env.example ntc_react/.env.local
# Terminal 1: start API only against your separately prepared local database.
dotnet run --project ntc_aspnet/NTC.API --launch-profile https
# Terminal 2:
npm --prefix ntc_react run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to `http://localhost:5032`; change server-only `NTC_API_PROXY_TARGET` in `.env.local` if needed. Do not change local API configuration just to run the browser tests.

`VITE_API_BASE_URL` defaults to `/api/v1`. For a separately hosted API, supply its absolute HTTPS `/api/v1` URL and allow the exact React origin in API CORS. `VITE_GOOGLE_CLIENT_ID` is optional and public; the API must validate the same Google audience. Missing Google configuration disables that option. Vite variables are embedded at build time; never put credentials, DB connections, JWT signing keys or SMTP secrets in them. Set API `AppSettings__ClientUrl` to the React origin for recovery/email-change links.

## Structure

| Directory | Responsibility |
| --- | --- |
| `src/domain` | Models, document schema and limits |
| `src/infrastructure` | HTTP envelope/errors and explicit API repositories |
| `src/application` | Session lifecycle, private query cache and serialized autosave classes |
| `src/features` | Notes/editor, labels, reminders, inbox, auth, settings, admin, public pages |
| `src/shared` | Accessible dialogs/fields, hooks and formatting |
| `src/app` | Composition, route guards, lazy routes and workspace shell |

Classes implement services and ports; React function components/hooks render UI. Cached data stays in memory, partitioned by account. Notes are not persisted offline. Refresh token storage is per-tab `sessionStorage`; access tokens remain in memory. Sign-out or account change clears private cache. A lost network connection keeps the editor draft open with retry/copy options. Reloading or closing with unsaved work shows the browser's supported warning; this is not durable offline storage.

## Verify using synthetic data

```powershell
npm --prefix ntc_react run typecheck
npm --prefix ntc_react run lint
npm --prefix ntc_react test
npm --prefix ntc_react run build
Set-Location ntc_react
npx playwright install chromium
npm run test:e2e
```

Playwright starts Vite and `tools/FrontendFixture` automatically on ports 5173/5199. Keep those ports available. The loopback fixture uses the actual API with isolated in-memory SQLite, captured email and a synthetic clock. Each test resets only its fixture database. It never connects to your SQL Server or Supabase. Do not deploy the fixture host. Tests exercise API contracts, not real Google/SMTP delivery or provider-specific DB behavior. Browser reports are in ignored `playwright-report/`, traces in `test-results/`, screenshots in root `artifacts/frontend/`.

## Production build

`npm run build` emits `dist/`. For future Vercel hosting, set project Root Directory to `ntc_react`; its `vercel.json` supports SPA deep links. Configure the public API URL before building. Actual cloud deployment, legal/operator details, real provider verification and release gates remain separate work.
