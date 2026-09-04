# Báo cáo hàng ngày (GA4 + Clarity → Email)

`DailyReport.gs` là một **Google Apps Script** độc lập — không chạy trên `laan.info`,
không ảnh hưởng gì tới landing page. Chạy hoàn toàn miễn phí trên hạ tầng Google,
theo lịch bạn đặt (khuyên dùng: mỗi sáng).

## Cài đặt

Xem hướng dẫn chi tiết ở đầu file [`DailyReport.gs`](DailyReport.gs) — tóm tắt:

1. https://script.google.com → New project → dán toàn bộ nội dung file vào.
2. Bật Advanced Service **"Google Analytics Data API"** (menu Services).
3. Điền `CONFIG` ở đầu file:
   - `GA4_PROPERTY_ID` — GA4 → Admin → Property Settings → **Property ID** (dạng số, khác với Measurement ID `G-...`)
   - `CLARITY_TOKEN` — Clarity → Settings → Data export → API tokens → tạo mới
   - `RECIPIENT_EMAIL` — email nhận báo cáo
4. Chạy hàm `testRun` một lần để cấp quyền + kiểm tra nhận được email thử.
5. Đặt Trigger (⏰ Triggers) chạy hàm `sendDailyReport` mỗi ngày.

## Nội dung email mỗi ngày

- Tổng quan truy cập (người dùng, phiên, lượt xem, thời gian phiên, bounce rate)
- Phễu hành vi: thêm giỏ → xem giỏ → bắt đầu đặt hàng → đặt hàng thành công
- Doanh thu + số đơn hàng
- Top 5 nguồn truy cập, thiết bị
- Số liệu hành vi thao tác từ Microsoft Clarity

## Giới hạn hiện tại

- Không tách được COD vs Chuyển khoản QR, hay Zalo vs Messenger trong báo cáo GA4 —
  cần đăng ký thêm **Custom dimension** trong GA4 Admin (scope Event) cho các tham số
  `payment_type` và `method`. Báo mình nếu muốn bổ sung.
- Clarity giới hạn API ở mức số liệu ngày gần nhất, không tách chi tiết theo phiên.
