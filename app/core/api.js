'use strict';
// 화면(web/app.js)이 부르는 /api/... 를 처리한다. 창과 관계없는 부분만 여기 둔다.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Dump, DumpError } = require('./dump');

class App {
  constructor(store, info) {
    this.store = store;
    this.info = info || {};
    this.dump = null;
    this.dumpError = '';
    let p = store.settings.db_path || '';
    if (!p) {
      const cand = path.join(os.homedir(), 'Downloads', 'namu-html.sqlite');
      if (fs.existsSync(cand)) p = cand;
    }
    if (p) this.openDump(p);
  }

  openDump(p) {
    let d;
    try {
      d = new Dump(p);
    } catch (e) {
      this.dumpError = e instanceof DumpError ? e.message : '덤프를 열지 못했습니다: ' + e.message;
      return false;
    }
    if (this.dump) this.dump.close();
    this.dump = d;
    this.dumpError = '';
    this.store.saveSettings({ db_path: d.path });
    // 제목 포함 검색에 쓰는 목록을 조금 뒤에 미리 읽어 둔다(첫 화면을 먼저 띄운다)
    setTimeout(() => { try { if (this.dump === d) d.loadTitles(); } catch (e) { /* 무시 */ } }, 1500);
    return true;
  }

  status() {
    const d = this.dump, s = this.store.settings;
    return {
      ready: !!d,
      error: this.dumpError,
      db_path: d ? d.path : (s.db_path || ''),
      doc_count: d ? d.count : 0,
      meta: d ? d.meta : {},
      settings: s,
      version: this.info.version,
      author: this.info.author,
      homepage: this.info.homepage,
      native: true,
      platform: this.info.platform,
    };
  }

  // 결과: { status, data }
  handle(method, ep, q, body) {
    try {
      return method === 'POST' ? this.post(ep, body && typeof body === 'object' ? body : {}) : this.get(ep, q || {});
    } catch (e) {
      return { status: 500, data: { error: '서버 오류: ' + e.message } };
    }
  }

  get(ep, q) {
    const ok = (data) => ({ status: 200, data });
    const store = this.store;
    if (ep === 'status') return ok(this.status());
    if (ep === 'settings') return ok(store.settings);
    if (ep === 'bookmarks') return ok(store.bookmarks());
    if (ep === 'history') return ok(store.history());
    const d = this.dump;
    if (!d) return { status: 409, data: { error: '덤프 파일이 열려 있지 않습니다.', need_dump: true } };
    const str = (k) => String(q[k] == null ? '' : q[k]);
    const int = (k, def) => { const n = parseInt(q[k], 10); return Number.isFinite(n) ? n : def; };
    if (ep === 'doc') {
      const title = str('title');
      let doc = d.get(title);
      if (!doc) {
        const alt = d.resolve(title);
        if (alt && alt !== title) doc = d.get(alt);
      }
      if (!doc) {
        let sugg = d.prefix(title, 12);
        if (sugg.length < 12 && title.length >= 2) {
          const base = title.replace(/\s*\([^)]*\)$/, '');
          if (base !== title) sugg = sugg.concat(d.prefix(base, 12).filter((t) => !sugg.includes(t)));
        }
        return ok({ missing: true, title, suggestions: sugg.slice(0, 20) });
      }
      doc.bookmarked = store.isBookmarked(doc.title);
      return ok(doc);
    }
    if (ep === 'suggest') {
      const s = str('q').trim();
      let items = d.prefix(s, 10);
      if (items.length < 10 && s && s[0] !== s[0].toUpperCase()) {
        items = items.concat(d.prefix(s[0].toUpperCase() + s.slice(1), 10).filter((t) => !items.includes(t)));
      }
      return ok({ q: s, items: items.slice(0, 10) });
    }
    if (ep === 'search') {
      const s = str('q').trim();
      const mode = str('mode') || 'prefix';
      const limit = Math.max(1, Math.min(200, int('limit', 50)));
      const offset = Math.max(0, int('offset', 0));
      if (mode === 'contains') {
        const r = d.contains(s, limit, offset);
        return ok({ q: s, mode, items: r.items, more: r.more });
      }
      const items = d.prefix(s, limit + 1, offset);
      return ok({ q: s, mode, items: items.slice(0, limit), more: items.length > limit, exact: d.resolve(s) });
    }
    if (ep === 'random') return ok({ title: d.randomTitle() });
    return { status: 404, data: { error: 'unknown endpoint' } };
  }

  post(ep, data) {
    const ok = (x) => ({ status: 200, data: x });
    const store = this.store;
    if (ep === 'settings') return ok(store.saveSettings(data));
    if (ep === 'open') {
      const r = this.openDump(String(data.path || ''));
      return ok({ ok: r, error: this.dumpError, path: this.dump ? this.dump.path : '' });
    }
    if (ep === 'bookmark') { store.setBookmark(String(data.title || ''), !!data.on); return ok({ ok: true }); }
    if (ep === 'history') {
      if (data.clear) store.clearHistory();
      else if (data.title && store.settings.record_history !== false) store.addHistory(String(data.title));
      return ok({ ok: true });
    }
    if (ep === 'exists') {
      if (!this.dump) return ok({ exists: [] });
      return ok({ exists: [...this.dump.existsMany(data.titles)].sort() });
    }
    return { status: 404, data: { error: 'unknown endpoint' } };
  }
}

module.exports = { App };
