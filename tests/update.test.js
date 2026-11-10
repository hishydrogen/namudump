'use strict';
// 새 버전 확인 결과 해석(app/core/update.js). 실제 요청은 하지 않는다.
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../app/core/update');

const ASSETS = [
  'namudump-3.2.0-mac-arm64.dmg', 'namudump-3.2.0-mac-arm64.dmg.blockmap',
  'namudump-3.2.0-win-x64-setup.exe', 'namudump-3.2.0-win-arm64-setup.exe',
  'namudump-3.2.0-linux-x86_64.AppImage', 'namudump-3.2.0-linux-arm64.AppImage',
].map((name) => ({ name, size: 100, browser_download_url: 'https://github.com/hishydrogen/NamuDump/releases/download/v3.2.0/' + name }));

test('저장소 주소에서 최신 릴리스 API 주소', () => {
  assert.equal(U.latestReleaseApi('https://github.com/hishydrogen/NamuDump'), 'https://api.github.com/repos/hishydrogen/NamuDump/releases/latest');
  assert.equal(U.latestReleaseApi('https://example.com/x'), null);
});

test('버전 비교', () => {
  assert.equal(U.isNewer('v3.2.0', '3.1.1'), true);
  assert.equal(U.isNewer('3.10.0', '3.9.9'), true);       // 글자가 아니라 숫자로 비교한다
  assert.equal(U.isNewer('v3.1.1', '3.1.1'), false);
  assert.equal(U.isNewer('3.0.9', '3.1.0'), false);
  assert.equal(U.isNewer('nightly', '3.1.0'), false);
});

test('운영체제와 CPU에 맞는 설치 파일', () => {
  assert.match(U.pickAsset(ASSETS, 'darwin', 'arm64').name, /mac-arm64\.dmg$/);
  assert.match(U.pickAsset(ASSETS, 'win32', 'x64').name, /win-x64-setup\.exe$/);
  assert.match(U.pickAsset(ASSETS, 'win32', 'arm64').name, /win-arm64-setup\.exe$/);
  assert.match(U.pickAsset(ASSETS, 'linux', 'x64').name, /linux-x86_64\.AppImage$/);
  assert.match(U.pickAsset(ASSETS, 'linux', 'arm64').name, /linux-arm64\.AppImage$/);
  assert.equal(U.pickAsset(ASSETS, 'darwin', 'x64'), null);      // 인텔 맥용은 만들지 않는다 → 릴리스 페이지로
  const evil = [{ name: 'namudump-3.2.0-win-x64-setup.exe', browser_download_url: 'https://evil.example/x.exe' }];
  assert.equal(U.pickAsset(evil, 'win32', 'x64'), null);         // GitHub 밖 주소는 쓰지 않는다
});

test('변경 내용 요약', () => {
  const n = U.summarizeNotes('## 새 기능\n- **업데이트 확인** 추가\n- [넘겨주기](https://x) 문단 찾기\n\n---\n## 고친 점\n');
  assert.deepEqual(n, [{ head: true, text: '새 기능' }, { head: false, text: '업데이트 확인 추가' }, { head: false, text: '넘겨주기 문단 찾기' }]);
  assert.equal(U.summarizeNotes(Array.from({ length: 40 }, (_, i) => '- ' + i).join('\n')).length, 40);   // 자르지 않는다
});

test('릴리스 응답 해석', () => {
  const r = U.interpret({ tag_name: 'v3.2.0', html_url: 'https://github.com/hishydrogen/NamuDump/releases/tag/v3.2.0', body: '- 하나', assets: ASSETS }, '3.1.1', 'win32', 'x64');
  assert.equal(r.ok, true);
  assert.equal(r.newer, true);
  assert.equal(r.latest, '3.2.0');
  assert.match(r.asset.url, /win-x64-setup\.exe$/);
  assert.equal(U.interpret({ tag_name: 'v4.0.0', prerelease: true }, '3.1.1', 'win32', 'x64').ok, false);
});
