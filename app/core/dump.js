'use strict';
// 나무위키 덤프(SQLite)를 읽기 전용으로 연다. 원본 파일은 바꾸지 않는다.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const NAMESPACES = ['분류:', '틀:', '파일:', '나무위키:', '사용자:', '휴지통:', '특수기능:', '위키운영:', '더미:', '파일휴지통:'];
const CHUNK = 500;          // IN (...)에 한 번에 넣는 제목 수

class DumpError extends Error {}

function expandHome(p) {
  return p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p;
}

// 영문 대문자만 소문자로 바꾼다(한글 등은 그대로). 버퍼를 직접 고친다.
function asciiLower(buf) {
  for (let i = 0; i < buf.length; i++) { const c = buf[i]; if (c >= 65 && c <= 90) buf[i] = c + 32; }
  return buf;
}

// SQLite가 읽는 file: 주소. 윈도우 네트워크 경로(\\Mac\Home\... 처럼 Parallels 공유 폴더나 NAS)는
// pathToFileURL이 file://Mac/Home/...로 만드는데, SQLite는 주소의 호스트 자리(Mac)를 받지 않는다
// (invalid uri authority). 호스트를 경로 쪽으로 옮긴 file:////Mac/Home/... 꼴로 넘긴다.
function sqliteUri(p) {
  const u = pathToFileURL(p);
  return u.host ? 'file:////' + u.host + u.pathname : u.href;
}

class Dump {
  constructor(p) {
    this.path = path.resolve(expandHome(String(p || '')));
    let st;
    try { st = fs.statSync(this.path); } catch (e) { st = null; }
    if (!st || !st.isFile()) throw new DumpError('해당 경로에서 파일을 찾을 수 없습니다: ' + this.path);
    // immutable=1: 잠금과 변경 확인을 하지 않는다(외장 드라이브에서도 빠르게 읽는다)
    const uri = sqliteUri(this.path) + '?mode=ro&immutable=1';
    try {
      try { this.db = new DatabaseSync(uri, { readOnly: true }); } catch (e) {
        // 네트워크 경로를 주소 꼴로 못 열면 경로 그대로 연다(읽기 전용은 그대로, immutable만 빠진다)
        if (!/^file:\/{4}/.test(uri)) throw e;
        this.db = new DatabaseSync(this.path, { readOnly: true });
      }
      this.db.exec('PRAGMA cache_size = -65536');
      const cols = new Set(this.db.prepare('PRAGMA table_info(docs)').all().map((r) => r.name));
      if (cols.has('title') && cols.has('md') && !cols.has('html')) {
        throw new DumpError('마크다운 전용 덤프 파일(namu-md.sqlite)은 지원하지 않습니다. HTML 본문이 포함된 덤프 파일(namu-html.sqlite)을 선택해 주세요.');
      }
      if (!cols.has('title') || !cols.has('html')) {
        throw new DumpError('지원하는 나무위키 덤프 형식(namu-html.sqlite)이 아닙니다.');
      }
    } catch (e) {
      if (this.db) { try { this.db.close(); } catch (x) { /* 무시 */ } this.db = null; }
      if (e instanceof DumpError) throw e;
      // 그림 등 다른 파일을 고른 경우가 대부분이라 영어 오류 문구(file is not a database)는 덧붙이지 않는다
      throw new DumpError(/not a database|file is encrypted/i.test(e.message)
        ? '지원하는 나무위키 덤프 파일(namu-html.sqlite)이 아닙니다.'
        : 'SQLite 데이터베이스 파일이 아니거나 손상되었습니다: ' + e.message);
    }
    this.meta = {};
    try {
      for (const r of this.db.prepare('SELECT k, v FROM meta').all()) this.meta[r.k] = r.v;
    } catch (e) { /* meta 테이블이 없어도 된다 */ }
    this.maxId = Number(this.db.prepare('SELECT max(id) AS m FROM docs').get().m || 0);
    this.count = parseInt(this.meta.doc_count, 10) || this.maxId;
    this.q = {
      get: this.db.prepare('SELECT id, html, last_modified FROM docs WHERE title = ?'),
      has: this.db.prepare('SELECT 1 AS x FROM docs WHERE title = ?'),
      prefix: this.db.prepare('SELECT title FROM docs WHERE title >= ? AND title < ? ORDER BY title LIMIT ? OFFSET ?'),
      fromId: this.db.prepare('SELECT title FROM docs WHERE id >= ? ORDER BY id LIMIT 1'),
    };
    this.inStmts = new Map();
    this.titles = null;        // "\n제목\n제목\n" (UTF-8)
    this.titlesLower = null;
  }

  close() { try { this.db.close(); } catch (e) { /* 무시 */ } }

  static inflate(value) {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    let raw = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    try {
      raw = zlib.inflateSync(raw);
    } catch (e) {
      try {
        raw = zlib.inflateRawSync(raw);
      } catch (e2) {
        const head = raw.toString('latin1', 0, 64).trimStart()[0];
        if (!['<', '-', '#'].includes(head)) throw new DumpError('문서 데이터의 압축을 풀 수 없습니다.');
      }
    }
    return raw.toString('utf8');
  }

  get(title) {
    const row = this.q.get.get(title);
    if (!row) return null;
    return { id: Number(row.id), title, html: Dump.inflate(row.html), last_modified: row.last_modified };
  }

  // 넘겨주기 문서는 넘겨받는 문서의 화면이 그대로 저장되어 있다(덤프 생성기가 넘겨진 뒤의 쪽을 받아 왔다).
  // '…에서 넘어옴' 표시가 있으면 <h1>에 적힌 진짜 문서 제목을 돌려준다. 문단 주소(#…)는 저장되지 않았다.
  static redirectTarget(html, title) {
    if (!html || !/noredirect=1"[^>]*>[^<]*<\/a>\s*에서 넘어옴/.test(html)) return null;
    const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
    if (!m) return null;
    const t = m[1].replace(/<[^>]*>/g, '')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
      .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
    return t && t !== title ? t : null;
  }

  has(title) { return !!this.q.has.get(title); }

  prefix(q, limit = 20, offset = 0) {
    if (!q) return [];
    return this.q.prefix.all(q, q + '\u{10ffff}', limit, offset).map((r) => r.title);
  }

  // 링크된 문서 가운데 덤프에 있는 것. 개수 상한은 두지 않는다.
  existsMany(titles) {
    const uniq = [...new Set((Array.isArray(titles) ? titles : []).filter((t) => typeof t === 'string' && t))];
    const found = new Set();
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const chunk = uniq.slice(i, i + CHUNK);
      let st = this.inStmts.get(chunk.length);
      if (!st) {
        st = this.db.prepare(`SELECT title FROM docs WHERE title IN (${chunk.map(() => '?').join(',')})`);
        this.inStmts.set(chunk.length, st);
      }
      for (const r of st.all(...chunk)) found.add(r.title);
    }
    return found;
  }

  // 입력한 제목을 실제 문서 제목으로 맞춰 본다(대소문자, 앞뒤 공백)
  resolve(q) {
    q = String(q || '').trim();
    if (!q) return null;
    const title = q.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
    const cands = [q, q[0].toUpperCase() + q.slice(1), q.toUpperCase(), q.toLowerCase(), title];
    for (const c of new Set(cands)) if (this.has(c)) return c;
    return null;
  }

  randomTitle(anyNs = false) {
    let row = null;
    for (let i = 0; i < 30; i++) {
      const rid = 1 + Math.floor(Math.random() * Math.max(1, this.maxId));
      row = this.q.fromId.get(rid);
      if (row && (anyNs || !NAMESPACES.some((n) => row.title.startsWith(n)))) return row.title;
    }
    return row ? row.title : null;
  }

  // 제목 포함 검색에 쓰는 목록. UTF-8 버퍼 하나로 두어 메모리를 아끼고 indexOf로 찾는다.
  loadTitles() {
    if (this.titles) return;
    const hasIdx = this.db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='index' AND name='ix_title'").get();
    const sql = hasIdx ? 'SELECT title FROM docs INDEXED BY ix_title ORDER BY title' : 'SELECT title FROM docs';
    const parts = ['\n'];
    for (const r of this.db.prepare(sql).iterate()) parts.push(r.title, '\n');
    const buf = Buffer.from(parts.join(''), 'utf8');
    this.titlesLower = asciiLower(Buffer.from(buf));
    this.titles = buf;
  }

  contains(q, limit = 100, offset = 0) {
    q = String(q || '').trim().replace(/\n/g, ' ');
    if (!q) return { items: [], more: false };
    this.loadTitles();
    const needle = asciiLower(Buffer.from(q, 'utf8'));
    const hay = this.titlesLower, src = this.titles;
    const out = [];
    let start = 0, skipped = 0;
    for (;;) {
      const i = hay.indexOf(needle, start);
      if (i < 0) return { items: out, more: false };
      const a = hay.lastIndexOf(10, i) + 1;
      const b = hay.indexOf(10, i);
      start = b;
      if (skipped < offset) { skipped++; continue; }
      out.push(src.toString('utf8', a, b));
      if (out.length >= limit) return { items: out, more: hay.indexOf(needle, start) >= 0 };
    }
  }
}

module.exports = { sqliteUri, Dump, DumpError, NAMESPACES };
