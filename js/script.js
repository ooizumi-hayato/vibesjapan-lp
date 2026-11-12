/* =========================================================
   VIBES JAPAN vol.8  LP  ―  script.js
   - Single-page scroll nav (smooth scroll / hamburger / scrollspy)
   - Photo loader (drop into /assets)
   - Digest video
   - Form validation & inline submit -> Thanks modal
   - Seat meter, count-up, reveal, sticky CTA
   ========================================================= */
(function () {
  'use strict';

  /* ★ バックエンド連携ポイント（未設定＝モック動作） */
  var ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbx1_32P8DwnMSor49zQu7CmARNJ6Cw-8BukcxcNL7VNO3EoBjEGOCvLaVwpQ9YxDOC5/exec'; // ← GASウェブアプリURL

  /* ★ 表記の設定（ここだけ直せば LP の定員まわりの表記が変わる）
     - capacity       … 定員（数）。OUTLINE・実績欄の数字に使う
     - capacityText   … ヒーローの「定員」ピルの文言
     - tickerText     … 画面上部の帯の文言
     - outlineCapacity… OUTLINE の「定員」欄の文言
     - showSeatMeter  … 残席メーターを出すか（true/false）
     - seatMode       … 'live'＝スプレッドシートの申込数をそのまま反映（GAS に count 機能が必要）
                        'manual'＝下の seatManualTaken を手で入れた数で表示
     - seatManualTaken… manual のときの申込済み人数
     - seatShowFrom   … 申込数がこの人数に達するまでメーターを隠す（0＝最初から出す）
     ※ live のときに数が取れなかった場合は、嘘の数を出さずメーターを隠す
     ※ 日本語の本文（index.html の meta description 等）はここでは変わらない */
  var SITE = {
    capacity: 1000,
    capacityText: '1,000名限定',
    tickerText: '定員1,000名限定／学生完全無料・完全事前予約制',
    outlineCapacity: '学生1,000名（完全事前予約制）',
    showSeatMeter: true,
    seatMode: 'live',
    seatManualTaken: 0,
    seatShowFrom: 0
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* =========================================================
     ハンバーガー / ドロワー
     ========================================================= */
  var nav = $('#nav'), burger = $('#burger'), scrim = $('#navScrim');
  function openNav() { nav.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); if (scrim) scrim.hidden = false; }
  function closeNav() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); if (scrim) scrim.hidden = true; }
  if (burger) burger.addEventListener('click', function () { nav.classList.contains('is-open') ? closeNav() : openNav(); });
  if (scrim) scrim.addEventListener('click', closeNav);

  /* =========================================================
     スムーススクロール（ヘッダー分オフセット）＋ナビ閉じ
     ========================================================= */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeNav();
    var headH = ($('.hdr') ? $('.hdr').offsetHeight : 60) + 8;
    var y = target.getBoundingClientRect().top + window.pageYOffset - headH;
    window.scrollTo({ top: y, behavior: 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* =========================================================
     スクロールスパイ（現在地をナビにハイライト）
     ========================================================= */
  var navLinks = $all('.nav a[href^="#"]');
  var linkMap = {};
  navLinks.forEach(function (a) { linkMap[a.getAttribute('href').slice(1)] = a; });
  var spied = Object.keys(linkMap).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  if ('IntersectionObserver' in window && spied.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-current'); });
          var link = linkMap[en.target.id];
          if (link) link.classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spied.forEach(function (s) { spy.observe(s); });
  }

  /* =========================================================
     写真ローダー
     ========================================================= */
  function initPhotos() {
    $all('.photo[data-photo] img').forEach(function (img) {
      function ok() { img.closest('.photo').classList.add('is-loaded'); }
      function ng() { img.closest('.photo').classList.remove('is-loaded'); }
      if (img.complete) { img.naturalWidth > 0 ? ok() : ng(); }
      img.addEventListener('load', ok);
      img.addEventListener('error', ng);
    });
  }

  /* =========================================================
     ロゴローダー（画像があれば画像、無ければテキスト）
     ========================================================= */
  function initLogos() {
    $all('img[data-logo]').forEach(function (img) {
      var wrap = img.closest('[data-logo-wrap]');
      function ok() { if (wrap) wrap.classList.add('logo-ready'); }
      function ng() { if (wrap) wrap.classList.remove('logo-ready'); }
      if (img.complete) { img.naturalWidth > 0 ? ok() : ng(); }
      img.addEventListener('load', ok);
      img.addEventListener('error', ng);
    });
  }

  /* =========================================================
     ダイジェスト映像
     ========================================================= */
  function initMovie() {
    var frame = $('.movie__frame[data-video]');
    if (!frame) return;
    var video = $('.movie__video', frame), playBtn = $('.movie__play', frame), source = $('source', video);
    var src = source ? source.getAttribute('src') : '';
    if (src) {
      var probe = document.createElement('video');
      probe.preload = 'metadata'; probe.muted = true;
      probe.addEventListener('loadedmetadata', function () { frame.classList.add('has-video'); });
      probe.addEventListener('error', function () { frame.classList.add('is-missing'); });
      probe.src = src;
    } else { frame.classList.add('is-missing'); }
    if (playBtn) playBtn.addEventListener('click', function () {
      frame.classList.add('is-playing');
      video.setAttribute('controls', '');
      var p = video.play();
      if (p && p.catch) p.catch(function () { frame.classList.remove('is-playing', 'has-video'); frame.classList.add('is-missing'); });
    });
  }

  /* =========================================================
     バリデーション
     ========================================================= */
  var VALIDATORS = {
    name:       { test: function (v) { return v.trim().length > 0; }, msg: '氏名をご入力ください。' },
    kana:       { test: function (v) { return v.trim().length > 0; }, msg: 'フリガナをご入力ください。' },
    university: { test: function (v) { return v.trim().length > 0; }, msg: '大学・学校名をご入力ください。' },
    faculty:    { test: function (v) { return v.trim().length > 0; }, msg: '学部をご入力ください。' },
    department: { test: function (v) { return v.trim().length > 0; }, msg: '学科をご入力ください。' },
    email:      { test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }, msg: 'メールアドレスの形式が正しくありません。' },
    tel:        { test: function (v) { return /^[0-9\-+()\s]{9,15}$/.test(v.trim()); }, msg: '電話番号を正しくご入力ください。' }
  };
  function validateField(input) {
    var rule = VALIDATORS[input.name]; if (!rule) return true;
    var ok = rule.test(input.value), field = input.closest('.field'), err = field ? field.querySelector('.err') : null;
    if (!ok) { input.classList.add('is-error'); if (err) err.textContent = rule.msg; }
    else { input.classList.remove('is-error'); if (err) err.textContent = ''; }
    return ok;
  }
  function validateForm(form) {
    var valid = true;
    $all('input[name]', form).forEach(function (i) { if (VALIDATORS[i.name] && !validateField(i)) valid = false; });
    // 学年（select）の必須チェック
    $all('select[required]', form).forEach(function (s) {
      var field = s.closest('.field'), err = field ? field.querySelector('.err') : null;
      if (!s.value) { valid = false; s.classList.add('is-error'); if (err) err.textContent = '学年を選択してください。'; }
      else { s.classList.remove('is-error'); if (err) err.textContent = ''; }
    });
    var agree = form.querySelector('input[name="agree"]');
    if (agree) { if (!agree.checked) { valid = false; agree.closest('.agree').style.color = 'var(--red-soft)'; } else { agree.closest('.agree').style.color = ''; } }
    return valid;
  }

  /* =========================================================
     送信
     ========================================================= */
  /* ★ 集客の計測：URLの ?ref=（チャネル）と &src=（団体名・紹介者など）を記憶して、申込と一緒に送る
     - 例：https://vibesjapan.com/?ref=dantai&src=baobab
     - 30日間、その端末で覚える（あとから直接開いて申し込んでも、元のチャネルが残る）
     - 後から別のリンクで来た場合は、新しいほうで上書きする */
  var REF_KEY = 'vj8_ref', REF_DAYS = 30;
  function cleanRef(v) { return String(v || '').replace(/[^0-9A-Za-z_\-぀-ヿ一-鿿]/g, '').slice(0, 40); }
  function captureRef() {
    try {
      var p = new URLSearchParams(location.search);
      var ref = cleanRef(p.get('ref') || p.get('utm_source')), src = cleanRef(p.get('src') || p.get('utm_campaign'));
      if (ref || src) localStorage.setItem(REF_KEY, JSON.stringify({ ref: ref, src: src, t: Date.now() }));
    } catch (e) {}
  }
  function getRef() {
    try {
      var o = JSON.parse(localStorage.getItem(REF_KEY) || 'null');
      if (o && Date.now() - o.t < REF_DAYS * 86400000) return { ref: o.ref || '', src: o.src || '' };
    } catch (e) {}
    return { ref: '', src: '' };
  }
  captureRef();

  function collectData(form) {
    var d = { formType: form.getAttribute('data-form'), name:'', kana:'', university:'', faculty:'', department:'', grade:'', email:'', tel:'', purpose:[], submittedAt:new Date().toISOString() };
    $all('input[name]', form).forEach(function (i) {
      if (i.type === 'checkbox' && i.name === 'purpose') { if (i.checked) d.purpose.push(i.value); }
      else if (i.name && i.name !== 'agree') { d[i.name] = i.value.trim(); }
    });
    $all('select[name]', form).forEach(function (s) { d[s.name] = s.value; });
    var r = getRef(); d.ref = r.ref; d.src = r.src;
    return d;
  }
  function submitToBackend(d) {
    // 未設定＝モック（backendレスポンス無しでフロント生成のQRを表示）
    if (!ENDPOINT_URL) return new Promise(function (r) { setTimeout(function () { r(null); }, 700); });
    // GAS対策：text/plain でCORSプリフライトを回避。返却JSONを読む
    return fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(d)
    }).then(function (res) { return res.json().catch(function () { return null; }); });
  }

  /* =========================================================
     シリアル & QR（モック）
     ========================================================= */
  function makeSerial() { return 'VJ8-' + Math.floor(100000 + Math.random() * 899999); }
  function drawMockQr(container, seed) {
    container.innerHTML = '';
    var size = 21, cell = 116 / size, canvas = document.createElement('canvas');
    canvas.width = 116; canvas.height = 116;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 116, 116); ctx.fillStyle = '#0A0A0A';
    var h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    function rnd() { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; }
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (rnd() > 0.5) ctx.fillRect(x * cell, y * cell, cell, cell);
    function finder(px, py) { ctx.fillStyle = '#0A0A0A'; ctx.fillRect(px, py, cell*7, cell*7); ctx.fillStyle = '#fff'; ctx.fillRect(px+cell, py+cell, cell*5, cell*5); ctx.fillStyle = '#0A0A0A'; ctx.fillRect(px+cell*2, py+cell*2, cell*3, cell*3); }
    finder(0, 0); finder(cell*14, 0); finder(0, cell*14);
    container.appendChild(canvas);
  }

  /* =========================================================
     サンクスモーダル
     ========================================================= */
  var modal = $('#thanksModal');
  function openThanks(resp) {
    // バックエンドが serial / qrUrl を返せばそれを、無ければフロントで生成
    var serial = (resp && resp.serial) ? resp.serial : makeSerial();
    var se = $('#thanksSerial'); if (se) se.textContent = serial;
    var qr = $('#thanksQr');
    if (qr) {
      if (resp && resp.qrUrl) { qr.innerHTML = '<img src="' + resp.qrUrl + '" alt="入場用QRコード" width="116" height="116">'; }
      else { drawMockQr(qr, serial); }
    }
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeThanks() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  if (modal) {
    $all('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeThanks); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeThanks(); closeNav(); } });
  }

  /* =========================================================
     フォーム
     ========================================================= */
  $all('.entry-form').forEach(function (form) {
    $all('input[name]', form).forEach(function (i) {
      i.addEventListener('blur', function () { if (VALIDATORS[i.name]) validateField(i); });
      i.addEventListener('input', function () { if (i.classList.contains('is-error') && VALIDATORS[i.name]) validateField(i); });
    });
    $all('select[name]', form).forEach(function (s) {
      s.addEventListener('change', function () {
        if (s.value) { s.classList.remove('is-error'); var f = s.closest('.field'), e = f ? f.querySelector('.err') : null; if (e) e.textContent = ''; }
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm(form)) { var fe = form.querySelector('.is-error'); if (fe) fe.focus(); return; }
      var btn = form.querySelector('.btn--submit'), label = btn ? btn.querySelector('span') : null, original = label ? label.textContent : '';
      if (btn) { btn.disabled = true; btn.style.opacity = '.75'; } if (label) label.textContent = '送信中…';
      Promise.resolve(submitToBackend(collectData(form)))
        .then(function (resp) {
          if (resp && resp.ok === false) { throw new Error(resp.error || 'error'); }
          form.reset(); openThanks(resp); refreshSeat();
        })
        .catch(function () { alert('送信に失敗しました。通信環境をご確認のうえ、再度お試しください。'); })
        .finally(function () { if (btn) { btn.disabled = false; btn.style.opacity = ''; } if (label) label.textContent = original; });
    });
  });

  /* =========================================================
     残席メーター
     ========================================================= */
  var seatTotal = SITE.capacity, seatTaken = SITE.seatTaken;
  function applySite() {
    $all('[data-site]').forEach(function (el) {
      var v = SITE[el.getAttribute('data-site')];
      if (v !== undefined) el.textContent = (typeof v === 'number') ? v.toLocaleString('ja-JP') : v;
    });
    $all('[data-site-count]').forEach(function (el) {
      var v = SITE[el.getAttribute('data-site-count')];
      if (typeof v === 'number') el.setAttribute('data-count', v);
    });
  }
  function setMeterVisible(v) { $all('.seat-meter').forEach(function (el) { el.style.display = v ? '' : 'none'; }); }
  function renderSeat() {
    var remain = Math.max(0, seatTotal - seatTaken), pct = Math.min(100, seatTaken / seatTotal * 100).toFixed(1) + '%';
    $all('#seatRemainQuick, #seatRemainMain').forEach(function (el) { el.textContent = remain.toLocaleString('ja-JP'); });
    $all('.seat-meter__fill').forEach(function (el) { el.style.setProperty('--pct', pct); });
    $all('[data-seat-label]').forEach(function (el) { el.textContent = SITE.seatMode === 'live' ? 'リアルタイム残席' : '残席'; });
    setMeterVisible(SITE.showSeatMeter && seatTaken >= SITE.seatShowFrom);
  }
  // 申込数を取得して表示を更新（live＝GASの count、manual＝設定値）。取れないときは隠す
  function refreshSeat() {
    if (!SITE.showSeatMeter) { setMeterVisible(false); return; }
    if (SITE.seatMode === 'manual') { seatTaken = SITE.seatManualTaken; renderSeat(); return; }
    if (!ENDPOINT_URL) { setMeterVisible(false); return; }
    fetch(ENDPOINT_URL + '?action=count&t=' + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (j) {
        if (j && j.ok && typeof j.count === 'number') { seatTaken = j.count; renderSeat(); }
        else { setMeterVisible(false); }
      })
      .catch(function () { setMeterVisible(false); });
  }
  applySite();
  refreshSeat();

  /* =========================================================
     カウントアップ & reveal
     ========================================================= */
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    var target = parseInt(el.getAttribute('data-count'), 10), suffix = el.getAttribute('data-suffix') || '', dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('ja-JP') + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var revealEls = $all('.card, .vc, .intro__def, .stat, .speaker, .tt__row, .faq__item, .photo--gallery, .photo--logo, .movie__frame, .outline__list > div');
  revealEls.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          if (en.target.classList.contains('stat')) { var n = en.target.querySelector('.stat__num'); if (n) countUp(n); }
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
    $all('.stat__num').forEach(countUp);
  }

  /* =========================================================
     追従CTA（ヒーローを過ぎ、ENTRY圏外で表示）
     ========================================================= */
  var sticky = $('#stickyCta'), hero = $('#hero'), entry = $('#entry');
  function toggleSticky() {
    if (!sticky) return;
    var pastHero = hero ? (hero.getBoundingClientRect().bottom < 0) : true;
    var inEntry = entry ? (entry.getBoundingClientRect().top < window.innerHeight && entry.getBoundingClientRect().bottom > 120) : false;
    (pastHero && !inEntry) ? sticky.classList.add('is-visible') : sticky.classList.remove('is-visible');
  }
  // 赤シグナル背景：ヒーローを抜けたら全体に薄く表示（ヒーローには出さない）
  var fxSignals = $('.fx-signals');
  function toggleFx() {
    if (!fxSignals || !hero) return;
    var pastHero = hero.getBoundingClientRect().bottom < window.innerHeight * 0.6;
    fxSignals.classList.toggle('is-visible', pastHero);
  }
  window.addEventListener('scroll', function () { toggleSticky(); toggleFx(); }, { passive: true });
  window.addEventListener('resize', function () { toggleSticky(); toggleFx(); });

  /* =========================================================
     実績ギャラリー：開催回タブ切替
     ========================================================= */
  function initGalleryTabs() {
    var tabs = $all('.gtab');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-gtab');
        $all('.gtab').forEach(function (t) {
          var on = (t === tab);
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $all('.gallery__panel').forEach(function (p) {
          var on = (p.getAttribute('data-gpanel') === id);
          p.classList.toggle('is-active', on);
          if (on) { $all('.reveal', p).forEach(function (el) { el.classList.add('is-in'); }); }
        });
      });
    });
  }

  function initHeroMobileImage() {
    var img = $('.hero__bg .photo img');
    if (!img) return;
    var PC = 'assets/fv-bg.jpg';
    var SP = 'assets/fv-bg-sp.jpg';
    var mq = window.matchMedia('(max-width:640px)');
    var spOK = null; // null=未確認 / true / false
    function useSP() { if (img.getAttribute('src') !== SP) img.src = SP; img.classList.add('is-sp'); }
    function usePC() { if (img.getAttribute('src') !== PC) img.src = PC; img.classList.remove('is-sp'); }
    function apply() {
      if (mq.matches) {
        if (spOK === true) { useSP(); }
        else if (spOK === false) { usePC(); }
        else {
          var test = new Image();
          test.onload = function () { spOK = true; if (mq.matches) useSP(); };
          test.onerror = function () { spOK = false; usePC(); };
          test.src = SP;
        }
      } else { usePC(); }
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  function initProfileToggle() {
    $all('.speaker').forEach(function (sp) {
      var desc = $('.speaker__desc:not(.speaker__desc--ph)', sp);
      if (!desc) return;
      if ($('.speaker__toggle', sp)) return; // 二重生成防止
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'speaker__toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'プロフィールを見る';
      desc.parentNode.insertBefore(btn, desc);
      btn.addEventListener('click', function () {
        var open = sp.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? '閉じる' : 'プロフィールを見る';
      });
    });
  }

  function initHeroTitle() {
    var lines = $all('.hero__title .line');
    if (!lines.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0;
    lines.forEach(function (line) {
      var text = line.textContent;
      line.textContent = '';
      Array.prototype.forEach.call(text, function (ch) {
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        if (!reduce) { span.style.transitionDelay = (idx * 0.06) + 's'; }
        line.appendChild(span);
        idx++;
      });
    });
    if (reduce) return;
    var titles = $all('.hero__title');
    titles.forEach(function (t) { t.classList.add('is-armed'); });
    setTimeout(function () {
      $all('.hero__title .char').forEach(function (c) { c.classList.add('is-in'); });
    }, 250);
  }

  function initPastSpeakerTabs() {
    $all('.pspk').forEach(function (section) {
      var tabs = $all('.pstab', section);
      if (!tabs.length) return;
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var id = tab.getAttribute('data-pstab');
          tabs.forEach(function (t) {
            var on = (t === tab);
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          $all('.pspk__panel', section).forEach(function (p) {
            p.classList.toggle('is-active', p.getAttribute('data-pspanel') === id);
          });
        });
      });
    });
  }

  /* =========================================================
     スクロール連動：筆文字が書き写される演出
     ========================================================= */
  function initScrollWrite() {
    var writers = $all('[data-write], [data-write-lines]');
    var fades = $all('[data-fade]');
    if (!writers.length && !fades.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      writers.forEach(function (el) { el.style.setProperty('--p', 1); });
      fades.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    function update() {
      var vh = window.innerHeight;
      writers.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var start = vh * 0.82, end = vh * 0.42;
        var p = (start - r.top) / (start - end);
        p = Math.max(0, Math.min(1, p));
        el.style.setProperty('--p', p.toFixed(3));
        el.classList.toggle('is-writing', p > 0.02 && p < 0.99);
      });
      fades.forEach(function (el) {
        if (el.getBoundingClientRect().top < vh * 0.8) el.classList.add('is-in');
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------- init ---------------- */
  initPhotos();
  initLogos();
  initMovie();
  initGalleryTabs();
  initPastSpeakerTabs();
  initProfileToggle();
  initHeroMobileImage();
  initHeroTitle();
  initScrollWrite();
  toggleSticky();
  toggleFx();

})();
