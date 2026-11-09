# 나무덤프 개발 안내

나무덤프를 고치거나 직접 빌드하려는 분을 위한 문서입니다. 쓰는 법은 [README](README.md)를 보세요.

## 구조

나무덤프는 Electron 앱이며 세 부분으로 이루어져 있습니다.

1. **메인 프로세스**(`app/`): 창, 메뉴, `namudump://` 주소, 파일 선택과 외부 링크 같은 운영체제 기능
2. **덤프 작업 스레드**(`app/worker.js`, `app/core/`): 덤프 읽기, 검색, 설정과 기록. 큰 문서를 풀거나 제목 목록을 읽는 동안에도 창이 멈추지 않게 따로 돕니다.
3. **화면**(`web/`): 창 안의 단일 페이지 앱. 나무위키 문서는 임의의 CSS, 복잡한 표, 수식이라 웹 엔진으로 그립니다. 빌드 과정이나 외부 라이브러리 없이 순수 HTML, CSS, JS입니다.

```
app/main.js              창, 메뉴, 오른쪽 클릭 메뉴, namudump:// 주소, 운영체제 기능(IPC)
app/preload.js           화면에 내보내는 통로(window.ndNative)
app/worker.js            덤프 작업 스레드
app/core/dump.js         덤프 읽기(node:sqlite, 읽기 전용), 제목 검색
app/core/store.js        설정(settings.json), 방문 기록과 즐겨찾기(user.sqlite)
app/core/api.js          /api/... 처리
app/core/web.js          화면 파일 내주기, CSP, 외부 링크 검사
native/mac-input/        맥 트랙패드 쓸기 입력 모듈(Objective-C, N-API)
web/index.html           화면 뼈대
web/app.js               라우팅(/, /w/제목, /search), 처음 화면, 검색, 각주, 문서 안 찾기, 읽던 자리, 쓸기
web/render.js            문서 본문 렌더링과 광고 걸러 내기(window.NamuRender.render)
web/classmap.json        글자 크기, 표 정렬 클래스 대응표
web/app.css              화면 스타일
web/content.css          문서 본문 스타일
web/fonts/               Pretendard 가변 글꼴(SIL OFL 1.1)
web/katex/               수식용 KaTeX CSS와 글꼴(MIT)
build/                   아이콘(맥 AppIcon.icon, Assets.car, AppIcon.icns, 다른 운영체제 icon-flat.svg, icon.png), .dmg 배경
tests/                   시험(node:test)
docs/                    README에 쓰는 그림
```

## 실행과 시험

Node.js 22 이상이 필요합니다. 맥에서는 `npm install`이 트랙패드 입력 모듈도 빌드하므로 Xcode 명령행 도구가 있어야 합니다.

```bash
npm install
npm start            # 앱 실행
npm test             # 시험(가짜 덤프로 덤프 읽기, API, 화면 파일 응답 확인)
```

- `NAMUDUMP_SUPPORT=<폴더>`로 실행하면 설정과 기록을 그 폴더에 따로 저장합니다. 평소 쓰는 기록을 건드리지 않고 시험할 때 씁니다.
- F12나 ⌥⌘I(Ctrl+Alt+I)로 개발자 도구를 엽니다. `--remote-debugging-port=<포트>`를 주면 밖에서 화면을 검사하고 스크립트를 돌릴 수 있습니다.
- 창이 다른 창에 가려지면 크로미움이 화면 갱신을 멈춥니다. 밖에서 자동으로 시험할 때는 `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`을 함께 줍니다.
- 시험은 화면을 다루지 않습니다. 화면을 고쳤다면 실제 창에서 눈으로 확인합니다.

## 코드 규칙

- **의존성**: 실행에 필요한 npm 패키지는 없습니다(개발용 Electron, electron-builder, node-gyp만). SQLite는 Electron에 들어 있는 `node:sqlite`를 씁니다. 그래서 Windows, Linux에는 네이티브 모듈이 없고, 맥에만 트랙패드 입력 모듈이 있습니다.
- **접두어**: 화면 코드의 CSS 클래스와 변수는 `nd-`로 시작합니다. 메인 프로세스가 부르는 화면 함수는 `window.ND_`로 시작합니다.
- **주석과 문구**: 한국어로 씁니다. 화면에 보이는 문구도 한국어입니다.
- **버전**: `package.json`의 `version` 한 곳에서 정합니다.
- **애니메이션**: 시간과 곡선은 `app.css`의 `:root` 변수 한 곳에서 정합니다.
- **세 운영체제**: 단축키는 ⌘과 Ctrl을 함께 받습니다(`app.js`의 `IS_MAC`, `MODK`, `keyLabel`). 경로는 `path.join`으로 만들고, 맥 전용 기능은 없을 때도 앱이 돌아가야 합니다.
- **저장소에 넣지 않는 것**: 빌드 결과(`dist/`), `node_modules/`, 네이티브 모듈 빌드 결과(`native/*/build/`)

## 빌드와 배포

```bash
npm run dist:mac      # dist/namudump-<버전>-mac-arm64.dmg
npm run dist:win      # dist/namudump-<버전>-win-x64-setup.exe, -win-arm64-setup.exe
npm run dist:linux    # dist/namudump-<버전>-linux-x86_64.AppImage, -arm64.AppImage, .deb
```

- 설정은 `package.json`의 `build`에 있습니다([electron-builder](https://www.electron.build)).
- Windows, Linux 설치 파일은 맥에서도 만들 수 있습니다. 실행 확인은 해당 운영체제에서 합니다. `.github/workflows/build.yml`은 태그(`v*`)를 올리거나 직접 실행하면 다섯 환경에서 각각 빌드해 결과물을 올립니다(릴리스에 게시하지는 않음).
- **앱 이름**: 앱 묶음과 실행 파일 이름은 영문 `NamuDump`입니다. Electron 보조 앱(`NamuDump Helper.app`) 이름에 한글이 들어가면 macOS에서 시작하자마자 멈춥니다(SIGTRAP). 맥에서는 `build/mac/InfoPlist.strings`로 파인더, Dock, Spotlight, 메뉴 막대에 '나무덤프'로 보이게 합니다. Info.plist의 `CFBundleName`을 한글로 바꾸면 역시 멈추므로, 한글 이름은 이 지역화 파일에만 둡니다(메뉴 막대의 앱 메뉴 이름은 지역화한 `CFBundleName`). 지역화한 표시 이름은 Info.plist의 `CFBundleDisplayName`이 파일 이름(`NamuDump`)과 같을 때만 쓰입니다. Windows는 시작 메뉴와 제거 목록, Linux는 데스크톱 항목 이름이 '나무덤프'입니다.
- **아이콘**
  - 모양은 가운데 잎맥을 따라 접힌 잎 하나가 펼친 책처럼 보이는 것입니다. 밝은 쪽에는 가는 틈 세 줄을 내어 글줄을 나타내고, 어두운 쪽은 통으로 둡니다.
  - 맥: 원본은 Icon Composer 문서 `build/AppIcon.icon`입니다. 여기서 만든 `Assets.car`(macOS 26 이상의 Liquid Glass 아이콘)와 `AppIcon.icns`(오래된 macOS, .dmg 볼륨 아이콘)를 앱에 넣고 `CFBundleIconName`을 `AppIcon`으로 둡니다. 결과물도 저장소에 두므로 아이콘을 고치지 않으면 빌드에 Xcode가 필요 없습니다. 다시 만들 때는 Xcode 안의 Icon Composer와 `xcrun actool`을 씁니다(`ictool`은 Icon Composer 안의 것. `xcrun ictool`은 이름만 같은 다른 도구).
  - Windows, Linux, README: `build/icon-flat.svg`(같은 모양을 단색으로 칠한 플랫 아이콘)를 그린 `build/icon.png`(1024px)와 `docs/icon.png`(512px)를 씁니다. 작은 크기에서도 잎맥 틈이 보이도록 틈을 맥 아이콘보다 조금 넓게 둡니다. PNG는 4096px로 크게 그린 뒤 절반씩 줄여 만들어야 가는 줄이 계단처럼 깨지지 않습니다.
  - 아이콘을 고칠 때는 밝은 바탕과 다크 바탕, 16px까지 작은 크기를 함께 보고, 잎의 무게중심을 재서 맞춥니다.
- **서명**: 맥 앱은 임시(ad-hoc) 서명만 합니다. 공증을 받지 않았으므로 내려받아 설치하면 경고가 뜹니다(README 참고). Windows 설치 파일도 서명하지 않습니다.
- **.dmg**: 창 크기(660×440)와 아이콘 자리(앱 180, 응용 프로그램 480, 높이 128)는 `build/dmg_background.tiff`의 그림에 맞춥니다.
- **릴리스 순서**
  1. `package.json`의 `version`을 올리고 `CHANGELOG.md`에 바뀐 점을 적습니다.
  2. 커밋하고 올립니다.
  3. 각 운영체제용 파일을 만듭니다(직접 또는 Actions).
  4. `v<버전>` 태그로 GitHub 릴리스를 만들고 파일들을 첨부합니다. 릴리스 설명에는 `CHANGELOG.md`의 해당 부분을 옮깁니다.

## 사용자 데이터

- **저장 위치**: macOS `~/Library/Application Support/NamuDump`, Windows `%APPDATA%\NamuDump`, Linux `~/.config/NamuDump`. 크로미움이 쓰는 파일(캐시 등)은 그 안의 `electron/`에 따로 둡니다.
- **저장하는 것**: 설정(`settings.json`), 방문 기록과 즐겨찾기(`user.sqlite`). 1.0과 같은 형식이라 그대로 이어서 씁니다.
- **덤프 위치**: 사용자가 고른 경로를 `settings.json`의 `db_path`에 기억합니다. 덤프는 `mode=ro&immutable=1`로 열어 잠그거나 고치지 않습니다.

## 메인 프로세스와 화면 사이

| 방향 | 방법 |
|---|---|
| 화면 → 덤프, 설정 | `fetch('/api/...')`. `namudump://` 주소 처리기가 받아 작업 스레드(`api.js`)로 넘깁니다. |
| 화면 → 운영체제 | `window.ndNative.call(이름, 값)`(IPC). `pick`(파일 선택), `bg`(창 바탕색, Windows·Linux 창 단추 색), `open_url`, `swipe_lock`, `quit` |
| 메인 → 화면 | 메뉴 명령은 `ND_command`, 전체 화면은 `ND_setFullscreen`, 오른쪽 클릭 검색은 `ND_searchSelection`, 맥 쓸기 입력은 `ndNative.onInput` |

- API: GET `status`, `settings`, `doc?title=`, `suggest?q=`, `search?q=&mode=prefix|contains`, `random`, `history`, `bookmarks`. POST `settings`, `open`, `bookmark`, `history`, `exists`.
- 화면에는 CSP를 겁니다(`web.js`). 화면 파일은 `web/` 밖으로 나갈 수 없습니다. 외부 그림은 CSP로 막습니다.
- 외부 링크는 `http`, `https`, `mailto` 주소만 기본 브라우저로 엽니다. 창 안에서 다른 사이트로 가려는 이동은 막습니다.
- **동영상**: `namudump://`에서는 Referer가 가지 않아 유튜브가 재생을 거부합니다(오류 153). 유튜브 안내대로 플레이어 요청에만 앱 식별자(`https://com.hishydrogen.namudump/`)를 Referer로 붙입니다.
- **허용하는 권한**: 전체 화면(동영상), 복사, 설치된 글꼴 목록(설정의 글꼴 고르기). 내려받기는 막습니다.

## 화면(app.js)

- **링크**: 외부 링크는 `open_url`로 기본 브라우저에서 엽니다. ⌘(Ctrl)을 누르고 문서 링크를 누르면 새 창에서 엽니다.
- **각주, 목차로 이동**: 거리와 관계없이 0.2~0.34초 안에 끝나는 짧은 애니메이션(`quickScrollTo`)입니다. 사용자가 굴리거나 누르면 바로 멈춥니다.
- **오른쪽 목차 표시**: 막대 하나(`.nd-toc-ind`)가 지금 읽는 문단으로 미끄러져 옮겨 갑니다. 새 문서를 연 직후(앞뒤 이동으로 읽던 자리를 찾는 동안)에는 미끄러지지 않고 바로 놓습니다.
- **읽던 자리**: 기록마다 `key`를 붙이고, 떠나기 직전에 화면 맨 위 요소의 경로와 높이, 문단 접기와 접기 상자 상태를 기억했다가 되살립니다. 픽셀 위치만으로는 어긋났습니다.
- **쓸어서 앞뒤로(맥)**: 바로 앞뒤 기록의 화면은 한가할 때 미리 만들어 `content-visibility: hidden`으로 숨겨 둡니다(`warmNeighbors`). 쓸기를 시작하면 꺼내기만 해서 멈칫하지 않습니다. 미리 보기에 넣는 화면은 id를 지우고, 그 문서의 CSS는 미리 보기 안에서만 듣게 범위를 바꿉니다(지금 문서의 CSS는 `:where(#nd-main)`). 입력은 프레임마다 한 번만 화면에 반영합니다.
- **상단 막대**: 창을 끄는 영역은 CSS(`-webkit-app-region`)로 정합니다. 단추, 입력란, 떠 있는 상자는 끌지 않습니다. 상단 막대 위에서 굴린 휠은 문서로 넘기지 않습니다.
- **광고 걸러 내기**(`render.js`): 크롤링하면서 광고 링크는 가짜 문단 앵커(`#s-숫자`)로 바뀌어 있고, 그중 하나는 광고주 주소를 글자로 가집니다. 그런 링크에서 시작해 안의 링크가 모두 `#s-숫자`이고 문단 제목이 없는 가장 큰 상자를 지웁니다. 클래스 이름은 덤프마다 달라 쓰지 않습니다.

## 맥 트랙패드 입력(native/mac-input)

- Electron(크로미움)은 스크롤 입력의 위상(손가락을 댔는지, 관성인지)을 웹에 알려 주지 않고, 쓸어서 앞뒤로 가는 기능도 없습니다. 그래서 `NSEvent` 지역 감시자로 정밀 스크롤 입력을 보고 좌우 쓸기만 가려내 화면(`ND_swipe`)에 넘깁니다.
- 화면이 "이번 동작은 쓸기"라고 알리면(`swipe_lock`) 그 동작의 나머지 입력과 관성은 크로미움에 넘기지 않습니다.
- 세로 스크롤, 문서 끝 튕기기(`scrollBounce`), 마우스 휠은 크로미움이 합성 스레드에서 처리합니다. 1.0처럼 앱이 직접 튕기거나 휠을 굴리면 입력이 IPC로 고르지 않게 들어와 버벅였고, 문서 영역을 늘 그림층으로 두면 상단 막대의 흐림이 떨렸습니다.
- 등록한 문서 창의 입력만 봅니다(`watch`). 파일 선택 창, 개발자 도구는 건드리지 않습니다.
- N-API로 만들어 Electron을 올려도 다시 빌드할 필요가 없습니다. 모듈이 없으면 쓸어서 넘기기만 빠집니다.
