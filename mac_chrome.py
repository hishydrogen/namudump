"""맥용 창 꾸미기: 제목 표시줄 숨기기, 신호등 단추 위치, 창 끌기, 오른쪽 클릭 메뉴.

pywebview(WKWebView) 창을 PyObjC로 직접 손본다. 어느 단계가 실패해도 창은 기본 모양으로 뜬다.
"""
import re
import sys
import traceback

# 웹 쪽 상단 막대 높이(px). app.css의 --nd-top-h와 같아야 한다.
TOP_H = 60
LIGHTS_X = 20          # 닫기 단추 왼쪽 여백
# 웹에서 알려 주는 창 끌기 영역: h(상단 막대 높이, 0이면 끌기 없음), no(끌면 안 되는 사각형들)
DRAG = {"h": 0, "no": []}
_keep = []             # 알림 관찰자 등 참조 유지용
WHEEL_LINE = 40        # 휠 한 칸의 이동 거리(px). WebKit과 크롬이 쓰는 값과 같다
# 정보 창에 쓰는 앱 정보. namudump.py가 patch_webview() 전에 채운다.
ABOUT = {"name": "", "version": "", "copyright": "", "homepage": ""}
# 정보 창 아래쪽 설명: (글, 링크) 줄들. 빈 줄은 문단 사이 여백이다.
ABOUT_LINES = [
    ("나무위키 덤프를 인터넷 없이 읽는 맥용 프로그램", None),
    ("", None),
    ("{site}", "{homepage}"),
    ("코드: MIT 라이선스", None),
    ("문서 내용: 나무위키 기여자, CC BY-NC-SA 2.0 KR", "https://creativecommons.org/licenses/by-nc-sa/2.0/kr/"),
    ("수식: KaTeX(MIT), 창: pywebview(BSD)", None),
    ("", None),
    ("나무위키와 관계없는 비공식 프로그램입니다.", None),
]


def log(*a):
    try:
        print("[mac]", *a, flush=True)
    except Exception:
        pass


def set_drag_regions(data):
    try:
        h = float(data.get("h") or 0)
        no = []
        for r in (data.get("no") or [])[:64]:
            x, y, w, hh = (float(v) for v in r[:4])
            no.append((x, y, w, hh))
        DRAG["h"], DRAG["no"] = max(0.0, min(h, 200.0)), no
        return True
    except Exception:
        return False


# 오른쪽 클릭 메뉴에서 뺄 항목(WebKit 메뉴 항목 식별자의 일부)
_DROP = ("OpenLink", "NewWindow", "Download", "Reload", "GoBack", "GoForward",
         "Inspect", "OpenFrame", "OpenMedia", "ShowHideMediaControls", "ToggleFullScreen",
         "EnterVideoFullscreen", "ToggleVideoEnhancedFullscreen")


def _in_drag_zone(view, event):
    h = DRAG["h"]
    if h <= 0:
        return False
    p = view.convertPoint_fromView_(event.locationInWindow(), None)
    y = p.y if view.isFlipped() else view.bounds().size.height - p.y
    x = p.x
    if y < 0 or y > h:
        return False
    for (rx, ry, rw, rh) in DRAG["no"]:
        if rx <= x <= rx + rw and ry <= y <= ry + rh:
            return False
    return True


_prev_frame = {}


def toggle_zoom(win):
    """창 키우기/되돌리기. 애니메이션 도중 웹 화면이 따라오지 못해 끊기고 빈 곳이
    보이므로 애니메이션 없이 한 번에 바꾼다."""
    import AppKit  # type: ignore
    scr = win.screen() or AppKit.NSScreen.mainScreen()
    vis = scr.visibleFrame()
    cur = win.frame()
    key = id(win)
    full = (abs(cur.origin.x - vis.origin.x) < 2 and abs(cur.origin.y - vis.origin.y) < 2
            and abs(cur.size.width - vis.size.width) < 2 and abs(cur.size.height - vis.size.height) < 2)
    if full:
        prev = _prev_frame.pop(key, None)
        if prev is None:
            w_, h_ = min(1280, vis.size.width * 0.8), min(880, vis.size.height * 0.85)
            prev = AppKit.NSMakeRect(vis.origin.x + (vis.size.width - w_) / 2,
                                     vis.origin.y + (vis.size.height - h_) / 2, w_, h_)
        win.setFrame_display_animate_(prev, True, False)
    else:
        _prev_frame[key] = cur
        win.setFrame_display_animate_(vis, True, False)


def about_credits(AppKit):
    """정보 창 가운데의 설명(링크 포함). 다크 모드에서도 보이도록 시스템 글자색을 쓴다."""
    out = AppKit.NSMutableAttributedString.alloc().init()
    para = AppKit.NSMutableParagraphStyle.alloc().init()
    para.setAlignment_(AppKit.NSTextAlignmentCenter)
    para.setLineSpacing_(2)
    font = AppKit.NSFont.systemFontOfSize_(AppKit.NSFont.smallSystemFontSize())
    info = dict(ABOUT, site=re.sub(r"^https?://", "", ABOUT["homepage"]))
    for i, (text, link) in enumerate(ABOUT_LINES):
        text = text.format(**info)
        attrs = {AppKit.NSFontAttributeName: font, AppKit.NSParagraphStyleAttributeName: para,
                 AppKit.NSForegroundColorAttributeName: AppKit.NSColor.secondaryLabelColor()}
        if link:
            link = link.format(**info)
            if not link:
                continue
            attrs[AppKit.NSLinkAttributeName] = AppKit.NSURL.URLWithString_(link)
        line = text + ("\n" if i < len(ABOUT_LINES) - 1 else "")
        out.appendAttributedString_(AppKit.NSAttributedString.alloc().initWithString_attributes_(line, attrs))
    return out


def patch_webview():
    """webview.start() 전에 부른다. 오른쪽 클릭 메뉴와 창 끌기를 고친다."""
    if sys.platform != "darwin":
        return
    try:
        import objc  # type: ignore
        import AppKit  # type: ignore
        from Foundation import NSObject  # type: ignore
        from webview.platforms import cocoa  # type: ignore
    except Exception:
        log("patch import failed", traceback.format_exc())
        return
    host = cocoa.BrowserView.WebKitHost

    class NDMenuTarget(NSObject):
        def searchSelection_(self, sender):
            v = getattr(self, "view", None)
            if v is not None:
                v.evaluateJavaScript_completionHandler_(
                    "window.ND_searchSelection && window.ND_searchSelection()", None)

        def showAbout_(self, sender):
            # 파이썬으로 실행되므로 기본 정보 창은 파이썬 아이콘을 쓰고 버전을 "1.0.0(1.0.0)"처럼
            # 두 번 적는다. "나무덤프 1.0.0" 한 줄과 설명, 저작권이 보이도록 직접 연다.
            app = AppKit.NSApplication.sharedApplication()
            app.activateIgnoringOtherApps_(True)
            app.orderFrontStandardAboutPanelWithOptions_({
                "ApplicationIcon": app.applicationIconImage(),
                "ApplicationName": ("%s %s" % (ABOUT["name"], ABOUT["version"])).strip(),
                "ApplicationVersion": "",
                "Version": "",
                "Copyright": ABOUT["copyright"],
                "Credits": about_credits(AppKit),
            })

    target = NDMenuTarget.alloc().init()
    _keep.append(target)
    _MENU["target"] = target

    def willOpenMenu_withEvent_(self, menu, event):
        try:
            items = list(menu.itemArray())
            has_sel = False
            for it in items:
                ident = str(it.identifier() or "")
                # 글자를 골랐을 때만 나오는 항목(찾아보기, 웹 검색)으로 선택 여부를 판단
                if "LookUp" in ident or "SearchWeb" in ident:
                    has_sel = True
                if any(k in ident for k in _DROP):
                    menu.removeItem_(it)
            # 앞뒤와 연달아 있는 구분선 정리
            prev_sep = True
            for it in list(menu.itemArray()):
                if it.isSeparatorItem():
                    if prev_sep:
                        menu.removeItem_(it)
                    prev_sep = True
                else:
                    prev_sep = False
            arr = list(menu.itemArray())
            while arr and arr[-1].isSeparatorItem():
                menu.removeItem_(arr[-1])
                arr = arr[:-1]
            if has_sel:
                target.view = self
                mi = AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
                    "나무덤프에서 제목 검색", "searchSelection:", "")
                mi.setTarget_(target)
                menu.insertItem_atIndex_(AppKit.NSMenuItem.separatorItem(), 0)
                menu.insertItem_atIndex_(mi, 0)
        except Exception:
            log("menu", traceback.format_exc())

    # 한글 입력기가 켜진 채 검색창에 초점이 있으면 입력기가 마우스 클릭을 가로채서
    # 첫 클릭이 무시된다. 클릭은 입력기를 거치지 않고 바로 웹 페이지로 보낸다.
    bypass = [False]

    def inputContext(self):
        if bypass[0]:
            return None
        return objc.super(host, self).inputContext()

    def _direct(self, event, name):
        try:
            ctx = objc.super(host, self).inputContext()
            if ctx is not None and self.hasMarkedText():
                self.unmarkText()          # 조합 중인 글자는 확정
                ctx.discardMarkedText()
        except Exception:
            pass
        bypass[0] = True
        try:
            getattr(objc.super(host, self), name)(event)
        finally:
            bypass[0] = False

    def mouseUp_(self, event):
        _direct(self, event, "mouseUp_")

    def mouseDown_(self, event):
        try:
            if _in_drag_zone(self, event):
                win = self.window()
                if event.clickCount() >= 2:
                    act = AppKit.NSUserDefaults.standardUserDefaults().stringForKey_("AppleActionOnDoubleClick")
                    act = str(act or "Maximize")
                    if act == "Minimize":
                        win.performMiniaturize_(None)
                    elif act != "None":
                        toggle_zoom(win)
                    return
                win.performWindowDragWithEvent_(event)
                return
        except Exception:
            log("drag", traceback.format_exc())
        _direct(self, event, "mouseDown_")

    # 마우스 옆 단추(3번 뒤로, 4번 앞으로). WebKit은 이 단추들을 가운데 단추로 뭉뚱그리므로
    # 웹에 넘기지 않고 여기서 바로 처리한다.
    def otherMouseDown_(self, event):
        if event.buttonNumber() in (3, 4):
            return
        objc.super(host, self).otherMouseDown_(event)

    def otherMouseUp_(self, event):
        n = event.buttonNumber()
        if n in (3, 4):
            self.evaluateJavaScript_completionHandler_("history.%s()" % ("back" if n == 3 else "forward"), None)
            return
        objc.super(host, self).otherMouseUp_(event)

    # 칸 단위로 움직이는 일반 마우스 휠은 WebKit이 한 칸씩 뚝뚝 옮긴다. 이런 입력만 골라
    # 웹(ND_wheel)에 넘겨 부드럽게 굴린다. 트랙패드, 매직 마우스(정밀 입력)는 그대로 둔다.
    def scrollWheel_(self, event):
        try:
            # 트랙패드, 매직 마우스의 좌우 쓸기는 웹으로 넘긴다
            if event.hasPreciseScrollingDeltas() and swipe_event(self, event):
                return
            mods = AppKit.NSEventModifierFlagCommand | AppKit.NSEventModifierFlagControl
            if (not event.hasPreciseScrollingDeltas() and event.phase() == 0 and event.momentumPhase() == 0
                    and not (event.modifierFlags() & mods)):
                dx = -event.scrollingDeltaX() * WHEEL_LINE
                dy = -event.scrollingDeltaY() * WHEEL_LINE
                if dx or dy:
                    p = self.convertPoint_fromView_(event.locationInWindow(), None)
                    y = p.y if self.isFlipped() else self.bounds().size.height - p.y
                    self.evaluateJavaScript_completionHandler_(
                        "window.ND_wheel ? ND_wheel(%.1f,%.1f,%.1f,%.1f) : scrollBy(%.1f,%.1f)" % (dx, dy, p.x, y, dx, dy), None)
                    return
        except Exception:
            log("wheel", traceback.format_exc())
        objc.super(host, self).scrollWheel_(event)

    # 신호등 단추 자리: Chromium처럼 창 틀(NSThemeFrame)의 하위 클래스를 써서
    # AppKit이 처음부터 상단 막대 가운데에 단추를 배치하게 한다(단추를 옮기며 싸우지 않음).
    try:
        ThemeFrame = objc.lookUpClass("NSThemeFrame")

        class NDThemeFrame(ThemeFrame):
            pass

        def tb_height(self):
            return float(TOP_H)

        def tb_min_x(self):
            return float(LIGHTS_X)

        def tb_min_y(self):
            return -float(round((TOP_H - 14) / 2))

        objc.classAddMethods(NDThemeFrame, [
            objc.selector(tb_height, selector=b"_titlebarHeight", signature=b"d@:"),
            objc.selector(tb_min_x, selector=b"_minXTitlebarWidgetInset", signature=b"d@:"),
            objc.selector(tb_min_y, selector=b"_minYTitlebarButtonsOffset", signature=b"d@:"),
        ])

        def frameViewClassForStyleMask_(cls, mask):
            base = AppKit.NSWindow.frameViewClassForStyleMask_(mask)
            if base is ThemeFrame:
                return NDThemeFrame
            return base

        # 웹이 처리하지 않은 esc는 AppKit이 cancelOperation:을 받을 곳을 찾다 없으면 경고음을 낸다. 창이 조용히 받는다
        def cancelOperation_(self, sender):
            pass

        objc.classAddMethods(cocoa.BrowserView.WindowHost, [
            objc.selector(frameViewClassForStyleMask_, selector=b"frameViewClassForStyleMask:",
                          signature=b"#@:Q", isClassMethod=True),
            objc.selector(cancelOperation_, selector=b"cancelOperation:", signature=b"v@:@"),
        ])
        _keep.append(NDThemeFrame)
        log("theme frame patched")
    except Exception:
        log("theme frame failed", traceback.format_exc())

    try:
        objc.classAddMethods(host, [
            objc.selector(willOpenMenu_withEvent_, selector=b"willOpenMenu:withEvent:", signature=b"v@:@@"),
            objc.selector(mouseDown_, selector=b"mouseDown:", signature=b"v@:@"),
            objc.selector(mouseUp_, selector=b"mouseUp:", signature=b"v@:@"),
            objc.selector(inputContext, selector=b"inputContext", signature=b"@@:"),
            objc.selector(otherMouseDown_, selector=b"otherMouseDown:", signature=b"v@:@"),
            objc.selector(otherMouseUp_, selector=b"otherMouseUp:", signature=b"v@:@"),
            objc.selector(scrollWheel_, selector=b"scrollWheel:", signature=b"v@:@"),
        ])
        log("webview patched")
    except Exception:
        log("classAddMethods failed", traceback.format_exc())


# 트랙패드, 매직 마우스의 좌우 쓸기. WebKit의 쓸기 기능은 화면 전체(상단 막대 포함)를 한 장의 그림으로
# 밀어서, 상단 막대의 흐림 효과가 멈추고 배경이 굳어 보였다. 그래서 WebKit 쓸기는 끄고, 좌우로 쓰는
# 움직임을 웹(ND_swipe)에 알려 상단 막대 아래 문서 영역만 움직이게 한다.
# 스크롤 자체는 WebKit이 그대로 한다(그래야 넓은 표 등이 자연스럽다).
# 웹이 "이건 앞뒤 이동 쓸기"라고 판단해 /api/swipe_lock을 보내면, 그때부터 그 한 번의 동작은 WebKit에 넘기지 않는다.
GESTURE = {"lock": None, "ax": 0.0, "ay": 0.0, "swallow": False}
SWIPE_DECIDE = 6.0      # 가로, 세로를 판단하기 시작하는 움직임(점)


def set_capture():
    """웹이 이번 스크롤 동작을 직접 처리하겠다고 알릴 때 부른다(/api/swipe_lock, /api/scroll_capture).
    앞뒤 이동 쓸기와 앱이 직접 만드는 튕기기에서 쓴다. 다음 동작이 시작되면 풀린다."""
    GESTURE["swallow"] = True
    return True


def swipe_event(v, event):
    """정밀 스크롤 입력 하나를 처리한다. WebKit에 넘기지 말아야 하면 True."""
    import AppKit  # type: ignore
    ph, mph = event.phase(), event.momentumPhase()
    if ph & (AppKit.NSEventPhaseBegan | AppKit.NSEventPhaseMayBegin):
        GESTURE.update(lock=None, ax=0.0, ay=0.0, swallow=False)
    p = v.convertPoint_fromView_(event.locationInWindow(), None)
    y = p.y if v.isFlipped() else v.bounds().size.height - p.y
    # 모든 정밀 스크롤 입력을 웹(ND_scroll)에도 알린다: 앱이 직접 만드는 튕기기에 쓴다.
    # dx, dy는 내용이 움직이는 방향(양수면 내용이 오른쪽, 아래로 간다)이다.
    v.evaluateJavaScript_completionHandler_(
        "window.ND_scroll && ND_scroll(%d,%d,%.2f,%.2f,%.1f,%.1f)" % (ph, mph, event.scrollingDeltaX(), event.scrollingDeltaY(), p.x, y), None)
    if ph & AppKit.NSEventPhaseMayBegin and not (ph & AppKit.NSEventPhaseBegan):
        return False
    # 손가락 방향 기준(자연스러운 스크롤 설정과 상관없이 손가락을 오른쪽으로 쓸면 양수)
    fx = event.scrollingDeltaX() * (1 if event.isDirectionInvertedFromDevice() else -1)

    def send(kind, dx):
        v.evaluateJavaScript_completionHandler_(
            "window.ND_swipe && ND_swipe('%s',%.2f,%.1f,%.1f)" % (kind, dx, p.x, y), None)

    if ph:
        if GESTURE["lock"] is None:
            GESTURE["ax"] += fx
            GESTURE["ay"] += event.scrollingDeltaY()
            if abs(GESTURE["ax"]) + abs(GESTURE["ay"]) < SWIPE_DECIDE:
                return False            # 아직 판단하기엔 짧다
            GESTURE["lock"] = abs(GESTURE["ax"]) > 1.5 * abs(GESTURE["ay"])
            if GESTURE["lock"]:
                send("begin", GESTURE["ax"])
                if ph & (AppKit.NSEventPhaseEnded | AppKit.NSEventPhaseCancelled):
                    send("end", 0)
            return GESTURE["swallow"]
        if GESTURE["lock"]:
            send("end" if ph & (AppKit.NSEventPhaseEnded | AppKit.NSEventPhaseCancelled) else "move", fx)
        return GESTURE["swallow"]
    return bool(mph) and GESTURE["swallow"]   # 쓸기로 가져간 동작의 관성도 WebKit에 넘기지 않는다


_MENU = {"target": None}


def fix_about_menu():
    """앱 메뉴의 "나무덤프에 관하여"가 showAbout:을 부르게 한다(주 스레드에서)."""
    try:
        import AppKit  # type: ignore
        menu = AppKit.NSApplication.sharedApplication().mainMenu()
        t = _MENU["target"]
        if menu is None or t is None or menu.numberOfItems() == 0:
            return
        sub = menu.itemAtIndex_(0).submenu()
        for it in (sub.itemArray() if sub is not None else []):
            if it.action() == "orderFrontStandardAboutPanel:":
                it.setTarget_(t)
                it.setAction_("showAbout:")
    except Exception:
        log("about", traceback.format_exc())


def tell_js(w, js):
    try:
        v = w.contentView()
        if v is not None and v.respondsToSelector_("evaluateJavaScript:completionHandler:"):
            v.evaluateJavaScript_completionHandler_(js, None)
    except Exception:
        log("tell_js", traceback.format_exc())


def fix_insets(w):
    """WKWebView가 제목 표시줄만큼 내용을 밀어내지 않게 한다. WebKit 자체의 쓸기(뒤로, 앞으로)는
    끄고 웹이 직접 처리한다(swipe_event 참고)."""
    try:
        v = w.contentView()
        if v is not None and v.respondsToSelector_("setAllowsBackForwardNavigationGestures:"):
            v.setAllowsBackForwardNavigationGestures_(False)
        # WebKit의 튕기기는 상단 막대까지 같이 튕겨서 끈다. 튕기기는 웹이 문서 영역에만 직접 만든다(ND_scroll).
        if v is not None and v.respondsToSelector_("_setRubberBandingEnabled:"):
            v._setRubberBandingEnabled_(False)
        if v is not None and v.respondsToSelector_("_setAutomaticallyAdjustsContentInsets:"):
            v._setAutomaticallyAdjustsContentInsets_(False)
            if v.respondsToSelector_("_setTopContentInset:"):
                v._setTopContentInset_(0)
    except Exception:
        log("insets", traceback.format_exc())


def webview_loaded(win):
    """첫 페이지를 불러온 뒤(웹 보기가 창 내용이 된 뒤) 부른다."""
    if sys.platform != "darwin":
        return
    try:
        from PyObjCTools import AppHelper  # type: ignore
        def run():
            if win.native is not None:
                fix_insets(win.native)
        AppHelper.callAfter(run)
    except Exception:
        log("loaded", traceback.format_exc())


def set_background(win, css_color):
    """창 바탕색을 웹 화면 바탕색과 맞춘다(창 크기가 바뀌는 순간 드러나는 빈 곳의 색)."""
    if sys.platform != "darwin" or win is None:
        return False
    try:
        m = re.fullmatch(r"#([0-9a-fA-F]{6})", str(css_color).strip())
        if not m:
            return False
        v = int(m.group(1), 16)
        r, g, b = ((v >> 16) & 255) / 255.0, ((v >> 8) & 255) / 255.0, (v & 255) / 255.0
        import AppKit  # type: ignore
        from PyObjCTools import AppHelper  # type: ignore

        def run():
            w = win.native
            if w is None:
                return
            col = AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(r, g, b, 1.0)
            w.setBackgroundColor_(col)
            cv = w.contentView()
            if cv is not None and cv.respondsToSelector_("setUnderPageBackgroundColor:"):
                cv.setUnderPageBackgroundColor_(col)
        AppHelper.callAfter(run)
        return True
    except Exception:
        log("bg", traceback.format_exc())
        return False


def style_window(win):
    """창이 뜬 뒤 부른다. 제목 표시줄을 투명하게 하고 내용을 창 맨 위까지 올린다.
    신호등 단추 위치는 patch_webview()에서 바꾼 창 틀(NDThemeFrame)이 정한다."""
    if sys.platform != "darwin":
        return
    try:
        import AppKit  # type: ignore
        from PyObjCTools import AppHelper  # type: ignore
    except Exception:
        log("style import failed")
        return

    def apply():
        try:
            w = win.native
            if w is None:
                return
            w.setStyleMask_(w.styleMask() | AppKit.NSWindowStyleMaskFullSizeContentView)
            w.setTitlebarAppearsTransparent_(True)
            w.setTitleVisibility_(AppKit.NSWindowTitleHidden)
            cv = w.contentView()
            frame_view = cv.superview() if cv is not None else None
            if frame_view is not None:
                log("frame view", frame_view.className())
                for sv in frame_view.subviews():
                    if sv is cv:
                        continue
                    if "Titlebar" in str(sv.className()) and sv.respondsToSelector_("setBackgroundColor:"):
                        sv.setBackgroundColor_(AppKit.NSColor.clearColor())
            fix_insets(w)
            nc = AppKit.NSNotificationCenter.defaultCenter()
            q = AppKit.NSOperationQueue.mainQueue()
            # 전체 화면에서는 신호등 단추가 없으므로 상단 막대 왼쪽 여백을 없앤다
            for name, fs in (("NSWindowWillEnterFullScreenNotification", True),
                             ("NSWindowWillExitFullScreenNotification", False)):
                _keep.append(nc.addObserverForName_object_queue_usingBlock_(
                    name, w, q, lambda note, fs=fs: tell_js(w, "window.ND_setFullscreen && ND_setFullscreen(%s)" % ("true" if fs else "false"))))
            # 실행하자마자 첫 클릭이 창 활성화에만 쓰이지 않도록 앞으로 가져온다
            AppKit.NSApplication.sharedApplication().activateIgnoringOtherApps_(True)
            w.makeKeyAndOrderFront_(None)
            fix_about_menu()
            log("window styled")
        except Exception:
            log("style", traceback.format_exc())

    AppHelper.callAfter(apply)
