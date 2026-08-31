/**
 * KiotViet order bridge — Cloudflare Worker
 * -----------------------------------------
 * Nhận đơn từ form trên landing page (laan.info) và tạo Đơn đặt hàng trong KiotViet
 * qua Public API. Giữ client_secret ở phía server (biến môi trường), không lộ ra trình duyệt.
 *
 * ENDPOINTS
 *   POST /order          -> tạo đơn.  Body JSON:
 *                           { name, phone, address, note,
 *                             items: [ { code: "<mã SP trong KiotViet>", quantity: 1 } ],
 *                             company: ""   // honeypot, để trống }
 *   GET  /setup?key=...   -> trả về danh sách chi nhánh + sản phẩm (để lấy branchId, mã SP).
 *                           Chỉ dùng lúc cài đặt, cần đúng SETUP_KEY.
 *   GET  /health         -> "ok"
 *
 * BIẾN MÔI TRƯỜNG (Cloudflare > Worker > Settings > Variables)
 *   KIOTVIET_CLIENT_ID       (Secret)  - từ KiotViet: Thiết lập > Kết nối API
 *   KIOTVIET_CLIENT_SECRET   (Secret)
 *   KIOTVIET_RETAILER        (Text)    - tên gian hàng (retailer), vd "laanshop"
 *   KIOTVIET_BRANCH_ID       (Text)    - id chi nhánh bán, lấy từ /setup
 *   SETUP_KEY                (Secret)  - chuỗi ngẫu nhiên bạn tự đặt, để bảo vệ /setup
 *   ALLOWED_ORIGINS          (Text)    - "https://laan.info,https://www.laan.info"
 */

const TOKEN_URL = "https://id.kiotviet.vn/connect/token";
const API_BASE = "https://public.kiotapi.com";

// Cache token trong phạm vi 1 isolate (đủ tốt; token KiotViet dùng lại được).
let _token = null; // { value, exp }

async function getToken(env) {
  const now = Date.now();
  if (_token && _token.exp > now + 60_000) return _token.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.KIOTVIET_CLIENT_ID,
    client_secret: env.KIOTVIET_CLIENT_SECRET,
    scopes: "PublicApi.Access",
  });

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Token ${r.status}: ${txt}`);
  const j = JSON.parse(txt);
  _token = { value: j.access_token, exp: now + (j.expires_in || 3600) * 1000 };
  return _token.value;
}

async function kv(env, path, init = {}) {
  const token = await getToken(env);
  const r = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      Retailer: env.KIOTVIET_RETAILER,
    },
  });
  const txt = await r.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw new Error(`KiotViet ${path} ${r.status}: ${txt}`);
  return data;
}

function corsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || "https://laan.info")
    .split(",").map((s) => s.trim());
  const allow = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(headers || {}) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const ch = corsHeaders(env, origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: ch });
    if (url.pathname === "/health") return new Response("ok", { headers: ch });

    try {
      // ---- Cài đặt: lấy branchId + mã sản phẩm ----
      if (url.pathname === "/setup" && request.method === "GET") {
        if (!env.SETUP_KEY || url.searchParams.get("key") !== env.SETUP_KEY)
          return json({ error: "forbidden" }, 403, ch);
        const branches = await kv(env, "/branches");
        const products = await kv(env, "/products?pageSize=200&orderBy=name");
        return json({
          branches: (branches.data || []).map((b) => ({ id: b.id, name: b.branchName })),
          products: (products.data || []).map((p) => ({
            id: p.id, code: p.code, name: p.fullName || p.name, basePrice: p.basePrice,
          })),
        }, 200, ch);
      }

      // ---- Tạo đơn ----
      if (url.pathname === "/order" && request.method === "POST") {
        let body;
        try { body = await request.json(); }
        catch { return json({ ok: false, error: "JSON không hợp lệ" }, 400, ch); }

        // Honeypot: bot thường điền mọi field.
        if (body.company) return json({ ok: true, orderCode: null }, 200, ch);

        const name = String(body.name || "").trim();
        const phone = String(body.phone || "").trim().replace(/\s+/g, "");
        const address = String(body.address || "").trim();
        const note = String(body.note || "").trim();
        const items = Array.isArray(body.items) ? body.items : [];

        if (name.length < 2) return json({ ok: false, error: "Vui lòng nhập họ tên" }, 400, ch);
        if (!/^(0|\+84)\d{8,10}$/.test(phone))
          return json({ ok: false, error: "Số điện thoại không hợp lệ" }, 400, ch);
        if (address.length < 6) return json({ ok: false, error: "Vui lòng nhập địa chỉ nhận hàng" }, 400, ch);
        if (items.length === 0) return json({ ok: false, error: "Chưa chọn sản phẩm" }, 400, ch);

        // Lấy giá & id thật từ KiotViet theo mã SP (không tin giá do client gửi).
        const orderDetails = [];
        for (const it of items) {
          const code = String(it.code || "").trim();
          const qty = Math.max(1, Math.min(999, parseInt(it.quantity, 10) || 1));
          if (!code) continue;
          let p;
          try { p = await kv(env, `/products/code/${encodeURIComponent(code)}`); }
          catch { return json({ ok: false, error: `Không tìm thấy sản phẩm: ${code}` }, 400, ch); }
          orderDetails.push({
            productId: p.id,
            productCode: p.code,
            productName: p.fullName || p.name,
            isMaster: true,
            quantity: qty,
            price: p.basePrice,
          });
        }
        if (orderDetails.length === 0)
          return json({ ok: false, error: "Sản phẩm không hợp lệ" }, 400, ch);

        const payload = {
          branchId: Number(env.KIOTVIET_BRANCH_ID),
          purchaseDate: new Date().toISOString(),
          description: "Đơn từ landing 20/10" + (note ? ` — ${note}` : ""),
          makeInvoice: false,
          orderDetails,
          customer: { name, contactNumber: phone, address },
          orderDelivery: { receiver: name, contactNumber: phone, address },
        };

        const created = await kv(env, "/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const orderCode = created?.code || created?.data?.code || null;
        return json({ ok: true, orderCode }, 200, ch);
      }

      return json({ error: "not found" }, 404, ch);
    } catch (err) {
      return json({ ok: false, error: "Lỗi hệ thống, vui lòng thử lại hoặc gọi hotline." }, 502, {
        ...ch,
        "X-Debug": String(err.message || err).slice(0, 200),
      });
    }
  },
};
