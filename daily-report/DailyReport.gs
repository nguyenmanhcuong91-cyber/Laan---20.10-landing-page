/**
 * Laan 20.10 — Báo cáo tổng hợp GA4 + Microsoft Clarity hàng ngày
 * ================================================================
 * Chạy 1 lần/ngày (qua trigger), gửi 1 email tổng hợp số liệu NGÀY HÔM QUA:
 * lượt truy cập, phễu hành vi (thêm giỏ → đặt hàng), doanh thu, nguồn khách,
 * thiết bị (từ GA4) + hành vi thao tác (từ Clarity).
 *
 * ============== CÀI ĐẶT (làm 1 lần) ==============
 * 1. Vào https://script.google.com → New project → xoá code mẫu → dán toàn bộ file này vào.
 * 2. Đổi tên project (góc trên trái) thành "Laan Daily Report" cho dễ nhận.
 * 3. Bật dịch vụ GA4: menu trái "Services" → bấm dấu (+) → chọn
 *    "Google Analytics Data API" → Add.
 * 4. Điền đủ 3 giá trị trong CONFIG bên dưới (xem hướng dẫn lấy từng giá trị ở cuối file).
 * 5. Ở thanh công cụ trên cùng, chọn hàm "testRun" trong dropdown → bấm ▶ Run.
 *    Lần đầu Google sẽ hỏi cấp quyền (Authorize) → chọn tài khoản → Advanced →
 *    "Go to Laan Daily Report (unsafe)" → Allow.  (Đây là script CỦA BẠN, tự viết
 *    và tự chạy trong tài khoản của bạn — không gửi dữ liệu cho ai khác.)
 * 6. Kiểm tra email đã nhận được báo cáo thử chưa.
 * 7. Đặt lịch chạy tự động: menu trái hình đồng hồ "Triggers" → "+ Add Trigger":
 *      - Choose function to run: sendDailyReport
 *      - Select event source: Time-driven
 *      - Select type of time based trigger: Day timer
 *      - Select time of day: 8am to 9am (tuỳ bạn)
 *    → Save.
 *
 * Từ đó mỗi sáng bạn sẽ tự nhận được email báo cáo ngày hôm trước.
 */

var CONFIG = {
  // Admin (bánh răng) > Property Settings > Property ID — là 1 dãy SỐ, KHÔNG phải "G-XXXXXXXXXX"
  GA4_PROPERTY_ID: 'REPLACE_GA4_PROPERTY_ID',

  // Clarity > Settings > Data export > API tokens > + Add
  CLARITY_TOKEN: 'REPLACE_CLARITY_API_TOKEN',

  // Email nhận báo cáo mỗi ngày
  RECIPIENT_EMAIL: 'REPLACE_EMAIL@example.com',

  SITE_NAME: 'Laan — 20.10 Landing (laan.info)',
  TIMEZONE: 'Asia/Ho_Chi_Minh'
};

function sendDailyReport() {
  var y = new Date();
  y.setDate(y.getDate() - 1);
  var dateLabel = Utilities.formatDate(y, CONFIG.TIMEZONE, 'dd/MM/yyyy');

  var ga = fetchGA4Summary_();
  var clarity = fetchClaritySummary_();
  var html = buildEmailHtml_(dateLabel, ga, clarity);

  MailApp.sendEmail({
    to: CONFIG.RECIPIENT_EMAIL,
    subject: '📊 Báo cáo ' + CONFIG.SITE_NAME + ' — ' + dateLabel,
    htmlBody: html
  });
}

// Dùng để chạy thử thủ công lúc thiết lập.
function testRun() {
  sendDailyReport();
}

/* ===================== GOOGLE ANALYTICS 4 ===================== */

function fetchGA4Summary_() {
  var property = 'properties/' + CONFIG.GA4_PROPERTY_ID;
  var yesterday = { startDate: 'yesterday', endDate: 'yesterday' };

  var overview = {};
  try {
    var basicReq = {
      dateRanges: [yesterday],
      metrics: [
        { name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' },
        { name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }
      ]
    };
    var basicResp = AnalyticsData.Properties.runReport(basicReq, property);
    var names1 = basicReq.metrics.map(function (m) { return m.name; });
    var row1 = basicResp.rows && basicResp.rows[0];
    if (row1) row1.metricValues.forEach(function (v, i) { overview[names1[i]] = v.value; });
  } catch (e) { overview.error = String(e); }

  // Doanh thu tách riêng — nếu tên metric sai/không hỗ trợ thì không ảnh hưởng phần trên.
  try {
    var revReq = {
      dateRanges: [yesterday],
      metrics: [{ name: 'purchaseRevenue' }, { name: 'transactions' }]
    };
    var revResp = AnalyticsData.Properties.runReport(revReq, property);
    var names2 = revReq.metrics.map(function (m) { return m.name; });
    var row2 = revResp.rows && revResp.rows[0];
    if (row2) row2.metricValues.forEach(function (v, i) { overview[names2[i]] = v.value; });
  } catch (e) { overview.revenueError = String(e); }

  var events = {};
  try {
    var evReq = {
      dateRanges: [yesterday],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
    };
    var evResp = AnalyticsData.Properties.runReport(evReq, property);
    (evResp.rows || []).forEach(function (r) {
      events[r.dimensionValues[0].value] = Number(r.metricValues[0].value);
    });
  } catch (e) { events.error = String(e); }

  var sources = [];
  try {
    var srcReq = {
      dateRanges: [yesterday],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5
    };
    var srcResp = AnalyticsData.Properties.runReport(srcReq, property);
    (srcResp.rows || []).forEach(function (r) {
      sources.push([r.dimensionValues[0].value, r.metricValues[0].value]);
    });
  } catch (e) {}

  var devices = [];
  try {
    var devReq = {
      dateRanges: [yesterday],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }]
    };
    var devResp = AnalyticsData.Properties.runReport(devReq, property);
    (devResp.rows || []).forEach(function (r) {
      devices.push([r.dimensionValues[0].value, r.metricValues[0].value]);
    });
  } catch (e) {}

  return { overview: overview, events: events, sources: sources, devices: devices };
}

/* ===================== MICROSOFT CLARITY ===================== */
// Lưu ý: Clarity giới hạn ~10 request/ngày cho mỗi project — 1 lần/ngày là an toàn.
function fetchClaritySummary_() {
  var url = 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1';
  try {
    var resp = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + CONFIG.CLARITY_TOKEN },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) {
      return { error: 'HTTP ' + resp.getResponseCode() + ' — ' + resp.getContentText().slice(0, 300) };
    }
    return { raw: JSON.parse(resp.getContentText()) };
  } catch (e) {
    return { error: String(e) };
  }
}

/* ===================== TẠO NỘI DUNG EMAIL ===================== */

function buildEmailHtml_(dateLabel, ga, clarity) {
  function n(v) { return (v === undefined || v === null) ? '—' : v; }
  function pct(v) { return (v === undefined || v === null) ? '—' : (Number(v) * 100).toFixed(1) + '%'; }
  function sec(v) { return (v === undefined || v === null) ? '—' : Math.round(Number(v)) + ' giây'; }
  function vnd(v) { return (v === undefined || v === null) ? '0₫' : Number(v).toLocaleString('vi-VN') + '₫'; }

  var o = ga.overview || {};
  var ev = ga.events || {};

  function table(rowsArr) {
    var body = rowsArr.map(function (r) {
      return '<tr><td style="padding:5px 10px;border-bottom:1px solid #f1e7ea;">' + r[0] +
        '</td><td style="padding:5px 10px;border-bottom:1px solid #f1e7ea;text-align:right;font-weight:600;color:#9c3b54;">' + r[1] + '</td></tr>';
    }).join('');
    return '<table style="width:100%;border-collapse:collapse;font-size:14px;">' + body + '</table>';
  }

  var overviewTable = table([
    ['Người dùng hoạt động', n(o.activeUsers)],
    ['Người dùng mới', n(o.newUsers)],
    ['Phiên truy cập (sessions)', n(o.sessions)],
    ['Lượt xem trang', n(o.screenPageViews)],
    ['Thời gian phiên trung bình', sec(o.averageSessionDuration)],
    ['Tỉ lệ thoát (bounce rate)', pct(o.bounceRate)]
  ]);

  var funnelTable = table([
    ['Thêm vào giỏ hàng', n(ev.add_to_cart)],
    ['Mở xem giỏ hàng', n(ev.view_cart)],
    ['Bắt đầu đặt hàng', n(ev.begin_checkout)],
    ['Đặt hàng thành công', n(ev.purchase)],
    ['Bấm Zalo / Messenger / Gọi', n(ev.contact_click)],
    ['Đổi ngôn ngữ VI/EN', n(ev.language_change)]
  ]);

  var revenueTable = table([
    ['Doanh thu ghi nhận', vnd(o.purchaseRevenue)],
    ['Số đơn hàng', n(o.transactions)]
  ]);

  var sourcesHtml = ga.sources && ga.sources.length ? table(ga.sources) : '<p style="color:#9a7d88;font-size:13px;">Chưa có dữ liệu.</p>';
  var devicesHtml = ga.devices && ga.devices.length ? table(ga.devices) : '<p style="color:#9a7d88;font-size:13px;">Chưa có dữ liệu.</p>';

  var clarityHtml;
  if (clarity.error) {
    clarityHtml = '<p style="color:#b3453b;font-size:13px;">Không lấy được dữ liệu Clarity: ' + clarity.error + '</p>';
  } else {
    var blocks = clarity.raw || [];
    if (!blocks.length) {
      clarityHtml = '<p style="color:#9a7d88;font-size:13px;">Chưa có dữ liệu (project mới thường cần 24–48h mới có số liệu).</p>';
    } else {
      var rows = blocks.map(function (block) {
        var info = (block.information || [])[0] || {};
        var line = Object.keys(info).map(function (k) {
          return k + ': <b>' + info[k] + '</b>';
        }).join(' &nbsp;·&nbsp; ');
        return '<tr><td style="padding:5px 10px;border-bottom:1px solid #f1e7ea;">' + block.metricName +
          '</td><td style="padding:5px 10px;border-bottom:1px solid #f1e7ea;font-size:12px;">' + (line || '—') + '</td></tr>';
      }).join('');
      clarityHtml = '<table style="width:100%;border-collapse:collapse;font-size:13px;">' + rows + '</table>';
    }
  }

  function h3(t) { return '<h3 style="border-bottom:1px solid #eee;padding-bottom:6px;margin:26px 0 10px;color:#3a232c;font-family:Georgia,serif;">' + t + '</h3>'; }

  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#3a232c;">'
    + '<h2 style="color:#9c3b54;margin-bottom:2px;">📊 Báo cáo ngày ' + dateLabel + '</h2>'
    + '<p style="color:#7a5c68;font-size:13px;margin-top:0;">' + CONFIG.SITE_NAME + '</p>'
    + h3('Tổng quan lượt truy cập') + overviewTable
    + h3('Phễu hành vi mua hàng') + funnelTable
    + h3('Doanh thu') + revenueTable
    + h3('Nguồn truy cập (top 5)') + sourcesHtml
    + h3('Thiết bị') + devicesHtml
    + h3('Hành vi thao tác (Microsoft Clarity)') + clarityHtml
    + '<p style="color:#9a7d88;font-size:12px;margin-top:30px;">Email tự động mỗi ngày. Xem chi tiết đầy đủ tại analytics.google.com và clarity.microsoft.com.</p>'
    + '</div>';
}
