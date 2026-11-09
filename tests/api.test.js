'use strict';
// 작은 가짜 덤프로 덤프 읽기, API, 화면 파일 응답을 시험한다(실제 덤프, Electron 없이).
//   npm test
// 화면(render.js, app.js)은 실제 앱에서 눈으로 확인한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');
const { UserStore } = require('../app/core/store');
const { App } = require('../app/core/api');
const { CSP, staticResponse, isAppRoute, isExternalUrl } = require('../app/core/web');

const WEB = path.join(__dirname, '..', 'web');
const DOCS = {
  나무위키: '<div><h2>개요</h2><p>나무위키 문서</p></div>',
  나무: '<div><p>나무 문서</p></div>',
  사과나무: '<div><p>사과나무 문서</p></div>',
  Python: '<div><p>파이썬</p></div>',
};

function makeDump(file) {
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT);' +
    'CREATE TABLE docs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, md BLOB NOT NULL, html BLOB, last_modified TEXT);' +
    'CREATE UNIQUE INDEX ix_title ON docs(title);');
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('doc_count', String(Object.keys(DOCS).length));
  const ins = db.prepare('INSERT INTO docs(id, title, md, html, last_modified) VALUES (?, ?, ?, ?, ?)');
  Object.entries(DOCS).forEach(([t, h], i) => ins.run(i + 1, t, zlib.deflateSync('== ' + t), zlib.deflateSync(h), '2026-08-01'));
  db.close();
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'namudump-test-'));
const dump = path.join(tmp, 'dump.sqlite');
makeDump(dump);
const store = new UserStore(path.join(tmp, 'support'));
const app = new App(store, { version: '9.9.9', platform: process.platform });
assert.ok(app.openDump(dump), app.dumpError);
const get = (ep, q) => app.handle('GET', ep, q || {}).data;
const post = (ep, body) => app.handle('POST', ep, {}, body).data;
test.after(() => { app.dump.close(); store.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('상태', () => {
  const s = get('status');
  assert.equal(s.ready, true);
  assert.equal(s.version, '9.9.9');
  assert.equal(s.doc_count, Object.keys(DOCS).length);
});

test('문서 읽기(압축 풀기)', () => {
  assert.match(get('doc', { title: '나무위키' }).html, /나무위키 문서/);
  assert.equal(get('doc', { title: 'python' }).title, 'Python');      // 대소문자를 맞춰 찾는다
});

test('없는 문서는 비슷한 제목을 알려 준다', () => {
  const d = get('doc', { title: '나무위' });
  assert.equal(d.missing, true);
  assert.ok(d.suggestions.includes('나무위키'));
});

test('제목 앞부분 검색, 포함 검색', () => {
  assert.deepEqual(get('search', { q: '나무', mode: 'prefix' }).items.slice(0, 2), ['나무', '나무위키']);
  assert.ok(get('search', { q: '나무', mode: 'contains' }).items.includes('사과나무'));
  assert.ok(get('search', { q: 'python', mode: 'contains' }).items.includes('Python'));
});

test('링크 확인: 있는 문서만, 개수 상한 없이', () => {
  assert.deepEqual(post('exists', { titles: ['나무', '없는문서'] }).exists, ['나무']);
  const many = Array.from({ length: 6000 }, (_, i) => '없음' + i).concat(['사과나무']);
  assert.deepEqual(post('exists', { titles: many }).exists, ['사과나무']);
});

test('방문 기록과 즐겨찾기', () => {
  post('history', { title: '나무' });
  assert.ok(get('history').some((h) => h.title === '나무'));
  post('bookmark', { title: '나무', on: true });
  assert.ok(get('bookmarks').some((b) => b.title === '나무'));
  assert.equal(get('doc', { title: '나무' }).bookmarked, true);
  post('history', { clear: true });
  assert.deepEqual(get('history'), []);
});

test('설정은 아는 항목만 저장한다', () => {
  const s = post('settings', { font: 'system', 모르는항목: 1 });
  assert.equal(s.font, 'system');
  assert.equal('모르는항목' in s, false);
  const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'support', 'settings.json'), 'utf8'));
  assert.equal(saved.db_path, path.resolve(dump));
});

test('덤프가 아닌 파일은 열지 않는다', () => {
  const bad = path.join(tmp, 'bad.sqlite');
  fs.writeFileSync(bad, 'not a database');
  const other = new App(new UserStore(path.join(tmp, 'support2')), {});
  assert.equal(other.openDump(bad), false);
  assert.match(other.dumpError, /SQLite|덤프/);
});

test('화면 주소는 index.html이 그리고, CSP로 유튜브 썸네일 말고는 외부 그림을 막는다', async () => {
  assert.ok(isAppRoute('/w/나무') && isAppRoute('/') && isAppRoute('/search'));
  const r = await staticResponse(WEB, 'index.html');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /render\.js/);
  const img = r.headers.get('Content-Security-Policy').split(';').find((x) => x.trim().startsWith('img-src'));
  const hosts = img.trim().split(/\s+/).slice(1).filter((s) => /^https?:/.test(s));
  assert.deepEqual(hosts, ['https://i.ytimg.com']);
  assert.equal(r.headers.get('Content-Security-Policy'), CSP);
});

test('화면 파일은 web 폴더 밖을 내주지 않는다', async () => {
  assert.equal((await staticResponse(WEB, '../package.json')).status, 404);
  assert.equal((await staticResponse(WEB, '/../../etc/passwd')).status, 404);
  assert.equal((await staticResponse(WEB, 'fonts/PretendardVariable.woff2')).headers.get('Content-Type'), 'font/woff2');
});

test('기본 브라우저로는 웹 주소와 메일만 연다', () => {
  assert.equal(isExternalUrl('https://namu.wiki/w/나무'), true);
  assert.equal(isExternalUrl('mailto:a@example.com'), true);
  assert.equal(isExternalUrl('file:///etc/passwd'), false);
  assert.equal(isExternalUrl('javascript:alert(1)'), false);
  assert.equal(isExternalUrl('https://a.example/\nx'), false);
});
