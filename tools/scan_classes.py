"""덤프 표본에서 난독화된 클래스(글자 크기, 표 정렬)를 모아 web/classmap.json을 만들 재료를 뽑는다.

    python3 tools/scan_classes.py <덤프.sqlite> <표본 수> <난수 씨앗> <결과.json>

문서마다 문단 제목의 클래스(수집 시점마다 다른 변형)를 열쇠로 삼아 다음을 모은다.
    span   글자 크기 후보: 본문 안에서 스타일 없이 클래스만 붙은 span과 그 글자 예시
    wrap   표 감싸개의 변형: 표를 감싼 div의 두 번째 이후 클래스와 예시
    div    그 밖에 본문에서 자주 나오는 div 클래스
여러 씨앗으로 돌린 결과를 합친 뒤, 같은 틀이 변형마다 공통으로 쓰는 패턴을 맞춰
web/classmap.json을 손으로 만들었다. 표준 라이브러리만 쓴다.
"""
import collections
import json
import random
import sqlite3
import sys
import zlib
from html.parser import HTMLParser

VOID = {"br", "hr", "img", "col", "input", "meta", "link", "source", "wbr", "area", "base", "embed", "param", "track"}
MAX_HTML = 1_500_000       # 이보다 큰 문서는 건너뛴다(느림)


class TreeParser(HTMLParser):
    """HTML을 {'t': 태그, 'a': 속성, 'c': 자식들} 모양의 간단한 나무로 읽는다."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {"t": "#", "a": {}, "c": []}
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = {"t": tag, "a": dict(attrs), "c": []}
        self.stack[-1]["c"].append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]["t"] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1]["c"].append(data)


def walk(node):
    yield node
    for c in node["c"]:
        if isinstance(c, dict):
            yield from walk(c)


def text(node):
    return "".join(c if isinstance(c, str) else text(c) for c in node["c"])


def vue_mark(node):
    """Vue 컴포넌트 표식(data-v-...) 속성 이름."""
    for k in node["a"]:
        if k.startswith("data-v-"):
            return k
    return None


def element_kids(node):
    return [k for k in node["c"] if isinstance(k, dict)]


def is_plain_size_span(node):
    """글자 크기용으로 보이는 span인가(문단 번호, 각주, 이미지를 감싼 span은 뺀다)."""
    kids = element_kids(node)
    if any(k["t"] in ("img", "a") and k["a"].get("href", "").startswith(("#s-", "/edit/")) for k in kids):
        return False
    if any("fn-" in k["a"].get("id", "") for k in kids):
        return False
    for k in kids:
        if k["t"] == "img":
            return False
        if k["t"] == "span" and "style" in k["a"] and k["c"] and isinstance(k["c"][0], dict) and k["c"][0]["t"] == "img":
            return False
    return True


def new_bucket():
    return {"docs": 0, "para": None, "span": collections.Counter(), "spanex": {},
            "wrap": collections.Counter(), "wrapex": {}, "div": collections.Counter(), "divex": {}}


def scan_doc(html, out):
    parser = TreeParser()
    parser.feed(html)
    nodes = list(walk(parser.root))
    heads = [n for n in nodes if n["t"] in ("h2", "h3", "h4", "h5") and n["a"].get("class")]
    if not heads:
        return
    main = vue_mark(heads[0])
    bucket = out[heads[0]["a"]["class"]]
    # 본문 문단 div의 클래스: 본문 컴포넌트의 div 중 가장 흔한 단일 클래스
    divs = collections.Counter(n["a"].get("class") for n in nodes if n["t"] == "div" and vue_mark(n) == main
                               and n["a"].get("class") and " " not in n["a"]["class"])
    para = divs.most_common(1)[0][0] if divs else None
    bucket["docs"] += 1
    bucket["para"] = para
    for n in nodes:
        if vue_mark(n) != main:
            continue
        cls = n["a"].get("class")
        if n["t"] == "span" and cls and "style" not in n["a"] and is_plain_size_span(n):
            bucket["span"][cls] += 1
            bucket["spanex"].setdefault(cls, collections.Counter())[text(n).strip()[:30]] += 1
        if n["t"] == "div":
            kids = element_kids(n)
            if kids and kids[0]["t"] == "table":
                mod = " ".join((cls or "").split()[1:]) or "-"
                bucket["wrap"][mod] += 1
                ex = bucket["wrapex"].setdefault(mod, [])
                if len(ex) < 8:
                    ex.append((n["a"].get("style"), kids[0]["a"].get("style", "")[:40], text(n)[:30]))
            elif cls and " " not in cls and cls != para:
                bucket["div"][cls] += 1
                ex = bucket["divex"].setdefault(cls, [])
                if len(ex) < 4:
                    ex.append(text(n)[:50])


def summarize(out):
    res = {}
    for key, b in out.items():
        top_span = b["span"].most_common(25)
        top_div = b["div"].most_common(15)
        res[key] = {
            "docs": b["docs"], "para": b["para"],
            "span": top_span, "spanex": {c: b["spanex"][c].most_common(400) for c, _ in top_span},
            "wrap": b["wrap"].most_common(), "wrapex": b["wrapex"],
            "div": top_div, "divex": {c: b["divex"][c] for c, _ in top_div},
        }
    return res


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    path, count, seed, result = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    db = sqlite3.connect("file:" + path + "?mode=ro&immutable=1", uri=True)
    random.seed(seed)
    max_id = db.execute("SELECT max(id) FROM docs").fetchone()[0]
    small = db.execute("SELECT count(*) FROM docs").fetchone()[0] < 10000
    ids = [r[0] for r in db.execute("SELECT id FROM docs")] if small else range(1, max_id + 1)
    out = collections.defaultdict(new_bucket)
    for i in random.sample(ids, min(count, len(ids))):
        row = db.execute("SELECT html FROM docs WHERE id = ?", (i,)).fetchone()
        if not row or not row[0]:
            continue
        html = zlib.decompress(row[0]).decode("utf-8", "replace")
        if len(html) <= MAX_HTML:
            scan_doc(html, out)
    res = summarize(out)
    with open(result, "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print("done", {k: v["docs"] for k, v in res.items()})


if __name__ == "__main__":
    main()
