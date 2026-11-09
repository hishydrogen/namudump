'use strict';
// 설정(JSON)과 즐겨찾기, 방문 기록(SQLite). 1.0, 2.0과 같은 파일을 그대로 쓴다.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_SETTINGS = {
  db_path: '',
  theme: 'system',       // system | light | dark
  font_size: 15,
  font: 'pretendard',    // pretendard | system | 설치된 글꼴 이름
  width: 'normal',       // narrow | normal | wide
  toc_sidebar: true,
  link_check: true,
  record_history: true,
  auto_find: true,       // 연결된 덤프가 없을 때 다운로드 폴더의 namu-html.sqlite를 찾아 연다(연결을 해제하면 끈다)
};
const HISTORY_KEEP = 500;

class UserStore {
  constructor(root) {
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
    this.cfgPath = path.join(root, 'settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      const saved = JSON.parse(fs.readFileSync(this.cfgPath, 'utf8'));
      // 모르는 설정 항목(없어진 항목 등)은 버린다
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in saved) this.settings[k] = saved[k];
    } catch (e) { /* 처음 실행 */ }
    this.db = new DatabaseSync(path.join(root, 'user.sqlite'));
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS bookmarks (title TEXT PRIMARY KEY, added_at REAL);' +
      'CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY, title TEXT, visited_at REAL);' +
      'CREATE INDEX IF NOT EXISTS ix_hist_title ON history(title);');
    const p = (sql) => this.db.prepare(sql);
    this.q = {
      bookmarks: p('SELECT title, added_at FROM bookmarks ORDER BY added_at DESC'),
      bmAdd: p('INSERT OR REPLACE INTO bookmarks VALUES (?, ?)'),
      bmDel: p('DELETE FROM bookmarks WHERE title = ?'),
      bmHas: p('SELECT 1 AS x FROM bookmarks WHERE title = ?'),
      histDel: p('DELETE FROM history WHERE title = ?'),
      histAdd: p('INSERT INTO history (title, visited_at) VALUES (?, ?)'),
      histTrim: p(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT ${HISTORY_KEEP})`),
      history: p('SELECT title, visited_at FROM history ORDER BY visited_at DESC LIMIT ?'),
      histClear: p('DELETE FROM history'),
    };
  }

  close() { try { this.db.close(); } catch (e) { /* 무시 */ } }

  saveSettings(patch) {
    for (const [k, v] of Object.entries(patch || {})) if (k in DEFAULT_SETTINGS) this.settings[k] = v;
    const tmp = this.cfgPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.settings, null, 2), 'utf8');
    fs.renameSync(tmp, this.cfgPath);
    return { ...this.settings };
  }

  bookmarks() { return this.q.bookmarks.all().map((r) => ({ title: r.title, added_at: r.added_at })); }
  setBookmark(title, on) {
    if (on) this.q.bmAdd.run(title, Date.now() / 1000); else this.q.bmDel.run(title);
  }
  isBookmarked(title) { return !!this.q.bmHas.get(title); }

  addHistory(title) {
    this.db.exec('BEGIN');
    try {
      this.q.histDel.run(title);
      this.q.histAdd.run(title, Date.now() / 1000);
      this.q.histTrim.run();
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  history(limit = 200) { return this.q.history.all(limit).map((r) => ({ title: r.title, visited_at: r.visited_at })); }
  clearHistory() { this.q.histClear.run(); }

  // 모든 설정, 즐겨찾기, 방문 기록을 지운다. 다운로드 폴더의 덤프를 다시 자동으로 열지 않게 auto_find는 끈다
  reset() {
    this.db.exec('DELETE FROM bookmarks; DELETE FROM history;');
    this.settings = { ...DEFAULT_SETTINGS };
    return this.saveSettings({ auto_find: false });
  }
}

module.exports = { UserStore, DEFAULT_SETTINGS };
