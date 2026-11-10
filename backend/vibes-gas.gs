/*************************************************************
 * バイブスジャパン vol.8 ｜ 申込フォーム バックエンド (Google Apps Script)
 *
 * 役割：
 *   1) LPフォームから送られた申込データを Googleスプレッドシート に保存
 *   2) シリアル番号を発番
 *   3) 入場用QRコードを生成
 *   4) 申込者へ自動返信メール（QR＋当日案内）を送信
 *   5) LPへ { ok, serial, qrUrl } を返却 → サンクス画面にQR表示
 *
 * セットアップ手順は BACKEND.md を参照してください。
 *************************************************************/

/* ============ 設定（ここを編集） ============ */
var CONFIG = {
  SHEET_ID:   '',                 // ← 保存先スプレッドシートのID（URLの /d/ と /edit の間）
  SHEET_NAME: '申込',             // シート（タブ）名
  MAIL_FROM_NAME: 'バイブスジャパン運営事務局',
  EVENT_NAME: 'バイブスジャパン vol.8',
  EVENT_DATE: '2027年2月13日（土）',
  EVENT_PLACE: 'なんばHatch（大阪市浪速区湊町1-3-1）',
  CC_TO_ORGANIZER: '',            // 申込通知を運営にも送る場合はメールアドレス（不要なら空）
  CHECKIN_KEY: 'CHANGE-ME-1234'   // ← 受付チェックイン画面の合言葉（推測されにくい文字列に変更）
};

/* ============ POST受信（LPからの申込） ============ */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── 受付チェックインAPI（外部の受付ページ checkin-web.html から呼び出し） ──
    if (data.action) {
      if (data.key !== CONFIG.CHECKIN_KEY) return json({ ok: false, error: '合言葉が違います' });
      if (data.action === 'lookup') return json(lookupSerial(data.serial));
      if (data.action === 'mark')   return json(markEntered(data.serial));
      if (data.action === 'stats')  return json(getStats());
      return json({ ok: false, error: 'unknown action' });
    }

    // 必須チェック
    var required = ['name', 'kana', 'university', 'faculty', 'department', 'grade', 'email', 'tel'];
    for (var i = 0; i < required.length; i++) {
      if (!data[required[i]] || String(data[required[i]]).trim() === '') {
        return json({ ok: false, error: '必須項目が未入力です: ' + required[i] });
      }
    }

    var sheet = getSheet_();
    var serial = makeSerial_(sheet);
    var purpose = Array.isArray(data.purpose) ? data.purpose.join(' / ') : (data.purpose || '');
    var schoolFull = [data.university, data.faculty, data.department, data.grade].filter(function (x) { return x; }).join(' ');
    var now = new Date();

    // 1行追記（列構成は getSheet_ のヘッダーと対応）
    sheet.appendRow([
      now,                       // 受付日時
      serial,                    // シリアル番号
      data.name,                 // 氏名
      data.kana,                 // フリガナ
      data.university,           // 大学・学校名
      data.faculty,             // 学部
      data.department,          // 学科
      data.grade,               // 学年
      data.email,                // メール
      data.tel,                  // 電話
      purpose,                   // 参加目的
      data.formType || '',       // フォーム種別 (quick/main)
      '未入場'                    // 当日ステータス
    ]);

    // 電話番号の先頭0が消えないよう、電話列(10列目)を文字列として書き直す
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 10).setNumberFormat('@').setValue(String(data.tel));

    // QRコード（シリアルをエンコード）
    var qrUrl = buildQrUrl_(serial);

    // 自動返信メール
    sendConfirmMail_(data, serial, qrUrl);

    // 運営へ通知（任意）
    if (CONFIG.CC_TO_ORGANIZER) {
      MailApp.sendEmail(CONFIG.CC_TO_ORGANIZER,
        '【新規申込】' + CONFIG.EVENT_NAME + ' / ' + data.name + '様',
        '氏名: ' + data.name + '\nフリガナ: ' + data.kana + '\n所属: ' + schoolFull +
        '\nメール: ' + data.email + '\n電話: ' + data.tel + '\n目的: ' + purpose +
        '\nシリアル: ' + serial);
    }

    return json({ ok: true, serial: serial, qrUrl: qrUrl });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ============ GET受信（動作確認 ＆ 受付チェックイン画面） ============ */
function doGet(e) {
  // 申込数（LPの残席メーター用）。個人情報は返さず、人数だけ返す
  if (e && e.parameter && e.parameter.action === 'count') {
    return json({ ok: true, count: Math.max(0, getSheet_().getLastRow() - 1) });
  }
  var page = e && e.parameter ? e.parameter.page : '';
  if (page === 'checkin') {
    // 合言葉チェック
    if (!e.parameter.key || e.parameter.key !== CONFIG.CHECKIN_KEY) {
      return HtmlService.createHtmlOutput('<h2 style="font-family:sans-serif">アクセスできません（合言葉が違います）</h2>');
    }
    return HtmlService.createHtmlOutputFromFile('checkin')
      .setTitle('受付チェックイン｜' + CONFIG.EVENT_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return json({ ok: true, message: 'VIBES JAPAN vol.8 backend is running.' });
}

/* ============ 受付チェックイン用（HTMLから google.script.run で呼び出し） ============ */

// シリアルで申込者を検索
function lookupSerial(serial) {
  serial = String(serial || '').trim().toUpperCase();
  if (!serial) return { found: false, error: 'シリアルが空です' };
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][1]).trim().toUpperCase() === serial) {
      return {
        found: true, row: r + 1, serial: values[r][1],
        name: values[r][2], kana: values[r][3],
        school: [values[r][4], values[r][5], values[r][6], values[r][7]].filter(function (x) { return x; }).join(' '),
        status: values[r][12] || '未入場',
        enteredAt: values[r][13] ? Utilities.formatDate(new Date(values[r][13]), 'Asia/Tokyo', 'HH:mm') : ''
      };
    }
  }
  return { found: false, serial: serial };
}

// 入場済みにする
function markEntered(serial) {
  var res = lookupSerial(serial);
  if (!res.found) return { ok: false, error: '該当データが見つかりません', serial: serial };
  var sheet = getSheet_();
  // ヘッダーに入場時刻列(14列目)が無ければ用意
  if (sheet.getRange(1, 14).getValue() === '') sheet.getRange(1, 14).setValue('入場時刻');
  if (res.status === '入場済') {
    return { ok: true, already: true, name: res.name, school: res.school, enteredAt: res.enteredAt, message: 'この方は既に入場済みです' };
  }
  var now = new Date();
  sheet.getRange(res.row, 13).setValue('入場済');       // 当日ステータス列
  sheet.getRange(res.row, 14).setValue(now);            // 入場時刻列
  return { ok: true, already: false, name: res.name, school: res.school, enteredAt: Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm') };
}

// 集計（入場済 / 総申込）
function getStats() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var total = 0, entered = 0;
  for (var r = 1; r < values.length; r++) {
    if (!values[r][1]) continue;
    total++;
    if (String(values[r][12]) === '入場済') entered++;
  }
  return { total: total, entered: entered };
}

/* ============ ヘルパー ============ */

// シート取得（無ければ作成＆ヘッダー付与）
function getSheet_() {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['受付日時', 'シリアル番号', '氏名', 'フリガナ', '大学・学校名', '学部', '学科', '学年', 'メール', '電話', '参加目的', 'フォーム種別', '当日ステータス']);
    sheet.setFrozenRows(1);
    // 電話列(10列目)を文字列書式にして先頭0を保持
    sheet.getRange(1, 10, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
  return sheet;
}

// シリアル発番：VJ8-XXXXXX（申込順の連番ベース＋衝突しにくい形式）
function makeSerial_(sheet) {
  var count = sheet.getLastRow(); // ヘッダー込み
  var seq = ('0000' + count).slice(-4);
  var rand = Math.floor(10 + Math.random() * 89);
  return 'VJ8-' + seq + rand;
}

// QRコード画像URL（シリアルをエンコード）
// ※第三者QRサービスを利用。自社ホスティングしたい場合はBACKEND.md参照
function buildQrUrl_(serial) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=' + encodeURIComponent(serial);
}

// 自動返信メール（QRインライン埋め込み）
function sendConfirmMail_(data, serial, qrUrl) {
  var subject = '【参加確定】' + CONFIG.EVENT_NAME + ' 参加申込を受け付けました';
  var qrBlob = null;
  try {
    qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName('qr.png');
  } catch (e) { /* 取得失敗時は画像なしで続行 */ }

  var html =
    '<div style="font-family:sans-serif;max-width:520px;margin:auto;color:#222;line-height:1.8">' +
      '<div style="background:#0A0A0A;color:#fff;padding:20px;text-align:center;border-radius:12px 12px 0 0">' +
        '<div style="font-size:20px;font-weight:900">' + CONFIG.EVENT_NAME + '</div>' +
        '<div style="color:#ff5a68;font-weight:700;margin-top:4px">学歴で生きるな、バイブスで生きろ。</div>' +
      '</div>' +
      '<div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px">' +
        '<p>' + escapeHtml_(data.name) + ' 様</p>' +
        '<p>この度は「' + CONFIG.EVENT_NAME + '」へのお申し込み、誠にありがとうございます。<br>参加が確定しました。当日は下記のQRコードで受付を行います。</p>' +
        (qrBlob ?
          '<div style="text-align:center;margin:24px 0">' +
            '<img src="cid:qrcode" width="200" height="200" style="border:8px solid #fff;border-radius:8px"><br>' +
            '<div style="font-weight:900;letter-spacing:1px;margin-top:8px">シリアルNo. ' + serial + '</div>' +
          '</div>'
          :
          '<div style="text-align:center;margin:24px 0;font-weight:900">シリアルNo. ' + serial + '</div>'
        ) +
        '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">' +
          row_('日時', CONFIG.EVENT_DATE) +
          row_('会場', CONFIG.EVENT_PLACE) +
          row_('参加費', '学生無料') +
        '</table>' +
        '<p style="font-size:12px;color:#888;margin-top:20px">※本メールは自動送信です。当日はこのQRコードを受付でご提示ください。<br>ご不明点は本メールにご返信ください。</p>' +
      '</div>' +
    '</div>';

  var options = {
    name: CONFIG.MAIL_FROM_NAME,
    htmlBody: html
  };
  if (qrBlob) options.inlineImages = { qrcode: qrBlob };

  GmailApp.sendEmail(data.email, subject, 'メールはHTMLでご覧ください。シリアルNo. ' + serial, options);
}

function row_(k, v) {
  return '<tr><th style="text-align:left;padding:6px 10px;background:#f7f7f7;width:80px;border:1px solid #eee">' + k +
         '</th><td style="padding:6px 10px;border:1px solid #eee">' + v + '</td></tr>';
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
