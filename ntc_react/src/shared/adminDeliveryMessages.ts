export const adminDeliveryMessages: Record<
  string,
  readonly [string, string, string]
> = {
  "Reminder deliveries": [
    "Theo dõi gửi nhắc nhở",
    "提醒发送记录",
    "リマインダー配信",
  ],
  "Delivery records only. Sent means accepted by the provider; worker health and mailbox arrival are not confirmed.":
    [
      "Chỉ hiển thị bản ghi gửi. Đã gửi nghĩa là nhà cung cấp đã nhận; chưa xác nhận worker khỏe hoặc thư tới hộp thư.",
      "仅显示发送记录。已发送表示服务商已接受，并不确认任务运行正常或邮件已送达。",
      "配信記録のみです。送信済みはプロバイダーが受理した状態で、ワーカーの正常稼働や受信箱への到着は確認しません。",
    ],
  "Target account ID": [
    "ID tài khoản đích",
    "目标账户 ID",
    "対象アカウント ID",
  ],
  "Delivery status": ["Trạng thái gửi", "发送状态", "配信状態"],
  "All statuses": ["Tất cả trạng thái", "所有状态", "すべての状態"],
  Pending: ["Đang chờ", "待处理", "待機中"],
  Retrying: ["Đang chờ thử lại", "等待重试", "再試行待ち"],
  "In progress": ["Đang xử lý", "处理中", "処理中"],
  Sent: ["Đã gửi", "已发送", "送信済み"],
  Abandoned: ["Đã ngừng thử", "已停止重试", "再試行終了"],
  "Occurrence from": ["Lần nhắc từ", "提醒时间起", "通知日時（開始）"],
  "Occurrence before": [
    "Lần nhắc trước",
    "提醒时间早于",
    "通知日時（終了・含まず）",
  ],
  "Apply filters": ["Áp dụng bộ lọc", "应用筛选", "絞り込みを適用"],
  "Delivery ID": ["ID lần gửi", "发送 ID", "配信 ID"],
  Attempts: ["Số lần thử", "尝试次数", "試行回数"],
  Occurrence: ["Lần nhắc", "提醒时间", "通知日時"],
  "Next attempt": ["Lần thử tiếp", "下次尝试", "次回試行"],
  "Last attempt": ["Lần thử cuối", "最后尝试", "最終試行"],
  "Abandoned at": ["Ngừng thử lúc", "停止重试时间", "再試行終了日時"],
  "Lease until": ["Giữ xử lý đến", "处理租约到期", "リース期限"],
  "Error code": ["Mã lỗi", "错误代码", "エラーコード"],
  "No matching deliveries": [
    "Không có lần gửi phù hợp",
    "没有匹配的发送记录",
    "該当する配信はありません",
  ],
  "Try another account, status or time range.": [
    "Thử tài khoản, trạng thái hoặc khoảng thời gian khác.",
    "请尝试其他账户、状态或时间范围。",
    "別のアカウント、状態、期間をお試しください。",
  ],
};
