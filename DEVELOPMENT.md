# 나무덤프 개발 안내

나무덤프를 고치거나 직접 빌드하려는 분을 위한 문서입니다. 쓰는 법은 [README](README.md)를 보세요.

## 구조

나무덤프는 두 부분으로 이루어져 있습니다.

1. **앱**(`Sources/`, Swift): AppKit 창과 Liquid Glass 도구 막대, SwiftUI 사이드바와 설정, 덤프 읽기. 덤프는 읽기 전용으로 열고, 설정과 기록을 저장합니다.
2. **문서 화면**(`web/`): WKWebView 안에서 돌아가는 단일 페이지 앱입니다. 나무위키 문서는 임의의 CSS, 복잡한 표, 수식이라 웹 엔진으로 그립니다. 빌드 과정이나 외부 라이브러리 없이 순수 HTML, CSS, JS입니다.

웹 뷰는 HTTP 서버 대신 `namudump://` 주소로 화면 파일과 `/api/...`를 받습니다(`SchemeHandler`).

```
Sources/NamuDumpCore/  덤프 읽기, 검색, 설정과 기록, API, 화면 파일 내주기(시험 대상)
Sources/NamuDump/      창, 도구 막대, 사이드바, 검색 제안, 설정, 메뉴, 웹 뷰 입력 처리
web/index.html         화면 뼈대
web/app.js             라우팅(/, /w/제목, /search), 검색 결과, 각주, 문서 안 찾기, 읽던 자리, window.ND
web/render.js          문서 본문 렌더링(window.NamuRender.render)
web/classmap.json      글자 크기, 표 정렬 클래스 대응표
web/app.css            화면 스타일
web/content.css        문서 본문 스타일
web/katex/             수식용 KaTeX CSS와 글꼴(MIT)
build/                 앱 묶기(make_app.py), 아이콘(AppIcon.icon), .dmg 배경 그리기
tests/                 Core 시험
docs/                  README에 쓰는 그림
```

## 실행과 시험

Xcode 26 이상이 필요합니다. `Package.swift`를 Xcode로 열어도 됩니다.

```bash
swift test                              # 시험(가짜 덤프로 Core 확인)
python3 build/make_app.py --debug       # 개발용 앱을 dist/에 만들기
open dist/나무덤프.app
```

- `NAMUDUMP_SUPPORT=<폴더>`로 실행하면 설정과 기록을 그 폴더에 따로 저장합니다. 평소 쓰는 기록을 건드리지 않고 시험할 때 씁니다.
- `NAMUDUMP_WEB=<폴더>`로 실행하면 앱에 묶인 화면 파일 대신 그 폴더를 씁니다. 저장소의 `web/`을 주면 고친 뒤 다시 빌드할 필요가 없습니다.
- 개발용 앱은 Safari의 개발자용 메뉴에서 웹 뷰를 검사할 수 있습니다.
- 개발용 앱에는 시험 도구가 있습니다. `NAMUDUMP_EVAL`에 JS 파일을, `NAMUDUMP_EVAL_OUT`에 결과 파일을 주면 그 JS를 돌려 결과를 적고 끝냅니다(`DebugHook.swift`). `NAMUDUMP_SNAP`을 주면 웹 뷰 그림도 남기고, `NAMUDUMP_KEEP`을 주면 끝내지 않습니다. `NAMUDUMP_SEARCH`를 주면 도구 막대 검색창에 그 글자를 넣습니다.
- `NAMUDUMP_TEST_DUMP`(실제 덤프)와 `NAMUDUMP_TEST_GOLDEN`(기준 응답 JSON)을 주면 `swift test`가 실제 덤프로 응답을 비교합니다(`ParityTests`).
- 시험은 화면을 다루지 않습니다. 화면을 고쳤다면 실제 창에서 눈으로 확인합니다.

## 코드 규칙

- **의존성**: 앱은 시스템 프레임워크만 씁니다. 화면(`web/`)은 외부 라이브러리나 빌드 도구 없이 씁니다(KaTeX는 CSS와 글꼴만).
- **접두어**: 화면 코드의 CSS 클래스와 변수는 `nd-`로 시작합니다. 앱이 부르는 JS는 `window.ND`에 모읍니다.
- **주석과 문구**: 한국어로 씁니다. 화면에 보이는 문구도 한국어입니다.
- **버전과 만든 사람**: `Sources/NamuDumpCore/AppInfo.swift` 한 곳에서 정합니다. `build/make_app.py`와 정보 창이 이 값을 가져다 씁니다.
- **애니메이션**: 시간과 곡선은 `app.css`의 `:root` 변수 한 곳에서 정합니다.
- **저장소에 넣지 않는 것**: 빌드 결과(`dist/`, `.build/`), 도구용 가상 환경(`build/.venv/`)

## 빌드와 배포

```bash
python3 build/make_app.py                  # dist/나무덤프.app 만들기
python3 build/make_app.py --dmg            # 배포용 dist/namudump-<버전>.dmg도 만들기
python3 build/make_app.py --install /Applications   # 만든 앱을 응용 프로그램 폴더에 덮어쓰기(앱을 먼저 종료)
python3 build/make_app.py --icon           # build/AppIcon.icon으로 아이콘 파일들 다시 만들기(Xcode 필요)
"$HOME/Library/Application Support/NamuDump/venv/bin/python3" build/make_dmg_bg.py   # .dmg 배경 다시 그리기(PyObjC 필요)
```

- **앱 구조**: `build/make_app.py`가 `swift build`로 만든 실행 파일, `Resources/web`, 아이콘을 묶습니다. `--dmg`는 인텔 맥도 돌도록 두 구조를 함께 빌드합니다.
- **아이콘**
  - 원본은 Icon Composer 문서 `build/AppIcon.icon`입니다. Xcode 안의 Icon Composer로 열어 고친 뒤 `--icon`을 실행합니다.
  - 가운데 잎맥을 따라 접힌 잎 하나가 펼친 책처럼 보입니다. 밝은 쪽(`page.svg`)에는 가는 틈 세 줄을 내어 글줄을 나타내고, 어두운 쪽(`shade.svg`)은 통으로 둡니다. 시스템이 다크 모드일 때의 바탕색은 `fill-specializations`로 따로 정합니다. 아이콘을 고칠 때는 다크 모드 렌더링을 꼭 함께 봅니다.
  - `--icon`은 `Assets.car`(macOS 26 이상의 Liquid Glass 아이콘), `AppIcon.icns`(오래된 macOS, .dmg 볼륨 아이콘), `icon_1024.png`, `web/icon.png`를 만듭니다. 결과물도 저장소에 두므로 아이콘을 고치지 않으면 빌드에 Xcode가 필요 없습니다.
  - `ictool`은 Icon Composer 안의 것을 씁니다. `xcrun ictool`은 이름만 같은 다른 도구로 연결됩니다.
- **서명**
  - 앱을 만들 때마다 임시(ad-hoc) 서명을 합니다. 직접 빌드해 설치하면 격리 표시가 없어 경고 없이 열립니다. `spctl`은 rejected로 나오지만, 격리 표시가 없으면 이 검사를 하지 않습니다.
  - 내려받은 .dmg로 설치하면 공증을 받지 않았으므로 여전히 경고가 뜹니다.
- **.dmg**
  - [dmgbuild](https://github.com/dmgbuild/dmgbuild)로 만듭니다. `--dmg`를 처음 쓸 때 `build/.venv`에 자동으로 설치됩니다.
  - 창 크기, 아이콘 자리, 배경 그림의 위치는 `make_app.py`의 `DMG_*` 값 한 곳에서 정하고, 배경 그림(`make_dmg_bg.py`)도 이 값으로 그립니다.
  - 아이콘 자리를 적는 창 설정(`.DS_Store`)에는 파일 이름을 **풀어쓴 한글(NFD)** 로 적어야 합니다. 디스크(HFS+)가 한글 이름을 풀어쓴 꼴로 저장하기 때문에, 모아쓴 꼴(NFC)로 적으면 파인더가 이름을 찾지 못해 아이콘을 제멋대로 늘어놓습니다.
  - 파인더에서 탭 막대, 경로 막대, 상태 막대를 늘 켜 둔 사용자는 이 막대들이 창 위아래를 가립니다. 창마다 끌 수 없으므로 아이콘과 안내 문구를 창 위쪽에 둡니다.
  - "그룹 사용"(예: 종류별로 묶기)을 켠 사용자를 위해 창 설정에 묶지 않는다는 값(`GRP0` = "None")을 넣습니다.
- **릴리스 순서**
  1. `AppInfo.swift`의 `version`을 올리고 `CHANGELOG.md`에 바뀐 점을 적습니다.
  2. 커밋하고 올립니다.
  3. `python3 build/make_app.py --dmg`로 .dmg를 만듭니다. `--install`만 실행해도 `dist/`를 새로 만들기 때문에, 릴리스 직전에는 `--dmg`로 다시 만들어야 합니다.
  4. `v<버전>` 태그로 GitHub 릴리스를 만들고 .dmg를 첨부합니다. 릴리스 설명에는 `CHANGELOG.md`의 해당 부분을 옮깁니다.

  ```bash
  gh release create v2.0.0 dist/namudump-2.0.0.dmg --title "나무덤프 2.0.0" --notes-file <설명 파일>
  ```

## 사용자 데이터

- **저장 위치**: `~/Library/Application Support/NamuDump`
- **저장하는 것**: 설정(`settings.json`), 방문 기록과 즐겨찾기(`user.sqlite`).
- **덤프 위치**: 사용자가 고른 경로를 `settings.json`의 `db_path`에 기억합니다.

## 앱과 화면 사이

| 방향 | 방법 |
|---|---|
| 화면 → 덤프, 설정 | `fetch('/api/...')`. `SchemeHandler`가 받아 `API`로 넘깁니다. |
| 화면 → 창 | `webkit.messageHandlers.nd`. `app.js`의 `host()`가 `star`, `toc`, `spy`, `title`, `bg`, `lists`, `settings`, `dump`, `sidebar`, `focusSearch`를 보내고 `MainWindowController`가 받습니다. |
| 창 → 화면 | `window.ND`의 함수(뒤로, 문서 열기, 찾기, 설정 반영 등)를 `evaluateJavaScript`로 부릅니다. |

- API: GET `status`, `settings`, `doc?title=`, `suggest?q=`, `search?q=&mode=prefix|contains`, `random`, `history`, `bookmarks`, `pick`. POST `settings`, `open`, `bookmark`, `history`, `exists`, `open_url`, `embed_url`.
- 화면에는 CSP를 겁니다(`StaticFiles`). 화면 파일은 `web/` 밖으로 나갈 수 없습니다. 외부 그림은 CSP로 막습니다.
- 외부 링크 열기(`open_url`)는 `http`, `https`, `mailto` 주소만 받습니다.
- **동영상**: `namudump://`에서는 Referer가 보내지지 않아 유튜브가 재생을 거부합니다(오류 153). 그래서 재생을 누르면 `EmbedServer`가 `127.0.0.1`의 빈 포트를 열어 플레이어를 감싸는 페이지만 내줍니다. 알려진 플레이어 주소만 받습니다(`EmbedPage`). 재생을 누르기 전에는 포트를 열지 않습니다.

## 화면(app.js)

- **링크**: 외부 링크는 `open_url`로 기본 브라우저에서 엽니다. `/w/` 링크의 `?쿼리`는 버립니다. 링크 안의 이미지 자리 표시는 클릭을 가로채지 않습니다. ⌘을 누르고 링크를 누르면 새 창에서 엽니다.
- **틀 안의 동영상**: `fitEmbeds()`로 비율을 유지하며 줄입니다. 창 크기를 바꾸거나 접고 펼 때도 다시 계산합니다.
- **각주**: 번호를 한 번 누르면 아래 각주로 가고, 각주 쪽 번호를 누르면 본문으로 돌아옵니다. 미리 보기는 마우스를 올릴 때만 뜹니다. 목차 글자에서는 각주 번호를 뺍니다.
- **처음 화면 검색창의 제안**: 늦게 도착한 응답이 닫힌 상자를 다시 열지 않게 `seq`, `closed`, 초점 여부로 막습니다. 한글 조합이 끝날 때 오는 input 이벤트는 값이 같으면 무시합니다.
- **읽던 자리**: 기록마다 `key`를 붙이고, 떠나기 직전(`go()`와 popstate 처음)에 화면 맨 위 요소의 경로와 높이, 문단 접기와 접기 상자 상태를 기억했다가 되살립니다. 픽셀 위치만으로는 어긋났습니다. `history.scrollRestoration`은 `manual`이고, 스크롤 위치 자동 보정(`overflow-anchor`)은 끕니다.
- **esc**: 웹이 처리하지 않은 esc는 맥이 경고음을 냅니다. 찾기 막대 등을 닫았으면 `preventDefault()`를 부릅니다.

## 앱 창

- **Liquid Glass**: `NSSplitViewController`와 `NSToolbar`, SwiftUI 사이드바와 설정은 시스템이 유리로 그립니다. 웹 뷰는 도구 막대 뒤까지 뻗고 `obscuredContentInsets`로 내용만 그 아래에서 시작해서, 문서가 유리 아래로 비쳐 지나갑니다. 그래서 CSS의 `--nd-top-h`는 0입니다.
- **쓸기, 튕기기, 스크롤 막대**: 모두 WebKit 기본 동작입니다(`allowsBackForwardNavigationGestures`). 1.0은 고정된 웹 상단 막대 때문에 직접 구현했지만 상단 막대가 네이티브가 되면서 필요 없어졌습니다. 뒤로, 앞으로 단추의 상태도 `canGoBack`, `canGoForward`를 관찰합니다.
- **일반 마우스 휠**: 정밀 입력이 아닌 휠만 `scrollWheel(with:)`에서 가로채 웹의 `ND_wheel`로 넘기고, 웹이 220ms 동안 미끄러지듯 굴립니다(한 칸 40px).
- **검색 제안**: `NSPopover`는 뜨는 순간 키 입력을 가져가 검색창 편집이 끝나 버립니다. 그래서 키 창이 되지 않는 패널(`SuggestionPanel`)에 `NSGlassEffectView`를 넣어 띄웁니다.
- **SwiftUI 사이드바**: `NSHostingController.sizingOptions`를 비워야 내용 크기가 창 크기를 줄이지 않습니다.
- **오른쪽 클릭 메뉴**: `willOpenMenu`에서 새로 고침, 새 창, 다운로드 같은 항목을 빼고, 글자를 골랐으면 "나무덤프에서 제목 검색"을 넣습니다.
- **한글 입력기와 클릭**: 웹 입력창에 초점이 있으면 한글 입력기가 다른 곳의 첫 클릭을 먹습니다. mouseDown과 mouseUp 동안 `inputContext`를 nil로 돌려 클릭을 웹으로 바로 보냅니다. 조합 중인 글자는 먼저 확정합니다.
- **마우스 옆 단추**: WebKit이 3번, 4번 단추를 가운데 단추로 뭉뚱그려서 `otherMouseUp`에서 직접 `history.back()`, `forward()`를 부릅니다.
- **WKURLSchemeTask**: 웹 뷰가 취소한 요청에 답하면 예외가 나므로 `stop`을 받은 작업은 기억해 두고 답하지 않습니다.
