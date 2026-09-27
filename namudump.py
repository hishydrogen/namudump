#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""나무덤프: 나무위키 SQLite 덤프를 오프라인으로 읽는 프로그램.

표준 라이브러리만으로 동작한다(Python 3.8 이상). pywebview가 설치되어 있으면
독립된 맥 창으로 열리고, 없으면 크롬 계열 브라우저의 앱 창이나 기본 브라우저로 연다.

원본 덤프는 읽기 전용으로만 연다. 설정, 즐겨찾기, 방문 기록은
~/Library/Application Support/NamuDump 에 따로 저장한다.
"""
import argparse
import json
import mimetypes
import os
import random
import re
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.parse as U
import webbrowser
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_NAME = "나무덤프"
APP_VERSION = "1.0.0"
APP_AUTHOR = "hishydrogen"
APP_COPYRIGHT = "© 2026 " + APP_AUTHOR
APP_HOMEPAGE = "https://github.com/hishydrogen/namudump"
HERE = Path(__file__).resolve().parent
WEB = HERE / "web"

if sys.platform == "darwin":
    SUPPORT = Path.home() / "Library" / "Application Support" / "NamuDump"
else:
    SUPPORT = Path.home() / ".namudump"

ASCII_LOWER = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
NAMESPACES = ("분류:", "틀:", "파일:", "나무위키:", "사용자:", "휴지통:", "특수기능:", "위키운영:", "더미:", "파일휴지통:")
DEFAULT_SETTINGS = {
    "db_path": "",
    "theme": "system",       # system | light | dark
    "font_size": 15,
    "width": "normal",       # narrow | normal | wide
    "toc_sidebar": True,
    "link_check": True,
    "record_history": True,
}


# ---------------------------------------------------------------- 사용자 데이터
class UserStore:
    """설정(JSON)과 즐겨찾기, 방문 기록(SQLite)을 다룬다."""

    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.cfg_path = self.root / "settings.json"
        self.lock = threading.Lock()
        self.settings = dict(DEFAULT_SETTINGS)
        try:
            saved = json.loads(self.cfg_path.read_text("utf-8"))
            # 모르는 설정 항목(없어진 항목 등)은 버린다
            self.settings.update({k: v for k, v in saved.items() if k in DEFAULT_SETTINGS})
        except Exception:
            pass
        self.db = sqlite3.connect(str(self.root / "user.sqlite"), check_same_thread=False)
        self.db.executescript(
            "CREATE TABLE IF NOT EXISTS bookmarks (title TEXT PRIMARY KEY, added_at REAL);"
            "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY, title TEXT, visited_at REAL);"
            "CREATE INDEX IF NOT EXISTS ix_hist_title ON history(title);"
        )
        self.db.commit()

    def save_settings(self, patch):
        with self.lock:
            for k, v in patch.items():
                if k in DEFAULT_SETTINGS:
                    self.settings[k] = v
            tmp = self.cfg_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.settings, ensure_ascii=False, indent=2), "utf-8")
            os.replace(tmp, self.cfg_path)
            return dict(self.settings)

    def bookmarks(self):
        with self.lock:
            return [{"title": t, "added_at": a} for t, a in
                    self.db.execute("SELECT title, added_at FROM bookmarks ORDER BY added_at DESC")]

    def set_bookmark(self, title, on):
        with self.lock:
            if on:
                self.db.execute("INSERT OR REPLACE INTO bookmarks VALUES (?, ?)", (title, time.time()))
            else:
                self.db.execute("DELETE FROM bookmarks WHERE title = ?", (title,))
            self.db.commit()

    def is_bookmarked(self, title):
        with self.lock:
            return self.db.execute("SELECT 1 FROM bookmarks WHERE title = ?", (title,)).fetchone() is not None

    def add_history(self, title):
        with self.lock:
            self.db.execute("DELETE FROM history WHERE title = ?", (title,))
            self.db.execute("INSERT INTO history (title, visited_at) VALUES (?, ?)", (title, time.time()))
            self.db.execute("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 500)")
            self.db.commit()

    def history(self, limit=200):
        with self.lock:
            return [{"title": t, "visited_at": a} for t, a in
                    self.db.execute("SELECT title, visited_at FROM history ORDER BY visited_at DESC LIMIT ?", (limit,))]

    def clear_history(self):
        with self.lock:
            self.db.execute("DELETE FROM history")
            self.db.commit()


# ---------------------------------------------------------------- 덤프
class DumpError(Exception):
    pass


class Dump:
    """덤프 파일을 읽기 전용으로 연다. 스레드마다 연결을 따로 둔다."""

    def __init__(self, path):
        self.path = Path(path).expanduser()
        if not self.path.is_file():
            raise DumpError("파일을 찾을 수 없습니다: %s" % self.path)
        self.local = threading.local()
        db = self.conn()
        try:
            cols = {r[1] for r in db.execute("PRAGMA table_info(docs)")}
        except sqlite3.DatabaseError as e:
            raise DumpError("SQLite 파일이 아니거나 손상되었습니다: %s" % e)
        if not {"title", "html"} <= cols:
            raise DumpError("나무위키 덤프 형식(docs 테이블의 title, html 컬럼)이 아닙니다.")
        self.meta = {}
        try:
            self.meta = dict(db.execute("SELECT k, v FROM meta").fetchall())
        except sqlite3.DatabaseError:
            pass
        self.max_id = db.execute("SELECT max(id) FROM docs").fetchone()[0] or 0
        self.count = int(self.meta.get("doc_count") or 0) or self.max_id
        self._titles = None
        self._titles_lock = threading.Lock()

    def conn(self):
        c = getattr(self.local, "c", None)
        if c is None:
            uri = self.path.resolve().as_uri() + "?mode=ro&immutable=1"
            c = sqlite3.connect(uri, uri=True, check_same_thread=False)
            c.execute("PRAGMA cache_size = -65536")
            self.local.c = c
        return c

    @staticmethod
    def inflate(value):
        if value is None:
            return None
        if isinstance(value, str):
            return value
        raw = bytes(value)
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            try:
                raw = zlib.decompress(raw, -15)
            except zlib.error:
                if not raw.lstrip()[:1] in (b"<", b"-", b"#"):
                    raise DumpError("압축을 풀 수 없는 형식입니다.")
        return raw.decode("utf-8", errors="replace")

    def get(self, title):
        row = self.conn().execute(
            "SELECT id, html, last_modified FROM docs WHERE title = ?", (title,)).fetchone()
        if not row:
            return None
        return {"id": row[0], "title": title, "html": self.inflate(row[1]), "last_modified": row[2]}

    def prefix(self, q, limit=20, offset=0):
        if not q:
            return []
        rows = self.conn().execute(
            "SELECT title FROM docs WHERE title >= ? AND title < ? ORDER BY title LIMIT ? OFFSET ?",
            (q, q + "\U0010ffff", limit, offset)).fetchall()
        return [r[0] for r in rows]

    def exists_many(self, titles):
        found = set()
        titles = list(dict.fromkeys(t for t in titles if isinstance(t, str) and t))[:5000]
        db = self.conn()
        for i in range(0, len(titles), 400):
            chunk = titles[i:i + 400]
            q = "SELECT title FROM docs WHERE title IN (%s)" % ",".join("?" * len(chunk))
            found.update(r[0] for r in db.execute(q, chunk))
        return found

    def resolve(self, q):
        """입력한 제목을 실제 문서 제목으로 맞춰 본다(대소문자, 앞뒤 공백)."""
        q = q.strip()
        if not q:
            return None
        cands = [q, q[:1].upper() + q[1:], q.upper(), q.lower(), q.title()]
        for c in dict.fromkeys(cands):
            if self.conn().execute("SELECT 1 FROM docs WHERE title = ?", (c,)).fetchone():
                return c
        return None

    def random_title(self, any_ns=False):
        db = self.conn()
        for _ in range(30):
            rid = random.randint(1, max(1, self.max_id))
            row = db.execute("SELECT title FROM docs WHERE id >= ? ORDER BY id LIMIT 1", (rid,)).fetchone()
            if row and (any_ns or not row[0].startswith(NAMESPACES)):
                return row[0]
        return row[0] if row else None

    def _load_titles(self):
        with self._titles_lock:
            if self._titles is None:
                db = self.conn()
                parts = [r[0] for r in db.execute("SELECT title FROM docs INDEXED BY ix_title ORDER BY title")] \
                    if self._has_index(db) else [r[0] for r in db.execute("SELECT title FROM docs")]
                self._titles = "\n" + "\n".join(parts) + "\n"
                self._titles_lower = self._titles.translate(ASCII_LOWER)
        return self._titles

    @staticmethod
    def _has_index(db):
        return db.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name='ix_title'").fetchone() is not None

    def contains(self, q, limit=100, offset=0):
        q = q.strip().translate(ASCII_LOWER).replace("\n", " ")
        if not q:
            return [], False
        self._load_titles()
        hay = self._titles_lower
        src = self._titles
        out, start, skipped = [], 0, 0
        while True:
            i = hay.find(q, start)
            if i < 0:
                return out, False
            a = hay.rfind("\n", 0, i) + 1
            b = hay.find("\n", i)
            start = b
            if skipped < offset:
                skipped += 1
                continue
            out.append(src[a:b])
            if len(out) >= limit:
                return out, hay.find(q, start) >= 0


# ---------------------------------------------------------------- HTTP
class App:
    def __init__(self, store):
        self.store = store
        self.dump = None
        self.dump_error = ""
        path = store.settings.get("db_path") or ""
        if not path:
            cand = Path.home() / "Downloads" / "namu-html.sqlite"
            if cand.is_file():
                path = str(cand)
        if path:
            self.open_dump(path)

    def open_dump(self, path):
        try:
            d = Dump(path)
        except DumpError as e:
            self.dump_error = str(e)
            return False
        except Exception as e:  # pragma: no cover
            self.dump_error = "덤프를 열지 못했습니다: %s" % e
            return False
        self.dump, self.dump_error = d, ""
        self.store.save_settings({"db_path": str(d.path)})
        # 제목 포함 검색에 쓰는 목록을 미리 읽어 둔다.
        threading.Thread(target=self._warm, args=(d,), daemon=True).start()
        return True

    @staticmethod
    def _warm(d):
        try:
            d._load_titles()
        except Exception:
            pass


def open_url_external(url):
    """외부 링크를 기본 웹 브라우저로 연다."""
    if not re.match(r"^(https?://|mailto:)", url or "", re.I) or any(c in url for c in "\r\n\0"):
        return False
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["/usr/bin/open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        return bool(webbrowser.open(url))
    except Exception:
        return False


def pick_file_dialog():
    if sys.platform != "darwin":
        return None
    script = ('POSIX path of (choose file with prompt "나무위키 덤프 파일(.sqlite)을 선택하세요" '
              'default location (path to downloads folder))')
    try:
        out = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=600)
    except Exception:
        return None
    p = out.stdout.strip()
    return p or None


class Handler(BaseHTTPRequestHandler):
    server_version = "NamuDump/" + APP_VERSION
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if os.environ.get("NAMUDUMP_DEBUG"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    # -- 응답 도우미
    def _send(self, status, body, ctype, extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def json(self, obj, status=200):
        self._send(status, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8",
                   {"Cache-Control": "no-store"})

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 5_000_000:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def allowed(self):
        port = self.server.server_port
        host = (self.headers.get("Host") or "")
        if host not in ("127.0.0.1:%d" % port, "localhost:%d" % port):
            self._send(403, "forbidden", "text/plain")
            return False
        if self.command == "POST":
            origin = self.headers.get("Origin")
            if origin and origin not in ("http://127.0.0.1:%d" % port, "http://localhost:%d" % port):
                self._send(403, "forbidden", "text/plain")
                return False
        return True

    def static(self, rel):
        rel = rel.lstrip("/") or "index.html"
        path = (WEB / rel).resolve()
        if WEB.resolve() not in path.parents and path != WEB.resolve() or not path.is_file():
            self._send(404, "not found", "text/plain")
            return
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        extra = {"Cache-Control": "no-cache"}
        if rel == "index.html":
            extra["Content-Security-Policy"] = (
                "default-src 'self'; img-src 'self' https: http: data:; style-src 'self' 'unsafe-inline'; "
                "font-src 'self' data:; script-src 'self'; connect-src 'self'; "
                "frame-src https:; media-src https: http:; "
                "base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        self._send(200, path.read_bytes(), ctype, extra)

    # -- 라우팅
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.allowed():
            return
        url = U.urlsplit(self.path)
        path, qs = url.path, U.parse_qs(url.query)
        q = lambda k, d="": (qs.get(k) or [d])[0]
        app = self.server.app
        try:
            if path.startswith("/api/"):
                return self.api_get(path[5:], q, app)
            if path in ("/", "/search") or path.startswith("/w/"):
                return self.static("index.html")
            return self.static(path)
        except BrokenPipeError:
            pass
        except Exception as e:
            self.json({"error": "서버 오류: %s" % e}, 500)

    def api_get(self, ep, q, app):
        store = app.store
        if ep == "status":
            d = app.dump
            return self.json({
                "ready": d is not None,
                "error": app.dump_error,
                "db_path": str(d.path) if d else store.settings.get("db_path", ""),
                "doc_count": d.count if d else 0,
                "meta": d.meta if d else {},
                "settings": store.settings,
                "version": APP_VERSION,
                "author": APP_AUTHOR,
                "homepage": APP_HOMEPAGE,
                "native": bool(getattr(self.server, "native", False)),
                "mac_chrome": bool(getattr(self.server, "mac_chrome", False)),
            })
        if ep == "settings":
            return self.json(store.settings)
        if ep == "bookmarks":
            return self.json(store.bookmarks())
        if ep == "history":
            return self.json(store.history())
        if ep == "pick":
            p = None
            win = getattr(self.server, "window", None)
            if win is not None:
                try:
                    import webview  # type: ignore
                    r = win.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False,
                                               directory=str(Path.home() / "Downloads"))
                    if r:
                        p = r[0] if isinstance(r, (list, tuple)) else r
                    else:
                        return self.json({"ok": False, "cancelled": True})
                except Exception:
                    p = None
            if p is None:
                p = pick_file_dialog()
            if not p:
                return self.json({"ok": False, "cancelled": True})
            ok = app.open_dump(p)
            return self.json({"ok": ok, "error": app.dump_error, "path": p})
        d = app.dump
        if d is None:
            return self.json({"error": "덤프 파일이 열려 있지 않습니다.", "need_dump": True}, 409)
        if ep == "doc":
            title = q("title")
            doc = d.get(title)
            if doc is None:
                alt = d.resolve(title)
                if alt and alt != title:
                    doc = d.get(alt)
            if doc is None:
                sugg = d.prefix(title, 12)
                if len(sugg) < 12 and len(title) >= 2:
                    base = re.sub(r"\s*\([^)]*\)$", "", title)
                    if base != title:
                        sugg += [t for t in d.prefix(base, 12) if t not in sugg]
                return self.json({"missing": True, "title": title, "suggestions": sugg[:20]})
            doc["bookmarked"] = store.is_bookmarked(doc["title"])
            return self.json(doc)
        if ep == "suggest":
            s = q("q").strip()
            items = d.prefix(s, 10)
            if len(items) < 10 and s and s[:1].islower():
                items += [t for t in d.prefix(s[:1].upper() + s[1:], 10) if t not in items]
            return self.json({"q": s, "items": items[:10]})
        if ep == "search":
            s = q("q").strip()
            mode = q("mode", "prefix")
            limit = min(200, int(q("limit", "50") or 50))
            offset = max(0, int(q("offset", "0") or 0))
            if mode == "contains":
                items, more = d.contains(s, limit, offset)
                return self.json({"q": s, "mode": mode, "items": items, "more": more})
            items = d.prefix(s, limit + 1, offset)
            return self.json({"q": s, "mode": mode, "items": items[:limit], "more": len(items) > limit,
                              "exact": d.resolve(s)})
        if ep == "random":
            return self.json({"title": d.random_title()})
        return self.json({"error": "unknown endpoint"}, 404)

    def do_POST(self):
        if not self.allowed():
            return
        ep = U.urlsplit(self.path).path
        data = self.body_json()
        app = self.server.app
        store = app.store
        try:
            if ep == "/api/settings":
                return self.json(store.save_settings(data if isinstance(data, dict) else {}))
            if ep == "/api/open":
                ok = app.open_dump(str(data.get("path", "")))
                return self.json({"ok": ok, "error": app.dump_error})
            if ep == "/api/bookmark":
                store.set_bookmark(str(data.get("title", "")), bool(data.get("on")))
                return self.json({"ok": True})
            if ep == "/api/history":
                if data.get("clear"):
                    store.clear_history()
                elif data.get("title") and store.settings.get("record_history", True) is not False:
                    store.add_history(str(data["title"]))
                return self.json({"ok": True})
            if ep == "/api/exists":
                if app.dump is None:
                    return self.json({"exists": []})
                titles = data.get("titles") or []
                return self.json({"exists": sorted(app.dump.exists_many(titles))})
            if ep == "/api/window_title":
                win = getattr(self.server, "window", None)
                if win is not None:
                    try:
                        win.set_title(str(data.get("title", ""))[:200] or APP_NAME)
                    except Exception:
                        return self.json({"ok": False})
                return self.json({"ok": win is not None})
            if ep == "/api/drag_regions":
                mc = sys.modules.get("mac_chrome")
                return self.json({"ok": bool(mc and mc.set_drag_regions(data if isinstance(data, dict) else {}))})
            if ep == "/api/bg":
                mc = sys.modules.get("mac_chrome")
                ok = bool(mc and mc.set_background(getattr(self.server, "window", None), str(data.get("color", ""))))
                return self.json({"ok": ok})
            if ep in ("/api/swipe_lock", "/api/scroll_capture"):
                mc = sys.modules.get("mac_chrome")
                return self.json({"ok": bool(mc and mc.set_capture())})
            if ep == "/api/open_url":
                url = str(data.get("url", ""))
                return self.json({"ok": open_url_external(url)})
            if ep == "/api/quit":
                self.json({"ok": True})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
                return
            return self.json({"error": "unknown endpoint"}, 404)
        except BrokenPipeError:
            pass
        except Exception as e:
            self.json({"error": "서버 오류: %s" % e}, 500)


def make_server(app, port=0):
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.daemon_threads = True
    srv.app = app
    return srv


# ---------------------------------------------------------------- 창 띄우기
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
]


MAC_MENU_KO = {
    "global.quitConfirmation": "종료할까요?", "global.ok": "확인", "global.quit": "종료",
    "global.cancel": "취소", "global.saveFile": "파일 저장",
    "cocoa.menu.about": "{app}에 관하여", "cocoa.menu.services": "서비스", "cocoa.menu.view": "보기",
    "cocoa.menu.edit": "편집", "cocoa.menu.hide": "{app} 가리기", "cocoa.menu.hideOthers": "기타 가리기",
    "cocoa.menu.showAll": "모두 보기", "cocoa.menu.quit": "{app} 종료", "cocoa.menu.fullscreen": "전체 화면 시작",
    "cocoa.menu.cut": "오려두기", "cocoa.menu.copy": "복사하기", "cocoa.menu.paste": "붙여넣기",
    "cocoa.menu.selectAll": "전체 선택",
}


def run_native(url, srv):
    """pywebview로 독립 창을 띄운다. 성공하면 True."""
    if sys.platform == "darwin":
        # WebKit 오른쪽 클릭 메뉴 등 시스템 문구를 사용자 언어(한국어)로
        try:
            from Foundation import NSBundle  # type: ignore
            info = NSBundle.mainBundle().infoDictionary()
            if info is not None:
                info["CFBundleAllowMixedLocalizations"] = True
                info["CFBundleDevelopmentRegion"] = "ko"
        except Exception:
            pass
    try:
        import webview  # type: ignore
    except Exception:
        return False
    srv.native = True
    # 웹에서 파이썬을 부를 때는 pywebview의 js_api 대신 서버 API(/api/...)를 쓴다(js_api는 믿을 수 없었다).

    def mac_tweaks():
        if sys.platform != "darwin":
            return
        try:
            from AppKit import NSApplication, NSImage  # type: ignore
            from Foundation import NSBundle  # type: ignore
            info = NSBundle.mainBundle().infoDictionary()
            if info is not None:
                # 파이썬으로 실행되므로 정보 창(나무덤프에 관하여)이 파이썬 정보를 보이지 않게 채운다
                info["CFBundleName"] = APP_NAME
                info["CFBundleShortVersionString"] = APP_VERSION
                info["CFBundleVersion"] = APP_VERSION
                info["NSHumanReadableCopyright"] = APP_COPYRIGHT
            icon = HERE / "icon.icns"
            if icon.is_file():
                img = NSImage.alloc().initWithContentsOfFile_(str(icon))
                if img:
                    NSApplication.sharedApplication().setApplicationIconImage_(img)
        except Exception:
            pass

    mac_tweaks()
    mc = None
    if sys.platform == "darwin":
        try:
            import mac_chrome as mc  # type: ignore
            mc.ABOUT.update(name=APP_NAME, version=APP_VERSION, copyright=APP_COPYRIGHT, homepage=APP_HOMEPAGE)
            mc.patch_webview()
            srv.mac_chrome = True
        except Exception as e:
            print("mac_chrome 실패:", e, flush=True)
            mc = None
    win = webview.create_window(APP_NAME, url, width=1280, height=880,
                                min_size=(640, 480), text_select=True, background_color="#FFFFFF")
    srv.window = win
    try:
        webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
        webview.settings["ALLOW_DOWNLOADS"] = False
    except Exception:
        pass
    def after_start():
        mac_tweaks()
        if mc is not None:
            try:
                win.events.before_show.wait(15)
                mc.style_window(win)
                win.events.loaded.wait(30)
                mc.webview_loaded(win)
            except Exception as e:
                print("style_window 실패:", e, flush=True)

    kw = {}
    if sys.platform == "darwin":
        try:
            from webview.platforms import cocoa  # type: ignore
            cocoa.BrowserView._append_app_name = lambda self, val: val.replace("{app}", APP_NAME)
            kw["localization"] = MAC_MENU_KO
        except Exception as e:
            print("메뉴 한글화 실패:", e, flush=True)
    try:
        webview.start(func=after_start, private_mode=False, storage_path=str(SUPPORT / "webview"), **kw)
    except TypeError:
        webview.start(func=after_start)
    return True


def run_chrome_app(url):
    for exe in CHROME_CANDIDATES:
        if os.path.exists(exe):
            prof = SUPPORT / "browser-profile"
            prof.mkdir(parents=True, exist_ok=True)
            args = [exe, "--app=" + url, "--user-data-dir=" + str(prof), "--no-first-run",
                    "--no-default-browser-check", "--window-size=1280,880", "--disable-features=Translate"]
            try:
                p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                continue
            p.wait()
            return True
    return False


def main():
    ap = argparse.ArgumentParser(description="나무덤프: 나무위키 SQLite 덤프를 오프라인으로 읽는 프로그램")
    ap.add_argument("database", nargs="?", help="덤프 파일 경로(namu-html.sqlite). 생략하면 마지막으로 연 파일")
    ap.add_argument("--port", type=int, default=0, help="고정 포트(기본: 빈 포트 자동 선택)")
    ap.add_argument("--mode", choices=["auto", "native", "chrome", "browser", "server"], default="auto",
                    help="창 띄우는 방식")
    ap.add_argument("--support-dir", help="설정 저장 위치(시험용)")
    args, _unknown = ap.parse_known_args()

    store = UserStore(args.support_dir or SUPPORT)
    app = App(store)
    if args.database:
        if not app.open_dump(args.database):
            print("경고: " + app.dump_error, file=sys.stderr)

    srv = make_server(app, args.port)
    url = "http://127.0.0.1:%d/" % srv.server_port
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    print("%s %s: %s" % (APP_NAME, APP_VERSION, url), flush=True)

    try:
        if args.mode in ("auto", "native") and run_native(url, srv):
            return
        if args.mode == "native":
            print("pywebview가 없어 창을 띄우지 못했습니다. pip install pywebview", file=sys.stderr)
        if args.mode in ("auto", "chrome") and run_chrome_app(url):
            return
        if args.mode in ("auto", "browser"):
            webbrowser.open(url)
        print("종료하려면 Control+C를 누르거나 설정 창의 '나무덤프 종료'를 누르세요.", flush=True)
        while t.is_alive():
            t.join(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        srv.shutdown()
        srv.server_close()


if __name__ == "__main__":
    main()
