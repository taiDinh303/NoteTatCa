# NoteTatCa backend architecture

ASP.NET Core 8, Identity/JWT, EF Core. SQL Server remains the local default;
PostgreSQL/Supabase uses a separate context/migration history and private `ntc` schema.

The repository root contains .git, docs, scripts and deployment/tool configuration.
All .NET projects and both solutions remain under ntc_aspnet/. Documentation has one
maintained location at docs/; ntc_aspnet/docs and a nested .git must not be recreated.

| Project | Boundary |
| --- | --- |
| NTC.Core | Actor interface, errors, pagination and audit basics; no HTTP/EF |
| NTC.Contract.Repositories | Entity and persistence interfaces |
| NTC.ModelViews | Legacy DTOs and v1 request/response contracts |
| NTC.Contract.Services | Business/infrastructure interfaces; no repository implementation reference |
| NTC.Repositories | DbContext, provider models, repositories/UoW, migrations and audit/concurrency stamps |
| NTC.Services | Explicit business services, BaseService, document/recurrence rules, auth/email adapters and maintenance |
| NTC.API | Composition/configuration, BaseApiController, legacy/v1 controllers, middleware, worker and health |
| NTC.Tests | HTTP/SQLite, unit, SQL LocalDB migration, optional isolated PostgreSQL fixture |

ICurrentUser and TimeProvider replace ad-hoc HTTP claim/time access in business
services. Inheritance shares behavior through BaseService/BaseApiController;
interfaces support replaceable Google/email/actor adapters. Services still use EF
query extensions through IQueryable: this is pragmatic layered code, not pure DDD.

No admin override exists for note content. Versioned document JSON is validated
and projected to plain text for search. Notes use Guid concurrency versions;
v1 save requires a version and create supports an owner-scoped idempotency key.
PATCH preserves omitted fields; empty title/icon/color clears those values.
Flattening rich content needs explicit `convertToPlainText=true`.

Refresh tokens are stored as hashes and rotated within a 7-day or 30-day absolute
family lifetime. Every access request checks DB user/session state and active roles.
Recovery token keys must persist securely across instances/restarts when deployed.

The disabled-by-default worker uses persisted occurrence/delivery rows and leases.
SMTP is at-least-once around ambiguous external ACKs. Trash purge rechecks the
seven-day cutoff in a transaction. Schema/data migration, backup and enabling jobs
remain explicit operations; startup never migrates or seeds production automatically.

Legacy routes remain secure adapters for retained Razor source. Username login is
legacy-only; v1 uses email. Existing access JWTs without a server session require
sign-in again. Rich-note edits through old plain-only clients are rejected.

See [implementation contract](docs/BACKEND-IMPLEMENTATION.md),
[API contract](docs/15-api-contract.md), [worklog](docs/worklog.md).

## React client

`ntc_react` contains domain models, explicit HTTP repository classes, application services for session/autosave/cache, and feature UI modules. React Router loads pages and the rich editor lazily; TanStack Query caches data per account in memory. Versioned writes and idempotent create protect autosave retries. Radix dialogs manage focus; dnd-kit supports pointer/keyboard reordering within complete unfiltered groups. Details and route mapping: [frontend implementation](docs/FRONTEND-IMPLEMENTATION.md).
