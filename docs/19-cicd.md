# 19 — CI/CD

> 2026-10-16 | DRAFT | Áp dụng: YES | PROPOSED; chưa tạo workflow

Khảo sát chưa tìm thấy CI YAML hoặc test project. Git backend ở NoteTatCa, docs/frontend ngoài repo hiện tại. Chủ dự án đã chọn định hướng gom Git root lên NTC khi bắt đầu React, nhưng chưa thực hiện; phải lập kế hoạch bảo toàn lịch sử/remote/config trước khi chỉnh Git.

| Trigger đề xuất | Job | Cwd / thao tác sau khi có source | Fail khi |
| --- | --- | --- | --- |
| PR backend | Restore/build .NET, integration DB test | Backend repo hoặc NoteTatCa dưới root mới | Compile/test/owner fail |
| PR frontend | Install lockfile, typecheck/lint/test/build | frontend; scripts sẽ xác định khi scaffold | Type/lint/E2E fail |
| PR docs | Link/placeholder/schema contract consistency | docs | Broken link, quyết định lệch |
| Release staging | Build Docker/API, React artifact, migration dry run | Repo root đã chốt | Provider/config/data mismatch |
| Release production được giao | Deploy artifact đã test + smoke | Cloud environments tách biệt | Smoke/security/recovery chưa đạt |

Pin SDK/runtime/package versions, commit lockfiles, không dùng mutable latest làm chính sách release. Test secrets chỉ cho code được tin cậy và môi trường test; không publish .env, connection string, browser auth trace hoặc note data làm artifact. Workflow permissions tối thiểu.

Vercel Git integration có thể build/deploy theo branch; cần chọn production branch và release gates để push tài liệu không vô tình phát hành backend/worker. CI đề xuất giữ tests riêng, Vercel xử lý frontend build khi phù hợp. [Vercel Git deployments](https://vercel.com/docs/git), [Deployment checks](https://vercel.com/docs/deployment-checks), kiểm tra 2026-10-16 qua hướng dẫn plugin; live settings chưa xác minh.

Không tự deploy/migrate khi API start. Ghi run URL/commit/job output sau khi tạo pipeline; hiện bằng chứng NOT RUN. Branch protection, người review, artifact retention và budget chưa chốt theo đội ngũ thực tế.
