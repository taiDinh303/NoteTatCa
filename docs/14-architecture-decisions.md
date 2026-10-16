# 14 — Quyết định kiến trúc

> 2026-10-16 | DRAFT | Áp dụng: YES

## ADR-001 — Chuyển frontend sang React, giữ Razor

- ACCEPTED bởi chủ dự án 2026-10-16; DEC-002/003.
- Backend hiện có nhiều tầng .NET và Razor. React là consumer mới trong workspace NTC; giữ NTC.VIEW để tham khảo và đối chiếu luồng.
- Không xóa Razor hoặc di chuyển Git root trong nhiệm vụ docs. Hệ quả: API không phụ thuộc session Razor cho nghiệp vụ mới; cần rà CORS, OAuth redirect và contract.
- Xem lại khi React đã thay đủ các luồng và chủ dự án giao xóa Razor. Chưa có ADR thay thế.

## ADR-002 — React TypeScript/Vite và cloud mục tiêu

- ACCEPTED định hướng theo trả lời Q-008: React TS/Vite tại NTC/frontend; .NET API trên Render; React trên Vercel; dữ liệu Supabase trong tương lai.
- CURRENT SQL Server; TARGET cloud PostgreSQL. SQL provider/migration/Identity data không thể chuyển chỉ bằng URL.
- PROPOSED: giữ một backend .NET, dùng Docker trên Render; chọn connection mode Supabase theo network; không thêm microservice.
- Q-019 đã chốt Supabase chỉ PostgreSQL, giữ .NET Identity. Q-025 chốt kế hoạch gom Git root NTC khi bắt đầu React; chưa thực hiện. Plan, region, runtime và package version pin khi thực hiện, không tự chọn bản mới nhất.

## ADR-003 — Phiên đăng nhập cho React

- Nguồn auth .NET Identity ACCEPTED theo Q-019; vòng đời phiên/refresh bên dưới PROPOSED, chốt trước code session.
- A: .NET Identity + access token ngắn hạn + refresh có rotation/revocation. Refresh cookie HttpOnly phải xem cross-site Vercel/Render, CSRF, SameSite/secure và custom domain; không giả định cookie cross-site luôn hoạt động.
- B: Supabase Auth từng là phương án so sánh; NOT SELECTED theo Q-019. Không chuyển account/password sang auth.users hoặc chạy hai nguồn auth song song.
- C: bearer theo current chỉ cho giai đoạn chuyển đổi; current thiếu revoke/logout/refresh server, không đáp ứng ngay yêu cầu khóa user đang có token.
- Quyết định cuối phải có test logout/revoke/refresh, multi-tab, Google và user bị khóa. Chưa có ADR thay thế.

## ADR-004 — Nội dung ghi chú nhiều định dạng

- ACCEPTED Q-020/021: một rich editor có checklist/màu chữ/emoji/Markdown shortcuts và emoji đại diện; chuyển Markdown cảnh báo mất định dạng. Chưa chốt thư viện/document schema cụ thể.
- PROPOSED rich editor document có schema version làm nguồn chuẩn; Markdown/export là projection có cảnh báo thuộc tính không hỗ trợ. Phương án bốn note type/editor riêng không được chọn trong Q-020.
- Không dùng cả HTML và Markdown làm hai nguồn chuẩn cập nhật độc lập. Sanitize render, whitelist link/màu/icon; chuyển note cũ thành plain không mất dữ liệu.
- Chưa chọn thư viện editor. Cần thử round-trip/keyboard/paste và license trước lựa chọn, không tự cài trong phiên docs.

## ADR-005 — Reminder và purge bền vững

- ACCEPTED nghiệp vụ: trong app + email, có lịch lặp; trash tự xóa sau 7 ngày.
- PROPOSED: occurrence/delivery/outbox trong DB, worker có lease/dedup, một scheduler chủ quản. Không dùng timer trong trình duyệt làm cơ chế duy nhất.
- Các phương án worker riêng/cron trên Render hoặc scheduler DB cần so sánh uptime, chi phí và độ chính xác; chưa chọn plan. Kênh email dùng adapter hiện có sau rà lỗi/retry.
- Q-024 đã chốt timezone từng user mặc định Việt Nam, gửi bù một lần trong 24h và bỏ cũ hơn. Test crash sau gửi trước ACK, race purge/restore, DST/cuối tháng và retry SMTP; chi tiết nhiều occurrence trong cửa sổ còn đề xuất.
