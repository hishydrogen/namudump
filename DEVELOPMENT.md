# 나무덤프 개발 안내

나무덤프의 코드를 수정하거나 직접 빌드하려는 분을 위한 기술 문서입니다. 프로그램 사용법은 [README.md](README.md)를 참고해 주세요.

## 구조

나무덤프는 Electron 기반 애플리케이션으로, 크게 세 부분으로 이루어져 있습니다.

1. **메인 프로세스**(`app/main.js`, `app/preload.js`): 창 관리, 메뉴 막대, 오른쪽 클릭 메뉴, `namudump://` 커스텀 프로토콜 처리, 파일 선택 대화상자와 외부 링크 열기 같은 운영체제 연동 기능을 담당합니다.
2. **덤프 작업 스레드**(`app/worker.js`, `app/core/`): SQLite 덤프 파일 읽기, 제목 검색, 설정 및 보관함 데이터베이스 관리를 담당합니다. 대용량 문서를 압축 해제하거나 전체 제목 목록을 검색하는 동안에도 화면이 멈추지 않도록 별도 워커 스레드에서 동작합니다.
3. **렌더러 화면**(`web/`): 창 안에서 동작하는 단일 페이지 앱(SPA)입니다. 나무위키 문서는 문서별 인라인 CSS, 다단 표, 수식(KaTeX)을 포함하므로 웹 엔진으로 렌더링합니다. 별도의 번들러나 외부 프런트엔드 프레임워크 없이 순수 HTML, CSS, JavaScript로 작성되어 있습니다.

```
app/main.js              창 생성, 메뉴, 오른쪽 클릭 메뉴, namudump:// 프로토콜, 운영체제 연동(IPC)
app/preload.js           렌더러에 노출하는 브리지(window.ndNative)
app/worker.js            덤프 작업 스레드 진입점
app/core/dump.js         덤프 파일 읽기(node:sqlite, 읽기 전용), 제목 검색 및 압축 해제
app/core/store.js        사용자 설정(settings.json), 방문 기록과 즐겨찾기(user.sqlite)
app/core/api.js          /api/... 요청 라우팅 및 응답 처리
app/core/web.js          정적 화면 파일 제공, CSP 헤더, 외부 URL 검증
app/core/update.js       새 버전 확인 결과 해석(버전 비교, 운영체제별 설치 파일 고르기, 변경 내용 요약)
native/mac-input/        macOS 트랙패드 및 매직 마우스 쓸기 입력 감지 모듈(Objective-C++, N-API)
web/index.html           앱 화면 기본 마크업
web/app.js               라우팅(/, /w/제목, /search), 홈 화면, 검색, 각주, 문서 내 찾기, 스크롤 복원, 쓸기 전환
web/render.js            덤프 HTML 정제, 본문 추출, 광고 제거, 허용 태그 필터링(window.NamuRender.render)
web/classmap.json        글자 크기 및 표 정렬 클래스 대응표
web/app.css              앱 인터페이스 스타일
web/content.css          나무위키 문서 본문 스타일
web/fonts/               Pretendard 가변 글꼴(SIL OFL 1.1)
web/katex/               수식 렌더링용 KaTeX CSS와 글꼴(MIT)
build/                   아이콘 리소스(macOS용 AppIcon.icon, Assets.car, AppIcon.icns 및 플랫 아이콘), .dmg 배경
tests/                   단위 및 통합 테스트(node:test)
docs/                    README용 아이콘 및 스크린샷
```

## 실행과 테스트

Node.js 22 이상이 필요합니다. macOS에서는 `npm install` 실행 시 트랙패드 입력 네이티브 모듈을 함께 컴파일하므로 Xcode 명령어 라인 도구가 설치되어 있어야 합니다.

```bash
npm install
npm start            # 개발 모드로 앱 실행
npm test             # 테스트 실행(임시 SQLite 덤프로 읽기, 검색, API, CSP 검증)
```

- `NAMUDUMP_SUPPORT=<폴더 경로>` 환경 변수를 지정해 실행하면 설정과 기록을 해당 폴더에 분리해 저장합니다. 기존 사용자 데이터를 건드리지 않고 테스트할 때 유용합니다.
- 개발 중에는 `F12` 또는 `⌥⌘I`(`Ctrl+Alt+I`)로 개발자 도구를 열 수 있습니다. `--remote-debugging-port=<포트>` 인자를 넘기면 외부에서 CDP로 화면을 검사하거나 스크립트를 실행할 수 있습니다.
- 창이 다른 창 뒤에 가려지면 크로미움이 화면 갱신을 멈추므로, 자동화 테스트 시에는 `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding` 옵션을 함께 전달합니다.

## 코드 작성 규칙

- **의존성 최소화**: 런타임 npm 패키지를 두지 않습니다(개발 의존성으로만 `electron`, `electron-builder`, `node-gyp` 사용). SQLite는 Electron에 내장된 Node.js의 `node:sqlite` 모듈을 그대로 사용합니다. 덕분에 Windows와 Linux 빌드에는 네이티브 애드온이 전혀 필요하지 않으며, macOS에만 트랙패드 제스처용 N-API 모듈이 포함됩니다.
- **네이밍 규칙**: 앱 자체 CSS 클래스와 변수는 위키 문서 스타일과 충돌하지 않도록 `nd-` 접두어를 붙입니다. 메인 프로세스에서 호출하는 전역 렌더러 함수는 `window.ND_` 접두어를 사용합니다.
- **한국어 문구와 주석**: 코드 주석과 화면 문구는 자연스러운 한국어로 작성합니다. 범위를 표기할 때는 물결표 대신 하이픈(`-`)을 쓰고, 불필요한 가운뎃점을 남발하지 않습니다.
- **버전 관리**: 앱 버전은 `package.json`의 `version` 필드 한 곳에서만 관리합니다.
- **애니메이션 토큰**: 전환 시간과 가속도 곡선은 `web/app.css`의 `:root` 변수에서 일괄 관리합니다.
- **크로스플랫폼 호환**: 단축키는 macOS의 `⌘`과 Windows 및 Linux의 `Ctrl`을 모두 지원합니다(`app.js`의 `IS_MAC`, `MODK`, `keyLabel`). 파일 경로는 반드시 `path.join`으로 다루고, macOS 전용 네이티브 모듈이 로드되지 않은 환경에서도 모든 기본 기능이 정상 동작해야 합니다.
- **저장소 제외 항목**: 패키지 빌드 결과물(`dist/`), `node_modules/`, 네이티브 모듈 빌드 산출물(`native/*/build/`)은 커밋하지 않습니다.

## 빌드와 배포

```bash
npm run dist:mac      # dist/namudump-<버전>-mac-arm64.dmg
npm run dist:win      # dist/namudump-<버전>-win-x64-setup.exe, -win-arm64-setup.exe
npm run dist:linux    # dist/namudump-<버전>-linux-x86_64.AppImage, -linux-arm64.AppImage
```

- 패키징 설정은 `package.json`의 `build` 항목([electron-builder](https://www.electron.build))에 정의되어 있습니다.
- `.github/workflows/build.yml` 워크플로는 `v*` 태그가 푸시되거나 GitHub Actions에서 수동 실행(`workflow_dispatch`)될 때 5개 환경(macOS arm64, Windows x64 및 Arm64, Linux x64 및 arm64)에서 설치 파일을 빌드해 아티팩트로 업로드합니다.
- **앱 이름 처리**: macOS 앱 번들과 실행 파일 이름은 영문 `NamuDump`로 유지합니다. Electron Helper 번들 이름이나 `Info.plist`의 `CFBundleName`에 한글이 들어가면 macOS에서 실행 직후 크래시(SIGTRAP)가 발생하기 때문입니다. 대신 `build/mac/InfoPlist.strings` 지역화 파일을 통해 Finder, Dock, Spotlight, 메뉴 막대에서는 '나무덤프'로 표시되게 합니다. Windows에서는 시작 메뉴와 프로그램 추가/제거 목록에, Linux에서는 데스크톱 엔트리에 '나무덤프'로 등록됩니다.
- **아이콘 구성**
  - 아이콘은 가운데 잎맥을 따라 접힌 나뭇잎 하나가 펼쳐진 책처럼 보이도록 디자인했습니다. 밝은 오른쪽 면에는 세 줄의 틈을 내어 본문 글줄을 형상화했습니다.
  - **macOS**: Xcode Icon Composer 원본(`build/AppIcon.icon`)에서 컴파일한 `Assets.car`(macOS 26 이상 Liquid Glass 아이콘)와 `AppIcon.icns`(하위 macOS 및 `.dmg` 볼륨 아이콘)를 사용합니다. 빌드 결과물이 저장소에 포함되어 있어 아이콘 자체를 수정하지 않는 한 빌드 시 Xcode가 필요하지 않습니다.
  - **앱 화면 속 아이콘(macOS)**: 홈 화면, 정보 창, 업데이트 알림에는 Dock과 같은 Liquid Glass 아이콘을 미리 렌더링한 `web/icon-mac.png`(라이트 모드), `web/icon-mac-dark.png`(다크 모드)를 사용합니다(`app.css`의 `--nd-app-icon`). 아이콘 원본을 수정한 경우 Icon Composer 안의 `ictool`로 다시 생성합니다.
    ```bash
    IC="/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
    "$IC" build/AppIcon.icon --export-image --output-file web/icon-mac.png --platform macOS --rendition Default --width 128 --height 128 --scale 2
    "$IC" build/AppIcon.icon --export-image --output-file web/icon-mac-dark.png --platform macOS --rendition Dark --width 128 --height 128 --scale 2
    ```
  - **Windows, Linux, 웹 화면, README**: 동일한 형태를 단색 플랫 스타일로 그린 `build/icon-flat.svg` 기반의 `build/icon.png`(1024px), `docs/icon.png`(512px), `web/icon.png`(256px)를 사용합니다.
- **코드 서명**: macOS 빌드는 임시(ad-hoc) 서명만 수행하며 Apple 공증(Notarization)은 거치지 않습니다. Windows 설치 파일 역시 별도 인증서 서명을 하지 않으므로 최초 실행 시 안내를 README에 수록했습니다.
- **Windows 설치 프로그램**: NSIS 원클릭 방식(`oneClick: true`, `perMachine: false`)으로, 설치 마법사 없이 `%LOCALAPPDATA%\Programs`에 설치하고 바로 실행합니다. 3.1.x까지의 설치 마법사에서 '모든 사용자'로 설치한 기록(HKLM)이 있으면 `build/installer.nsh`의 `customInit`이 기존 버전을 따로 제거하도록 안내합니다.
- **새 버전 확인**: 메인 프로세스가 GitHub API의 `releases/latest`(초안과 사전 릴리스 제외)를 조회하고, 렌더러가 시작 8초 뒤와 6시간마다 확인을 요청합니다(설정 `update_check`). 확인과 알림만 수행하며, 설치 파일 링크는 기본 웹 브라우저로 엽니다. macOS 빌드가 임시 서명만 되어 있어 자동 설치(`electron-updater`)는 사용하지 않습니다. 설치 파일 이름이 `artifactName` 규칙(`namudump-<버전>-<os>-<arch>…`)을 벗어나면 릴리스 페이지로 안내하므로, 이름 규칙을 바꿀 때는 `app/core/update.js`의 `pickAsset`도 함께 수정해야 합니다. 릴리스 설명 전문은 알림 창의 스크롤 영역에 표시됩니다.
- **릴리스 절차**
  1. `package.json`의 `version`을 업데이트하고 `CHANGELOG.md`에 변경 사항을 기록합니다.
  2. 변경 사항을 커밋하고 푸시합니다.
  3. 각 운영체제용 설치 파일을 빌드합니다(로컬 빌드 또는 GitHub Actions).
  4. `v<버전>` 태그로 GitHub Release를 생성하고 빌드된 파일을 첨부합니다.

## 사용자 데이터와 덤프 파일

- **데이터 저장 위치**: macOS `~/Library/Application Support/NamuDump`, Windows `%APPDATA%\NamuDump`, Linux `~/.config/NamuDump`. 크로미움 내부 캐시와 세션 파일은 하위 폴더인 `electron/`에 분리해 보관합니다.
- **저장 파일**: 환경 설정(`settings.json`), 방문 기록 및 즐겨찾기(`user.sqlite`). 1.0 및 2.0 버전과 스키마가 같아 업데이트 시 기존 데이터가 그대로 유지됩니다.
- **덤프 파일 접근**: 선택한 덤프 파일 경로는 `settings.json`의 `db_path`에 저장됩니다. 덤프는 `?mode=ro&immutable=1` 옵션으로 읽기 전용 연결만 수행하므로 원본 파일을 잠그거나 변경하지 않습니다. `docs` 테이블에 `html` 컬럼이 없는 마크다운 전용 덤프(`namu-md.sqlite`)를 열려고 하면 `namu-html.sqlite` 파일이 필요하다는 안내 메시지를 반환합니다.

## 프로세스 간 통신과 보안

| 방향 | 통신 방식 |
|---|---|
| 렌더러 → 덤프 및 설정 | `fetch('/api/...')` 호출을 `namudump://` 프로토콜 핸들러가 받아 워커 스레드(`api.js`)로 전달 |
| 렌더러 → 운영체제 | `window.ndNative.call(명령, 인자)`(IPC)로 파일 선택(`pick`), 창 배경색 및 Windows와 Linux 창 버튼 색상 동기화(`bg`), 외부 링크 열기(`open_url`), 쓸기 제스처 잠금(`swipe_lock`), 새 버전 확인(`update_check`), 앱 종료(`quit`) 수행 |
| 메인 → 렌더러 | 메뉴 명령(`ND_command`), 전체 화면 상태(`ND_setFullscreen`), 선택 영역 검색(`ND_searchSelection`), macOS 트랙패드 쓸기 입력(`ndNative.onInput`) 전달 |

- **콘텐츠 보안 정책(CSP)**: `web.js`에서 `index.html` 응답에 엄격한 CSP 헤더를 부여합니다. 외부 이미지는 YouTube 썸네일(`https://i.ytimg.com`)만 허용하며, 외부 링크는 `http`, `https`, `mailto` 스킴만 기본 웹 브라우저로 엽니다.
- **YouTube 임베드 재생**: 커스텀 스킴(`namudump://`)에서는 기본 `Referer` 헤더가 전송되지 않아 YouTube 플레이어가 재생을 차단(오류 153)하므로, `https://www.youtube.com/embed/*` 요청에만 앱 식별자(`https://com.hishydrogen.namudump/`)를 `Referer`로 주입합니다.
- **권한 제한**: 동영상 전체 화면(`fullscreen`), 클립보드 복사(`clipboard-sanitized-write`), 로컬 글꼴 목록 조회(`local-fonts`)만 허용하고 파일 다운로드와 그 밖의 권한 요청은 차단합니다.

## 화면 렌더링과 인터랙션(web/)

- **목차 및 각주 빠른 스크롤**: 브라우저 기본 `smooth` 스크롤은 이동 거리가 멀수록 지연이 길어지므로, 거리와 관계없이 0.2-0.34초 안에 도달하는 커스텀 이징 스크롤(`quickScrollTo`)을 사용합니다. 도중에 사용자가 휠을 굴리거나 클릭하면 즉시 멈춥니다.
- **오른쪽 목차 현재 위치 표시**: 단일 인디케이터 막대(`.nd-toc-ind`)가 현재 읽고 있는 문단 항목으로 미끄러지듯 이동합니다.
- **읽던 위치와 접기 상태 복원**: 히스토리 항목마다 고유 `key`를 부여하고, 문서를 떠나기 직전에 화면 상단에 걸친 DOM 요소의 경로와 오프셋, 문단 접기 및 `<details>` 펼침 상태를 저장해 정확히 복원합니다.
- **쓸어서 앞뒤 이동(macOS)**: 유휴 시간에 바로 이전과 다음 히스토리의 DOM 미리 보기를 미리 구성해 `content-visibility: hidden`으로 숨겨 둡니다(`warmNeighbors`). 사용자가 트랙패드를 좌우로 쓸기 시작하면 지연 없이 이전 또는 다음 문서 화면을 겹쳐 보여 줍니다.
- **넘겨주기 문서**: 덤프의 넘겨주기 행에는 넘겨받는 문서의 본문이 그대로 들어 있고 문단 주소(`#…`)는 남아 있지 않습니다. `Dump.redirectTarget`이 '…에서 넘어옴' 표시와 `<h1>` 태그로 실제 문서 제목을 찾아 `title`로 반환하고, 원래 제목은 `redirect_from`에 담습니다. 렌더러는 주소를 실제 제목으로 바꾸고, 넘겨준 제목과 id가 같은 문단 앵커(나무위키 `[anchor()]` 또는 문단 제목)가 있으면 해당 문단으로 스크롤합니다.
- **광고 제거(`render.js`)**: 크롤링 과정에서 가짜 문단 앵커(`#s-숫자`)로 변환된 광고주 도메인 링크를 역추적해 광고 컨테이너 전체를 제거합니다.

## macOS 트랙패드 입력 모듈(native/mac-input)

- 크로미움은 트랙패드 스크롤 이벤트의 단계(손가락 접촉 시작, 이동, 해제, 관성)를 웹 페이지에 노출하지 않으므로, `NSEvent` 로컬 모니터로 정밀 스크롤(`hasPreciseScrollingDeltas`) 이벤트를 감지해 좌우 쓸기 동작만 렌더러(`ND_swipe`)로 전달합니다.
- 렌더러가 현재 제스처를 페이지 전환 쓸기로 확정한 경우(`swipe_lock`) 해당 제스처의 남은 이벤트와 관성 스크롤은 크로미움으로 넘기지 않고 가로챕니다.
- 세로 스크롤과 문서 끝 탄성 효과(`scrollBounce`), 일반 마우스 휠은 크로미움 합성 스레드가 직접 처리해 프레임 저하 없이 부드럽게 동작합니다.
