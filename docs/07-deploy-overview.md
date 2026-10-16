# 07 — Tổng quan triển khai

> 2026-10-16 | DRAFT | Áp dụng: YES

## Hướng đã chốt

Chủ dự án chọn lộ trình tương lai: Supabase PostgreSQL chỉ làm dữ liệu, giữ .NET Identity; Render cho .NET API, Vercel cho React. Chưa tạo tài nguyên hoặc triển khai trong phiên này. Cần chuyển provider/schema từ SQL Server và giữ account/note cũ; không dùng Supabase Auth (Q-019).

| Môi trường | Frontend | API | Database | Trạng thái |
| --- | --- | --- | --- | --- |
| Local hiện tại | Razor còn giữ | .NET profile HTTPS 5033 / HTTP 5032 | SQL Server qua MyCnn | Source có config, runtime NOT VERIFIED |
| Local đích | React TS/Vite, dự kiến 5173 | .NET API | SQL Server ban đầu; Postgres test khi migrate | Frontend chưa tạo |
| Staging tương lai | Vercel preview/test | Render service staging | Supabase test riêng | Chưa cấp tài nguyên/URL |
| Production tương lai | Vercel | Render | Supabase production | Plan/region/domain/budget CHƯA XÁC ĐỊNH |

TARGET: React gọi API Render quản lý nghiệp vụ, Supabase chỉ DB; không đọc note qua Data API từ browser. Xem file 16 về ngăn đường truy cập vòng. API .NET trên Render đề xuất đóng gói Docker; Vercel có hướng dẫn Vite. [Render Docker](https://render.com/docs/docker), [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite), kiểm tra 2026-10-16.

## Chuỗi phát hành dự kiến

Chốt Q và contract → test/build → artifact có commit → backup → migration tương thích → API staging → React staging → smoke browser/API/DB → production theo phạm vi được giao → theo dõi. Không tự migration mỗi lần startup khi nhiều instance cùng chạy.

Worker nhắc lịch và purge 7 ngày cần lịch chạy bền vững. Chốt một nơi chịu trách nhiệm job, không đồng thời API timer/cron/DB scheduler cùng gửi. Plan có ngủ, độ trễ khởi động, lịch cron và quota phải kiểm khi chọn dịch vụ, không giả định tài khoản miễn phí đáp ứng nhắc lịch đúng giờ.

Điều kiện release ở [18](18-release-checklist.md); chi tiết ở [08](08-deploy-detail.md); secret tại [17](17-environment-config.md).
