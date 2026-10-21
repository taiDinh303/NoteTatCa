# NoteTatCa repository working agreement

Read docs/00-README.md, docs/PROJECT-INTAKE.md, docs/01-plan.md,
docs/BACKEND-IMPLEMENTATION.md and the latest worklog before changes.
The human user's current instruction takes precedence.

- Repository root is D:\My Project\NTC. Backend projects and solutions live in
  ntc_aspnet/. docs/ at the repository root is the only maintained documentation.
  Repository scripts, .github/, .config/, Dockerfile and render.yaml live here.

- Preserve .NET 8/Identity, private per-user notes and all confirmed decisions.
- Legacy Razor NTC.VIEW was removed at the owner's request on 2026-10-21; do not recreate it. Frontend lives in ntc_react/. Do not migrate live data or deploy from a code task.
- Keep Core independent of HTTP/EF, contracts independent of persistence implementation;
  business services use ICurrentUser, TimeProvider and repository/unit-of-work interfaces.
- Use BaseService/BaseApiController for shared behavior, explicit services for features;
  do not introduce an empty generic CRUD framework.
- Enforce ownership for all note/tag/reminder/notification paths. Admin access never
  grants access to another user's note content. Keep legacy routes with secure adapters.
- Preserve historical migrations; new provider histories and data transfer need review.
  Never test against the owner's connection string or send real email from tests.
- Keep credentials outside Git. Preserve pre-existing appsettings local changes.
- Run focused regression/HTTP tests, build Release and record actual evidence/limits.
- Before completing a code/docs task or committing it, update docs/worklog.md
  with the outcome, actual validation and remaining work. For publication, record
  the commit scope and verify the remote branch after pushing.
- Do not recreate ntc_aspnet/docs or a nested Git repository. Use root docs/ directly.
- Run build/test/tool commands from the root using ntc_aspnet/ project paths.
  Preserve Git history, working changes and local configuration when reorganizing files.

- Configuration changes follow docs/CONFIGURATION-STANDARD.md and deploy/project.json. Keep safe Production JSON separate from local secrets; maintain configuration checks and update worklog with actual verification.
