# 14 — Quyết định kiến trúc

> 2026-10-17 | WORKING ADR | Áp dụng: YES

## ADR-001 — Chuyển frontend sang React, giữ Razor

- ACCEPTED bởi chủ dự án 2026-10-16; DEC-002/003.
- Backend hiện có nhiều tầng .NET và Razor. React là consumer mới trong workspace NTC; giữ NTC.VIEW để tham khảo và đối chiếu luồng.
- Không xóa Razor. Git root đã chuyển lên NTC trong nhiệm vụ cấu trúc riêng theo yêu cầu chủ dự án 2026-10-17 (ADR-008). Hệ quả: API không phụ thuộc session Razor cho nghiệp vụ mới; cần rà CORS, OAuth redirect và contract.
- Xem lại khi React đã thay đủ các luồng và chủ dự án giao xóa Razor. Chưa có ADR thay thế.

## ADR-002 — React TypeScript/Vite và cloud mục tiêu

- ACCEPTED định hướng theo trả lời Q-008: React TS/Vite tại NTC/ntc_react; .NET API trên Render; React trên Vercel; dữ liệu Supabase trong tương lai.
- CURRENT SQL Server; TARGET cloud PostgreSQL. SQL provider/migration/Identity data không thể chuyển chỉ bằng URL.
- PROPOSED: giữ một backend .NET, dùng Docker trên Render; chọn connection mode Supabase theo network; không thêm microservice.
- Q-019 đã chốt Supabase chỉ PostgreSQL, giữ .NET Identity. Q-025 chốt kế hoạch gom Git root NTC; yêu cầu trực tiếp tiếp theo 2026-10-17 đã thực hiện (ADR-008). Plan, region, runtime và package version pin khi thực hiện, không tự chọn bản mới nhất.

## ADR-003 — Phiên đăng nhập cho React

- Nguồn auth .NET Identity ACCEPTED theo Q-019; backend session A IMPLEMENTED 2026-10-17 trong scope được giao; client storage chưa chốt.
- A: .NET Identity + access token ngắn hạn + refresh có rotation/revocation. Refresh cookie HttpOnly phải xem cross-site Vercel/Render, CSRF, SameSite/secure và custom domain; không giả định cookie cross-site luôn hoạt động.
- B: Supabase Auth từng là phương án so sánh; NOT SELECTED theo Q-019. Không chuyển account/password sang auth.users hoặc chạy hai nguồn auth song song.
- C: bearer theo current chỉ cho giai đoạn chuyển đổi; current thiếu revoke/logout/refresh server, không đáp ứng ngay yêu cầu khóa user đang có token.
- Backend đã test logout/revoke/refresh/reuse/lock/family expiry. Multi-tab/browser và Google thật chưa kiểm. API bearer không refresh cookie; TTL/access/family xem15.

## ADR-004 — Nội dung ghi chú nhiều định dạng

- ACCEPTED Q-020/021: một rich editor có checklist/màu chữ/emoji/Markdown shortcuts và emoji đại diện; chuyển Markdown cảnh báo mất định dạng. Chưa chốt thư viện/document schema cụ thể.
- IMPLEMENTED schema 1 JSON allowlist làm nguồn chuẩn; Markdown/export là projection có cảnh báo thuộc tính không hỗ trợ. Phương án bốn note type/editor riêng không được chọn trong Q-020.
- Không dùng cả HTML và Markdown làm hai nguồn chuẩn cập nhật độc lập. Sanitize render, whitelist link/màu/icon; chuyển note cũ thành plain không mất dữ liệu.
- Chưa chọn thư viện editor. Cần thử round-trip/keyboard/paste và license trước lựa chọn, không tự cài trong phiên docs.

## ADR-005 — Reminder và purge bền vững

- ACCEPTED nghiệp vụ: trong app + email, có lịch lặp; trash tự xóa sau 7 ngày.
- IMPLEMENTED: occurrence/delivery DB, worker lease/dedup trong API default off, tick30 giây. Không dùng timer trong trình duyệt làm cơ chế duy nhất.
- Các phương án worker riêng/cron trên Render hoặc scheduler DB cần so sánh uptime, chi phí và độ chính xác; chưa chọn plan. Kênh email dùng adapter hiện có sau rà lỗi/retry.
- Q-024 đã chốt timezone từng user mặc định Việt Nam, gửi bù một lần trong 24 giờ và bỏ cũ hơn. Test crash sau gửi trước ACK, race purge/restore, DST/cuối tháng và retry SMTP; một occurrence gần nhất mỗi lịch trong24 giờ đã chốt DEC-014, có test.

## Rà soát và triển khai 2026-10-17

Lựa chọn kỹ thuật đợt mới: access bearer + refresh opaque rotation/revoke, không phụ thuộc cross-site cookie cho API hiện tại; document JSON versioned và whitelist; worker lease/concurrency persisted, mặc định tắt. Xem BACKEND-IMPLEMENTATION; đây là lựa chọn triển khai trong phạm vi backend được giao.

## ADR-006 — Provider và phong cách backend

IMPLEMENTED 2026-10-17: contracts không tham chiếu persistence implementation, Core không HTTP/EF, actor/clock/base service/controller; SQL Server + context/history PostgreSQL riêng, schema `ntc`. Chọn từ Marixa, không import HR. SQL legacy giữ nguyên migration, thêm additive và preflight duplicate email; xem04/23.

## ADR-007 — Entity integrity và administrative audit

IMPLEMENTED2026-10-17 theo quyền rà/bổ sung entities của chủ dự án: composite FK gắn owner/parent; CHECK invariant, cleanup indexes; shared audit interface cho Identity/domain; AdministrativeAuditEvent chỉ ID/action/time và append-only qua ứng dụng. Không dùng schema ntc như tenant, không thêm quyền admin đọc note. NoteTag.UserId backfill chỉ khi owner hợp lệ, dữ liệu sai dừng migration thay tự sửa. [Phân tích và giới hạn](ENTITY-REVIEW.md).

## ADR-008 — Repository root NTC và docs duy nhất

ACCEPTED và IMPLEMENTED theo yêu cầu trực tiếp của chủ dự án 2026-10-17. NTC là Git root; .git/.github/.config/scripts/Dockerfile/render.yaml/README/AGENTS ở root. Backend và solutions giữ ntc_aspnet; NTC.VIEW không đổi source. Chỉ docs/ ở root được duy trì; không sync hai bản nữa. Thư mục react hiện có trống được giữ, chưa scaffold hoặc đổi tên frontend.

Giữ nguyên HEAD/branch/refs/remote, không rewrite lịch sử; Git index chuyển đường dẫn baseline thành287 renames thuần, thay đổi backend/config hiện tại vẫn unstaged. Không commit/push trong task. Recovery bundle/index/patch/hash manifest và bản docs cũ được lưu trong .git/root-relocation-backup, không public. Build/test/CI/Docker paths cập nhật root; cloud và dữ liệu thật không thao tác.

## ADR-018 — React frontend 2026-10-18

ACCEPTED: người dùng giao xây SPA đầy đủ từ Razor, đặt ntc_react tại root NTC. IMPLEMENTED local theo FRONTEND-IMPLEMENTATION. React function components/hooks cho UI; class services/repositories/session/autosave cho phân tầng/OOP. Server state cache theo user trong memory, không tải toàn bộ DB trước khi dùng; access token memory, refresh theo tab sessionStorage, shared rotation flight, clear cache theo identity. Tiptap JSON canonical theo whitelist backend, Markdown là import/export có cảnh báo. Dnd pointer/keyboard chỉ khi nhóm đã tải đủ và không filter. Không triển khai Supabase Auth, service worker/offline hoặc cloud trong nhiệm vụ này.
