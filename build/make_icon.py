"""앱 아이콘 원본(build/icon_1024.png)을 그린다. Pillow가 필요하다.

    python3 build/make_icon.py
    python3 build/make_app.py --icon     # 그린 그림으로 AppIcon.icns 다시 만들기

청록 바탕의 둥근 사각형 위에 펼친 책과 새싹을 흰색으로 그린다.
4배 크기로 그린 뒤 줄여서 가장자리를 매끄럽게 한다.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

S = 4                      # 4배로 그린 뒤 줄인다
N = 1024 * S
MARGIN = 100 * S           # macOS 아이콘 격자: 가운데 824, 둘레 약 100 여백
RADIUS = 185 * S
TOP, BOTTOM = (18, 196, 176), (4, 122, 110)   # 바탕 그라데이션(위, 아래)
WHITE = (255, 255, 255, 255)
OUT = Path(__file__).resolve().parent / "icon_1024.png"


def gradient():
    g = Image.new("RGBA", (N, N))
    d = ImageDraw.Draw(g)
    for y in range(0, N, S):
        t = y / N
        color = tuple(int(TOP[i] * (1 - t) + BOTTOM[i] * t) for i in range(3)) + (255,)
        d.rectangle([0, y, N, y + S], fill=color)
    return g


def body():
    """그라데이션을 채운 둥근 사각형과 위쪽의 은은한 광택."""
    mask = Image.new("L", (N, N), 0)
    ImageDraw.Draw(mask).rounded_rectangle([MARGIN, MARGIN, N - MARGIN, N - MARGIN], radius=RADIUS, fill=255)
    b = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    b.paste(gradient(), (0, 0), mask)
    shine = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(shine).ellipse([MARGIN - 200 * S, MARGIN - 560 * S, N - MARGIN + 200 * S, MARGIN + 330 * S],
                                  fill=(255, 255, 255, 38))
    b.alpha_composite(Image.composite(shine, Image.new("RGBA", (N, N), (0, 0, 0, 0)), mask))
    return b


def shadow():
    sh = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([MARGIN, MARGIN + 14 * S, N - MARGIN, N - MARGIN + 14 * S],
                                         radius=RADIUS, fill=(0, 0, 0, 90))
    return sh.filter(ImageFilter.GaussianBlur(18 * S))


def book_page(cx, by, side):
    """펼친 책의 한쪽 면. side는 -1(왼쪽) 또는 1(오른쪽)."""
    top, bottom = [], []
    for i in range(41):
        t = i / 40
        x = cx + side * (22 * S + t * 280 * S)
        top.append((x, by - 60 * S * math.sin(t * math.pi * 0.9) + t * 10 * S))
        bottom.append((x, by + 80 * S - 40 * S * math.sin(t * math.pi * 0.9) + t * 10 * S))
    return top + bottom[::-1]


def leaf(x0, y0, angle, length, width):
    """(x0, y0)에서 angle 방향으로 뻗는 잎. 한쪽은 볼록하고 다른 쪽은 조금만 볼록하다."""
    upper = [(i / 60 * length, math.sin(i / 60 * math.pi) * width) for i in range(61)]
    lower = [(i / 60 * length, -math.sin(i / 60 * math.pi) * width * 0.35) for i in range(61)]
    ca, sa = math.cos(angle), math.sin(angle)
    return [(x0 + x * ca - y * sa, y0 + x * sa + y * ca) for x, y in upper + lower[::-1]]


def main():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    img.alpha_composite(shadow())
    img.alpha_composite(body())
    d = ImageDraw.Draw(img)
    cx, by = N // 2, 640 * S
    for side in (-1, 1):
        d.polygon(book_page(cx, by, side), fill=WHITE)
    stem_top = by - 250 * S
    d.line([(cx, by - 40 * S), (cx, stem_top)], fill=WHITE, width=30 * S)
    d.polygon(leaf(cx, stem_top, math.radians(-38), 250 * S, 95 * S), fill=WHITE)
    d.polygon(leaf(cx, by - 180 * S, math.radians(-150), 200 * S, -80 * S), fill=WHITE)
    d.ellipse([cx - 15 * S, stem_top - 15 * S, cx + 15 * S, stem_top + 15 * S], fill=WHITE)
    img.resize((1024, 1024), Image.LANCZOS).save(OUT)
    print("만듦:", OUT)


if __name__ == "__main__":
    main()
