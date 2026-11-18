# Kết quả kiểm tra

Ngày2026-11-05 (Asia/Bangkok), source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`.

## Kết quả artifact

- 37/37 workflow Archify v2 đã qua finalize với validate, deliver, strict provenance check và browser-check.
- 207 khoảng dòng / 50 file source được kiểm tại revision; cited files không khác committed bytes.
- Hash candidate và HTML khớp delivery receipt cho37/37artifact.
- Kiểm link nội bộ recursive: 407links tại thời điểm kiểm; 0lỗi. Root docs checker chạy riêng để không bỏ qua các link ngoài bộ mới.
- 21controller đã map vào luồng; API-COVERAGE không có controller nghiệp vụ chưa map.
- Mục lục kiểm Chromium1440/393:37cards, tìm kiếm, lọc nhóm, mở đặc tả và không horizontal overflow.
- Review trực quan đại diện: FLOW-013 (light1440), FLOW-030 (dark1440, bản cuối) và mục lục desktop/mobile. Không tuyên bố đã xem ảnh của toàn bộ37sơ đồ.

## Cảnh báo còn giữ

Mỗi diagram có cảnh báo i18n/translation-coverage:23/486message của Viewer được dịch Việt;463message nâng cao fallback English. Đây là cảnh báo ngôn ngữ đã công bố, không phải bỏ qua lỗi topology/provenance/browser. Không ghi zero warnings. Update check của Archify3.2.0 báo current, không có notice yêu cầu cập nhật.

## Cách tái tạo

PowerShell tại repository root. Dùng Node24.22.1 bundled để tránh lỗi receipt-publication quan sát với Node24.0.0 trên Windows; không sửa package Archify. Với mỗi candidate, gọi:

```powershell
& 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' 'D:/Tools/archify/archify/bin/archify.mjs' finalize workflow <candidate.json> <output.html> --repo-root . --quality showcase --out-dir <thu-muc-evidence-moi> --json
```

Dùng đúng đường dẫn candidate/output trong meta.output. Không thay candidate giữa các gate; khi sửa và chạy lại, dùng evidence directory mới. JSON validation cạnh từng spec giữ bản copy receipt cuối của artifact. Evidence gốc/ảnh tại artifacts/flow-specs ngoài Git. Không cài/cập nhật Archify và không sửa D:/Tools/archify.

## Bảng gate của từng luồng

| Mã | Validate | Deliver | Provenance | Browser | Evidence |
| --- | --- | --- | --- | --- | --- |
| FLOW-001 | PASS | PASS | PASS | PASS | [Receipt](01-dang-ky-xac-minh/validation.json) |
| FLOW-002 | PASS | PASS | PASS | PASS | [Receipt](02-dang-nhap/validation.json) |
| FLOW-003 | PASS | PASS | PASS | PASS | [Receipt](03-google-dang-nhap/validation.json) |
| FLOW-004 | PASS | PASS | PASS | PASS | [Receipt](04-khoi-phuc-mat-khau/validation.json) |
| FLOW-005 | PASS | PASS | PASS | PASS | [Receipt](05-khoi-phuc-refresh/validation.json) |
| FLOW-006 | PASS | PASS | PASS | PASS | [Receipt](06-dang-xuat-phien/validation.json) |
| FLOW-007 | PASS | PASS | PASS | PASS | [Receipt](07-lien-ket-google/validation.json) |
| FLOW-008 | PASS | PASS | PASS | PASS | [Receipt](08-guest-local/validation.json) |
| FLOW-009 | PASS | PASS | PASS | PASS | [Receipt](09-copy-guest/validation.json) |
| FLOW-010 | PASS | PASS | PASS | PASS | [Receipt](10-chuan-bi-workspace/validation.json) |
| FLOW-011 | PASS | PASS | PASS | PASS | [Receipt](11-danh-sach-tim-loc/validation.json) |
| FLOW-012 | PASS | PASS | PASS | PASS | [Receipt](12-luu-offline/validation.json) |
| FLOW-013 | PASS | PASS | PASS | PASS | [Receipt](13-dong-bo-xung-dot/validation.json) |
| FLOW-014 | PASS | PASS | PASS | PASS | [Receipt](14-tao-autosave-dong/validation.json) |
| FLOW-015 | PASS | PASS | PASS | PASS | [Receipt](15-mo-view-edit-zoom/validation.json) |
| FLOW-016 | PASS | PASS | PASS | PASS | [Receipt](16-rich-markdown-template/validation.json) |
| FLOW-017 | PASS | PASS | PASS | PASS | [Receipt](17-revision-conflict/validation.json) |
| FLOW-018 | PASS | PASS | PASS | PASS | [Receipt](18-quan-ly-label/validation.json) |
| FLOW-019 | PASS | PASS | PASS | PASS | [Receipt](19-gan-label/validation.json) |
| FLOW-020 | PASS | PASS | PASS | PASS | [Receipt](20-ghim-sap-xep/validation.json) |
| FLOW-021 | PASS | PASS | PASS | PASS | [Receipt](21-trash-khoi-phuc/validation.json) |
| FLOW-022 | PASS | PASS | PASS | PASS | [Receipt](22-tao-sua-reminder/validation.json) |
| FLOW-023 | PASS | PASS | PASS | PASS | [Receipt](23-dispatch-reminder/validation.json) |
| FLOW-024 | PASS | PASS | PASS | PASS | [Receipt](24-delivery-email/validation.json) |
| FLOW-025 | PASS | PASS | PASS | PASS | [Receipt](25-inbox/validation.json) |
| FLOW-026 | PASS | PASS | PASS | PASS | [Receipt](26-profile-doi-email/validation.json) |
| FLOW-027 | PASS | PASS | PASS | PASS | [Receipt](27-export-workspace/validation.json) |
| FLOW-028 | PASS | PASS | PASS | PASS | [Receipt](28-import-workspace/validation.json) |
| FLOW-029 | PASS | PASS | PASS | PASS | [Receipt](29-tuy-chon-hien-thi/validation.json) |
| FLOW-030 | PASS | PASS | PASS | PASS | [Receipt](30-ai-mascot-tao/validation.json) |
| FLOW-031 | PASS | PASS | PASS | PASS | [Receipt](31-ai-mascot-ap-dung/validation.json) |
| FLOW-032 | PASS | PASS | PASS | PASS | [Receipt](32-gui-phan-hoi/validation.json) |
| FLOW-033 | PASS | PASS | PASS | PASS | [Receipt](33-admin-tai-khoan/validation.json) |
| FLOW-034 | PASS | PASS | PASS | PASS | [Receipt](34-admin-role/validation.json) |
| FLOW-035 | PASS | PASS | PASS | PASS | [Receipt](35-admin-thong-ke-audit/validation.json) |
| FLOW-036 | PASS | PASS | PASS | PASS | [Receipt](36-phan-quyen-adapter/validation.json) |
| FLOW-037 | PASS | PASS | PASS | PASS | [Receipt](37-maintenance-health/validation.json) |

## Giới hạn nghiệp vụ

Không chạy lại .NET/React build hoặc regression nghiệp vụ vì chỉ thay tài liệu/artifacts. Không gọi API production, database của chủ dự án, email thật hoặc AI thật; không migrate, deploy, commit hoặc push. Các AC trong spec là yêu cầu nghiệm thu cho mỗi luồng, không được gán PASS từ việc render sơ đồ.
