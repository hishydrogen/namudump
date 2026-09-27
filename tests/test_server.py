"""서버 API 기본 시험(표준 라이브러리만 사용, 실제 덤프 불필요).

    python3 -m unittest discover -s tests -v

작은 가짜 덤프를 임시 폴더에 만들고 서버를 띄워 주요 API가 살아 있는지 확인한다.
화면(render.js, app.js)은 실제 앱에서 눈으로 확인한다.
"""
import json
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import namudump as nd  # noqa: E402

DOCS = {
    "나무위키": "<div><h2>개요</h2><p>나무위키 문서</p></div>",
    "나무": "<div><p>나무 문서</p></div>",
    "사과나무": "<div><p>사과나무 문서</p></div>",
    "Python": "<div><p>파이썬</p></div>",
}


def make_dump(path):
    db = sqlite3.connect(path)
    db.execute("CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT)")
    db.execute("CREATE TABLE docs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, md BLOB NOT NULL, html BLOB,"
               " md_len, html_len, text_len, categories, images, links, last_modified TEXT, rendered_at INTEGER)")
    db.execute("CREATE UNIQUE INDEX ix_title ON docs(title)")
    db.executemany("INSERT INTO meta VALUES (?, ?)", [("doc_count", str(len(DOCS))), ("source", "test")])
    for i, (t, h) in enumerate(DOCS.items(), 1):
        db.execute("INSERT INTO docs(id, title, md, html, last_modified) VALUES (?, ?, ?, ?, ?)",
                   (i, t, zlib.compress(("== " + t).encode()), zlib.compress(h.encode()), "2026-08-01"))
    db.commit()
    db.close()


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        dump = Path(cls.tmp.name) / "dump.sqlite"
        make_dump(dump)
        app = nd.App(nd.UserStore(Path(cls.tmp.name) / "support"))
        assert app.open_dump(str(dump)), app.dump_error
        cls.srv = nd.make_server(app, 0)
        cls.base = "http://127.0.0.1:%d" % cls.srv.server_port
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        cls.tmp.cleanup()

    def get(self, path):
        with urllib.request.urlopen(self.base + path, timeout=10) as r:
            return json.loads(r.read())

    def post(self, path, data):
        req = urllib.request.Request(self.base + path, data=json.dumps(data).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())

    def test_status(self):
        s = self.get("/api/status")
        self.assertTrue(s["ready"])
        self.assertEqual(s["version"], nd.APP_VERSION)
        self.assertEqual(s["doc_count"], len(DOCS))

    def test_doc(self):
        d = self.get("/api/doc?title=" + urllib.parse.quote("나무위키"))
        self.assertIn("나무위키 문서", d["html"])

    def test_missing_doc_gives_suggestions(self):
        d = self.get("/api/doc?title=" + urllib.parse.quote("나무위"))
        self.assertTrue(d.get("missing"))

    def test_prefix_and_contains(self):
        p = self.get("/api/search?mode=prefix&q=" + urllib.parse.quote("나무"))
        self.assertEqual(p["items"][:2], ["나무", "나무위키"])
        c = self.get("/api/search?mode=contains&q=" + urllib.parse.quote("나무"))
        self.assertIn("사과나무", c["items"])
        c2 = self.get("/api/search?mode=contains&q=python")
        self.assertIn("Python", c2["items"])

    def test_exists(self):
        r = self.post("/api/exists", {"titles": ["나무", "없는문서"]})
        self.assertEqual(r["exists"], ["나무"])

    def test_history_and_bookmark(self):
        self.post("/api/history", {"title": "나무"})
        self.assertIn("나무", json.dumps(self.get("/api/history"), ensure_ascii=False))
        self.post("/api/bookmark", {"title": "나무", "on": True})
        self.assertIn("나무", json.dumps(self.get("/api/bookmarks"), ensure_ascii=False))

    def test_static_index(self):
        with urllib.request.urlopen(self.base + "/w/" + urllib.parse.quote("나무"), timeout=10) as r:
            self.assertIn(b"render.js", r.read())

    def test_clear_history(self):
        self.post("/api/history", {"title": "사과나무"})
        self.post("/api/history", {"clear": True})
        self.assertEqual(self.get("/api/history"), [])

    def status_of(self, req):
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status
        except urllib.error.HTTPError as e:
            e.close()
            return e.code

    def test_rejects_foreign_host(self):
        req = urllib.request.Request(self.base + "/api/status", headers={"Host": "evil.example"})
        self.assertEqual(self.status_of(req), 403)

    def test_rejects_foreign_origin_post(self):
        req = urllib.request.Request(self.base + "/api/history", data=b'{"clear": true}', method="POST",
                                     headers={"Content-Type": "application/json", "Origin": "https://evil.example"})
        self.assertEqual(self.status_of(req), 403)

    def test_static_stays_in_web_folder(self):
        self.assertEqual(self.status_of(self.base + "/../namudump.py"), 404)
        self.assertEqual(self.status_of(self.base + "/%2e%2e/namudump.py"), 404)

    def test_open_url_only_web_links(self):
        self.assertFalse(nd.open_url_external("file:///etc/passwd"))
        self.assertFalse(nd.open_url_external("javascript:alert(1)"))


if __name__ == "__main__":
    unittest.main()
