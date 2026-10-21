# Laan — Landing Page theo mùa quà tặng

Landing page bán hàng theo mùa cho **Laan Plant & Gift Store**.

- **Trang chủ (hiện tại):** 20/11 Ngày Nhà giáo Việt Nam — "The Light · Ánh sáng dẫn lối".
- **Trang phụ:** `20-10/` — bộ sưu tập 20/10 "Blossom Her" (HER, beyond ordinary).

🔗 **Bản đang chạy:** https://laan.info

## Nội dung

| File | Mô tả |
|------|-------|
| `index.html`, `blossom-her-NN.html`, `img/` | Trang chủ 20/11 "The Light": trang chính, 15 trang chi tiết set, ảnh tách thành file riêng. |
| `20-10/` | Trang 20/10 "Blossom Her" (trang chính + 15 trang chi tiết, ảnh nhúng base64) — mở tại `/20-10/`. |

## Xem thử tại máy

Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy một web server tĩnh:

```bash
python3 -m http.server 8000
# rồi mở http://localhost:8000/
```

## Triển khai

Trang được host bằng **GitHub Pages** (Settings → Pages → Deploy from a branch → `main` / `/root`).
Mỗi lần push lên nhánh `main`, GitHub Pages tự build lại sau ~1 phút.

## Đặt hàng (hiện tại)

Khách bấm **"Đặt mua"** (mỗi sản phẩm) hoặc **"Đặt quà ngay"** (cuối trang) → mở popup gồm:

1. **Form đơn hàng** — Sản phẩm, Số lượng, Họ tên, SĐT, Địa chỉ, Ghi chú → gửi email về shop
   qua **Web3Forms** (`https://api.web3forms.com/submit`). Có validate + honeypot chống bot.
2. **Nhắn trực tiếp** — Zalo / Messenger / Gọi (fallback).

Ngoài ra có **thanh liên hệ nổi** (Zalo / Messenger / gọi) ở góc phải màn hình.

### Kích hoạt form

1. Vào https://web3forms.com → nhập email nhận đơn → lấy **Access Key** (gửi qua email).
2. Mở `index.html`, thay `WEB3FORMS_KEY = "REPLACE-WITH-ACCESS-KEY"` bằng key đó.
3. Commit + push. Gửi thử 1 đơn để xác nhận email về đúng hộp thư.

> Access Key không phải mật khẩu — nó chỉ cho phép gửi email tới địa chỉ đã đăng ký.

### Sửa số điện thoại / link liên hệ

Trong `index.html`: các thẻ `.contact-fab`, `.m-quick` trong `#orderModal`, và footer.
Hiện dùng: Zalo/hotline `0399995729`, Fanpage `facebook.com/laan.plantstore`.

Nâng cấp tương lai: `worker/` chứa sẵn cầu nối tạo đơn thẳng vào KiotViet (xem `worker/README.md`),
đang chờ bật Public API bên KiotViet.

## Ghi chú

- Font dùng Google Fonts (Cormorant Garamond, Jost) — cần kết nối mạng khi xem.
- Trang thiết kế theo tông blush / hồng / gold, hỗ trợ responsive và `prefers-reduced-motion`.
- Sản phẩm trên trang hiện là hàng mẫu — thay bằng các set quà 20/10 thật khi chốt.
