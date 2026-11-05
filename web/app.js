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
    doc: null, bookmarks: new Set(), loadSeq: 0,
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

  // 앱(네이티브 창)에게 알린다. 도구 막대, 사이드바, 창 제목이 이 값을 보고 바뀐다.
  function host(kind, data) {
    try { window.webkit.messageHandlers.nd.postMessage(Object.assign({ kind }, data)); } catch (e) { /* 무시 */ }
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
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.dataset.theme = t;
    applyDarkStyles(document.querySelector('.nd-content'));
    syncWindowBg();
  }
  // 창 바탕색을 화면 바탕색에 맞춘다(창 크기가 바뀌거나 튕길 때 다른 색이 보이지 않게)
  let bgSent = '';
  function syncWindowBg() {
    let hex = getComputedStyle(document.documentElement).getPropertyValue('--nd-bg').trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(hex)) hex = '#' + hex.slice(1).split('').map((c) => c + c).join('');
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    if (hex === bgSent) return;
    bgSent = hex;
    host('bg', { color: hex });
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
    saveView();
    const cur = history.state || {};
    history.replaceState(Object.assign({}, cur, { y: SCR().scrollTop }), '');
    if (opts.replace) history.replaceState({ y: 0, key: cur.key || newKey() }, '', url);
    else history.pushState({ y: 0, key: newKey() }, '', url);
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
  }

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
    saveView();
    await route(true);
  });

  // ── 레이아웃 도우미 ─────────────────────────────────────
  function setPage(html, opts) {
    opts = opts || {};
    const page = $('#nd-page');
    page.innerHTML = html;
    // 불러오는 중 뼈대(keepScroll)는 도구 막대와 사이드바를 건드리지 않는다
    if (!opts.keepScroll) { host('star', { enabled: !!opts.star, on: false }); host('toc', { items: [] }); }
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
    setTitle('나무덤프');
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
      const mh = $('#nd-home-more-h'); if (mh) mh.onclick = () => host('sidebar', { tab: 'history' });
      const mb = $('#nd-home-more-b'); if (mb) mb.onclick = () => host('sidebar', { tab: 'bookmarks' });
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
    setTitle('나무덤프');
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
      if (r.ok) { await refreshStatus(); host('dump'); go('/', { replace: true }); toast('덤프 파일을 열었습니다.'); }
      else if (!r.cancelled) { await refreshStatus(); route(); }
    } finally { progress(false); }
  }
  async function openDumpPath(p) {
    if (!p) return;
    progress(true);
    try {
      const r = await api('open', { path: p });
      await refreshStatus();
      if (r.ok) { go('/', { replace: true }); toast('덤프 파일을 열었습니다.'); }
      else route();
    } finally { progress(false); }
  }
  async function refreshStatus() {
    S.status = await api('status');
    S.settings = S.status.settings || {};
    applyLayout(); applyTheme();
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

  // 창 제목(도구 막대에 보인다)
  function setTitle(winTitle) {
    document.title = winTitle;
    host('title', { title: winTitle.replace(/ - 나무덤프$/, '') });
  }

  function renderDocPage(d, res, hash, view) {
    const title = d.title;
    setTitle(title + ' - 나무덤프');
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
  }

  function renderMissing(d) {
    setTitle(d.title + ' - 나무덤프');
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
    host('toc', { items: toc });
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
        b.innerHTML = `<div class="ctl"><button class="play" type="button" aria-label="재생">${I.play}</button><span>${esc(kind)} (인터넷 필요)</span>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">브라우저에서 열기</a>` : ''}</div>`;
        b.querySelector('.play').onclick = async () => {
          const url = b.dataset.embed + (b.dataset.embed.includes('?') ? '&' : '?') + 'autoplay=1';
          // 앱 주소에서는 Referer가 없어 유튜브가 재생을 거부하므로, 앱의 작은 로컬 페이지로 감싼다
          let wrapped = null;
          try { wrapped = (await api('embed_url', { url })).url; } catch (e) { /* 무시 */ }
          if (!wrapped) { openExternal(link || url); return; }
          const f = document.createElement('iframe');
          f.src = wrapped;
          f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          f.setAttribute('allowfullscreen', '');
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
  let spyHeads = [], spyRaf = 0, spyCur = null;
  function setupScrollSpy(content) {
    spyHeads = $$('.nd-h[id]', content);
    spyCur = null;
    updateSpy();
  }
  // 사이드바의 목차가 지금 읽는 문단을 표시하도록 앱에 알린다
  function updateSpy() {
    spyRaf = 0;
    if (!spyHeads.length) return;
    let cur = spyHeads[0];
    const line = topBarH() + 40;
    for (const h of spyHeads) {
      if (h.offsetParent === null) continue;
      if (h.getBoundingClientRect().top <= line) cur = h; else break;
    }
    if (cur === spyCur) return;
    spyCur = cur;
    host('spy', { id: cur.id });
  }
  window.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(updateSpy); }, { passive: true });

  // 즐겨찾기
  function updateStar(on) {
    host('star', { enabled: true, on: !!on });
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
    host('lists');
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
    setTitle(`‘${q}’ 검색 - 나무덤프`);
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
      e.preventDefault(); openExternal(a.href);
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
      const t = a.dataset.title, hash = a.dataset.hash || '';
      if (S.doc && t === S.doc.title && location.pathname.startsWith('/w/')) { if (hash) scrollToAnchor(hash, true); else SCR().scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (e.metaKey || e.ctrlKey) { window.open(docUrl(t, hash), '_blank'); return; }
      openDoc(t, hash);
      return;
    }
    if (a.hasAttribute('data-route') || (href.startsWith('/') && !href.startsWith('//'))) {
      e.preventDefault(); go(href);
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

  // ⌘ 단축키는 앱의 메뉴가 맡는다(window.ND를 부른다)
  document.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === 'Escape') {
      // 처리했다고 알려야(preventDefault) 맥이 경고음을 내지 않는다
      if (!$('#nd-find').hidden) { e.preventDefault(); closeFind(); return; }
      if (popFor) { e.preventDefault(); closePop(); return; }
    }
    if (!e.metaKey && !e.ctrlKey && !inField && e.key === '/') { e.preventDefault(); host('focusSearch'); return; }
    if (e.altKey && !e.metaKey && e.key === 'ArrowLeft') { e.preventDefault(); history.back(); }
    if (e.altKey && !e.metaKey && e.key === 'ArrowRight') { e.preventDefault(); history.forward(); }
  });

  // 일반 마우스 휠을 크롬처럼 부드럽게 굴린다. 앱이 칸 단위로 움직이는
  // 휠 입력만 골라 여기로 넘긴다(트랙패드와 매직 마우스는 원래대로 둔다).
  // 굴리는 도중에 또 굴리면 남은 거리에 더해서 이어 간다.
  const WHEEL_MS = 220;
  const WHEEL_WALL = '#nd-pop';
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

  function initChrome() {
    $('#nd-totop').innerHTML = I.up;
    $('#nd-find-close').innerHTML = I.close;
    $('#nd-find-prev').innerHTML = I.up; $('#nd-find-next').innerHTML = I.down;
    $('#nd-totop').onclick = () => SCR().scrollTo({ top: 0, behavior: 'smooth' });
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
    history.replaceState(Object.assign({ y: 0, key: newKey() }, history.state || {}), '');
    route(false);
  }
  // 앱의 메뉴, 도구 막대, 사이드바가 부른다
  window.ND = {
    back: () => history.back(),
    forward: () => history.forward(),
    home: () => { if (location.pathname !== '/') go('/'); else SCR().scrollTo({ top: 0, behavior: 'smooth' }); },
    random: randomDoc,
    toggleStar: () => { if (location.pathname.startsWith('/w/')) toggleBookmark(); },
    search: (q) => goSearch(q),
    open: (title, hash) => openDoc(title, hash || ''),
    anchor: (id) => scrollToAnchor(id, true),
    find: openFind,
    searchSelection: () => window.ND_searchSelection(),
    settings: (s) => {
      const relink = s.link_check !== S.settings.link_check, recent = s.record_history !== S.settings.record_history;
      S.settings = s; applyLayout(); applyTheme();
      if (relink && location.pathname.startsWith('/w/')) route();
      if (recent && location.pathname === '/') refreshHomeLists();
    },
    fontSize: (delta) => saveSettings({ font_size: delta === 0 ? 15 : Math.max(12, Math.min(24, (S.settings.font_size || 15) + delta)) }).then(() => host('settings')),
    reload: async () => { await refreshStatus(); go('/', { replace: true }); },
    lists: () => { if (location.pathname === '/') refreshHomeLists(); },
    unbookmarked: (t) => { S.bookmarks.delete(t); if (S.doc && S.doc.title === t && location.pathname.startsWith('/w/')) updateStar(false); },
  };
  boot();
})();
