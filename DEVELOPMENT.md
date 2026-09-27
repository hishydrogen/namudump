# 나무덤프 개발 안내

나무덤프를 고치거나 직접 빌드하려는 분을 위한 문서입니다. 쓰는 법은 [README](README.md)를 보세요.

## 구조

나무덤프는 세 부분으로 이루어져 있습니다.

1. **로컬 서버**(`namudump.py`): 파이썬 표준 라이브러리만 씁니다. 덤프를 읽기 전용으로 열고, `127.0.0.1`의 빈 포트에서 화면 파일과 API를 내줍니다. 설정과 기록도 여기서 저장합니다.
2. **화면**(`web/`): 서버가 내주는 단일 페이지 앱입니다. 덤프에 든 나무위키 웹페이지 HTML을 정리해 문서로 보여 줍니다. 빌드 과정이나 외부 라이브러리 없이 순수 HTML, CSS, JS로 되어 있습니다.
3. **창**: pywebview 독립 창, 크롬 계열 브라우저의 앱 창, 기본 브라우저 순서로 시도합니다. 맥 독립 창은 `mac_chrome.py`가 맥 앱처럼 다듬습니다.

```
namudump.py        로컬 서버, 설정과 기록 저장, 창 띄우기
mac_chrome.py      맥 독립 창 꾸미기(제목 표시줄, 신호등 단추, 창 끌기, 메뉴, 입력 처리, 정보 창)
web/index.html     화면 뼈대
web/app.js         라우팅(/, /w/제목, /search), 검색, 목차, 각주, 보관함, 설정, 스크롤과 제스처
web/render.js      덤프 HTML을 깨끗한 문서로 바꾸는 핵심 코드(window.NamuRender.render)
web/classmap.json  난독화된 글자 크기, 표 정렬 클래스 대응표
web/app.css        화면 스타일
web/content.css    문서 본문 스타일
web/katex/         수식용 KaTeX CSS와 글꼴(MIT)
build/             앱 묶기(make_app.py), 실행기(launcher.sh), 아이콘과 .dmg 배경 그리기
tools/             덤프 조사 도구(classmap.json 재료 뽑기)
tests/             서버 API 시험(가짜 덤프 사용)
docs/              README에 쓰는 그림
```

## 실행과 시험

필요한 것은 Python 3.8 이상뿐입니다. 독립 창으로 띄우려면 pywebview가 있어야 합니다.

```bash
python3 -m unittest discover -s tests -v                  # 시험(가짜 덤프로 서버 API 확인)
python3 namudump.py "<덤프 경로>" --mode browser            # 기본 브라우저로 열기(개발자 도구로 화면 디버깅)
python3 namudump.py "<덤프 경로>" --mode native             # 독립 창(pywebview 필요)
```

- `--mode`는 `auto`(기본), `native`, `chrome`, `browser`, `server` 중에서 고릅니다. `--port N`으로 포트를 고정할 수 있습니다.
- 덤프 경로를 생략하면 마지막으로 연 파일을 엽니다.
- `--support-dir <폴더>`를 주면 설정과 기록을 그 폴더에 따로 저장합니다. 평소 쓰는 기록을 건드리지 않고 시험할 때 씁니다.
- 앱을 한 번 실행했다면 `~/Library/Application Support/NamuDump/venv/bin/python3`에 pywebview가 들어 있으니 이 파이썬으로 `--mode native`를 실행하면 편합니다.
- 화면 파일(`web/`)은 서버가 매번 디스크에서 읽으므로, 고친 뒤 새로 고침만 하면 됩니다.
- 서버 시험은 화면을 다루지 않습니다. 화면을 고쳤다면 실제 창에서 눈으로 확인합니다.

## 코드 규칙

- **의존성**: 서버(`namudump.py`)는 표준 라이브러리만 씁니다. 화면(`web/`)은 외부 라이브러리나 빌드 도구 없이 씁니다(KaTeX는 CSS와 글꼴만).
- **접두어**: 화면 코드의 CSS 클래스와 변수는 `nd-`, 파이썬이 부르는 JS 함수는 `ND_`로 시작합니다.
- **주석과 문구**: 한국어로 씁니다. 화면에 보이는 문구도 한국어입니다.
- **버전과 만든 사람**: `namudump.py`의 `APP_VERSION`, `APP_AUTHOR`, `APP_HOMEPAGE` 한 곳에서 정합니다. `build/make_app.py`, 설정 창, 정보 창이 이 값을 가져다 씁니다.
- **애니메이션**: 시간과 곡선은 `app.css`의 `:root` 변수 한 곳에서 정합니다.
  - 나타나기와 움직이기: `--nd-t-in`(0.2초), `--nd-ease`
  - 사라지기: `--nd-t-out`(0.16초), `--nd-ease-in`
  - 작은 팝업: `--nd-t-pop`(0.14초)
  - 쓸기 마무리: `--nd-t-swipe`(0.26초)
  - JS에서 기다리는 시간(`ANIM_OUT`, `SWIPE_MS`)도 같은 값을 씁니다. `prefers-reduced-motion`(동작 줄이기)이면 서랍, 설정 창, 팝업 애니메이션을 끕니다.
- **저장소에 넣지 않는 것**: 덤프 파일과 문서 내용(CC BY-NC-SA이고 크기도 큽니다), 빌드 결과(`dist/`), 도구용 가상 환경(`build/.venv/`)

## 빌드와 배포

```bash
python3 build/make_app.py                  # dist/나무덤프.app 만들기
python3 build/make_app.py --dmg            # 배포용 dist/namudump-<버전>.dmg도 만들기
python3 build/make_app.py --install DIR    # 만든 앱을 DIR에 덮어쓰기(앱을 먼저 종료)
python3 build/make_app.py --icon           # build/icon_1024.png로 AppIcon.icns 다시 만들기(Pillow 필요)
python3 build/make_icon.py                 # 아이콘 원본 build/icon_1024.png 다시 그리기(Pillow 필요)
"$HOME/Library/Application Support/NamuDump/venv/bin/python3" build/make_dmg_bg.py   # .dmg 배경 다시 그리기(PyObjC 필요)
```

- **앱 구조**: `나무덤프.app/Contents/MacOS/NamuDump`는 bash 실행기(`build/launcher.sh`)입니다. 이 실행기가 `Resources/app/namudump.py`를 파이썬으로 실행합니다. 처음 실행할 때는 pywebview를 전용 가상 환경(`~/Library/Application Support/NamuDump/venv`)에 설치하고, 실패하면 브라우저 창으로 엽니다.
- **.dmg**
  - [dmgbuild](https://github.com/dmgbuild/dmgbuild)로 만듭니다. `--dmg`를 처음 쓸 때 `build/.venv`에 자동으로 설치됩니다.
  - 창 크기, 아이콘 자리, 배경 그림의 위치는 `make_app.py`의 `DMG_*` 값 한 곳에서 정하고, 배경 그림(`make_dmg_bg.py`)도 이 값으로 그립니다.
  - 아이콘 자리를 적는 창 설정(`.DS_Store`)에는 파일 이름을 **풀어쓴 한글(NFD)** 로 적어야 합니다. 디스크(HFS+)가 한글 이름을 풀어쓴 꼴로 저장하기 때문에, 모아쓴 꼴(NFC)로 적으면 파인더가 이름을 찾지 못해 아이콘을 제멋대로 늘어놓습니다.
  - 파인더에서 탭 막대, 경로 막대, 상태 막대를 늘 켜 둔 사용자는 이 막대들이 창 위아래를 가립니다. 창마다 끌 수 없으므로 아이콘과 안내 문구를 창 위쪽에 둡니다.
  - "그룹 사용"(예: 종류별로 묶기)을 켠 사용자를 위해 창 설정에 묶지 않는다는 값(`GRP0` = "None")을 넣습니다.
- **릴리스 순서**
  1. `namudump.py`의 `APP_VERSION`을 올리고 `CHANGELOG.md`에 바뀐 점을 적습니다.
  2. 커밋하고 올립니다.
  3. `python3 build/make_app.py --dmg`로 .dmg를 만듭니다. `--install`만 실행해도 `dist/`를 새로 만들기 때문에, 릴리스 직전에는 `--dmg`로 다시 만들어야 합니다.
  4. `v<버전>` 태그로 GitHub 릴리스를 만들고 .dmg를 첨부합니다. 릴리스 설명에는 `CHANGELOG.md`의 해당 부분을 옮깁니다.

  ```bash
  gh release create v1.0.0 dist/namudump-1.0.0.dmg --title "나무덤프 1.0.0" --notes-file <설명 파일>
  ```

## 사용자 데이터

- **저장 위치**: 맥은 `~/Library/Application Support/NamuDump`, 그 밖의 운영체제는 `~/.namudump`
- **저장하는 것**: 설정(`settings.json`), 방문 기록과 즐겨찾기(`user.sqlite`), 실행 기록(`namudump.log`), pywebview 가상 환경(`venv/`), 웹 보기 저장소(`webview/`)
- **덤프 위치**: `~/Downloads/namu-html.sqlite`를 먼저 찾고, 없으면 사용자가 고른 경로를 `settings.json`의 `db_path`에 기억합니다.
- 맥 독립 창으로 실행하면 실행 기록이 `namudump.log`에 쌓입니다. `mac_chrome.py`의 기록은 `[mac]`으로 시작합니다.

## 서버 API

| 방식 | 경로 |
|---|---|
| GET | `/api/status`, `/api/settings`, `/api/doc?title=`, `/api/suggest?q=`, `/api/search?q=&mode=prefix\|contains`, `/api/random`, `/api/history`, `/api/bookmarks`, `/api/pick` |
| POST | `/api/settings`, `/api/open`, `/api/bookmark`, `/api/history`, `/api/exists`, `/api/window_title`, `/api/open_url`, `/api/drag_regions`, `/api/bg`, `/api/swipe_lock`, `/api/scroll_capture`, `/api/quit` |

- 서버는 `127.0.0.1`에서만 열립니다. Host와 Origin을 검사해 다른 사이트의 요청을 막고, 화면에는 CSP를 겁니다. 화면 파일은 `web/` 밖으로 나갈 수 없습니다.
- 외부 링크 열기(`/api/open_url`)는 `http`, `https`, `mailto` 주소만 받습니다.
- 웹에서 파이썬 쪽을 부를 때(창 제목, 외부 링크, 창 끌기 영역, 창 바탕색 등)는 pywebview의 `js_api` 대신 이 API를 씁니다. `js_api`는 믿을 만하게 동작하지 않았습니다.

## 덤프 형식

```
meta(k TEXT PRIMARY KEY, v TEXT)   -- source, license, attribution, generated_at_iso, doc_count 등
docs(id INTEGER PRIMARY KEY, title TEXT NOT NULL, md BLOB NOT NULL, html BLOB,
     md_len, html_len, text_len, categories, images, links, last_modified TEXT, rendered_at INTEGER)
UNIQUE INDEX ix_title ON docs(title)
```

- **기본**
  - 나무덤프가 쓰는 것은 `docs`의 `title`, `html`, `last_modified`와 `meta`입니다. `html`은 zlib로 압축되어 있어 `zlib.decompress`로 그대로 풉니다.
  - 2026년 8월판 기준 문서는 1,787,556개이고, id는 1부터 빈틈없이 이어집니다.
  - 파일이 70GB가 넘으므로 반드시 읽기 전용(`file:...?mode=ro&immutable=1`)으로 열고, 전체를 훑는 일은 피합니다.
  - 처음 화면의 덤프 날짜와 문서 수는 `meta`의 `generated_at_iso`, `doc_count`에서 읽습니다.
- **검색**
  - 제목 앞부분 검색은 색인 범위 조회(`title >= q AND title < q || '\U0010ffff'`)로 합니다.
  - 포함 검색은 제목 전체를 한 문자열로 메모리에 올려 찾습니다. 이때 `.lower()`를 쓰면 일부 유니코드에서 글자 수가 바뀌어 위치가 어긋나므로, ASCII만 `translate`로 소문자로 바꿉니다.
- **내용의 특징**
  - 넘겨주기 문서에는 대상 문서 내용이 통째로 복사되어 있습니다.
  - `html`은 나무위키 웹페이지(Vue 앱) 전체를 렌더링한 결과라, 본문 앞뒤로 사이트 틀, 광고("파워링크"), 라이선스 안내가 붙어 있습니다.
- **크롤링 방지 장치**
  - 클래스 이름이 무작위 문자열이고, 수집 시점마다 10가지쯤의 변형이 섞여 있습니다.
  - `&nbsp;`만 든 가짜 div가 수천 개 들어 있습니다.
- **그대로 살아 있는 것**: 문서 안 `<style>`(위키 CSS), `data-onclick`(틀의 탭 전환), `data-dark-style`(다크 모드 색), KaTeX의 원래 클래스 이름
- **이미지**: 이미지 주소(`i.namu.wiki/i/...`)는 기한이 있는 주소라 이미 만료되었습니다. 그래서 이미지 자리에는 원래 크기의 자리 표시와 설명(alt)만 보여 줍니다.

## 문서 정리(render.js)

클래스 이름을 믿지 않고 구조로 판단합니다. 단계는 코드 주석의 번호(1-21)와 같습니다.

- **가짜 요소**: `data-v-*` 속성이 없고 내용이 빈 div는 지웁니다.
- **본문 찾기**: "이 저작물은"으로 시작하는 라이선스 안내의 바로 앞 형제 블록이 본문입니다.
- **본문 컴포넌트**: 가장 흔한 `data-v-*` 표식으로 알아봅니다. 광고 블록과, 같은 클래스로 겹겹이 싼 껍데기는 벗겨 냅니다.
- **요소 알아보기**: 문단 제목은 `a[id^=s-]`, 각주는 `#fn-`과 `#rfn-`, 이미지 크기는 자리 표시 SVG의 치수, 표 정렬과 글자 크기는 `classmap.json`으로 알아봅니다.
- **허용 목록**
  - 최종 결과에는 허용 목록에 있는 태그와 속성만 남깁니다. `<script>`, 이벤트 속성, `url()`이 든 스타일은 버립니다.
  - 원래 클래스는 `nd-*`로 바꾼 것과 위키 CSS용 해시 클래스만 남깁니다.
  - 위키 CSS는 적용 범위를 문서 본문으로 좁혀서(`scopeCss`) 넣습니다.
- **링크 안의 링크**: 이미지 안에 빈 `/jump/` 링크가 겹쳐 있으면 HTML 파서가 바깥 링크를 끊어 틀 배치가 깨집니다. 파싱하기 전에 빈 `/jump/` 링크를 지웁니다.
- **동영상**: `lite-youtube`는 실제 iframe이 `noscript` 안에만 있어서, noscript를 지우기 전에 iframe으로 바꿉니다. 폭이 `%`인 경우를 px로 읽으면 좁아지므로 `boxSize()`에서 따로 다룹니다.

`classmap.json`은 `tools/scan_classes.py`로 덤프 표본 약 6,400개를 여러 번 훑어 만들었습니다. 같은 틀이 여러 변형에 공통으로 나오는 점을 이용해 손으로 맞췄습니다. 글자 크기 단계는 추정이라 드물게 한 칸쯤 다를 수 있습니다.

## 화면(app.js)

- **링크**: 외부 링크는 `/api/open_url`로 기본 브라우저에서 엽니다. `/w/` 링크의 `?쿼리`는 버립니다. 링크 안의 이미지 자리 표시는 클릭을 가로채지 않습니다.
- **틀 안의 동영상**: `fitEmbeds()`로 비율을 유지하며 줄입니다. 창 크기를 바꾸거나 접고 펼 때도 다시 계산합니다.
- **각주**: 번호를 한 번 누르면 아래 각주로 가고, 각주 쪽 번호를 누르면 본문으로 돌아옵니다. 미리 보기는 마우스를 올릴 때만 뜹니다. 목차 글자에서는 각주 번호를 뺍니다.
- **검색 제안**
  - 늦게 도착한 응답이 닫힌 상자를 다시 열지 않게 `seq`, `closed`, 초점 여부로 막습니다.
  - 한글 조합이 끝날 때 오는 input 이벤트는 값이 같으면 무시하고, 방향키로 고를 때는 입력창 글자를 바꾸지 않습니다.
  - 검색을 실행해 넘어가면 검색창을 비웁니다.
- **읽던 자리**: 기록마다 `key`를 붙이고, 떠나기 직전(`go()`와 popstate 처음)에 화면 맨 위 요소의 경로와 높이, 문단 접기와 접기 상자 상태를 기억했다가 되살립니다. 픽셀 위치만으로는 어긋났습니다. `history.scrollRestoration`은 `manual`이고, 스크롤 위치 자동 보정(`overflow-anchor`)은 끕니다.
- **뒤로, 앞으로 단추**: 기록 순번(`idx`)과 가장 앞선 순번(sessionStorage)으로 갈 곳이 있는지 판단해, 없으면 흐리게 하고 누를 수 없게 합니다.
- **상단 막대**: `position: fixed`이고, body에 `padding-top: var(--nd-top-h)`를 줍니다. `sticky`로 두면 WebKit이 상단 막대 검색창에 글자를 넣거나 지울 때 커서 위치를 잘못 잡아 문서를 조금씩 위로 굴립니다. 즐겨찾기 단추는 문서가 아닐 때도 자리를 차지해 다른 단추가 밀리지 않게 합니다.
- **보관함 서랍**: 닫을 때 `closing` 클래스로 미끄러져 사라진 뒤 숨깁니다. 탭의 흰 선택 표시는 `#nd-drawer-tabs::before`를 `--pill-x`, `--pill-w`로 옮기고, 목록은 `from-right`, `from-left`로 밀려 들어옵니다. "기록 지우기"는 되돌릴 수 없어서 한 번 더 눌러야 지웁니다(3초 안에). 목록 끝을 굴리다 잘못 눌려 기록이 지워지는 일이 있었습니다.
- **설정 창**: 열 때 살짝 커지며 나타나고 닫을 때 살짝 작아지며 사라집니다. 제목 줄은 고정하고 아래 내용(`#nd-modal-sc`)만 굴리며, 굴리면 제목 밑에 구분선이 생깁니다. 스크롤 상자는 아래 둥근 모서리 위에서 끝나서 막대가 모서리를 벗어나지 않습니다.
- **문서 스크롤 막대(직접 그림)**: WebKit의 문서 막대는 창 맨 위, 상단 막대 뒤에서부터 그려지고 서랍 목록의 막대와도 겹쳐서 숨깁니다(`html { scrollbar-width: none }`). 대신 `.nd-sbar`를 상단 막대 아래부터 그립니다(`initScrollbar`). 굴릴 때만 나타났다 1초 뒤 사라지고, 끌거나 빈 곳을 눌러 옮길 수 있습니다.
- **esc**: 웹이 처리하지 않은 esc는 맥이 경고음을 냅니다. 창을 닫는 등 esc를 처리했으면 `preventDefault()`를 부릅니다(맥 창 쪽도 참고).
- **패널 스크롤**: 목차, 서랍, 설정 창 안의 스크롤이 끝에 닿아도 뒤 문서로 넘어가지 않게 막습니다(`containWheel`, `overscroll-behavior: contain`).

## 스크롤과 제스처

맥 독립 창에서는 맥 창(`mac_chrome.py`의 `scrollWheel:`)이 입력을 먼저 보고, 필요한 것만 웹에 넘깁니다. 크롬 앱 창이나 브라우저로 열면 브라우저 기본 동작을 따릅니다.

| 입력 | 처리 |
|---|---|
| 일반 마우스 휠(칸 단위) | 맥 창이 가로채 웹의 `ND_wheel`로 넘기고, 웹이 부드럽게 굴린다 |
| 트랙패드, 매직 마우스 스크롤 | WebKit이 그대로 굴린다. 맥 창은 입력을 `ND_scroll`로 웹에도 알린다 |
| 좌우 쓸기(앞뒤 이동) | 맥 창이 `ND_swipe`로 알리고, 웹이 쓸기로 판단하면 그 동작을 가져와 문서 영역만 넘긴다 |
| 맨 위, 맨 아래에서 더 당기기 | 웹이 그 동작을 가져와 문서 영역(또는 서랍, 설정 창의 목록)만 튕긴다 |
| 마우스 옆 단추(3번, 4번) | 맥 창이 `history.back()`, `forward()`를 부른다 |

- **입력 가져오기**: 웹이 `/api/swipe_lock` 또는 `/api/scroll_capture`를 보내면(`set_capture`), 그 한 번의 동작(손을 뗀 뒤 관성 포함)은 WebKit에 넘기지 않습니다. 다음 동작이 시작되면 풀립니다. 필요한 동작만 가져오므로 넓은 표 스크롤 등은 WebKit 그대로 매끄럽습니다.
- **일반 마우스 휠**: 정밀 입력이 아닌(`hasPreciseScrollingDeltas`가 거짓) 휠만 가로챕니다. 웹이 220ms 동안 미끄러지듯 굴립니다(한 칸 40px). 마우스 아래에서 더 움직일 수 있는 스크롤 영역을 찾아 굴리고, `overscroll-behavior: contain`인 패널에서는 뒤 문서로 넘기지 않습니다.
- **쓸어서 뒤로, 앞으로**
  - WebKit 자체의 쓸기(`allowsBackForwardNavigationGestures`)는 끕니다.
  - 손가락이 닿은 뒤 조금 움직였을 때 가로 움직임이 세로의 1.5배를 넘으면, 맥 창이 손가락 방향 기준의 움직임(자연스러운 스크롤 설정과 무관)을 `ND_swipe('begin'|'move'|'end', dx, x, y)`로 알립니다.
  - 웹은 상단 막대 아래 문서 영역(`#nd-main`)만 CSS `transform`으로 움직이고, 뒤에는 이전(다음) 문서의 미리 보기(`.nd-swipe-view`)를 사파리처럼 겹쳐 보입니다. 떠나는 문서의 화면은 버리지 않고 `pageCache`에 옮겨 두었다가(최대 6개) 미리 보기에 씁니다. 기록 순번별 key는 `navKeys`에 둡니다.
  - 손을 떼면 35% 넘게 밀었거나 빠르게 튕겼을 때 넘어가고, 아니면 제자리로 돌아옵니다. 넘어간 뒤 새 문서를 다 그리면 미리 보기를 걷습니다.
  - 좌우로 스크롤할 수 있는 표 위에서는 넘기지 않습니다.
- **튕기기(앱이 직접)**
  - WebKit의 튕기기는 고정된 상단 막대까지 같이 튕겨서 맥 창이 끕니다(`_setRubberBandingEnabled:`).
  - 맥 창은 모든 정밀 스크롤 입력을 `ND_scroll(단계, 관성 단계, dx, dy, x, y)`로 웹에 알립니다.
  - 맨 위, 맨 아래에서 더 당기면 웹이 그 동작을 가져와 문서 영역(`#nd-main`)만 CSS `translate`로 밀어냅니다. 당길수록 뻑뻑하게 밀리고(WebKit과 같은 공식), 쓸기가 쓰는 `transform`과는 겹치지 않습니다.
  - 되돌아가기와 관성으로 끝에 부딪혀 튕기기는 임계 감쇠 스프링 `x(t) = (x0 + (v0 + ωx0)t)e^(-ωt)`(ω = 11)으로 합니다. 손을 떼거나 부딪히는 순간의 속도를 이어받습니다.
  - 움직이는 동안만 `will-change: translate`로 그림층을 만들어 가볍게 옮깁니다.
  - 손을 뗐다는 신호가 없어도 0.2초 뒤 되돌아갑니다(굳지 않게).
  - 웹이 가져간 동작은 관성까지 WebKit에 넘어가지 않으므로, 튕긴 뒤 반대로 굴려 끝에서 떨어진 채 놓으면 뒤따르는 관성도 웹이 직접 굴립니다(`momOk`). 이것이 없으면 관성이 사라지고 스크롤이 한 번 뚝 끊겼습니다.
  - 서랍과 설정 창이 열려 있으면 같은 방식으로 그 목록만 튕깁니다(`bnTarget`). 스크롤 막대가 따라 움직이지 않게 스크롤 상자(`#nd-drawer-b`, `#nd-modal-sc`)가 아니라 안의 내용(`#nd-drawer-list`, `#nd-modal-b`)을 밉니다.
  - 옆 목차, 넓은 표처럼 따로 스크롤되는 영역 위에서는 끼어들지 않습니다.

## 맥 창(mac_chrome.py)

macOS 26과 27에서 확인한 내용입니다. 비공개 기능을 쓰는 곳이 있어 macOS가 바뀌면 다시 확인해야 합니다. 어느 단계가 실패해도 창은 기본 모양으로 뜹니다.

- **웹과 파이썬 사이 호출**: 웹에서 파이썬으로는 서버 API를 씁니다. 파이썬에서 웹으로는 `evaluateJavaScript`를 씁니다(주 스레드에서 pywebview의 `evaluate_js`를 부르면 교착됩니다).
- **오른쪽 클릭 메뉴**: pywebview는 `willOpenMenu:withEvent:`에서 항목을 전부 지웁니다. 이 메서드를 바꿔 새로 고침, 새 창, 다운로드 같은 항목만 빼고, 글자를 골랐으면 "나무덤프에서 제목 검색"을 넣습니다.
- **한글 입력기와 클릭**: 한글 입력기가 켜진 채 검색창에 초점이 있으면 다른 곳의 첫 클릭을 입력기가 먹어 버립니다. mouseDown과 mouseUp 동안 `inputContext`를 None으로 돌려 클릭을 웹으로 바로 보냅니다. 조합 중인 글자는 먼저 확정합니다.
- **신호등 단추 자리(비공개 기능)**: Chromium처럼 `NSThemeFrame` 하위 클래스에서 `_titlebarHeight`, `_minXTitlebarWidgetInset`, `_minYTitlebarButtonsOffset`을 돌려주고, 창 클래스의 `frameViewClassForStyleMask:`가 그 클래스를 쓰게 합니다. 단추를 직접 옮기면 창 제목이 바뀔 때마다 AppKit이 되돌려 흔들립니다. `TOP_H`(60)는 CSS `--nd-top-h`와 같아야 합니다.
- **창 끌기와 키우기**: 투명한 제목 표시줄 영역의 클릭은 웹으로 옵니다. 그래서 웹이 알려 주는 영역(`/api/drag_regions`)을 보고 `performWindowDragWithEvent:`로 끕니다. 두 번 누르면 시스템 설정(`AppleActionOnDoubleClick`)을 따르고, 키우기는 애니메이션 없이 한 번에 합니다(애니메이션을 쓰면 WKWebView가 따라오지 못해 끊깁니다).
- **창 바탕색**: 화면 바탕색(`--nd-bg`)에 맞춰, 크기를 바꿀 때 빈 곳이 튀지 않게 합니다.
- **전체 화면**: 들어가거나 나올 때 `ND_setFullscreen`으로 상단 막대 왼쪽 여백을 켜고 끕니다.
- **esc 경고음**: 웹이 처리하지 않은 esc는 AppKit이 `cancelOperation:`을 받을 곳을 찾지 못해 경고음을 냅니다. 창 클래스가 `cancelOperation:`을 조용히 받습니다.
- **정보 창**: 파이썬으로 실행되므로 기본 정보 창은 파이썬 아이콘을 쓰고 버전을 두 번 적습니다. 그래서 "나무덤프에 관하여"는 `showAbout_`가 앱 아이콘, "나무덤프 버전", 설명(`ABOUT_LINES`, 링크 포함), 저작권으로 직접 엽니다.
- **메뉴 막대**: pywebview의 `localization`과 `_append_app_name`을 바꿔 한국어로 표시합니다.

## 넣지 않기로 한 것

같은 시행착오를 반복하지 않도록, 해 보고 버린 것과 이유를 적어 둡니다.

- **이미지 불러오기 시도**: 덤프의 이미지 주소가 만료되어 거의 동작하지 않아 기능을 뺐습니다.
- **목차 안의 튕기기**: 따로 구현했다가 스크롤이 굳는 문제가 생겨 되돌렸습니다. 목차는 끝에 닿으면 뒤 문서로 넘어가지 않게만 막습니다. 서랍과 설정 창의 튕기기는 문서 튕기기와 같은 방식으로 만들어 문제가 없습니다.
- **확대, 축소(핀치, 스마트 줌)**: 문서 영역만 돋보기처럼 키우는 기능을 여러 방식으로 만들었다가 뺐습니다.
  - CSS `zoom`: 매번 전체를 다시 배치해 버벅였습니다. 글자를 새 크기로 다시 그리며 줄바꿈이 달라져 위치가 어긋났고, WebKit은 zoom 안쪽 요소의 위치를 배율로 나눈 값으로 돌려줍니다.
  - `transform: scale`: 흐리거나(그림층일 때), 확대 중 스크롤이 버벅였습니다. WebKit은 한 방향으로만 스크롤하고 이를 끄는 설정이 없어서, 대각선은 웹이 직접 굴려야 했습니다.
  - WebKit 자체 확대: 상단 막대까지 함께 커집니다.
- **WebKit 자체 쓸기**: 상단 막대까지 한 장의 그림으로 밀어 흐림 효과가 멈추고, 쓸기 뒤 스냅샷이 몇 초씩 남아 스크롤을 막았습니다. 상단 막대를 사진으로 덮는 방법도 배경이 굳어 보여 버렸습니다.
- **상단 막대를 두고 튕기는 다른 방법들**
  - `_setBackgroundExtendsBeyondPage:`: 상단 막대가 여전히 같이 튕겼습니다.
  - 문서 영역만 따로 스크롤하는 상자: 튕기기가 한 번 뒤로 되지 않았습니다.
