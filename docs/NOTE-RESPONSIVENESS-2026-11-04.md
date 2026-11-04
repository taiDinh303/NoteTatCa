# Note responsiveness and Keep comparison — 2026-11-04

## Observed workflow and confirmed choices

Compared the owner's open Google Keep and NoteTatCa tabs using a separate synthetic note, `NTC speed comparison 2026-11-04`, creating, reopening, editing and closing it. Existing notes were not edited. Synthetic notes remain for review. Keep uses an inline creation composer and opens existing notes in an immediately editable overlay; NoteTatCa opens a lightweight viewer followed by Edit. This does not establish whether Keep reuses the original card DOM internally. Browser-tool round trips were not treated as application latency.

The owner selected an optional **Open notes for editing** switch in Appearance, with View remaining the default. Available on desktop/mobile, excluded from admin, stored in this browser as `ntc.note.edit-on-open.v1`. It affects normal opens only; explicit label/reminder actions retain their destinations. Fullscreen remains independent and hidden on mobile as previously requested. New notes always open for editing.

The owner explicitly requested loading note/editor code during initial workspace preparation. This supersedes November 3's background-only warming policy: customer/guest preparation now awaits both shared module loaders alongside shell/list modules and data. Until modules finish, preparation remains visible with **Preparing note tools…**. Failed imports use the existing error/reload retry screen. Admin does not load these modules. No editor instance is constructed for every card or for the readonly viewer.

## Implementation

- After workspace preparation, New, cached View and Edit use resolved modules. No artificial opening/closing delay.
- RichEditor serialization reuses immutable ProseMirror branches with a session-local WeakMap. Output matches existing canonical JSON, including marks/attributes and escaping. Root strings are not retained; cached fragments are limited to 4096 characters so undo history does not retain full serialized note/list snapshots. First edit still populates the cache.
- Character counting, byte/text validation, synchronous draft updates, autosave, durable persistence, conflicts and ownership protections remain. Closing awaits durable local persistence. Cached reads still refresh stale content in the background.

## Measurements and limits

Production Vite build, isolated .NET/SQLite frontend fixture, Chromium on this Windows machine; desktop 1440×900 and mobile viewport 393×900. Before: HEAD d568fc7. After: this implementation. Actual click to first animation frame containing expected DOM. Each row is one observation, not p95, INP, real-phone evidence or statistical proof. Earlier module loading trades more initial preparation for readiness after entering the workspace.

| Scenario | Before desktop | After desktop | Before mobile viewport | After mobile viewport |
| --- | ---: | ---: | ---: | ---: |
| First cached short View | 120 ms | 49 ms | 75 ms | 53 ms |
| Short View → Edit | 72 ms | 59 ms | 57 ms | 76 ms |
| Clean close | 22 ms | 16 ms | 12 ms | 11 ms |
| Reopen | 36 ms | 40 ms | 22 ms | 32 ms |
| Dirty close, API PATCH held 1200 ms | 35 ms | 51 ms | 31 ms | 31 ms |
| 90,000 characters / 450 paragraphs: View | 90 ms | 85 ms | 67 ms | 63 ms |
| Same long note: View → Edit | 127 ms | 101 ms | 103 ms | 99 ms |

After deliberately holding the cold NoteEditor chunk at startup then releasing it, New reached editable content in 101 ms and dirty close in 75 ms. Creation, close and reopening preserved content. No same-scenario pre-change creation baseline.

Opt-in CPU benchmark in `serializeEditorDocument.test.ts`: 100 edits across 450 paragraphs, output equality against previous canonical serializer, including validation. Five final samples: original 186.57/91.47/85.45/92.27/93.36 ms, cached 59.18/57.28/66.35/64.45/53.61 ms. Median 92.27 → 59.18 ms, about 36% less CPU **for serialization plus validation**, not total typing. Another isolated run was 80.77 → 52.34 ms. Input-to-RAF varies with scheduling and does not establish consistent total typing improvement. Some UI samples worsened; no universal improvement, zero latency or parity-with-Keep claim.

Raw local evidence: ignored `artifacts/keep-comparison/` (before, after, final, regression, title-rich). Synthetic fixture only: no owner DB, real email, schema changes or manual deployment. Hosting rollout and comparable production Keep timings remain unverified.

## Validation

16 unique Chromium cases passed across the focused runs: held startup chunks, cached/stale reads, desktop/mobile interaction audits and 90k notes, desktop/mobile edit preference and explicit labels, independent fullscreen preference, guest/authenticated production offline reload, conflict retention, durable retry without duplication, Markdown import/export, title focus after deferred preparation, and rich CRUD/labels/trash restoration. 54 unit tests passed; opt-in CPU observation also passed separately. React production build, scoped ESLint and .NET Release build with warnings as errors passed. Not a full-suite or real-device run. Initial harness failures used a styling class to infer editor construction, old label-menu selectors and Escape assumptions; updated to readonly contenteditable assertions and the current explicit tool toggles, then reran successfully without relaxing persistence/content assertions.
