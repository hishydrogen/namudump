"""배포용 .dmg 창의 배경 그림(build/dmg_background.tiff)을 그린다. PyObjC(AppKit)가 필요하다.

    "$HOME/Library/Application Support/NamuDump/venv/bin/python3" build/make_dmg_bg.py

창 크기와 아이콘 자리는 make_app.py의 DMG_* 값을 그대로 쓴다.
보통 화면용(1배)과 레티나용(2배) 그림을 그려 tiffutil로 한 파일에 묶는다.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import AppKit  # type: ignore

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_app import DMG_W, DMG_H, DMG_APP_X, DMG_LINK_X, DMG_ICON_Y, DMG_HINT_Y  # noqa: E402

HINT = "나무덤프를 응용 프로그램 폴더로 끌어다 놓으세요"
ICON_HALF = 64 + 18      # 아이콘 반지름(128의 절반)과 화살표 사이 여백


def rgb(r, g, b, a=1.0):
    return AppKit.NSColor.colorWithSRGBRed_green_blue_alpha_(r / 255, g / 255, b / 255, a)


def draw_text(s, y, size, weight, color):
    """위에서부터 잰 y에 가운데 맞춰 글을 쓴다(좌표를 뒤집어 두었으므로 글자만 다시 뒤집는다)."""
    para = AppKit.NSMutableParagraphStyle.alloc().init()
    para.setAlignment_(AppKit.NSTextAlignmentCenter)
    attrs = {
        AppKit.NSFontAttributeName: AppKit.NSFont.systemFontOfSize_weight_(size, weight),
        AppKit.NSForegroundColorAttributeName: color,
        AppKit.NSParagraphStyleAttributeName: para,
    }
    text = AppKit.NSAttributedString.alloc().initWithString_attributes_(s, attrs)
    AppKit.NSGraphicsContext.saveGraphicsState()
    t = AppKit.NSAffineTransform.transform()
    t.translateXBy_yBy_(0, y + size * 1.4)
    t.scaleXBy_yBy_(1, -1)
    t.concat()
    text.drawInRect_(AppKit.NSMakeRect(0, 0, DMG_W, size * 1.6))
    AppKit.NSGraphicsContext.restoreGraphicsState()


def draw_arrow():
    """앱 아이콘에서 응용 프로그램 폴더 쪽으로 가는 화살표."""
    x0, x1, y = DMG_APP_X + ICON_HALF, DMG_LINK_X - ICON_HALF, DMG_ICON_Y
    path = AppKit.NSBezierPath.bezierPath()
    path.setLineWidth_(3.5)
    path.setLineCapStyle_(AppKit.NSLineCapStyleRound)
    path.setLineJoinStyle_(AppKit.NSLineJoinStyleRound)
    path.moveToPoint_((x0, y))
    path.lineToPoint_((x1, y))
    path.moveToPoint_((x1 - 13, y - 13))
    path.lineToPoint_((x1, y))
    path.lineToPoint_((x1 - 13, y + 13))
    rgb(0, 164, 149, 0.55).setStroke()
    path.stroke()


def draw(scale, out):
    w, h = DMG_W * scale, DMG_H * scale
    rep = AppKit.NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel_(
        None, w, h, 8, 4, True, False, AppKit.NSDeviceRGBColorSpace, 0, 0)
    ctx = AppKit.NSGraphicsContext.graphicsContextWithBitmapImageRep_(rep)
    AppKit.NSGraphicsContext.saveGraphicsState()
    AppKit.NSGraphicsContext.setCurrentContext_(ctx)
    # 파인더 아이콘 자리와 같은 기준(왼쪽 위가 0)으로 그리도록 좌표를 뒤집는다
    tr = AppKit.NSAffineTransform.transform()
    tr.translateXBy_yBy_(0, h)
    tr.scaleXBy_yBy_(scale, -scale)
    tr.concat()

    # 바탕: 위는 흰색, 아래로 갈수록 아주 옅은 청록
    grad = AppKit.NSGradient.alloc().initWithStartingColor_endingColor_(rgb(255, 255, 255), rgb(232, 245, 243))
    grad.drawInRect_angle_(AppKit.NSMakeRect(0, 0, DMG_W, DMG_H), 90)
    draw_arrow()
    draw_text(HINT, DMG_HINT_Y, 13, AppKit.NSFontWeightMedium, rgb(96, 112, 110))

    AppKit.NSGraphicsContext.restoreGraphicsState()
    data = rep.representationUsingType_properties_(AppKit.NSBitmapImageFileTypePNG, {})
    data.writeToFile_atomically_(str(out), True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        one, two = Path(tmp) / "bg.png", Path(tmp) / "bg@2x.png"
        draw(1, one)
        draw(2, two)
        out = HERE / "dmg_background.tiff"
        subprocess.run(["tiffutil", "-cathidpicheck", str(one), str(two), "-out", str(out)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("만듦:", out)


if __name__ == "__main__":
    main()
