'use strict';
// 나무덤프 Electron 메인 프로세스: 창, 메뉴, namudump:// 주소, 운영체제 기능.
const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, protocol, session, shell } = require('electron');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const pkg = require('../package.json');
const { jsonResponse, staticResponse, isAppRoute, isExternalUrl } = require('./core/web');

const APP_NAME = '나무덤프';
const APP_ID = 'com.hishydrogen.namudump';
const SCHEME = 'namudump';
const ORIGIN = SCHEME + '://app';
const WEB = path.join(__dirname, '..', 'web');
const IS_MAC = process.platform === 'darwin';
const TOP_H = 60;              // 상단 막대 높이(app.css의 --nd-top-h)
const INFO = {
  name: APP_NAME, version: pkg.version, author: pkg.author, homepage: pkg.homepage,
  copyright: '© 2026 ' + pkg.author, platform: process.platform,
};

// 설정과 기록: 맥 ~/Library/Application Support/NamuDump(1.0, 2.0과 같은 곳),
// 윈도우 %APPDATA%\NamuDump, 리눅스 ~/.config/NamuDump. NAMUDUMP_SUPPORT로 바꿀 수 있다(시험용).
const SUPPORT = process.env.NAMUDUMP_SUPPORT || path.join(app.getPath('appData'), 'NamuDump');
// 크로미움이 쓰는 파일(캐시, 저장소)은 설정과 섞이지 않게 따로 둔다
app.setPath('userData', path.join(SUPPORT, 'electron'));
app.setName(APP_NAME);

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

// ── 덤프 작업 스레드 ─────────────────────────────────────
let worker = null, seq = 0;
const waiting = new Map();
function startWorker() {
  worker = new Worker(path.join(__dirname, 'worker.js'), { workerData: { supportDir: SUPPORT, info: INFO } });
  worker.on('message', (m) => { const w = waiting.get(m.id); if (w) { waiting.delete(m.id); w(m); } });
  worker.on('error', (e) => console.error('작업 스레드 오류:', e));
  worker.on('exit', (code) => {
    for (const w of waiting.values()) w({ status: 500, data: { error: '작업 스레드가 멈췄습니다.' } });
    waiting.clear();
    if (code !== 0 && !app.isQuitting) startWorker();
  });
}
function callWorker(method, ep, query, body) {
  return new Promise((resolve) => {
    const id = ++seq;
    waiting.set(id, resolve);
    worker.postMessage({ id, method, ep, query, body });
  });
}

// ── namudump:// 주소 ─────────────────────────────────────
async function handleRequest(req) {
  const url = new URL(req.url);
  if (url.host !== 'app') return new Response('not found', { status: 404 });
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { p = url.pathname; }
  if (p.startsWith('/api/')) {
    const ep = p.slice(5);
    let body = null;
    if (req.method === 'POST') {
      try { body = await req.json(); } catch (e) { body = {}; }
    }
    const r = await callWorker(req.method === 'POST' ? 'POST' : 'GET', ep, Object.fromEntries(url.searchParams), body);
    return jsonResponse(r.status, r.data);
  }
  return staticResponse(WEB, isAppRoute(p) ? 'index.html' : p);
}

// ── 맥 트랙패드, 휠 입력(native/mac-input) ───────────────
// 트랙패드, 매직 마우스의 좌우 쓸기를 화면에 넘겨 앞뒤로 넘기게 한다(세로 스크롤, 튕기기는 크로미움 그대로).
// 모듈이 없으면(빌드 전, 다른 운영체제) 쓸어서 넘기기만 빠진다.
let macInput = null;
if (IS_MAC) {
  // 패키징한 앱: Contents/Resources/native/, 개발 중: native/mac-input/build/Release/
  const cands = [path.join(process.resourcesPath || '', 'native', 'mac_input.node'),
    path.join(__dirname, '..', 'native', 'mac-input', 'build', 'Release', 'mac_input.node')];
  for (const p of cands) {
    try { macInput = require(p); break; } catch (e) { macInput = null; }
  }
}
const viewWins = new Map();          // contentView 주소 → BrowserWindow
function winForView(view) {
  let w = viewWins.get(view);
  if (w && !w.isDestroyed()) return w;
  for (const b of BrowserWindow.getAllWindows()) {
    try {
      const h = b.getNativeWindowHandle();
      if (h.readBigUInt64LE(0) === view) { viewWins.set(view, b); return b; }
    } catch (e) { /* 무시 */ }
  }
  return null;
}
function startMacInput() {
  if (!macInput) return;
  macInput.start((m) => {
    const w = winForView(m.view);
    if (!w || w.isDestroyed()) return;
    w.webContents.send('nd-input', [m.k, m.ph, m.mph, m.sub, m.dx, m.dy, m.x, m.y]);
  });
}

// ── 창 ──────────────────────────────────────────────────
const LIGHT_BG = '#ffffff';
function overlayFor(bg) {
  // 윈도우, 리눅스의 최소화, 최대화, 닫기 단추. 상단 막대 높이에 맞추고 바탕색을 따른다
  const dark = isDark(bg);
  return { color: bg, symbolColor: dark ? '#e8e8e8' : '#333333', height: TOP_H };
}
function isDark(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function windowOptions() {
  return {
    width: 1280, height: 880, minWidth: 640, minHeight: 480,
    title: APP_NAME, show: false, backgroundColor: LIGHT_BG,
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 20, y: Math.round((TOP_H - 14) / 2) } }
      : { titleBarOverlay: overlayFor(LIGHT_BG), icon: path.join(WEB, 'icon.png') }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      spellcheck: false, navigateOnDragDrop: false,
      // 맥: 문서 끝에서 더 당기면 맥 기본 고무줄 효과로 튕긴다(합성 스레드가 처리해 끊기지 않는다)
      scrollBounce: IS_MAC,
    },
  };
}

function setupWindow(win) {
  const wc = win.webContents;
  win.once('ready-to-show', () => win.show());
  // 화면 밖으로 나가는 주소는 막고, 웹 주소면 기본 브라우저로 연다
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN + '/')) { e.preventDefault(); openExternal(url); }
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ORIGIN + '/')) return { action: 'allow', overrideBrowserWindowOptions: windowOptions() };
    openExternal(url);
    return { action: 'deny' };
  });
  wc.on('did-create-window', (child) => setupWindow(child));
  wc.on('context-menu', (e, p) => showContextMenu(win, p));
  // 맥 입력 모듈이 이 창의 스크롤 입력만 넘기게 등록한다
  if (macInput) {
    try {
      const view = win.getNativeWindowHandle().readBigUInt64LE(0);
      macInput.watch(view, true);
      viewWins.set(view, win);
      win.on('closed', () => { macInput.watch(view, false); viewWins.delete(view); });
    } catch (e) { /* 무시 */ }
  }
  const tellFullscreen = (on) => wc.executeJavaScript(`window.ND_setFullscreen && ND_setFullscreen(${on})`).catch(() => {});
  win.on('enter-full-screen', () => tellFullscreen(true));
  win.on('leave-full-screen', () => tellFullscreen(false));
  // 개발 중에는 F12나 ⌥⌘I로 개발자 도구를 연다
  wc.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F12' || (input.alt && (input.meta || input.control) && input.key.toLowerCase() === 'i'))) {
      wc.toggleDevTools(); e.preventDefault();
    }
  });
}

function createWindow(route) {
  const win = new BrowserWindow(windowOptions());
  setupWindow(win);
  win.loadURL(ORIGIN + (route || '/'));
  return win;
}

function openExternal(url) {
  if (!isExternalUrl(url)) return false;
  shell.openExternal(url).catch(() => {});
  return true;
}

function showContextMenu(win, p) {
  const wc = win.webContents;
  const items = [];
  const sel = (p.selectionText || '').trim();
  if (p.isEditable) {
    items.push(
      { label: '실행 취소', role: 'undo', enabled: p.editFlags.canUndo },
      { label: '실행 복귀', role: 'redo', enabled: p.editFlags.canRedo },
      { type: 'separator' },
      { label: '오려두기', role: 'cut', enabled: p.editFlags.canCut },
      { label: '복사하기', role: 'copy', enabled: p.editFlags.canCopy },
      { label: '붙여넣기', role: 'paste', enabled: p.editFlags.canPaste },
      { type: 'separator' },
      { label: '전체 선택', role: 'selectAll' });
  } else {
    if (p.linkURL) {
      const inner = p.linkURL.startsWith(ORIGIN + '/');
      if (inner && p.linkURL.startsWith(ORIGIN + '/w/')) {
        items.push({ label: '새 창에서 열기', click: () => createWindow(p.linkURL.slice(ORIGIN.length)) });
      } else if (!inner) {
        items.push({ label: '브라우저에서 열기', click: () => openExternal(p.linkURL) });
      }
      if (!inner) items.push({ label: '링크 주소 복사', click: () => clipboard.writeText(p.linkURL) });
      items.push({ type: 'separator' });
    }
    if (sel) {
      items.push(
        { label: '복사하기', role: 'copy' },
        { label: `나무덤프에서 '${sel.length > 20 ? sel.slice(0, 20) + '…' : sel}' 검색`, click: () => wc.executeJavaScript('window.ND_searchSelection && ND_searchSelection()').catch(() => {}) });
      if (IS_MAC) items.push({ label: '찾아보기', click: () => wc.showDefinitionForSelection() });
      items.push({ type: 'separator' });
    }
    items.push({ label: '전체 선택', role: 'selectAll' });
  }
  while (items.length && items[items.length - 1].type === 'separator') items.pop();
  Menu.buildFromTemplate(items).popup({ window: win });
}

// 화면에서 부르는 운영체제 기능
ipcMain.handle('nd', async (e, ep, body) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  body = body && typeof body === 'object' ? body : {};
  if (ep === 'pick') {
    const r = await dialog.showOpenDialog(win, {
      title: '나무위키 덤프 파일 선택', message: '나무위키 덤프 파일(.sqlite)을 선택하세요',
      defaultPath: app.getPath('downloads'), properties: ['openFile'],
      filters: [{ name: 'SQLite 덤프', extensions: ['sqlite', 'sqlite3', 'db'] }, { name: '모든 파일', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePaths.length) return { ok: false, cancelled: true };
    return (await callWorker('POST', 'open', {}, { path: r.filePaths[0] })).data;
  }
  if (ep === 'bg') {
    const c = String(body.color || '');
    if (!win || !/^#[0-9a-f]{6}$/i.test(c)) return { ok: false };
    win.setBackgroundColor(c);
    if (!IS_MAC) { try { win.setTitleBarOverlay(overlayFor(c)); } catch (x) { /* 무시 */ } }
    return { ok: true };
  }
  if (ep === 'open_url') return { ok: openExternal(String(body.url || '')) };
  if (ep === 'window_title') return { ok: true };       // 창 제목은 document.title을 따른다
  if (ep === 'swipe_lock') {
    if (macInput) macInput.setCapture();
    return { ok: !!macInput };
  }
  if (ep === 'quit') { app.quit(); return { ok: true }; }
  return { ok: false };
});

// ── 메뉴 ────────────────────────────────────────────────
function sendCommand(cmd) {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.webContents.executeJavaScript(`window.ND_command && ND_command(${JSON.stringify(cmd)})`).catch(() => {});
}
function buildMenu() {
  if (!IS_MAC) { Menu.setApplicationMenu(null); return; }
  const tpl = [
    { label: APP_NAME, submenu: [
      { label: `${APP_NAME}에 관하여`, role: 'about' },
      { type: 'separator' },
      { label: '설정…', accelerator: 'Cmd+,', click: () => sendCommand('settings') },
      { label: '덤프 파일 열기…', click: () => sendCommand('pick') },
      { type: 'separator' },
      { label: '서비스', role: 'services' },
      { type: 'separator' },
      { label: `${APP_NAME} 가리기`, role: 'hide' },
      { label: '기타 가리기', role: 'hideOthers' },
      { label: '모두 보기', role: 'unhide' },
      { type: 'separator' },
      { label: `${APP_NAME} 종료`, role: 'quit' },
    ] },
    { label: '파일', submenu: [
      { label: '새 창', accelerator: 'Cmd+N', click: () => createWindow('/') },
      { label: '창 닫기', role: 'close' },
    ] },
    { label: '편집', submenu: [
      { label: '실행 취소', role: 'undo' }, { label: '실행 복귀', role: 'redo' }, { type: 'separator' },
      { label: '오려두기', role: 'cut' }, { label: '복사하기', role: 'copy' }, { label: '붙여넣기', role: 'paste' },
      { label: '전체 선택', role: 'selectAll' },
    ] },
    { label: '보기', submenu: [
      { label: '전체 화면', role: 'togglefullscreen' },
    ] },
    { label: '윈도우', role: 'windowMenu', submenu: [
      { label: '최소화', role: 'minimize' }, { label: '확대/축소', role: 'zoom' },
      { type: 'separator' }, { label: '모두 앞으로 가져오기', role: 'front' },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

// ── 시작 ────────────────────────────────────────────────
app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); } else createWindow('/');
});

app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: APP_NAME, applicationVersion: pkg.version, version: '',
    copyright: INFO.copyright, website: pkg.homepage,
    credits: '나무위키 덤프를 인터넷 없이 읽는 프로그램\n문서 내용: 나무위키 기여자, CC BY-NC-SA 2.0 KR\n나무위키와 관계없는 비공식 프로그램입니다.',
  });
  // 외부 요청은 화면이 직접 띄운 동영상 틀(https)만 허용한다. 내려받기는 막는다.
  session.defaultSession.on('will-download', (e) => e.preventDefault());
  // 허용: 전체 화면(동영상), 복사, 설치된 글꼴 목록(설정의 글꼴 고르기)
  const ALLOWED = new Set(['fullscreen', 'clipboard-sanitized-write', 'local-fonts']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(ALLOWED.has(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ALLOWED.has(perm));
  // namudump:// 주소에서는 Referer가 가지 않아 유튜브가 재생을 거부한다(오류 153).
  // 유튜브 안내대로 앱 안 플레이어 요청에는 앱 식별자를 Referer로 붙인다.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/embed/*', 'https://www.youtube-nocookie.com/embed/*'] },
    (d, cb) => {
      const h = d.requestHeaders;
      if (d.resourceType === 'subFrame' && !h.Referer) h.Referer = 'https://' + APP_ID + '/';
      cb({ requestHeaders: h });
    });
  protocol.handle(SCHEME, handleRequest);
  startWorker();
  startMacInput();
  buildMenu();
  createWindow('/');
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow('/'); });
});

app.on('before-quit', () => { app.isQuitting = true; });
app.on('window-all-closed', () => { if (!IS_MAC) app.quit(); });
