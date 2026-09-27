/* 나무덤프 화면 */
(function () {
  'use strict';

  // ── 아이콘 ──────────────────────────────────────────────
  const I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    // 셔플: 엇갈려 지나가는 두 화살표
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7h2.6c1.7 0 3.2.9 4.1 2.3l3.6 5.4c.9 1.4 2.4 2.3 4.1 2.3h2.6"/><path d="M3.5 17h2.6c1.7 0 3.2-.9 4.1-2.3l.4-.6"/><path d="M13.4 9.9l.4-.6c.9-1.4 2.4-2.3 4.1-2.3h2.6"/><path d="M17.5 4l3 3-3 3"/><path d="M17.5 14l3 3-3 3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.4 9.8l6-.8z"/></svg>',
    starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.4 9.8l6-.8z"/></svg>',
    // 보관함(최근 본 문서, 즐겨찾기): 펼친 책
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.2 5.2 7.6 4.7 4 5v13c3.6-.3 6.2.2 8 1.5 1.8-1.3 4.4-1.8 8-1.5V5c-3.6-.3-6.2.2-8 1.5z"/><path d="M12 6.5v13"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10l6 6 6-6"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5"/><path d="M6 9v10h4.5v-5h3v5H18V9"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const docUrl = (t, hash) => '/w/' + encodeURIComponent(t) + (hash ? '#' + encodeURIComponent(hash) : '');
  const NS = ['분류', '틀', '파일', '나무위키', '사용자', '휴지통', '특수기능', '위키운영'];
  const nsOf = (t) => { const i = t.indexOf(':'); return i > 0 && NS.includes(t.slice(0, i)) ? t.slice(0, i) : ''; };

  const S = {
    status: null, settings: {}, classMap: { size: {}, align: {} },
    doc: null, bookmarks: new Set(), loadSeq: 0, native: false,
  };

  // ── 서버 호출 ───────────────────────────────────────────
  async function api(path, body) {
    const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    const r = await fetch('/api/' + path, opt);
    let j = null;
    try { j = await r.json(); } catch (e) { j = { error: '응답을 읽지 못했습니다.' }; }
    if (!r.ok && !j.missing) { const err = new Error(j.error || ('HTTP ' + r.status)); err.data = j; err.status = r.status; throw err; }
    return j;
  }

  // ── 진행 막대, 알림 ─────────────────────────────────────
  let progT = null;
  function progress(on) {
    const p = $('#nd-progress');
    clearTimeout(progT);
    if (on) { p.classList.add('run'); p.style.width = '0'; requestAnimationFrame(() => { p.style.width = '70%'; }); }
    else { p.style.width = '100%'; progT = setTimeout(() => { p.classList.remove('run'); p.style.width = '0'; }, 250); }
  }
  let toastT = null;
  function toast(msg) {
    const t = $('#nd-toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ── 테마, 글자 크기 ─────────────────────────────────────
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function resolvedTheme() {
    const t = S.settings.theme || 'system';
    return t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
  }
  const THEME_NAME = { system: '시스템', light: '라이트', dark: '다크' };
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.dataset.theme = t;
    const mode = S.settings.theme || 'system';
    const tb = document.getElementById('nd-theme');
    if (tb) {
      tb.innerHTML = mode === 'light' ? I.sun : mode === 'dark' ? I.moon : I.auto;
      const next = { system: 'light', light: 'dark', dark: 'system' }[mode];
      tb.title = `화면 모드: ${THEME_NAME[mode]} (누르면 ${THEME_NAME[next]})`;
    }
    const segEl = document.querySelector('#nd-modal-b [data-set="theme"]');
    if (segEl) segEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === mode));
    applyDarkStyles(document.querySelector('.nd-content'));
    syncWindowBg();
  }
  // 맥 창 바탕색을 화면 바탕색에 맞춘다(창 크기가 바뀌는 순간 검거나 흰 빈 곳이 보이지 않게)
  let bgSent = '';
  function syncWindowBg() {
    if (!macOn) return;
    let hex = getComputedStyle(document.documentElement).getPropertyValue('--nd-bg').trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(hex)) hex = '#' + hex.slice(1).split('').map((c) => c + c).join('');
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    if (hex === bgSent) return;
    bgSent = hex;
    api('bg', { color: hex }).catch(() => { bgSent = ''; });
  }
  mq.addEventListener && mq.addEventListener('change', applyTheme);
  function applyDarkStyles(root) {
    if (!root) return;
    const dark = resolvedTheme() === 'dark';
    root.querySelectorAll('[data-dark-style]').forEach((el) => {
      if (el.dataset.ndLight === undefined) el.dataset.ndLight = el.getAttribute('style') || '';
      const light = el.dataset.ndLight;
      el.setAttribute('style', dark ? (light ? light.replace(/;?\s*$/, ';') : '') + el.getAttribute('data-dark-style') : light);
    });
  }
  function applyLayout() {
    const r = document.documentElement.style;
    r.setProperty('--nd-fs', (S.settings.font_size || 15) + 'px');
    const w = { narrow: '820px', normal: '1080px', wide: '1500px' }[S.settings.width || 'normal'] || '1080px';
    r.setProperty('--nd-maxw', w);
    setTimeout(() => fitEmbeds(), 60);
  }
  async function saveSettings(patch) {
    Object.assign(S.settings, patch);
    applyLayout(); applyTheme();
    try { S.settings = await api('settings', patch); } catch (e) { /* 무시 */ }
  }

  // 페이지 스크롤 상자(스크롤 위치를 읽고 쓸 때 쓴다)
  function SCR() { return document.scrollingElement || document.documentElement; }

  // ── 라우팅 ──────────────────────────────────────────────
  function go(url, opts) {
    opts = opts || {};
    bnReset();
    saveView();
    const cur = history.state || {};
    const idx = cur.idx || 0;
    history.replaceState(Object.assign({}, cur, { y: SCR().scrollTop }), '');
    if (opts.replace) {
      if (cur.key) pageCache.delete(cur.key);
      history.replaceState({ y: 0, idx, key: cur.key || newKey() }, '', url);
    } else {
      history.pushState({ y: 0, idx: idx + 1, key: newKey() }, '', url); setNavMax(idx + 1);
      navKeys.length = idx + 1;
    }
    navKeys[navIdx()] = history.state.key;
    route(false);
  }

  // ── 읽던 자리 기억 ──────────────────────────────────────
  // 기록마다 key를 붙이고, 그 문서를 떠나기 직전(링크, 뒤로, 앞으로, 쓸기 모두)의 자리를 기억한다.
  // 픽셀 위치만으로는 접기 상태나 늦게 잡히는 배치 때문에 어긋나므로, 화면 맨 위에 걸친 요소의
  // 문서 안 경로와 그 요소가 화면에서 놓여 있던 높이, 문단 접기와 접기 상자 상태를 함께 기억한다.
  const views = new Map();
  let viewKey = null;          // 지금 화면에 그려진 기록의 key(다 그린 뒤에만 채운다)
  function newKey() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function topBarH() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nd-top-h')) || 60; }
  function elPath(root, el) {
    const path = [];
    for (let e = el; e && e !== root; e = e.parentElement) {
      if (!e.parentElement) return null;
      path.unshift(Array.prototype.indexOf.call(e.parentElement.children, e));
    }
    return path;
  }
  function saveView() {
    if (!viewKey) return;
    const v = { y: SCR().scrollTop };
    const content = document.getElementById('nd-content');
    if (content && location.pathname.startsWith('/w/')) {
      const cr = content.getBoundingClientRect();
      const top = topBarH() + 6;
      let el = null;
      // 표나 틀의 빈 곳에 걸리지 않도록 가로 몇 군데를 찔러 본다
      for (const fx of [0.3, 0.5, 0.15, 0.7]) {
        const hit = document.elementFromPoint(cr.left + cr.width * fx, top);
        if (hit && hit !== content && content.contains(hit)) { el = hit; break; }
      }
      if (el) {
        const path = elPath(content, el);
        if (path) { v.path = path; v.top = el.getBoundingClientRect().top; }
      }
      v.collapsed = $$('.nd-h', content).map((h) => h.classList.contains('nd-collapsed'));
      v.open = $$('details', content).map((d) => d.open);
    }
    views.set(viewKey, v);
    keepPage(viewKey, v);
  }
  // ── 튕기기(앱이 직접) ──────────────────────────────────────
  // WebKit의 튕기기는 상단 막대까지 같이 튕겨서 맥 창이 끈다. 대신 맥 창이 넘기는 정밀 스크롤 입력(ND_scroll)을 보고
  // 맨 위, 맨 아래에서 더 당기면 문서 영역(#nd-main)만 당긴 만큼(갈수록 뻑뻑하게) 밀었다가, 손을 떼면 되돌린다.
  // 빠르게 굴려 끝에 부딪혀도 살짝 튕겼다 돌아온다. 입력이 끊기면 무조건 제자리로 돌아간다(굳지 않게).
  // 이동은 CSS translate 속성으로 해서, 쓸기가 쓰는 transform과 겹치지 않는다.
  const PH = { BEGAN: 1, CHANGED: 4, ENDED: 8, CANCELLED: 16, MAYBEGIN: 32 };
  // sc: 굴리는 스크롤 영역, el: 당겨지는 요소. 보통은 문서(#nd-main)이고, 보관함이 열려 있으면 그 목록 상자다.
  // momOk: 앱이 맡은 동작을 끝에서 떨어진 채 놓았다(뒤따르는 관성을 앱이 굴린다)
  const BN = { over: 0, raw: 0, captured: false, anim: 0, idleT: null, flung: false, off: false, hist: [], sc: null, el: null, momOk: false };
  // WebKit(맥)과 같은 느낌의 스프링: 임계 감쇠 x(t) = (x0 + (v0 + ωx0)t)e^(-ωt). 멈춘 상태에서 부드럽게 출발해 스르르 멈춘다
  const SPRING_W = 11;
  // 손가락 아래가 문서 말고 따로 스크롤되는 영역(옆 목차, 넓은 표 등)인가
  function inScrollArea(x, y) {
    const page = SCR();
    for (let el = document.elementFromPoint(x, y); el && el !== document.body && el !== page; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if ((/(auto|scroll|overlay)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) ||
          (/(auto|scroll|overlay)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1)) return true;
    }
    return false;
  }
  // 이번 동작을 누가 튕길지 고른다. 설정 창이 열려 있거나 튕길 곳이 아니면 null
  function bnTarget(x, y) {
    // 설정 창, 보관함이 열려 있으면 그 목록만 튕긴다. 스크롤 막대가 따라 움직이지 않게 스크롤 상자 대신 안의 내용을 민다
    const hit = x != null && document.elementFromPoint(x, y);
    if (!$('#nd-modal').hidden) { const b = $('#nd-modal-sc'); return hit && b.contains(hit) ? { sc: b, el: $('#nd-modal-b') } : null; }
    if (!$('#nd-drawer').hidden) { const b = $('#nd-drawer-b'); return hit && b.contains(hit) ? { sc: b, el: $('#nd-drawer-list') } : null; }
    if (x != null && inScrollArea(x, y)) return null;
    return { sc: SCR(), el: $('#nd-main') };
  }
  function bnApply() {
    const m = BN.el || $('#nd-main');
    m.style.translate = BN.over ? `0 ${BN.over.toFixed(2)}px` : '';
    m.style.willChange = BN.over ? 'translate' : '';     // 움직이는 동안만 그림층으로 만들어 가볍게 옮긴다
  }
  function bnSize() { return (BN.sc && BN.sc.clientHeight) || window.innerHeight; }
  function rubber(raw) { const d = bnSize(), a = Math.abs(raw); return Math.sign(raw) * (1 - 1 / (a * 0.55 / d + 1)) * d; }
  function unrubber(over) { const d = bnSize(), o = Math.min(Math.abs(over), d * 0.99); return Math.sign(over) * (1 / (1 - o / d) - 1) * d / 0.55; }
  function bnCapture() { if (!BN.captured) { BN.captured = true; api('scroll_capture', {}).catch(() => {}); } }
  function bnSpring(x0, v0) {                      // v0: px/s(내용이 움직이는 방향)
    cancelAnimationFrame(BN.anim); clearTimeout(BN.idleT);
    const t0 = performance.now();
    const step = (now) => {
      const t = (now - t0) / 1000, x = (x0 + (v0 + SPRING_W * x0) * t) * Math.exp(-SPRING_W * t);
      if (t > 0.08 && Math.abs(x) < 0.4) { BN.anim = 0; BN.over = 0; BN.raw = 0; bnApply(); return; }
      BN.over = x; BN.raw = unrubber(x); bnApply();
      BN.anim = requestAnimationFrame(step);
    };
    BN.anim = requestAnimationFrame(step);
  }
  // 손을 뗄 때의 속도(최근 60ms)
  function bnVelocity() {
    const now = performance.now(), h = BN.hist.filter((e) => now - e[0] < 60);
    if (h.length < 2) return 0;
    const sum = h.slice(1).reduce((a, e) => a + e[1], 0), dt = (h[h.length - 1][0] - h[0][0]) / 1000;
    return dt > 0 ? sum / dt : 0;
  }
  function bnRelease() {
    clearTimeout(BN.idleT);
    // 늘어난 반대쪽으로 가는 속도만 이어받는다(더 늘리는 쪽 속도는 버린다)
    if (BN.over) { let v = bnVelocity(); if (Math.sign(v) === Math.sign(BN.over)) v = 0; bnSpring(BN.over, v * 0.5); }
  }
  function bnWatch() { clearTimeout(BN.idleT); BN.idleT = setTimeout(() => { if (BN.over && !BN.anim) bnSpring(BN.over, 0); }, 200); }
  function bnReset() { cancelAnimationFrame(BN.anim); clearTimeout(BN.idleT); BN.anim = 0; BN.over = 0; BN.raw = 0; bnApply(); }
  window.ND_scroll = (ph, mph, dx, dy, x, y) => {
    if (SW.mode === 'swipe') return;
    if (ph & (PH.BEGAN | PH.MAYBEGIN)) {
      BN.captured = false; BN.flung = false; BN.momOk = false; BN.hist = [];
      // 다른 스크롤 영역(옆 목차, 넓은 표) 위에서는 이번 동작에 끼어들지 않는다
      const t = bnTarget(x, y);
      BN.off = !t;
      if (t && t.el !== BN.el) { bnReset(); BN.sc = t.sc; BN.el = t.el; }
      if (!BN.off && BN.anim && BN.over) { cancelAnimationFrame(BN.anim); BN.anim = 0; BN.raw = unrubber(BN.over); }   // 되돌아가는 중에 다시 잡음
    }
    if (BN.off) return;
    const sc = BN.sc || SCR();
    const max = sc.scrollHeight - sc.clientHeight;
    const atTop = sc.scrollTop <= 0, atBot = sc.scrollTop >= max - 1;
    if (ph & (PH.BEGAN | PH.CHANGED)) {
      if (!BN.over && Math.abs(dx) > Math.abs(dy) * 1.5) return;          // 거의 가로 움직임은 쓸기, 표에 맡긴다
      BN.hist.push([performance.now(), dy]); if (BN.hist.length > 12) BN.hist.shift();
      if (BN.over || BN.raw || (atTop && dy > 0) || (atBot && dy < 0)) {
        bnCapture();
        cancelAnimationFrame(BN.anim); BN.anim = 0;
        let raw = BN.raw + dy;
        if ((BN.raw > 0 && raw < 0) || (BN.raw < 0 && raw > 0)) { sc.scrollTop -= raw; raw = 0; }   // 되돌아와 지나친 만큼은 문서를 굴린다
        BN.raw = raw; BN.over = rubber(raw); bnApply(); bnWatch();
      } else if (BN.captured) {
        sc.scrollTop -= dy;                                                  // 이번 동작은 앱이 맡았으니 직접 굴린다
      }
      return;
    }
    if (ph & (PH.ENDED | PH.CANCELLED)) { BN.momOk = BN.captured && !BN.over; bnRelease(); return; }
    if (mph && BN.captured) {
      // 앱이 맡은 동작(튕긴 뒤 반대로 굴림 등)은 맥 창이 관성까지 WebKit에 넘기지 않으므로 관성도 앱이 굴린다.
      // 관성으로 끝에 닿으면 그 속도로 튕긴다
      if (!BN.momOk || BN.flung || BN.over || BN.anim) return;
      if ((atTop && dy > 0) || (atBot && dy < 0)) {
        BN.momOk = false;
        if (Math.abs(dy) > 1) { BN.flung = true; bnSpring(0, dy * 60 * 0.55); }
        return;
      }
      sc.scrollTop -= dy;
      return;
    }
    if (mph && !BN.captured && !BN.flung && !BN.over && !BN.anim && ((atTop && dy > 0) || (atBot && dy < 0)) && Math.abs(dy) > 1) {
      // 관성으로 굴러가다 끝에 부딪힘: 그 속도를 이어받아 넘어갔다가 스프링으로 돌아온다. 남은 관성은 앱이 삼킨다
      BN.flung = true; bnCapture();
      bnSpring(0, dy * 60 * 0.55);
    }
  };

  // ── 쓸어서 뒤로, 앞으로 ─────────────────────────────────
  // 맥 창(mac_chrome.py)이 트랙패드, 매직 마우스의 좌우 쓸기를 ND_swipe로 넘긴다.
  // 상단 막대는 그대로 두고 그 아래 문서 영역(#nd-main)만 손가락을 따라 움직이며,
  // 뒤에는 떠날 때 보관해 둔 이전(다음) 문서 화면을 사파리처럼 겹쳐 보인다.
  const navKeys = [];                 // 기록 순번별 key
  const pageCache = new Map();        // key → { frag, side, css, v }  떠날 때 그려져 있던 화면
  const PAGE_CACHE_MAX = 6;
  function keepPage(key, v) {
    const page = $('#nd-page');
    if (!key || !page.firstChild) return;
    const frag = document.createDocumentFragment();
    while (page.firstChild) frag.appendChild(page.firstChild);   // 옮기기만 한다(복사하지 않음)
    const side = $('#nd-side');
    pageCache.delete(key);
    pageCache.set(key, { frag, side: side.hidden ? '' : side.innerHTML, css: $('#nd-wiki-css').textContent, v });
    while (pageCache.size > PAGE_CACHE_MAX) pageCache.delete(pageCache.keys().next().value);
  }
  const SW = { mode: null, dir: 0, off: 0, w: 1, view: null, entry: null, key: null, hist: [], pendingNav: false, anim: false };
  // 애니메이션 시간(app.css의 --nd-t-out, --nd-t-swipe와 같게)
  const ANIM_OUT = 160;
  const SWIPE_MS = 260;
  function swipeView(dir) {
    const key = navKeys[navIdx() + dir];
    const entry = key ? pageCache.get(key) : null;
    const box = document.createElement('div');
    box.className = 'nd-swipe-view ' + (dir < 0 ? 'under' : 'over');
    box.innerHTML = `<div class="nd-swipe-in"><main class="nd-main"><div class="nd-layout"><div class="nd-page"></div>
      <aside class="nd-side"${entry && entry.side ? '' : ' hidden'}><div class="nd-side-in"><div class="nd-side-h">목차</div><nav class="nd-side-toc">${entry ? entry.side : ''}</nav></div></aside></div></main></div>
      <div class="nd-swipe-shade"></div>`;
    if (entry) {
      if (entry.css) { const st = document.createElement('style'); st.textContent = entry.css; box.appendChild(st); }
      box.querySelector('.nd-page').appendChild(entry.frag);
    }
    document.body.appendChild(box);
    if (entry && entry.v) {
      // 떠날 때의 자리: 맨 위에 있던 요소가 같은 높이에 오도록 맞춘다
      const inner = box.querySelector('.nd-swipe-in');
      inner.style.transform = `translateY(${-entry.v.y}px)`;
      const content = box.querySelector('.nd-content');
      let el = content;
      if (el && entry.v.path) for (const i of entry.v.path) el = el && el.children[i];
      if (entry.v.path && el && el.getClientRects().length) {
        const fix = entry.v.top - el.getBoundingClientRect().top;
        inner.style.transform = `translateY(${-entry.v.y + fix}px)`;
      }
      // 옆 목차는 실제 화면에서 위에 붙어 있으므로(sticky) 미리 보기에서도 같은 높이로 내린다
      const side = box.querySelector('.nd-side:not([hidden])');
      if (side) {
        const want = topBarH() + 20, now = side.getBoundingClientRect().top;
        if (now < want) side.style.transform = `translateY(${want - now}px)`;
      }
    }
    SW.key = key; SW.entry = entry;
    return box;
  }
  function swipeApply() {
    const p = Math.min(1, Math.abs(SW.off) / SW.w);
    const main = $('#nd-main');
    if (SW.dir < 0) {           // 뒤로: 지금 문서가 오른쪽으로 밀려나고, 아래에서 이전 문서가 드러난다
      main.style.transform = `translateX(${SW.off}px)`;
      SW.view.style.transform = `translateX(${-0.3 * SW.w * (1 - p)}px)`;
    } else {                    // 앞으로: 다음 문서가 오른쪽에서 덮으며 들어오고, 지금 문서는 살짝 밀린다
      SW.view.style.transform = `translateX(${SW.w * (1 - p)}px)`;
      main.style.transform = `translateX(${-0.3 * SW.w * p}px)`;
    }
    SW.view.style.setProperty('--shade', String(SW.dir < 0 ? (1 - p) * 0.12 : 0));
  }
  function swipeStart(fx, x, y) {
    SW.mode = 'none';
    if (SW.anim || SW.pendingNav) return;
    // 좌우로 스크롤할 수 있는 표 위에서는 넘기지 않고 표를 굴린다
    // 좌우로 스크롤할 수 있는 곳(넓은 표) 위에서는 넘기지 않는다. 스크롤은 WebKit이 그대로 한다.
    const t = wheelTarget(x, y, -fx, 0);
    const page = SCR();
    if (t && t !== page) { SW.mode = 'scroll'; return; }
    const dir = fx > 0 ? -1 : 1;
    if (!$('#nd-modal').hidden || !$('#nd-drawer').hidden) return;
    if (dir < 0 ? navIdx() <= 0 : navIdx() >= navMax()) return;
    closePop(); closeSugg();
    SW.mode = 'swipe'; SW.dir = dir; SW.off = 0; SW.w = window.innerWidth; SW.hist = [];
    $('#nd-main').classList.add('nd-swiping', dir < 0 ? 'on-top' : 'below');
    SW.view = swipeView(dir);
    // 이 쓸기는 앞뒤 이동이므로, 이제부터 이 동작의 입력은 WebKit에 넘기지 말라고 맥 창에 알린다
    if (S.native) api('swipe_lock', {}).catch(() => {});
    swipeMove(fx);
  }
  function swipeMove(fx) {
    if (SW.mode !== 'swipe') return;
    SW.off += fx;
    SW.off = SW.dir < 0 ? Math.max(0, Math.min(SW.w, SW.off)) : Math.min(0, Math.max(-SW.w, SW.off));
    const now = performance.now();
    SW.hist.push([now, SW.off]);
    while (SW.hist.length > 2 && now - SW.hist[0][0] > 100) SW.hist.shift();
    swipeApply();
  }
  function swipeEnd() {
    if (SW.mode !== 'swipe') { SW.mode = null; return; }
    SW.mode = null;
    const h = SW.hist, a = h[0], b = h[h.length - 1];
    const vel = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;   // px/ms, 손가락 방향
    const p = Math.abs(SW.off) / SW.w;
    const toward = SW.dir < 0 ? vel : -vel;                                   // 넘어가는 쪽이 양수
    const commit = p > 0.35 || (p > 0.05 && toward > 0.45);
    SW.anim = true;
    const main = $('#nd-main');
    [main, SW.view].forEach((e) => { e.style.transition = `transform ${SWIPE_MS}ms var(--nd-ease)`; });
    SW.view.classList.add('anim');
    SW.off = commit ? (SW.dir < 0 ? SW.w : -SW.w) : 0;
    swipeApply();
    setTimeout(() => {
      if (commit) {
        SW.pendingNav = true;
        if (SW.dir < 0) history.back(); else history.forward();
      } else {
        swipeReset(true);
      }
    }, SWIPE_MS);
  }
  // 쓸기를 되돌리거나(되돌린 화면은 다시 보관) 넘어간 뒤 정리한다
  function swipeReset(keep) {
    const main = $('#nd-main');
    main.style.transition = 'none'; main.style.transform = '';
    main.classList.remove('nd-swiping', 'on-top', 'below');
    if (SW.view) {
      const page = SW.view.querySelector('.nd-page');
      if (keep && SW.entry && page) { while (page.firstChild) SW.entry.frag.appendChild(page.firstChild); }
      else if (SW.key) pageCache.delete(SW.key);
      SW.view.remove();
    }
    SW.view = null; SW.entry = null; SW.key = null; SW.anim = false; SW.pendingNav = false;
    requestAnimationFrame(() => { main.style.transition = ''; });
  }
  function swipeFinish() { swipeReset(false); }
  window.ND_swipe = (kind, fx, x, y) => {
    if (kind === 'begin') swipeStart(fx, x, y);
    else if (kind === 'move') swipeMove(fx);
    else if (kind === 'end') swipeEnd();
  };

  function restoreView(content, v) {
    if (v.collapsed) {
      const hs = $$('.nd-h', content);
      if (hs.length === v.collapsed.length) hs.forEach((h, i) => { if (h.classList.contains('nd-collapsed') !== v.collapsed[i]) toggleSection(h, v.collapsed[i]); });
    }
    if (v.open) {
      const ds = $$('details', content);
      if (ds.length === v.open.length) ds.forEach((d, i) => { d.open = v.open[i]; });
    }
    fitEmbeds(content);
    let el = content;
    if (v.path) {
      for (const i of v.path) { el = el && el.children[i]; }
    }
    if (v.path && el && el.getClientRects().length) {
      SCR().scrollTo({ top: SCR().scrollTop + el.getBoundingClientRect().top - v.top, behavior: 'instant' });
    } else {
      SCR().scrollTo({ top: v.y, behavior: 'instant' });
    }
  }
  function openDoc(title, hash) { go(docUrl(title, hash)); }

  async function route(isPop) {
    closePop(); closeSugg(); closeFind(true);
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const st = history.state || {};
    const view = isPop ? (views.get(st.key) || (st.y != null ? { y: st.y } : null)) : null;
    viewKey = null;
    updateNavBtns();
    if (!S.status || !S.status.ready) { renderOnboarding(); return; }
    if (path.startsWith('/w/')) {
      let title;
      try { title = decodeURIComponent(path.slice(3)); } catch (e) { title = path.slice(3); }
      let hash = '';
      try { hash = decodeURIComponent(location.hash.slice(1)); } catch (e) { hash = location.hash.slice(1); }
      await loadDoc(title, hash, view);
    } else if (path === '/search') {
      renderSearch(params.get('q') || '');
    } else {
      renderHome();
      if (view) SCR().scrollTo(0, view.y);
    }
    if (!path.startsWith('/w/')) viewKey = st.key || null;
  }
  window.addEventListener('popstate', async () => {
    // 이때 화면에는 아직 떠나는 문서가 그려져 있다
    bnReset();
    saveView();
    navKeys[navIdx()] = history.state && history.state.key;
    await route(true);
    // 쓸어서 넘어온 경우, 새 문서가 자리를 잡은 뒤(두 번 그린 뒤) 미리 보기를 걷는다
    if (SW.pendingNav) requestAnimationFrame(() => requestAnimationFrame(swipeFinish));
  });

  // 뒤로, 앞으로 단추: 기록마다 순번(idx)을 붙이고 가장 앞선 순번을 기억해 갈 곳이 있는지 판단한다.
  // 갈 곳이 없으면 단추를 흐리게 하고 누를 수 없게 한다.
  const NAV_MAX_KEY = 'nd-nav-max';
  function navIdx() { return (history.state && history.state.idx) || 0; }
  function navMax() { try { return +sessionStorage.getItem(NAV_MAX_KEY) || 0; } catch (e) { return navIdx(); } }
  function setNavMax(n) { try { sessionStorage.setItem(NAV_MAX_KEY, String(n)); } catch (e) { /* 무시 */ } }
  function updateNavBtns() {
    $('#nd-back').disabled = navIdx() <= 0;
    $('#nd-fwd').disabled = navIdx() >= navMax();
  }

  // ── 레이아웃 도우미 ─────────────────────────────────────
  function setPage(html, opts) {
    opts = opts || {};
    const page = $('#nd-page');
    page.innerHTML = html;
    $('#nd-side').hidden = !opts.side;
    // 즐겨찾기 단추는 자리를 항상 차지해서 다른 단추가 밀리지 않게 한다
    const star = $('#nd-star');
    star.hidden = false;
    star.style.visibility = opts.star ? 'visible' : 'hidden';
    star.disabled = !opts.star;
    star.tabIndex = opts.star ? 0 : -1;
    $('#nd-wiki-css').textContent = opts.css || '';
    if (!opts.keepScroll) SCR().scrollTo(0, 0);
    return page;
  }
  function skeleton() {
    setPage('<article class="nd-card nd-skel"><i class="t"></i><i style="width:92%"></i><i style="width:86%"></i><i style="width:95%"></i><i style="width:60%"></i><i style="width:90%"></i><i style="width:78%"></i></article>', { keepScroll: true });
  }

  // ── 처음 화면 ───────────────────────────────────────────
  function fmtNum(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function dumpDate() {
    const m = (S.status && S.status.meta) || {};
    const g = m.generated_at_iso || '';
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(g);
    return d ? `${+d[1]}년 ${+d[2]}월 ${+d[3]}일` : '';
  }
  async function renderHome() {
    setTitle('나무덤프', '');
    const st = S.status;
    setPage(`
      <div class="nd-home">
        <div class="nd-hero">
          <div class="nd-hero-logo"></div>
          <h1>나무덤프</h1>
          <p>${dumpDate() ? dumpDate() + ' 덤프, ' : ''}문서 ${fmtNum(st.doc_count)}개</p>
        </div>
        <div class="nd-bigsearch" id="nd-bigsearch">
          <span class="ic">${I.search}</span>
          <input id="nd-bigq" type="search" placeholder="어떤 문서를 찾으세요?" autocomplete="off" spellcheck="false">
          <div class="nd-sugg" id="nd-bigsugg" hidden></div>
        </div>
        <div class="nd-home-actions">
          <button class="nd-btn pri" id="nd-home-random">${I.shuffle}아무 문서나 읽기</button>
          <a class="nd-btn" href="/w/${encodeURIComponent('나무위키')}" data-title="나무위키">${I.doc}나무위키란?</a>
        </div>
        <section class="nd-sect" id="nd-home-recent"></section>
        <section class="nd-sect" id="nd-home-bm"></section>
        <div class="nd-tips">
          <span><kbd>⌘</kbd> <kbd>K</kbd> 검색</span><span><kbd>⌘</kbd> <kbd>[</kbd> <kbd>]</kbd> 뒤로, 앞으로</span>
          <span><kbd>⌘</kbd> <kbd>F</kbd> 문서 안에서 찾기</span><span><kbd>⌘</kbd> <kbd>R</kbd> 아무 문서</span><span><kbd>⌘</kbd> <kbd>+</kbd> <kbd>−</kbd> 글자 크기</span>
        </div>
        <div class="nd-about">
          이 화면의 문서는 나무위키 기여자들이 작성한 것으로, <a class="nd-ext-plain" href="https://creativecommons.org/licenses/by-nc-sa/2.0/kr/" target="_blank" rel="noopener">CC BY-NC-SA 2.0 KR</a>에 따라 이용할 수 있습니다.<br>
          원본 덤프는 읽기 전용으로 엽니다. 덤프에는 이미지 파일이 없어서 이미지 자리에는 설명만 표시합니다.
        </div>
      </div>`, { side: false });
    const bq = $('#nd-bigq');
    attachSuggest(bq, $('#nd-bigsugg'));
    setTimeout(() => bq.focus(), 30);
    $('#nd-home-random').onclick = randomDoc;
    refreshHomeLists();
  }
  async function refreshHomeLists() {
    if (!$('#nd-home-recent')) return;
    try {
      const recOn = S.settings.record_history !== false;
      const [hist, bms] = await Promise.all([recOn ? api('history') : Promise.resolve([]), api('bookmarks')]);
      S.bookmarks = new Set(bms.map((b) => b.title));
      const tiles = (arr, when) => arr.map((x) => `<a class="nd-tile" href="${docUrl(x.title)}" data-title="${esc(x.title)}" title="${esc(x.title)}">${esc(x.title)}<small>${esc(when(x))}</small></a>`).join('');
      $('#nd-home-recent').innerHTML = hist.length
        ? `<div class="nd-sect-h"><h2>최근 본 문서</h2><a id="nd-home-more-h">모두 보기</a></div><div class="nd-tiles">${tiles(hist.slice(0, 12), (x) => ago(x.visited_at))}</div>` : '';
      $('#nd-home-bm').innerHTML = bms.length
        ? `<div class="nd-sect-h"><h2>즐겨찾기</h2><a id="nd-home-more-b">모두 보기</a></div><div class="nd-tiles">${tiles(bms.slice(0, 12), (x) => ago(x.added_at) + ' 추가')}</div>` : '';
      const mh = $('#nd-home-more-h'); if (mh) mh.onclick = () => openDrawer('history');
      const mb = $('#nd-home-more-b'); if (mb) mb.onclick = () => openDrawer('bookmarks');
    } catch (e) { /* 무시 */ }
  }
  function ago(ts) {
    const s = Date.now() / 1000 - ts;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  }

  // ── 시작 안내(덤프가 없을 때) ───────────────────────────
  function renderOnboarding() {
    setTitle('나무덤프', '');
    const st = S.status || {};
    setPage(`
      <div class="nd-card nd-onb">
        <div class="nd-hero-logo"></div>
        <h1>덤프 파일을 연결해 주세요</h1>
        <p>가지고 계신 나무위키 덤프 파일(.sqlite)을 선택하면 바로 읽을 수 있습니다.<br>원본 파일은 읽기만 하고 바꾸지 않습니다.</p>
        ${st.error ? `<div class="err">${esc(st.error)}</div>` : ''}
        <div style="margin-top:20px"><button class="nd-btn pri" id="nd-pick">${I.folder}파일 선택…</button></div>
        <div class="nd-pathrow"><input id="nd-path" placeholder="또는 덤프 파일 경로를 붙여 넣으세요" value="${esc(st.db_path || '')}"><button class="nd-btn" id="nd-open">열기</button></div>
        <p style="margin-top:14px;font-size:13px">외장 드라이브에 둔 파일도 열 수 있습니다. 드라이브를 연결한 뒤 다시 시도하세요.</p>
      </div>`, {});
    $('#nd-pick').onclick = pickDump;
    $('#nd-open').onclick = () => openDumpPath($('#nd-path').value.trim());
    $('#nd-path').onkeydown = (e) => { if (e.key === 'Enter') openDumpPath(e.target.value.trim()); };
  }
  async function pickDump() {
    progress(true);
    try {
      const r = await api('pick');
      if (r.ok) { await refreshStatus(); closeModal(); go('/', { replace: true }); toast('덤프 파일을 열었습니다.'); }
      else if (!r.cancelled) { await refreshStatus(); route(); }
    } finally { progress(false); }
  }
  async function openDumpPath(p) {
    if (!p) return;
    progress(true);
    try {
      const r = await api('open', { path: p });
      await refreshStatus();
      if (r.ok) { closeModal(); go('/', { replace: true }); toast('덤프 파일을 열었습니다.'); }
      else { closeModal(); route(); }
    } finally { progress(false); }
  }
  async function refreshStatus() {
    S.status = await api('status');
    S.settings = S.status.settings || {};
    S.native = !!S.status.native;
    if (S.status.mac_chrome) initMacChrome();
    applyLayout(); applyTheme();
  }

  // ── 맥 창 꾸미기: 제목 표시줄 대신 상단 막대로 창 끌기 ──
  let macOn = false, dragSent = '', dragT = 0;
  function initMacChrome() {
    if (macOn) return;
    macOn = true;
    const root = document.documentElement;
    root.classList.add('nd-mac');
    setTimeout(syncWindowBg, 0);
    window.ND_setFullscreen = (fs) => { root.classList.toggle('nd-fullscreen', !!fs); dragSent = ''; soon(10); };
    const report = () => {
      dragT = 0;
      const bar = $('#nd-topbar');
      let h = 0; const no = [];
      const overlay = !$('#nd-scrim').hidden || !$('#nd-modal').hidden;
      if (!overlay && !root.classList.contains('nd-fullscreen')) {
        h = Math.round(bar.getBoundingClientRect().bottom);
        $$('#nd-topbar button, #nd-topbar a, #nd-topbar input, #nd-search, #nd-sugg:not([hidden])').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
          no.push([Math.floor(r.left) - 2, Math.floor(r.top) - 2, Math.ceil(r.width) + 4, Math.ceil(r.height) + 4]);
        });
      }
      const js = JSON.stringify({ h, no });
      if (js === dragSent) return;
      dragSent = js;
      api('drag_regions', { h, no }).catch(() => { dragSent = ''; });
    };
    const soon = (ms) => { if (!dragT) dragT = setTimeout(report, ms || 120); };
    // 포인터가 상단 막대 근처에 오면 영역을 새로 알린다
    document.addEventListener('mousemove', (e) => { if (e.clientY < 90) soon(60); }, { passive: true });
    window.addEventListener('resize', () => soon(150));
    new MutationObserver(() => soon(80)).observe($('#nd-topbar'), { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'disabled'] });
    ['#nd-scrim', '#nd-modal'].forEach((sel) => new MutationObserver(() => soon(10)).observe($(sel), { attributes: true, attributeFilter: ['hidden'] }));
    report();
  }
  // 오른쪽 클릭 메뉴의 "나무덤프에서 제목 검색"
  window.ND_searchSelection = () => {
    const q = String(window.getSelection() || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (q) go('/search?q=' + encodeURIComponent(q));
  };

  // ── 문서 ────────────────────────────────────────────────
  async function loadDoc(title, hash, view) {
    const seq = ++S.loadSeq;
    // 떠나는 화면은 쓸기 미리 보기용으로 옮겨 두므로 페이지가 비어 있을 수 있다
    if (!S.doc || S.doc.title !== title || !$('#nd-page').firstChild) skeleton();
    progress(true);
    let d;
    try {
      d = await api('doc?title=' + encodeURIComponent(title));
    } catch (e) {
      progress(false);
      if (seq !== S.loadSeq) return;
      if (e.data && e.data.need_dump) { await refreshStatus(); renderOnboarding(); return; }
      setPage(`<article class="nd-card nd-article"><h1 class="nd-title">문서를 표시하지 못했습니다</h1><p>${esc(e.message)}</p></article>`);
      return;
    }
    if (seq !== S.loadSeq) return;
    if (d.missing) { progress(false); renderMissing(d); return; }
    if (d.title !== title) history.replaceState(history.state, '', docUrl(d.title, hash));
    S.doc = d;
    let res;
    try {
      res = window.NamuRender.render(d.html || '', { classMap: S.classMap });
    } catch (e) {
      console.error(e);
      res = null;
    }
    progress(false);
    renderDocPage(d, res, hash, view);
    if (S.settings.record_history !== false) api('history', { title: d.title }).catch(() => {});
  }

  // 창 제목과 상단 막대의 현재 문서 제목
  function setTitle(winTitle, docTitle) {
    document.title = winTitle;
    if (S.native) api('window_title', { title: winTitle }).catch(() => {});
    const bd = document.getElementById('nd-brand-doc');
    if (bd) { bd.textContent = docTitle || ''; bd.title = docTitle ? docTitle + ' (누르면 맨 위로)' : ''; }
    document.getElementById('nd-topbar').classList.remove('show-doc');
    if (titleObs) { titleObs.disconnect(); titleObs = null; }
  }
  let titleObs = null;
  function watchTitle() {
    const h1 = document.querySelector('.nd-article .nd-title');
    const bar = document.getElementById('nd-topbar');
    if (!h1 || !document.getElementById('nd-brand-doc').textContent) return;
    titleObs = new IntersectionObserver(([en]) => {
      bar.classList.toggle('show-doc', !en.isIntersecting && en.boundingClientRect.top < 80);
    }, { rootMargin: '-60px 0px 0px 0px' });
    titleObs.observe(h1);
  }


  function renderDocPage(d, res, hash, view) {
    const title = d.title;
    setTitle(title + ' - 나무덤프', title);
    const cats = res ? res.categories : [];
    const catHtml = cats.length ? `<div class="nd-cats"><span class="lbl">분류</span>${cats.slice(0, 12).map((c) => `<a href="${docUrl(c.title)}" data-title="${esc(c.title)}">${esc(c.name)}</a>`).join('')}${cats.length > 12 ? `<button class="more" id="nd-cat-more">+${cats.length - 12}</button>` : ''}</div>` : '';
    const bm = S.bookmarks.has(title) || d.bookmarked;
    if (bm) S.bookmarks.add(title);
    const page = setPage(`
      <article class="nd-card nd-article" id="nd-article">
        <h1 class="nd-title">${esc(title)}</h1>
        <div class="nd-meta">
          <span>최근 수정 ${esc(d.last_modified || '알 수 없음')}</span>
          <span class="grow"></span>
          <button class="nd-chipbtn${bm ? ' on' : ''}" id="nd-bm-btn">${bm ? I.starOn : I.star}<span>${bm ? '즐겨찾기됨' : '즐겨찾기'}</span></button>
          <button class="nd-chipbtn" id="nd-copy-btn" title="문서 제목 복사">${I.copy}<span>제목 복사</span></button>
          <a class="nd-chipbtn" href="https://namu.wiki/w/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer" title="인터넷의 최신판 보기">${I.ext}<span>나무위키에서 보기</span></a>
        </div>
        ${catHtml}
        <div class="nd-content" id="nd-content"></div>
        <div class="nd-docfoot">이 문서는 ${dumpDate() ? dumpDate() + ' 기준 ' : ''}나무위키 덤프에서 불러온 것입니다. 이후에 바뀐 내용은 반영되어 있지 않습니다.
          원문은 나무위키 기여자들이 작성했으며 <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/kr/" target="_blank" rel="noopener">CC BY-NC-SA 2.0 KR</a> 라이선스를 따릅니다.</div>
      </article>`, { side: !!(S.settings.toc_sidebar && res && res.toc.length > 1), star: true, css: res ? res.css : '', keepScroll: false });
    const content = $('#nd-content', page);
    if (res) {
      content.appendChild(res.fragment);
      if (!content.textContent.trim() && !content.querySelector('img, table')) {
        content.innerHTML = res.hadBody ? '<p class="nd-empty">본문 내용이 없는 문서입니다.</p>' : '<p class="nd-empty">본문을 찾지 못했습니다.</p>';
      }
    } else {
      content.innerHTML = '<p class="nd-empty">이 문서의 HTML을 해석하지 못했습니다.</p>';
    }
    updateStar(bm);
    $('#nd-bm-btn').onclick = toggleBookmark;
    $('#nd-copy-btn').onclick = () => { copyText(title); toast('제목을 복사했습니다.'); };
    const more = $('#nd-cat-more');
    if (more) more.onclick = () => {
      more.parentElement.insertAdjacentHTML('beforeend', cats.slice(12).map((c) => `<a href="${docUrl(c.title)}" data-title="${esc(c.title)}">${esc(c.name)}</a>`).join(''));
      more.remove();
    };
    if (res) {
      buildToc(content, res.toc);
      applyDarkStyles(content);
      setupImages(content);
      setupEmbeds(content);
      requestAnimationFrame(() => fitEmbeds(content));
      checkLinks(content, res.linkTitles);
      setupOnclick(content);
    }
    // 위치 맞추기
    requestAnimationFrame(() => {
      if (view) restoreView(content, view);
      else if (hash) scrollToAnchor(hash, false);
      else SCR().scrollTo(0, 0);
      viewKey = (history.state && history.state.key) || null;
    });
    setupScrollSpy(content);
    watchTitle();
  }

  function renderMissing(d) {
    setTitle(d.title + ' - 나무덤프', '');
    const sugg = d.suggestions || [];
    setPage(`
      <article class="nd-card nd-article nd-missing-page">
        <h1 class="nd-title">${esc(d.title)}</h1>
        <p class="big">이 문서는 덤프에 없습니다. 수집 이후에 생겼거나, 제목이 조금 다를 수 있습니다.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="nd-btn" href="/search?q=${encodeURIComponent(d.title)}" data-route>${I.search}제목에 포함된 문서 찾기</a>
          <a class="nd-btn" href="https://namu.wiki/w/${encodeURIComponent(d.title)}" target="_blank" rel="noopener noreferrer">${I.ext}나무위키에서 보기</a>
        </div>
        ${sugg.length ? `<div class="nd-results"><h2>비슷한 제목</h2><ul class="nd-rlist">${sugg.map((t) => `<li><a href="${docUrl(t)}" data-title="${esc(t)}">${esc(t)}</a></li>`).join('')}</ul></div>` : ''}
      </article>`);
  }

  // 목차
  function buildToc(content, toc) {
    const side = $('#nd-side-toc');
    side.innerHTML = toc.map((t) => `<a href="#${esc(t.id)}" data-anchor="${esc(t.id)}" class="l${t.level}" title="${esc(t.num + '. ' + t.text)}"><span class="n">${esc(t.num)}.</span>${esc(t.text)}</a>`).join('');
    const slots = $$('.nd-toc-slot', content);
    if (!toc.length) { slots.forEach((s) => s.remove()); return; }
    // 중첩 목록 만들기
    const minL = Math.min(...toc.map((t) => t.level));
    let html = '<ol>';
    let depth = 0;
    toc.forEach((t, i) => {
      const lv = t.level - minL;
      if (i === 0) depth = 0;
      while (depth < lv) { html += '<ol>'; depth++; }
      while (depth > lv) { html += '</ol>'; depth--; }
      html += `<li><a href="#${esc(t.id)}" data-anchor="${esc(t.id)}"><span class="n">${esc(t.num)}.</span>${esc(t.text)}</a></li>`;
    });
    while (depth > 0) { html += '</ol>'; depth--; }
    html += '</ol>';
    const nav = `<nav class="nd-toc" id="toc"><div class="nd-toc-t"><span>목차</span><button type="button" data-toc-toggle>접기</button></div>${html}</nav>`;
    if (slots.length) { slots[0].outerHTML = nav; slots.slice(1).forEach((s) => s.remove()); }
    else if (toc.length >= 3) {
      const firstH = content.querySelector('.nd-h');
      if (firstH) firstH.insertAdjacentHTML('beforebegin', nav);
    }
  }

  // 이미지
  // 덤프에는 이미지 파일이 없고 원래 주소도 만료되어서, 늘 자리 표시만 보여 준다.
  function setupImages(root) {
    root.querySelectorAll('img[data-nd-src]').forEach(showPlaceholder);
  }
  // 이미지 자리 표시. 원래 이미지와 같은 크기의 그림(SVG)을 그 자리의 <img>에 그대로 넣어서,
  // 틀 안 배치가 실제 이미지가 있을 때와 똑같이 잡히게 한다.
  function placeholderSrc(w, h, alt) {
    w = Math.max(8, Math.round(w || 120)); h = Math.max(8, Math.round(h || 80));
    const m = Math.min(w, h);
    // 아이콘과 글자 크기는 원래 그림 크기에 비례하게 잡는다(그림 전체가 표시 크기에 맞춰 줄어들기 때문)
    const s = Math.min(m * 0.35, Math.max(28, m * 0.14)) / 17;
    const cx = w / 2;
    let cy = h / 2;
    let text = '';
    if (alt && w >= 140 && h >= 80) {
      const fs = Math.max(11, Math.min(40, w * 0.045));
      const maxChars = Math.max(4, Math.floor((w - 20) / (fs * 0.92)));
      let t = alt.length > maxChars ? alt.slice(0, maxChars - 1) + '…' : alt;
      t = t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
      cy -= fs * 0.7;
      text = `<text x='${cx}' y='${(cy + 13 * s + fs * 1.3).toFixed(1)}' text-anchor='middle' font-family='-apple-system, Apple SD Gothic Neo, sans-serif' font-size='${fs.toFixed(1)}' fill='rgb(127,127,127)' fill-opacity='.85'>${t}</text>`;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      `<rect width='${w}' height='${h}' rx='${Math.min(10, m / 6).toFixed(1)}' fill='rgb(127,127,127)' fill-opacity='.13'/>` +
      `<g transform='translate(${cx} ${cy.toFixed(1)}) scale(${s.toFixed(2)})' fill='none' stroke='rgb(127,127,127)' stroke-opacity='.65' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>` +
      `<rect x='-8.5' y='-7.5' width='17' height='15' rx='2.5'/><circle cx='-3' cy='-2' r='1.6'/><path d='M8 4l-5-5-8 8'/></g>${text}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function showPlaceholder(img) {
    const st = img.getAttribute('style') || '';
    let w = +img.getAttribute('width') || 0, h = +img.getAttribute('height') || 0;
    if (!w || !h) { w = w || 120; h = h || 80; }
    img.classList.add('nd-img-ph');
    img.title = (img.alt || '이미지') + ' (이미지는 덤프에 없습니다)';
    if (!/width:100%|height:100%/.test(st)) { img.setAttribute('width', Math.min(w, 640)); img.setAttribute('height', Math.round(Math.min(w, 640) * h / w)); }
    img.src = placeholderSrc(w, h, img.alt);
  }


  // 표 안의 동영상이 표를 밀어내 오른쪽이 잘리지 않도록 폭을 맞춘다
  function fitEmbeds(root) {
    root = root || document.getElementById('nd-content');
    if (!root) return;
    const embeds = root.querySelectorAll('.nd-embed:not(.nd-embed-map)');
    if (!embeds.length) return;
    embeds.forEach((e) => { e.style.maxWidth = '100%'; });
    const wraps = Array.from(root.querySelectorAll('.nd-tw')).filter((w) => w.querySelector('.nd-embed:not(.nd-embed-map)')).reverse();
    wraps.forEach((w) => {
      const inner = w.querySelectorAll('.nd-embed:not(.nd-embed-map)');
      for (let i = 0; i < 4; i++) {
        const over = w.scrollWidth - w.clientWidth;
        if (over <= 1) break;
        const factor = w.clientWidth / w.scrollWidth;
        inner.forEach((e) => {
          const cur = e.getBoundingClientRect().width;
          e.style.maxWidth = Math.max(160, Math.floor(cur * factor) - 4) + 'px';
        });
      }
    });
  }
  let fitT = null;
  window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => fitEmbeds(), 150); });
  document.addEventListener('toggle', (e) => { if (e.target.tagName === 'DETAILS' && e.target.open) fitEmbeds(); }, true);

  function setupEmbeds(root) {
    root.querySelectorAll('.nd-embed').forEach((b) => {
      const link = b.dataset.link, kind = b.dataset.kind || '외부 콘텐츠';
      if (b.dataset.embed) {
        if (b.dataset.thumb) b.style.backgroundImage = `url("${b.dataset.thumb}")`;
        b.innerHTML = `<div class="ctl"><button class="play" type="button" aria-label="재생">${I.play}</button><span>${esc(kind)} (인터넷 필요)</span>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">브라우저에서 열기</a>` : ''}</div>`;
        b.querySelector('.play').onclick = () => {
          const f = document.createElement('iframe');
          f.src = b.dataset.embed + (b.dataset.embed.includes('?') ? '&' : '?') + 'autoplay=1';
          f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          f.setAttribute('allowfullscreen', '');
          f.referrerPolicy = 'strict-origin-when-cross-origin';
          b.innerHTML = ''; b.appendChild(f);
        };
      } else if (b.dataset.video) {
        b.innerHTML = `<div class="ctl"><button class="play" type="button" aria-label="재생">${I.play}</button><span>${esc(kind)} (인터넷 필요)</span><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">브라우저에서 열기</a></div>`;
        b.querySelector('.play').onclick = () => {
          const v = document.createElement('video');
          v.src = b.dataset.video; v.controls = true; v.autoplay = true; v.playsInline = true;
          b.innerHTML = ''; b.appendChild(v);
        };
      } else {
        b.innerHTML = b.classList.contains('nd-embed-map')
          ? `<div class="ctl">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">지도 보기</a>` : '<span>지도</span>'}</div>`
          : `<div class="ctl"><span>${esc(kind)}</span>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">인터넷에서 열기</a>` : ''}</div>`;
      }
    });
  }

  // 없는 문서 링크 표시
  async function checkLinks(root, titles) {
    if (S.settings.link_check === false || !titles.length) return;
    const seq = S.loadSeq;
    try {
      const r = await api('exists', { titles });
      if (seq !== S.loadSeq) return;
      const ok = new Set(r.exists);
      root.querySelectorAll('a.nd-wl').forEach((a) => {
        if (!ok.has(a.dataset.title)) { a.classList.add('nd-missing'); if (!a.title || a.title === a.dataset.title) a.title = a.dataset.title + ' (덤프에 없는 문서)'; }
      });
    } catch (e) { /* 무시 */ }
  }

  // 위키 CSS의 탭 전환(data-onclick)
  function setupOnclick(root) {
    root.querySelectorAll('[data-nd-onclick]').forEach((el) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        el.getAttribute('data-nd-onclick').split(';').forEach((act) => {
          const [op, sel, cls] = act.split(',');
          if (!sel || !cls) return;
          root.querySelectorAll('.' + CSS.escape(sel)).forEach((t) => {
            if (op === 'add-class') t.classList.add(cls);
            else if (op === 'remove-class') t.classList.remove(cls);
            else if (op === 'toggle-class') t.classList.toggle(cls);
          });
        });
      });
    });
  }

  // 문단 접기
  function sectionRange(h) {
    const lv = +h.dataset.level;
    const out = [];
    let n = h.nextElementSibling;
    while (n) {
      if (n.classList.contains('nd-h') && +n.dataset.level <= lv) break;
      const inner = n.querySelector && n.querySelector(':scope > .nd-h');
      if (inner && +inner.dataset.level <= lv) break;
      out.push(n);
      n = n.nextElementSibling;
    }
    return out;
  }
  function toggleSection(h, force) {
    const collapse = force != null ? force : !h.classList.contains('nd-collapsed');
    h.classList.toggle('nd-collapsed', collapse);
    sectionRange(h).forEach((n) => n.classList.toggle('nd-hidden-by-fold', collapse));
    if (!collapse) {
      // 안쪽에 접혀 있던 하위 문단은 다시 숨긴다
      sectionRange(h).forEach((n) => { if (n.classList.contains('nd-h') && n.classList.contains('nd-collapsed')) sectionRange(n).forEach((m) => m.classList.add('nd-hidden-by-fold')); });
      setTimeout(() => fitEmbeds(), 30);
    }
  }
  function revealAnchor(el) {
    // 접힌 문단이나 접기 상자 안에 있으면 펼친다
    let e = el;
    while (e && e !== document.body) {
      if (e.tagName === 'DETAILS' && !e.open) e.open = true;
      if (e.classList && e.classList.contains('nd-hidden-by-fold')) {
        let p = e.previousElementSibling;
        while (p) { if (p.classList.contains('nd-h') && p.classList.contains('nd-collapsed')) { toggleSection(p, false); break; } p = p.previousElementSibling; }
      }
      e = e.parentElement;
    }
  }

  function findAnchor(id) {
    if (!id) return null;
    const content = $('#nd-content');
    if (!content) return null;
    let el = null;
    try { el = content.querySelector('#' + CSS.escape(id)); } catch (e) { el = null; }
    if (!el) { try { el = content.querySelector('#' + CSS.escape(id.replace(/_/g, ' '))); } catch (e) { el = null; } }
    return el;
  }
  function scrollToAnchor(id, smooth) {
    if (id === 'toc') { const t = $('#toc'); if (t) { t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); } return true; }
    const el = findAnchor(id);
    if (!el) return false;
    revealAnchor(el);
    const target = el.classList.contains('nd-h') ? el : (el.closest('.nd-h') || el);
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: el.classList.contains('nd-fn') ? 'center' : 'start' });
    const flashEl = el.classList.contains('nd-fn') ? el : (el.tagName === 'SPAN' && el.closest('.nd-h') ? null : el);
    if (flashEl && !flashEl.classList.contains('nd-h')) { flashEl.classList.remove('nd-flash'); void flashEl.offsetWidth; flashEl.classList.add('nd-flash'); }
    return true;
  }

  // 스크롤 위치에 맞춰 옆 목차 강조
  let spyHeads = [], spyLinks = new Map(), spyRaf = 0, spyCur = null;
  function setupScrollSpy(content) {
    spyHeads = $$('.nd-h[id]', content);
    spyLinks = new Map($$('#nd-side-toc a').map((a) => [a.dataset.anchor, a]));
    spyCur = null;
    updateSpy();
  }
  function updateSpy() {
    spyRaf = 0;
    if (!spyHeads.length || !spyLinks.size || $('#nd-side').hidden) return;
    let cur = spyHeads[0];
    const line = 90;
    for (const h of spyHeads) {
      if (h.offsetParent === null) continue;
      if (h.getBoundingClientRect().top <= line) cur = h; else break;
    }
    if (cur === spyCur) return;
    spyCur = cur;
    spyLinks.forEach((a) => a.classList.remove('act'));
    const a = spyLinks.get(cur.id);
    if (a) {
      a.classList.add('act');
      const side = $('#nd-side');
      const r = a.getBoundingClientRect(), sr = side.getBoundingClientRect();
      if (r.top < sr.top + 30 || r.bottom > sr.bottom - 30) side.scrollTop += r.top - sr.top - sr.height / 3;
    }
  }
  window.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(updateSpy); }, { passive: true });

  // 즐겨찾기
  function updateStar(on) {
    const b = $('#nd-star');
    b.innerHTML = on ? I.starOn : I.star;
    b.classList.toggle('on', !!on);
    b.title = on ? '즐겨찾기에서 빼기 (⌘D)' : '즐겨찾기에 추가 (⌘D)';
    const bb = $('#nd-bm-btn');
    if (bb) { bb.classList.toggle('on', !!on); bb.innerHTML = (on ? I.starOn : I.star) + `<span>${on ? '즐겨찾기됨' : '즐겨찾기'}</span>`; }
  }
  async function toggleBookmark() {
    if (!S.doc) return;
    const t = S.doc.title;
    const on = !S.bookmarks.has(t);
    if (on) S.bookmarks.add(t); else S.bookmarks.delete(t);
    updateStar(on);
    toast(on ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 뺐습니다.');
    try { await api('bookmark', { title: t, on }); } catch (e) { /* 무시 */ }
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
    else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 무시 */ }
    ta.remove();
  }

  // 외부 링크는 기본 웹 브라우저로 연다(독립 창 모드)
  async function openExternal(url) {
    try {
      const r = await api('open_url', { url });
      if (r.ok) { toast('기본 브라우저에서 열었습니다.'); return; }
    } catch (e) { /* 아래로 */ }
    window.open(url, '_blank');
  }

  async function randomDoc() {
    try { const r = await api('random'); if (r.title) openDoc(r.title); } catch (e) { toast(e.message); }
  }

  // ── 검색 ────────────────────────────────────────────────
  function hl(t, q) {
    if (q && t.startsWith(q)) return `<b>${esc(q)}</b>${esc(t.slice(q.length))}`;
    const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i >= 0) return esc(t.slice(0, i)) + `<b>${esc(t.slice(i, i + q.length))}</b>` + esc(t.slice(i + q.length));
    return esc(t);
  }
  const suggState = new WeakMap();
  function attachSuggest(input, box) {
    const st = { items: [], act: -1, seq: 0, timer: null, typed: '', closed: false };
    suggState.set(input, st);
    // 검색을 실행해 다른 화면으로 넘어가면 검색창을 비운다
    const clearInput = () => { input.value = ''; st.typed = ''; st.items = []; st.act = -1; };
    const render = (q) => {
      // 검색을 이미 실행했거나 입력창을 떠났으면 늦게 도착한 후보는 버린다
      if (!q || st.closed || document.activeElement !== input) { box.hidden = true; return; }
      const nsBadge = (t) => { const n = nsOf(t); return n ? `<span class="ns">${esc(n)}</span>` : ''; };
      box.innerHTML = st.items.map((t, i) => `<a class="nd-sugg-i${i === st.act ? ' act' : ''}" data-i="${i}" href="${docUrl(t)}" data-title="${esc(t)}">${I.doc}<span>${hl(t, q)}</span>${nsBadge(t)}</a>`).join('') +
        `<div class="nd-sugg-foot">${I.search}<a data-search="${esc(q)}">‘${esc(q)}’ 제목 검색 결과 모두 보기</a></div>`;
      box.hidden = false;
    };
    input.addEventListener('input', () => {
      const q = input.value.trim();
      // 한글 조합이 끝날 때도 input 이벤트가 오는데, 내용이 같으면 고른 후보를 유지한다
      if (q === st.typed && st.items.length && !box.hidden) return;
      st.typed = q;
      clearTimeout(st.timer);
      st.closed = false;
      if (!q) { st.items = []; box.hidden = true; return; }
      st.timer = setTimeout(async () => {
        const seq = ++st.seq;
        try {
          const r = await api('suggest?q=' + encodeURIComponent(q));
          if (seq !== st.seq) return;
          if (q !== st.typed) return;
          st.items = r.items; st.act = -1; render(q);
        } catch (e) { /* 무시 */ }
      }, 70);
    });
    input.addEventListener('keydown', (e) => {
      const q = input.value.trim();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (box.hidden || !st.items.length) return;
        e.preventDefault();
        st.act = e.key === 'ArrowDown' ? Math.min(st.items.length - 1, st.act + 1) : Math.max(-1, st.act - 1);
        render(st.typed || q);
        const cur = box.querySelector('.nd-sugg-i.act');
        if (cur) cur.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.isComposing) return;
        const val = st.act >= 0 ? st.items[st.act] : input.value.trim();
        if (!val) return;
        clearTimeout(st.timer); st.seq++; st.closed = true;
        box.hidden = true; input.blur();
        goSearch(val, st.act >= 0);
        clearInput();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!box.hidden) { box.hidden = true; st.act = -1; e.stopPropagation(); } else input.blur();
      }
    });
    input.addEventListener('focus', () => { st.closed = false; if (input.value.trim() && st.items.length && input.value.trim() === st.typed) render(st.typed); });
    input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => {
      if (e.target.closest('.nd-sugg-i')) { st.closed = true; clearTimeout(st.timer); st.seq++; box.hidden = true; input.blur(); clearInput(); }
      const s = e.target.closest('[data-search]');
      if (s) { e.preventDefault(); st.closed = true; box.hidden = true; input.blur(); go('/search?q=' + encodeURIComponent(s.dataset.search)); clearInput(); }
    });
  }
  async function goSearch(q, exactPick) {
    if (exactPick) { openDoc(q); return; }
    try {
      const r = await api('search?q=' + encodeURIComponent(q) + '&limit=1');
      if (r.exact) { openDoc(r.exact); return; }
    } catch (e) { /* 무시 */ }
    go('/search?q=' + encodeURIComponent(q));
  }
  function closeSugg() { $$('.nd-sugg').forEach((b) => { b.hidden = true; }); }

  async function renderSearch(q) {
    setTitle(`‘${q}’ 검색 - 나무덤프`, '');
    setPage(`
      <article class="nd-card nd-article nd-results">
        <h1>‘${esc(q)}’ 검색 결과</h1>
        <div class="sub">문서 제목에서 찾습니다. 본문 내용 검색은 지원하지 않습니다.</div>
        <div id="nd-r-exact"></div>
        <h2>이 말로 시작하는 제목 <span class="cnt" id="nd-r-pc"></span></h2>
        <ul class="nd-rlist" id="nd-r-prefix"><li><span class="nd-spin"></span></li></ul>
        <div id="nd-r-pmore"></div>
        <h2>이 말이 들어간 제목 <span class="cnt" id="nd-r-cc"></span></h2>
        <ul class="nd-rlist" id="nd-r-contains"><li><span class="nd-spin"></span> <span style="color:var(--nd-faint);font-size:13px">처음 검색할 때는 제목 목록을 읽느라 몇 초 걸릴 수 있습니다</span></li></ul>
        <div id="nd-r-cmore"></div>
      </article>`);
    if (!q) return;
    const li = (arr) => arr.map((t) => `<li><a href="${docUrl(t)}" data-title="${esc(t)}">${hl(t, q)}</a></li>`).join('');
    const loadPrefix = async (offset) => {
      const r = await api(`search?q=${encodeURIComponent(q)}&mode=prefix&limit=100&offset=${offset}`);
      if (offset === 0) {
        $('#nd-r-prefix').innerHTML = r.items.length ? li(r.items) : '<li class="nd-empty">없음</li>';
        if (r.exact) $('#nd-r-exact').innerHTML = `<div class="nd-exact">${I.doc}<a href="${docUrl(r.exact)}" data-title="${esc(r.exact)}">${esc(r.exact)}</a><span style="color:var(--nd-muted);font-size:13px">제목이 정확히 일치하는 문서</span></div>`;
      } else $('#nd-r-prefix').insertAdjacentHTML('beforeend', li(r.items));
      $('#nd-r-pc').textContent = $('#nd-r-prefix').querySelectorAll('a').length + (r.more ? '+' : '') + '개';
      $('#nd-r-pmore').innerHTML = r.more ? '<button class="nd-btn" style="margin-top:10px">더 보기</button>' : '';
      const b = $('#nd-r-pmore button'); if (b) b.onclick = () => loadPrefix(offset + 100);
    };
    const loadContains = async (offset) => {
      const r = await api(`search?q=${encodeURIComponent(q)}&mode=contains&limit=200&offset=${offset}`);
      if (offset === 0) $('#nd-r-contains').innerHTML = r.items.length ? li(r.items) : '<li class="nd-empty">없음</li>';
      else $('#nd-r-contains').insertAdjacentHTML('beforeend', li(r.items));
      $('#nd-r-cc').textContent = $('#nd-r-contains').querySelectorAll('a').length + (r.more ? '+' : '') + '개';
      $('#nd-r-cmore').innerHTML = r.more ? '<button class="nd-btn" style="margin-top:10px">더 보기</button>' : '';
      const b = $('#nd-r-cmore button'); if (b) b.onclick = () => loadContains(offset + 200);
    };
    try { await loadPrefix(0); } catch (e) { $('#nd-r-prefix').innerHTML = `<li class="nd-empty">${esc(e.message)}</li>`; }
    try { await loadContains(0); } catch (e) { $('#nd-r-contains').innerHTML = `<li class="nd-empty">${esc(e.message)}</li>`; }
  }

  // ── 각주 말풍선 ─────────────────────────────────────────
  let popT = null, popFor = null, popPinned = false;
  function showFootnote(a, pin) {
    const id = a.dataset.fn;
    const item = findAnchor(id);
    if (!item) return;
    const pop = $('#nd-pop');
    const clone = item.cloneNode(true);
    clone.querySelectorAll('.nd-fnback').forEach((b) => b.remove());
    clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    clone.removeAttribute('id');
    const lbl = a.textContent.trim();
    pop.innerHTML = `<span class="fnlbl">${esc(lbl)}</span>`;
    const body = document.createElement('span');
    body.className = 'nd-content';
    body.innerHTML = clone.innerHTML;
    pop.appendChild(body);
    pop.hidden = false;
    pop.style.left = '0px'; pop.style.top = '0px';
    const r = a.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = r.left + window.scrollX + r.width / 2 - pw / 2;
    left = Math.max(window.scrollX + 12, Math.min(left, window.scrollX + document.documentElement.clientWidth - pw - 12));
    let top = r.bottom + window.scrollY + 8;
    if (r.bottom + ph + 16 > window.innerHeight && r.top - ph - 8 > 60) top = r.top + window.scrollY - ph - 8;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    popFor = a; popPinned = !!pin;
    applyDarkStyles(pop);
  }
  function closePop() { const p = $('#nd-pop'); if (p) p.hidden = true; popFor = null; popPinned = false; }

  // ── 서랍(최근 본 문서, 즐겨찾기) ────────────────────────
  let drawerTab = 'history';
  let drawerCloseT = null;
  const DRAWER_TABS = ['history', 'bookmarks'];
  // 탭 단추 뒤의 흰 선택 표시를 고른 단추 자리로 옮긴다(처음 열 때는 애니메이션 없이 바로)
  function moveDrawerPill(instant) {
    const tabs = $('#nd-drawer-tabs');
    const on = tabs.querySelector('button.on');
    if (!on) return;
    tabs.classList.toggle('no-anim', !!instant);
    tabs.style.setProperty('--pill-x', on.offsetLeft + 'px');
    tabs.style.setProperty('--pill-w', on.offsetWidth + 'px');
    if (instant) requestAnimationFrame(() => tabs.classList.remove('no-anim'));
  }
  async function openDrawer(tab) {
    const drawer = $('#nd-drawer'), scrim = $('#nd-scrim');
    const wasOpen = !drawer.hidden && !drawer.classList.contains('closing');
    const prevTab = drawerTab;
    drawerTab = tab || drawerTab;
    clearTimeout(drawerCloseT);
    drawer.classList.remove('closing'); scrim.classList.remove('closing');
    scrim.hidden = false; drawer.hidden = false;
    $$('#nd-drawer-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === drawerTab));
    moveDrawerPill(!wasOpen);
    // 열린 채로 탭을 바꾸면 목록이 옮겨 가는 쪽에서 밀려 들어온다
    const slide = wasOpen && prevTab !== drawerTab ? (DRAWER_TABS.indexOf(drawerTab) > DRAWER_TABS.indexOf(prevTab) ? 'from-right' : 'from-left') : '';
    const box = $('#nd-drawer-list');
    box.classList.remove('from-right', 'from-left');
    if (slide) { void box.offsetWidth; box.classList.add(slide); }
    const foot = $('#nd-drawer-foot');
    foot.hidden = true; foot.innerHTML = '';
    box.innerHTML = '<div class="nd-empty"><span class="nd-spin"></span></div>';
    try {
      if (drawerTab === 'history') {
        const h = await api('history');
        const offNote = S.settings.record_history === false ? '<div class="nd-empty" style="padding:12px 10px">방문 기록 남기기가 꺼져 있습니다. 설정에서 다시 켤 수 있습니다.</div>' : '';
        if (!h.length) { box.innerHTML = offNote || '<div class="nd-empty" style="padding:20px">아직 읽은 문서가 없습니다.</div>'; return; }
        let last = '';
        let html = offNote;
        h.forEach((x) => {
          const d = new Date(x.visited_at * 1000);
          const key = d.toDateString();
          if (key !== last) { last = key; html += `<div class="nd-daysep">${dayLabel(d)}</div>`; }
          html += `<div class="nd-li"><a href="${docUrl(x.title)}" data-title="${esc(x.title)}" title="${esc(x.title)}">${esc(x.title)}</a><small>${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}</small></div>`;
        });
        box.innerHTML = html;
        foot.innerHTML = `<span class="cnt">${h.length}개</span><button class="nd-btn" id="nd-clear-h">${I.trash}기록 지우기</button>`;
        foot.hidden = false;
        // 되돌릴 수 없으므로 한 번 더 눌러야 지운다(목록 끝을 굴리다 잘못 눌러 지워지는 일이 있었다)
        const clr = $('#nd-clear-h');
        let armT = null;
        clr.onclick = async () => {
          if (!clr.classList.contains('armed')) {
            clr.classList.add('armed');
            clr.innerHTML = `${I.trash}한 번 더 누르면 모두 지웁니다`;
            armT = setTimeout(() => { clr.classList.remove('armed'); clr.innerHTML = `${I.trash}기록 지우기`; }, 3000);
            return;
          }
          clearTimeout(armT);
          await api('history', { clear: true });
          openDrawer('history');
          if (location.pathname === '/') refreshHomeLists();
          toast('기록을 지웠습니다.');
        };
      } else {
        const b = await api('bookmarks');
        S.bookmarks = new Set(b.map((x) => x.title));
        if (!b.length) { box.innerHTML = '<div class="nd-empty" style="padding:20px">즐겨찾기한 문서가 없습니다. 문서를 열고 별 단추를 누르세요.</div>'; return; }
        box.innerHTML = b.map((x) => `<div class="nd-li"><a href="${docUrl(x.title)}" data-title="${esc(x.title)}" title="${esc(x.title)}">${esc(x.title)}</a><button class="nd-ib nd-sm" data-unbm="${esc(x.title)}" title="빼기">${I.close}</button></div>`).join('');
      }
    } catch (e) { box.innerHTML = `<div class="nd-empty">${esc(e.message)}</div>`; }
  }
  function dayLabel(d) {
    const today = new Date(); const y = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) return '오늘';
    if (d.toDateString() === y.toDateString()) return '어제';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  // 닫을 때도 열 때처럼 오른쪽으로 미끄러지며 사라진다
  function closeDrawer() {
    const drawer = $('#nd-drawer'), scrim = $('#nd-scrim');
    if (drawer.hidden || drawer.classList.contains('closing')) return;
    drawer.classList.add('closing'); scrim.classList.add('closing');
    if (BN.el === $('#nd-drawer-list')) bnReset();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    drawerCloseT = setTimeout(() => {
      drawer.hidden = true; scrim.hidden = true;
      drawer.classList.remove('closing'); scrim.classList.remove('closing');
    }, reduce ? 0 : ANIM_OUT);
  }

  // ── 설정 ────────────────────────────────────────────────
  function seg(name, opts, cur) {
    return `<div class="nd-seg" data-set="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  }
  function sw(name, on) { return `<label class="nd-switch"><input type="checkbox" data-sw="${name}" ${on ? 'checked' : ''}><span></span></label>`; }
  function openSettings() {
    const s = S.settings, st = S.status || {}, m = st.meta || {};
    $('#nd-modal-b').innerHTML = `
      <div class="nd-row"><div class="l">화면 모드<small>시스템은 macOS의 라이트, 다크 설정을 따릅니다</small></div>${seg('theme', [['system', '시스템'], ['light', '라이트'], ['dark', '다크']], s.theme || 'system')}</div>
      <div class="nd-row"><div class="l">글자 크기<small id="nd-fs-v">${s.font_size || 15}px</small></div><input type="range" min="13" max="22" step="1" value="${s.font_size || 15}" id="nd-fs"></div>
      <div class="nd-row"><div class="l">본문 너비</div>${seg('width', [['narrow', '좁게'], ['normal', '보통'], ['wide', '넓게']], s.width || 'normal')}</div>
      <div class="nd-row"><div class="l">옆 목차<small>넓은 창에서 오른쪽에 목차를 띄웁니다</small></div>${sw('toc_sidebar', s.toc_sidebar !== false)}</div>
      <div class="nd-row"><div class="l">방문 기록 남기기<small>끄면 읽은 문서를 기록하지 않습니다. 이미 남은 기록은 목록에서 지울 수 있습니다</small></div>${sw('record_history', s.record_history !== false)}</div>
      <div class="nd-row"><div class="l">없는 문서 링크 표시<small>덤프에 없는 문서로 가는 링크를 빨갛게 표시합니다</small></div>${sw('link_check', s.link_check !== false)}</div>
      <div class="nd-sub-h">덤프 파일</div>
      <div class="nd-row"><div class="l nd-kv"><code>${esc(st.db_path || '없음')}</code><br>${st.doc_count ? fmtNum(st.doc_count) + '개 문서' : ''}${m.generated_at_iso ? ', 생성 ' + esc(m.generated_at_iso.replace('T', ' ')) : ''}</div><button class="nd-btn" id="nd-change-db">${I.folder}다른 파일</button></div>
      <div class="nd-sub-h">정보</div>
      <div class="nd-kv nd-about-kv">
        <b>나무덤프 ${esc(st.version || '')}</b><br>나무위키 덤프를 인터넷 없이 읽는 맥용 프로그램입니다.<br>
        © 2026 ${esc(st.author || '')}. 코드는 MIT 라이선스로 공개되어 있습니다.${st.homepage ? `<br><a class="nd-ext-plain" href="${esc(st.homepage)}" target="_blank" rel="noopener">${esc(st.homepage.replace(/^https?:\/\//, ''))}</a>` : ''}<br><br>
        문서 출처 ${esc(m.source || 'https://namu.wiki')}, 작성 ${esc(m.attribution || '나무위키 기여자')}.<br>
        문서 내용은 ${esc(m.license || 'CC BY-NC-SA 2.0 KR')}에 따라 비영리 목적으로만 이용할 수 있습니다.<br>
        수식 표시에 KaTeX(MIT), 창에 pywebview(BSD)를 씁니다. 나무위키와 관계없는 비공식 프로그램입니다.</div>
      ${S.native ? '' : `<div style="margin-top:18px;text-align:right"><button class="nd-btn" id="nd-quit">나무덤프 종료</button></div>`}`;
    showModal();
    $$('#nd-modal-b .nd-seg').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', g).forEach((x) => x.classList.toggle('on', x === b));
      saveSettings({ [g.dataset.set]: b.dataset.v });
    }));
    $('#nd-fs').oninput = (e) => { $('#nd-fs-v').textContent = e.target.value + 'px'; S.settings.font_size = +e.target.value; applyLayout(); };
    $('#nd-fs').onchange = (e) => saveSettings({ font_size: +e.target.value });
    $$('#nd-modal-b [data-sw]').forEach((c) => c.onchange = () => {
      saveSettings({ [c.dataset.sw]: c.checked });
      if (c.dataset.sw === 'toc_sidebar' && S.doc) $('#nd-side').hidden = !c.checked || !$('#nd-side-toc').children.length || !location.pathname.startsWith('/w/');
      if (c.dataset.sw === 'record_history' && location.pathname === '/') refreshHomeLists();
      if (c.dataset.sw === 'link_check') { if (location.pathname.startsWith('/w/')) route(); }
    });
    $('#nd-change-db').onclick = pickDump;
    const q = $('#nd-quit'); if (q) q.onclick = async () => { try { await api('quit', {}); } catch (e) { /* 무시 */ } document.body.innerHTML = '<div style="padding:60px;text-align:center;font:16px var(--nd-font)">나무덤프를 종료했습니다. 이 창을 닫아도 됩니다.</div>'; };
  }
  // 설정 창: 열 때 살짝 커지며 나타나고, 닫을 때는 반대로 살짝 작아지며 사라진다
  let modalCloseT = null;
  function showModal() {
    const m = $('#nd-modal');
    clearTimeout(modalCloseT);
    m.classList.remove('closing');
    m.hidden = false;
    $('#nd-modal-sc').scrollTop = 0; $('.nd-modal-card').classList.remove('scrolled');
  }
  function closeModal() {
    const m = $('#nd-modal');
    if (m.hidden || m.classList.contains('closing')) return;
    m.classList.add('closing');
    if (BN.el === $('#nd-modal-b')) bnReset();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    modalCloseT = setTimeout(() => { m.hidden = true; m.classList.remove('closing'); }, reduce ? 0 : ANIM_OUT);
  }

  // ── 문서 안에서 찾기 ────────────────────────────────────
  let findHits = [], findIdx = -1;
  function openFind() {
    const f = $('#nd-find'); f.hidden = false;
    const q = $('#nd-find-q'); q.focus(); q.select();
  }
  function closeFind(silent) {
    clearFindMarks();
    $('#nd-find').hidden = true;
    if (!silent) { /* 초점 되돌리기 */ }
  }
  function clearFindMarks() {
    $$('mark.nd-hit').forEach((m) => { const t = document.createTextNode(m.textContent); m.replaceWith(t); t.parentNode && t.parentNode.normalize(); });
    findHits = []; findIdx = -1; $('#nd-find-n').textContent = '';
  }
  function runFind(q) {
    clearFindMarks();
    const root = $('#nd-article') || $('#nd-page');
    if (!q || !root) return;
    const ql = q.toLowerCase();
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.nodeValue.toLowerCase().includes(ql) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = []; let n;
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      let idx, cur = node;
      while ((idx = cur.nodeValue.toLowerCase().indexOf(ql)) >= 0) {
        const after = cur.splitText(idx);
        const rest = after.splitText(q.length);
        const m = document.createElement('mark'); m.className = 'nd-hit';
        m.textContent = after.nodeValue; after.replaceWith(m);
        findHits.push(m); cur = rest;
        if (findHits.length > 3000) break;
      }
    });
    $('#nd-find-n').textContent = findHits.length ? '' : '없음';
    if (findHits.length) stepFind(1);
  }
  function stepFind(dir) {
    if (!findHits.length) return;
    if (findHits[findIdx]) findHits[findIdx].classList.remove('cur');
    findIdx = (findIdx + dir + findHits.length) % findHits.length;
    const m = findHits[findIdx];
    m.classList.add('cur'); revealAnchor(m);
    m.scrollIntoView({ block: 'center' });
    $('#nd-find-n').textContent = (findIdx + 1) + '/' + findHits.length;
  }

  // ── 전역 이벤트 ─────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.target.closest('.nd-brand') && document.getElementById('nd-topbar').classList.contains('show-doc')) {
      e.preventDefault(); SCR().scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    const toggle = e.target.closest('[data-toc-toggle]');
    if (toggle) { const t = toggle.closest('.nd-toc'); t.classList.toggle('closed'); toggle.textContent = t.classList.contains('closed') ? '펼치기' : '접기'; return; }
    const a = e.target.closest('a');
    // 문단 제목 접기
    const h = e.target.closest('.nd-content .nd-h');
    if (h && !a && !e.target.closest('#nd-pop')) { toggleSection(h); return; }
    if (!a) {
      if (popPinned && !e.target.closest('#nd-pop')) closePop();
      return;
    }
    // 각주 번호는 한 번 누르면 아래 각주로 간다(내용 미리 보기는 마우스를 올리면 뜬다)
    if (a.classList.contains('nd-fnref')) { e.preventDefault(); closePop(); scrollToAnchor(a.dataset.fn, true); return; }
    const href = a.getAttribute('href') || '';
    if (a.target === '_blank' || /^https?:/i.test(href)) {
      if (S.native) { e.preventDefault(); openExternal(a.href); }
      return;
    }
    if (href.startsWith('#')) {
      e.preventDefault();
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch (x) { /* 그대로 */ }
      closePop();
      if (scrollToAnchor(id, true)) history.replaceState(history.state, '', location.pathname + location.search + '#' + encodeURIComponent(id));
      return;
    }
    if (a.dataset.title !== undefined) {
      e.preventDefault();
      closeDrawer();
      const t = a.dataset.title, hash = a.dataset.hash || '';
      if (S.doc && t === S.doc.title && location.pathname.startsWith('/w/')) { if (hash) scrollToAnchor(hash, true); else SCR().scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (e.metaKey || e.ctrlKey) { window.open(docUrl(t, hash), '_blank'); return; }
      openDoc(t, hash);
      return;
    }
    if (a.hasAttribute('data-route') || (href.startsWith('/') && !href.startsWith('//'))) {
      e.preventDefault(); closeDrawer(); go(href);
    }
  });
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest('a.nd-fnref');
    if (a && !popPinned) { clearTimeout(popT); popT = setTimeout(() => showFootnote(a, false), 180); return; }
    if (!popPinned && popFor && !e.target.closest('#nd-pop') && !(a && a === popFor)) { clearTimeout(popT); popT = setTimeout(closePop, 200); }
    if (e.target.closest && e.target.closest('#nd-pop')) clearTimeout(popT);
  });
  window.addEventListener('scroll', () => {
    $('#nd-totop').hidden = SCR().scrollTop < 600;
    if (popFor && !popPinned) closePop();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === 'Escape') {
      // 처리했다고 알려야(preventDefault) 맥이 경고음을 내지 않는다
      if (!$('#nd-modal').hidden) { e.preventDefault(); closeModal(); return; }
      if (!$('#nd-drawer').hidden) { e.preventDefault(); closeDrawer(); return; }
      if (!$('#nd-find').hidden) { e.preventDefault(); closeFind(); return; }
      if (popFor) { e.preventDefault(); closePop(); return; }
    }
    if (mod && (e.key === 'k' || e.key === 'l')) { e.preventDefault(); const q = $('#nd-bigq') || $('#nd-q'); q.focus(); q.select(); return; }
    if (mod && e.key === 'f') { e.preventDefault(); openFind(); return; }
    if (mod && e.key === '[') { e.preventDefault(); history.back(); return; }
    if (mod && e.key === ']') { e.preventDefault(); history.forward(); return; }
    if (mod && e.key === 'r' && !e.shiftKey) { e.preventDefault(); randomDoc(); return; }
    if (mod && e.key === 'd') { e.preventDefault(); if (location.pathname.startsWith('/w/')) toggleBookmark(); return; }
    if (mod && e.key === 'y') { e.preventDefault(); openDrawer('history'); return; }
    if (mod && e.shiftKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); go('/'); return; }
    if (mod && e.key === ',') { e.preventDefault(); openSettings(); return; }
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); saveSettings({ font_size: Math.min(24, (S.settings.font_size || 15) + 1) }); return; }
    if (mod && e.key === '-') { e.preventDefault(); saveSettings({ font_size: Math.max(12, (S.settings.font_size || 15) - 1) }); return; }
    if (mod && e.key === '0') { e.preventDefault(); saveSettings({ font_size: 15 }); return; }
    if (!mod && !inField && e.key === '/') { e.preventDefault(); const q = $('#nd-bigq') || $('#nd-q'); q.focus(); return; }
    if (!mod && e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); history.back(); }
    if (!mod && e.altKey && e.key === 'ArrowRight') { e.preventDefault(); history.forward(); }
  });

  // 패널 안에서 굴린 스크롤이 끝에 닿아도 뒤 문서로 넘어가지 않게 한다.
  // 패널 바깥(어두운 배경)에서 굴리면 뒤 문서가 평소처럼 움직인다.
  function containWheel(panel, scroller) {
    panel.addEventListener('wheel', (e) => {
      const sc = scroller && scroller.contains(e.target) ? scroller : null;
      if (!sc) { e.preventDefault(); return; }
      const dy = e.deltaY;
      if (dy === 0) return;
      const atTop = sc.scrollTop <= 0;
      const atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
      if ((dy < 0 && atTop) || (dy > 0 && atBottom)) e.preventDefault();
    }, { passive: false });
  }

  // 일반 마우스 휠을 크롬처럼 부드럽게 굴린다. 맥 창(mac_chrome.py)이 칸 단위로 움직이는
  // 휠 입력만 골라 여기로 넘긴다(트랙패드와 매직 마우스는 원래대로 둔다).
  // 굴리는 도중에 또 굴리면 남은 거리에 더해서 이어 간다.
  const WHEEL_MS = 220;
  const WHEEL_WALL = '#nd-drawer, .nd-modal-card, #nd-pop';
  const wheelAnims = new Map();
  function wheelRoom(el, dx, dy) {
    const cs = getComputedStyle(el);
    const a = wheelAnims.get(el);
    const y = a ? a.ty : el.scrollTop, x = a ? a.tx : el.scrollLeft;
    const canY = dy !== 0 && /(auto|scroll|overlay)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 &&
      (dy < 0 ? y > 0 : y < el.scrollHeight - el.clientHeight - 1);
    const canX = dx !== 0 && /(auto|scroll|overlay)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 &&
      (dx < 0 ? x > 0 : x < el.scrollWidth - el.clientWidth - 1);
    return { canY, canX, contain: /(contain|none)/.test(cs.overscrollBehaviorY + cs.overscrollBehaviorX) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) };
  }
  function wheelTarget(x, y, dx, dy) {
    const page = SCR();
    for (let el = document.elementFromPoint(x, y); el && el !== document.body && el !== page; el = el.parentElement) {
      const r = wheelRoom(el, dx, dy);
      if (r.canY || r.canX) return el;
      if (r.contain || el.matches(WHEEL_WALL)) return null;
    }
    return page;
  }
  function wheelStep(now) {
    wheelAnims.forEach((a, el) => {
      const t = Math.min(1, (now - a.t0) / WHEEL_MS);
      const k = 1 - Math.pow(1 - t, 3);
      el.scrollTo({ left: a.x0 + (a.tx - a.x0) * k, top: a.y0 + (a.ty - a.y0) * k, behavior: 'instant' });
      if (t >= 1) wheelAnims.delete(el);
    });
    if (wheelAnims.size) requestAnimationFrame(wheelStep);
  }
  window.ND_wheel = (dx, dy, x, y) => {
    const el = wheelTarget(x, y, dx, dy);
    if (!el) return;
    const a = wheelAnims.get(el);
    const maxX = el.scrollWidth - el.clientWidth, maxY = el.scrollHeight - el.clientHeight;
    const tx = Math.max(0, Math.min(maxX, (a ? a.tx : el.scrollLeft) + dx));
    const ty = Math.max(0, Math.min(maxY, (a ? a.ty : el.scrollTop) + dy));
    if (!wheelAnims.size) requestAnimationFrame(wheelStep);
    wheelAnims.set(el, { x0: el.scrollLeft, y0: el.scrollTop, tx, ty, t0: performance.now() });
  };

  // ── 문서 스크롤 막대(직접 그림) ─────────────────────────
  // WebKit의 문서 스크롤 막대는 창 맨 위, 상단 막대 뒤에서부터 그려져서 숨기고(app.css), 상단 막대 아래부터 직접 그린다.
  // 맥처럼 굴릴 때만 나타났다 사라지고, 막대를 끌거나 빈 곳을 눌러 옮길 수 있다. 튕길 때는 제자리에 있다.
  const SBAR = { el: null, thumb: null, hideT: null, drag: null, h: 0, track: 0 };
  function sbLayout() {
    const sc = SCR(), max = sc.scrollHeight - sc.clientHeight;
    SBAR.track = window.innerHeight - topBarH();
    if (max <= 0) { SBAR.el.hidden = true; return max; }
    SBAR.el.hidden = false;
    SBAR.h = Math.max(36, SBAR.track * sc.clientHeight / sc.scrollHeight);
    const y = (SBAR.track - SBAR.h) * Math.min(1, Math.max(0, sc.scrollTop / max));
    SBAR.thumb.style.height = SBAR.h + 'px';
    SBAR.thumb.style.transform = `translateY(${y.toFixed(1)}px)`;
    return max;
  }
  function sbShow() {
    if (sbLayout() <= 0) return;
    SBAR.el.classList.add('on');
    clearTimeout(SBAR.hideT);
    SBAR.hideT = setTimeout(() => { if (!SBAR.drag && !SBAR.el.matches(':hover')) SBAR.el.classList.remove('on'); }, 1000);
  }
  function initScrollbar() {
    const el = document.createElement('div');
    el.className = 'nd-sbar'; el.hidden = true; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="nd-sbar-thumb"></div>';
    document.body.appendChild(el);
    SBAR.el = el; SBAR.thumb = el.firstChild;
    let raf = 0;
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sbShow(); }); }, { passive: true });
    window.addEventListener('resize', () => sbLayout());
    new ResizeObserver(() => sbLayout()).observe($('#nd-main'));
    el.addEventListener('mouseleave', () => { if (!SBAR.drag) sbShow(); });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const sc = SCR(), max = sc.scrollHeight - sc.clientHeight;
      if (e.target !== SBAR.thumb) {         // 빈 곳을 누르면 그 자리로 막대 가운데를 옮긴다
        const want = e.clientY - el.getBoundingClientRect().top - SBAR.h / 2;
        sc.scrollTop = max * Math.min(1, Math.max(0, want / (SBAR.track - SBAR.h)));
      }
      SBAR.drag = { y: e.clientY, top: sc.scrollTop, max };
      el.setPointerCapture(e.pointerId); el.classList.add('drag');
    });
    el.addEventListener('pointermove', (e) => {
      if (!SBAR.drag) return;
      const d = SBAR.drag, room = SBAR.track - SBAR.h;
      if (room > 0) SCR().scrollTop = d.top + (e.clientY - d.y) * d.max / room;
    });
    const end = () => { if (!SBAR.drag) return; SBAR.drag = null; el.classList.remove('drag'); sbShow(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  function initChrome() {
    $('#nd-back').innerHTML = I.back; $('#nd-fwd').innerHTML = I.fwd; $('#nd-home').innerHTML = I.home;
    $('#nd-home').onclick = () => { if (location.pathname !== '/') go('/'); else SCR().scrollTo({ top: 0, behavior: 'smooth' }); };
    containWheel($('#nd-drawer'), $('#nd-drawer-b'));
    containWheel($('.nd-modal-card'), $('#nd-modal-sc'));
    // 설정 내용이 제목 아래로 굴러 들어가면 제목 밑에 구분선을 보인다
    $('#nd-modal-sc').addEventListener('scroll', (e) => $('.nd-modal-card').classList.toggle('scrolled', e.target.scrollTop > 0), { passive: true });
    initScrollbar();
    $('.nd-search-ic').innerHTML = I.search;
    $('#nd-random').innerHTML = I.shuffle; $('#nd-star').innerHTML = I.star;
    $('#nd-lists').innerHTML = I.list; $('#nd-settings').innerHTML = I.gear;
    $('#nd-totop').innerHTML = I.up;
    $$('#nd-drawer-close, #nd-modal-close, #nd-find-close').forEach((b) => { b.innerHTML = I.close; });
    $('#nd-find-prev').innerHTML = I.up; $('#nd-find-next').innerHTML = I.down;
    $('#nd-q-kbd').textContent = /Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K';
    $('#nd-back').onclick = () => history.back();
    $('#nd-fwd').onclick = () => history.forward();
    $('#nd-random').onclick = randomDoc;
    $('#nd-star').onclick = toggleBookmark;
    $('#nd-lists').onclick = () => openDrawer();
    $('#nd-settings').onclick = openSettings;
    $('#nd-theme').onclick = () => {
      const next = { system: 'light', light: 'dark', dark: 'system' }[S.settings.theme || 'system'];
      saveSettings({ theme: next });
      toast('화면 모드: ' + THEME_NAME[next]);
    };
    $('#nd-totop').onclick = () => SCR().scrollTo({ top: 0, behavior: 'smooth' });
    $('#nd-scrim').onclick = closeDrawer;
    $('#nd-drawer-close').onclick = closeDrawer;
    $('#nd-drawer-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) openDrawer(b.dataset.tab); };
    $('#nd-drawer-b').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-unbm]'); if (!b) return;
      await api('bookmark', { title: b.dataset.unbm, on: false });
      S.bookmarks.delete(b.dataset.unbm);
      if (S.doc && S.doc.title === b.dataset.unbm) updateStar(false);
      openDrawer('bookmarks');
      if (location.pathname === '/') refreshHomeLists();
    });
    $('#nd-modal-close').onclick = closeModal;
    $('#nd-modal').addEventListener('mousedown', (e) => { if (e.target.id === 'nd-modal') closeModal(); });
    attachSuggest($('#nd-q'), $('#nd-sugg'));
    let ft = null;
    $('#nd-find-q').addEventListener('input', (e) => { clearTimeout(ft); ft = setTimeout(() => runFind(e.target.value.trim()), 160); });
    $('#nd-find-q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (!findHits.length) runFind(e.target.value.trim()); else stepFind(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
    });
    $('#nd-find-prev').onclick = () => stepFind(-1);
    $('#nd-find-next').onclick = () => stepFind(1);
    $('#nd-find-close').onclick = () => closeFind();
  }

  async function boot() {
    initChrome();
    try {
      const [cm] = await Promise.all([fetch('/classmap.json').then((r) => r.json()).catch(() => null), refreshStatus()]);
      if (cm) S.classMap = cm;
      if (!S.classMap.size) S.classMap.size = {};
      if (!S.classMap.align) S.classMap.align = {};
    } catch (e) {
      setPage(`<div class="nd-card nd-onb"><h1>나무덤프 서버에 연결하지 못했습니다</h1><p>${esc(e.message)}</p></div>`);
      return;
    }
    history.scrollRestoration = 'manual';
    history.replaceState(Object.assign({ y: 0, idx: 0, key: newKey() }, history.state || {}), '');
    navKeys[navIdx()] = history.state.key;
    route(false);
    if (S.native) setTimeout(() => api('window_title', { title: document.title }).catch(() => {}), 500);
  }
  window.addEventListener('pywebviewready', () => {
    S.native = true;
    api('window_title', { title: document.title }).catch(() => {});
  });
  boot();
})();
