# FLOW-029 — Ngôn ngữ, theme, zoom và mascot có sẵn

[Danh mục](../README.md) · [Sơ đồ Archify](29-tuy-chon-hien-thi.html) · [Nguồn sơ đồ](candidate.json)

> CURRENT theo source commit `46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e`. Ngày khảo sát: 2026-11-05 (Asia/Bangkok). Không đồng nghĩa luồng đã chạy trên production.

## Mục tiêu và điều kiện

- **Tác nhân:** User/Admin/guest trong phạm vi UI tương ứng.
- **Kích hoạt:** Settings Language/Appearance hoặc Zoom.
- **Điều kiện trước:** Có trình duyệt; một số tùy chọn mascot chỉ desktop/customer.
- **Đầu vào:** Language vi/en/zh/ja, theme, zoom50–150, Edit-on-open/fullscreen, mascot preference.
- **Truy vết nghiệp vụ:** DEC-021/023/024.

## Luồng chính

1. **Chọn ngôn ngữ.** Radio setLanguage đổi UI, giữ nguyên text note/label do user nhập.
2. **Theme và mặc định note.** Toggle theme, Edit-on-open và desktop fullscreen theo preference.
3. **Zoom riêng workspace.** DisplayPreferences lấy/persist integer50–150; mobile scale1.
4. **Giữ nội dung note.** Gesture content zoom đi đường riêng với workspace zoom.
5. **Dùng lại preference.** Giá trị được lưu browser; không tạo quyền account hoặc thay schema note.

## Nhánh lỗi và khôi phục

| Kết quả/mã | Điều kiện | Hành vi tiếp theo |
| --- | --- | --- |
| Storage bị chặn | Không persist được preference | Fallback an toàn; chức năng ghi note vẫn tách biệt. |
| Zoom ngoài range | Nhập giá trị ngoài50–150 | Clamp; không thay width card gốc theo từng mức zoom. |
| Không hỗ trợ mobile | Tùy chọn desktop/mascot không áp dụng | Giữ layout mobile, không giả có tính năng. |

## Trạng thái sau và bất biến

- Giá trị được lưu browser; không tạo quyền account hoặc thay schema note.
- Preference không phải setting bảo mật hay dữ liệu được sync đa thiết bị.
- Preset mascot không đồng nghĩa tác vụ AI; AI có consent và quota riêng.

## Hợp đồng và dữ liệu

API dưới đây tính từ `/api/v1`, trừ khi ghi rõ là local/job.

- `LOCAL preferences; không có API đổi nội dung note`

## Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ca cần kiểm, không phải tuyên bố PASS trong đợt tài liệu này.

- **FLOW-029-AC1:** Đổi language không dịch hoặc sửa nội dung note.
- **FLOW-029-AC2:** Reload dùng lại preference hợp lệ.
- **FLOW-029-AC3:** Zoom không thay documentJson hoặc ownership.

## Nguồn đối chiếu

- [ntc_react/src/features/settings/PreferencesPage.tsx:41](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PreferencesPage.tsx#L41-L55)
- [ntc_react/src/features/settings/PreferencesPage.tsx:59](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/features/settings/PreferencesPage.tsx#L59-L84)
- [ntc_react/src/shared/DisplayPreferences.tsx:8](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/shared/DisplayPreferences.tsx#L8-L48)
- [ntc_react/src/shared/DisplayPreferences.tsx:58](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/shared/DisplayPreferences.tsx#L58-L64)
- [ntc_react/src/shared/DisplayPreferences.tsx:65](https://github.com/taiDinh303/NoteTatCa/blob/46e8341d2ea6b4ff13eca36a61cc19a0095f0b2e/ntc_react/src/shared/DisplayPreferences.tsx#L65-L72)

## Giới hạn kiểm chứng

Đợt này đọc mã và kiểm artifact Archify; không gọi API thật, không gửi email, không migrate/deploy và không chạy lại regression nghiệp vụ. Xem worklog để phân biệt bằng chứng lịch sử với kết quả của đợt đặc tả.
