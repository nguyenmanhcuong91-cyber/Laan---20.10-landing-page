# Kết nối landing page với KiotViet (Mức 2)

Form đặt hàng trên `laan.info` → **Cloudflare Worker** (`order-worker.js`) → **KiotViet Public API** tạo Đơn đặt hàng.

Landing page vẫn nằm trên GitHub Pages. Worker chạy miễn phí, giữ khóa bí mật KiotViet ở phía server.

```
Trình duyệt khách ──POST /order──▶ Cloudflare Worker ──▶ KiotViet Public API
   (laan.info)                     (giữ client_secret)      (tạo đơn đặt hàng)
```

---

## Bước 0 — Kiểm tra KiotViet có cho dùng API không (QUAN TRỌNG)

1. Đăng nhập KiotViet → **Thiết lập → Kết nối API** (hoặc *Cửa hàng → Thiết lập → Kết nối API*)
2. Nếu thấy nút tạo **Client ID / Client Secret** → gói của bạn dùng được, làm tiếp
3. Nếu không có mục này / bị khóa → gói hiện tại **không hỗ trợ Public API**. Cần nâng gói hoặc chuyển sang Mức 1 (nút dẫn sang cửa hàng KiotViet). Báo lại để tư vấn.

Ghi lại 3 thứ:
- `Client ID`
- `Client Secret`
- **Tên gian hàng (retailer)** — thường là phần trước `.kiotviet.vn` khi đăng nhập, vd `laanshop`

---

## Bước 1 — Tạo Worker trên Cloudflare (không cần cài gì)

1. Tạo tài khoản miễn phí tại https://dash.cloudflare.com
2. Menu trái: **Workers & Pages → Create → Workers → Create Worker**
3. Đặt tên, vd `laan-kiotviet-order` → **Deploy** (nó tạo bản mẫu)
4. Bấm **Edit code** → xóa hết → dán toàn bộ nội dung file [`order-worker.js`](order-worker.js) → **Deploy**
5. Ghi lại URL worker, dạng: `https://laan-kiotviet-order.<tên>.workers.dev`

---

## Bước 2 — Khai báo biến môi trường

Trong Worker: **Settings → Variables and Secrets → Add**

| Tên biến | Kiểu | Giá trị |
|---|---|---|
| `KIOTVIET_CLIENT_ID` | Secret | (Client ID từ KiotViet) |
| `KIOTVIET_CLIENT_SECRET` | Secret | (Client Secret từ KiotViet) |
| `KIOTVIET_RETAILER` | Text | tên gian hàng, vd `laanshop` |
| `SETUP_KEY` | Secret | tự đặt 1 chuỗi ngẫu nhiên, vd `abc123xyz789` |
| `ALLOWED_ORIGINS` | Text | `https://laan.info,https://www.laan.info` |
| `KIOTVIET_BRANCH_ID` | Text | tạm để `0`, điền lại ở Bước 3 |

Bấm **Deploy** lại sau khi thêm biến.

---

## Bước 3 — Lấy `branchId` và mã sản phẩm

Mở trên trình duyệt (thay `<URL>` và `<SETUP_KEY>`):

```
https://<URL>.workers.dev/setup?key=<SETUP_KEY>
```

Kết quả trả về:
- `branches`: danh sách chi nhánh + `id` → chọn id chi nhánh bán hàng, điền vào biến `KIOTVIET_BRANCH_ID`, Deploy lại
- `products`: danh sách sản phẩm + `code` → đây là mã dùng cho form đặt hàng

> Nếu các set quà 20/10 chưa có trong KiotViet → tạo sản phẩm trong KiotViet trước (mỗi set = 1 sản phẩm, đặt mã dễ nhớ như `SET-PHUQUY-01`).

Gửi lại kết quả `/setup` (branchId + list code) để gắn vào form trên landing page.

---

## Bước 4 — Kiểm thử

```bash
curl -X POST https://<URL>.workers.dev/order \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyen Van A","phone":"0900000000","address":"123 Le Loi, Q1, HCM","note":"test","items":[{"code":"SET-PHUQUY-01","quantity":1}]}'
```

Thành công: `{"ok":true,"orderCode":"..."}` và đơn xuất hiện trong KiotViet mục **Đơn đặt hàng**.

---

## Bảo mật / lưu ý

- `client_secret` chỉ nằm trong biến Secret của Worker, không bao giờ xuống trình duyệt.
- Worker chỉ nhận request từ `laan.info` (CORS) + có honeypot chống bot cơ bản.
- Giá đơn hàng lấy từ KiotViet, **không tin giá client gửi lên**.
- Nên thêm **Cloudflare Turnstile** (captcha ẩn) nếu bị spam đơn — báo để bổ sung.
- `/setup` chỉ dùng lúc cài đặt; có thể xóa `SETUP_KEY` sau khi xong để vô hiệu hoá.
