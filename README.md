# Laan — 20.10 Landing Page

Landing page bán hàng dịp 20/10 cho **Laan Plant & Gift Store** — bộ sưu tập "HER, beyond ordinary".

🔗 **Bản đang chạy:** https://laan.info

## Nội dung

| File | Mô tả |
|------|-------|
| `index.html` | Trang landing page (một file HTML tự chứa, gồm CSS nội tuyến và hình nền nhúng base64). |

## Xem thử tại máy

Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy một web server tĩnh:

```bash
python3 -m http.server 8000
# rồi mở http://localhost:8000/
```

## Triển khai

Trang được host bằng **GitHub Pages** (Settings → Pages → Deploy from a branch → `main` / `/root`).
Mỗi lần push lên nhánh `main`, GitHub Pages tự build lại sau ~1 phút.

## Đặt hàng (hiện tại — Cách A)

Khách bấm **"Đặt mua"** trên mỗi sản phẩm → mở popup với 3 lựa chọn liên hệ:

- **Nhắn Zalo** → `https://zalo.me/0399995729` (nút chính)
- **Nhắn Messenger** → `https://m.me/laan.plantstore`
- **Gọi** → `tel:0399995729`

Kèm nút "Sao chép nội dung" tạo sẵn tin nhắn có tên sản phẩm. Ngoài ra có **thanh liên hệ nổi**
(Zalo / Messenger / gọi) ở góc phải màn hình.

Số điện thoại/link được ghi trực tiếp trong `index.html` — sửa ở: các thẻ `.contact-fab`,
modal `#orderModal`, footer, và biến `ZALO` trong `<script>`.

Nâng cấp tương lai: `worker/` chứa sẵn cầu nối tạo đơn thẳng vào KiotViet (xem `worker/README.md`),
đang chờ bật Public API bên KiotViet.

## Ghi chú

- Font dùng Google Fonts (Cormorant Garamond, Jost) — cần kết nối mạng khi xem.
- Trang thiết kế theo tông blush / hồng / gold, hỗ trợ responsive và `prefers-reduced-motion`.
- Sản phẩm trên trang hiện là hàng mẫu — thay bằng các set quà 20/10 thật khi chốt.
