'use strict';
// 새 버전 확인: GitHub Releases의 최신 공개 릴리스(초안, 사전 릴리스 제외)를 보고 알리기만 한다.
// 맥은 임시 서명이라 자동 설치(electron-updater)를 쓸 수 없어서, 세 운영체제 모두 내려받을 파일 링크만 건넨다.
// 요청은 메인 프로세스(main.js)가 하고, 여기에는 그 결과를 해석하는 부분만 둔다(테스트할 수 있게).

// GitHub 저장소 주소(package.json의 homepage) → 최신 릴리스 API 주소
function latestReleaseApi(homepage) {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(homepage || ''));
  return m ? `https://api.github.com/repos/${m[1]}/${m[2]}/releases/latest` : null;
}

// 'v3.2.0' 같은 꼬리표에서 숫자 세 개. 못 읽으면 null
function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v || '').trim());
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function isNewer(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

// 운영체제와 CPU에 맞는 설치 파일(package.json의 artifactName 규칙: namudump-<버전>-<os>-<arch>…)
function pickAsset(assets, platform, arch) {
  const list = Array.isArray(assets) ? assets : [];
  let re = null;
  if (platform === 'darwin') re = new RegExp(`-mac-${arch}\\.dmg$`, 'i');
  else if (platform === 'win32') re = new RegExp(`-win-${arch}-setup\\.exe$`, 'i');
  else if (platform === 'linux') re = new RegExp(`-linux-${arch === 'x64' ? '(x64|x86_64)' : arch}\\.AppImage$`, 'i');
  const a = re && list.find((x) => x && re.test(String(x.name || '')));
  const url = a ? String(a.browser_download_url || '') : '';
  return url.startsWith('https://github.com/') ? { name: a.name, url, size: Number(a.size) || 0 } : null;
}

// 릴리스 설명(마크다운)을 줄 단위 글로 바꾼다. 전부 넘기고, 화면의 알림 카드 안에서 스크롤한다.
// 화면은 글자로만 넣는다(HTML로 해석하지 않는다)
function summarizeNotes(body) {
  const lines = [];
  for (let l of String(body || '').replace(/\r/g, '').split('\n')) {
    l = l.replace(/<!--[\s\S]*?-->/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, '$1').trim();
    if (!l || /^([-*_=]\s*){3,}$/.test(l)) continue;
    const head = /^#{1,6}\s+(.*)$/.exec(l);
    if (head) { lines.push({ head: true, text: head[1] }); continue; }
    lines.push({ head: false, text: l.replace(/^([-*+]|\d+\.)\s+/, '') });
  }
  // 내용 없이 끝에 걸린 제목은 뺀다
  while (lines.length && lines[lines.length - 1].head) lines.pop();
  return lines;
}

// API 응답 → 화면에 넘길 결과
function interpret(rel, current, platform, arch) {
  if (!rel || rel.draft || rel.prerelease || !rel.tag_name) return { ok: false, error: '릴리스 정보를 읽지 못했습니다.' };
  const latest = String(rel.tag_name).replace(/^v/, '');
  const page = String(rel.html_url || '');
  return {
    ok: true,
    current,
    latest,
    newer: isNewer(latest, current),
    name: String(rel.name || ''),
    published: String(rel.published_at || ''),
    page: page.startsWith('https://github.com/') ? page : '',
    asset: pickAsset(rel.assets, platform, arch),
    notes: summarizeNotes(rel.body),
  };
}

module.exports = { latestReleaseApi, parseVersion, isNewer, pickAsset, summarizeNotes, interpret };
