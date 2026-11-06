#!/usr/bin/env python3
"""나무덤프.app 묶기(표준 라이브러리만 사용).

    python3 build/make_app.py                 # dist/나무덤프.app 만들기
    python3 build/make_app.py --install DIR   # 만든 앱을 DIR에 덮어쓰기(예: "나무덤프")
    python3 build/make_app.py --dmg           # 배포용 dist/namudump-<버전>.dmg도 만들기
    python3 build/make_app.py --debug         # 개발용으로 빠르게 빌드(시험 도구 포함)
    python3 build/make_app.py --icon          # build/AppIcon.icon으로 아이콘 파일들 다시 만들기(Xcode 필요)

앱 본체는 Swift 패키지(Package.swift)다. 화면 파일(web/)은 Resources/web으로 들어간다.
아이콘 원본은 Icon Composer 문서(build/AppIcon.icon)다. 컴파일한 결과도 저장소에 두므로
아이콘을 고칠 때만 Xcode가 있으면 된다.
"""
import argparse
import os
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
DIST = ROOT / "dist"
APP_NAME = "나무덤프"
# 버전과 만든 사람은 AppInfo.swift 한 곳에서만 정한다
_SRC = (ROOT / "Sources/NamuDumpCore/AppInfo.swift").read_text("utf-8")
VERSION = re.search(r'static let version = "([^"]+)"', _SRC).group(1)
AUTHOR = re.search(r'static let author = "([^"]+)"', _SRC).group(1)
ICON_NAME = "AppIcon"
ICTOOL = "/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"


def make_icons():
    """Icon Composer 문서를 컴파일한다.

    Assets.car: macOS 26 이상의 Liquid Glass 아이콘(다크, 틴트, 투명 모양 포함)
    AppIcon.icns: 그보다 오래된 macOS와 .dmg 볼륨 아이콘, 실행 중 Dock 아이콘
    icon_1024.png, web/icon.png: 화면(처음 화면 로고, 파비콘)에 쓰는 그림
    """
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["xcrun", "actool", "--compile", tmp, "--platform", "macosx",
                        "--minimum-deployment-target", "11.0", "--app-icon", ICON_NAME,
                        "--output-partial-info-plist", tmp + "/icon-info.plist", str(BUILD / (ICON_NAME + ".icon"))],
                       check=True, stdout=subprocess.DEVNULL)
        for name in ("Assets.car", ICON_NAME + ".icns"):
            shutil.copy(Path(tmp) / name, BUILD / name)
    for out, size in ((BUILD / "icon_1024.png", 1024), (ROOT / "web/icon.png", 256)):
        subprocess.run([ICTOOL, str(BUILD / (ICON_NAME + ".icon")), "--export-image", "--output-file", str(out),
                        "--platform", "macOS", "--rendition", "Default",
                        "--width", str(size), "--height", str(size), "--scale", "1"],
                       check=True, stdout=subprocess.DEVNULL)
    print("아이콘 파일 다시 만듦")


def sign(app):
    """임시(ad-hoc) 서명. 이 맥에서 만든 앱은 격리 표시가 없어 경고 없이 열린다.
    인터넷으로 내려받은 사람에게는 공증을 받지 않았으므로 여전히 경고가 뜬다."""
    subprocess.run(["codesign", "--force", "--sign", "-", "--timestamp=none", str(app)], check=True)
    subprocess.run(["codesign", "--verify", "--strict", str(app)], check=True)
    print("서명함(임시):", app)


def compile_app(debug, universal):
    """실행 파일을 빌드하고 그 경로를 돌려준다. 배포판은 인텔 맥에서도 돌도록 두 구조를 함께 만든다."""
    args = ["swift", "build", "-c", "debug" if debug else "release", "--product", "NamuDump"]
    if universal:
        args += ["--arch", "arm64", "--arch", "x86_64"]
    subprocess.run(args, cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    out = subprocess.run(args + ["--show-bin-path"], cwd=ROOT, check=True, capture_output=True, text=True)
    return Path(out.stdout.strip()) / "NamuDump"


def build(debug=False, universal=False):
    binary = compile_app(debug, universal)
    app = DIST / (APP_NAME + ".app")
    shutil.rmtree(DIST, ignore_errors=True)
    (app / "Contents/MacOS").mkdir(parents=True)
    res = app / "Contents/Resources"
    res.mkdir(parents=True)
    shutil.copy(BUILD / "Assets.car", res / "Assets.car")
    shutil.copy(BUILD / "AppIcon.icns", res / "AppIcon.icns")
    plist = {
        "CFBundleName": APP_NAME, "CFBundleDisplayName": APP_NAME, "CFBundleIdentifier": "com.hishydrogen.namudump",
        "CFBundleVersion": VERSION, "CFBundleShortVersionString": VERSION, "CFBundlePackageType": "APPL",
        "CFBundleExecutable": "NamuDump", "CFBundleIconFile": ICON_NAME, "CFBundleIconName": ICON_NAME,
        "LSMinimumSystemVersion": "14.0", "NSPrincipalClass": "NSApplication",
        "NSHighResolutionCapable": True, "CFBundleDevelopmentRegion": "ko",
        "LSApplicationCategoryType": "public.app-category.reference",
        "NSHumanReadableCopyright": "© 2026 " + AUTHOR,
    }
    with open(app / "Contents/Info.plist", "wb") as f:
        plistlib.dump(plist, f)
    (app / "Contents/PkgInfo").write_text("APPL????")
    shutil.copy(binary, app / "Contents/MacOS/NamuDump")
    shutil.copytree(ROOT / "web", res / "web", ignore=shutil.ignore_patterns(".DS_Store"))
    shutil.copy(ROOT / "LICENSE", res / "LICENSE")
    shutil.copy(ROOT / "README.md", DIST / "README.md")
    sign(app)
    print("만듦:", app)
    return app


# .dmg 창 모양(점 단위). build/make_dmg_bg.py의 배경 그림도 이 값으로 그린다.
# 창 크기는 제목 막대까지 포함한다. 파인더에서 탭 막대, 경로 막대, 상태 막대를 늘 켜 두는 사용자는
# 이 막대들이 창 위아래를 가리므로(창마다 끌 수 없다) 그림과 아이콘을 창 위쪽 3분의 2 안에 둔다.
DMG_W, DMG_H = 660, 440
DMG_APP_X, DMG_LINK_X = 180, 480   # 앱, "응용 프로그램" 아이콘 가운데의 가로 위치
DMG_ICON_Y = 128                   # 아이콘 가운데의 세로 위치(창 안쪽 맨 위에서)
DMG_HINT_Y = 246                   # 안내 문구 윗줄
DMG_LINK = "응용 프로그램"
BUILD_VENV = BUILD / ".venv"       # .dmg를 만들 때만 쓰는 도구(dmgbuild)를 두는 곳(저장소에 넣지 않음)

DMG_SCRIPT = """
import sys, unicodedata, dmgbuild, dmgbuild.core as core

# 파인더에서 "그룹 사용"(예: 종류별로 묶기)을 켠 사용자는 아이콘 자리를 무시하고 묶어서 늘어놓는다.
# dmgbuild가 창 설정(.DS_Store)을 쓸 때 이 폴더는 묶지 않는다는 값(GRP0 = None)을 함께 넣는다.
class _Grp:
    def __init__(self, st):
        self.st = st
    def __enter__(self):
        return self.st.__enter__()
    def __exit__(self, *exc):
        self.st["."]["GRP0"] = ("ustr", "None")
        return self.st.__exit__(*exc)
_open = core.DSStore.open
core.DSStore = type("DSStoreNoGroups", (), {"open": staticmethod(lambda *a, **k: _Grp(_open(*a, **k)))})

# 디스크(HFS+)는 한글 파일 이름을 풀어쓴 꼴(NFD)로 저장한다. 창 설정의 아이콘 자리도 같은 꼴의
# 이름으로 적어야 파인더가 알아본다(모아쓴 꼴로 적으면 아이콘 자리를 무시하고 제멋대로 늘어놓는다).
nfd = lambda s: unicodedata.normalize("NFD", s)
a = sys.argv[1:]
dmgbuild.build_dmg(a[0], a[1], settings={
    "format": "UDZO", "filesystem": "HFS+",
    "files": [a[2]], "symlinks": {a[3]: "/Applications"},
    "icon": a[4], "background": a[5],
    "default_view": "icon-view", "show_toolbar": False, "show_status_bar": False,
    "show_tab_view": False, "show_pathbar": False, "show_sidebar": False,
    "window_rect": ((200, 120), (int(a[6]), int(a[7]))),
    "icon_size": 128, "text_size": 13, "arrange_by": None,
    "icon_locations": {nfd(a[8]): (int(a[9]), int(a[11])), nfd(a[3]): (int(a[10]), int(a[11]))},
})
"""


def make_dmg(app):
    """배포용 디스크 이미지: 열면 앱과 "응용 프로그램" 폴더 바로 가기가 배경 화살표와 함께 보여,
    끌어다 놓으면 설치된다. 창 설정(.DS_Store)은 dmgbuild가 직접 써 넣는다(파인더를 조작하지 않는다)."""
    py = BUILD_VENV / "bin/python3"
    if not py.exists() or subprocess.run([str(py), "-c", "import dmgbuild"], capture_output=True).returncode:
        print(".dmg 도구(dmgbuild)를 build/.venv에 설치합니다.")
        subprocess.run([sys.executable, "-m", "venv", str(BUILD_VENV)], check=True)
        subprocess.run([str(py), "-m", "pip", "install", "-q", "--disable-pip-version-check", "dmgbuild"], check=True)
    dmg = DIST / ("namudump-%s.dmg" % VERSION)
    if dmg.exists():
        dmg.unlink()
    subprocess.run([str(py), "-c", DMG_SCRIPT, str(dmg), APP_NAME, str(app), DMG_LINK,
                    str(BUILD / "AppIcon.icns"), str(BUILD / "dmg_background.tiff"),
                    str(DMG_W), str(DMG_H), app.name, str(DMG_APP_X), str(DMG_LINK_X), str(DMG_ICON_Y)],
                   check=True)
    print("만듦:", dmg)
    return dmg


def install(app, dest):
    dest = Path(dest).expanduser()
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / app.name
    if target.exists():
        shutil.rmtree(target)
    subprocess.run(["ditto", str(app), str(target)], check=True)
    subprocess.run(["codesign", "--verify", "--strict", str(target)], check=True)
    if dest.resolve() != Path("/Applications"):
        shutil.copy(DIST / "README.md", dest / "README.md")
    print("설치:", target)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--install", metavar="DIR", help="만든 앱을 이 폴더에 덮어쓰기")
    ap.add_argument("--icon", action="store_true", help="build/AppIcon.icon으로 아이콘 파일들 다시 만들기(Xcode 필요)")
    ap.add_argument("--dmg", action="store_true", help="배포용 dist/namudump-<버전>.dmg도 만들기")
    ap.add_argument("--debug", action="store_true", help="개발용으로 빠르게 빌드")
    a = ap.parse_args()
    if a.icon:
        make_icons()
    app = build(debug=a.debug, universal=a.dmg)
    if a.dmg:
        make_dmg(app)
    if a.install:
        install(app, a.install)


if __name__ == "__main__":
    sys.exit(main())
