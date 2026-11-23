"""
Regenerates src/app/favicon.ico from the ACADNEX icon geometry.

Requires Pillow:  python scripts/generate-favicon.py
The source of truth for the brand mark is public/brand/acadnex-icon.svg;
this script mirrors it at 16/32/48px for legacy browser tabs.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "app" / "favicon.ico"

NAVY = (13, 20, 38, 255)
BLUE = (37, 99, 235, 255)
CYAN = (34, 211, 238, 255)
WHITE = (241, 245, 249, 255)


def render(size: int) -> Image.Image:
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def box(x0, y0, x1, y1):
        return (x0 * s / 64, y0 * s / 64, x1 * s / 64, y1 * s / 64)

    d.rounded_rectangle(box(0, 0, 64, 64), radius=14 * s / 64, fill=NAVY)
    d.rounded_rectangle(box(13, 36, 21, 51), radius=2.5 * s / 64, fill=BLUE)
    d.rounded_rectangle(box(27, 28, 35, 51), radius=2.5 * s / 64, fill=BLUE)
    d.rounded_rectangle(box(41, 18, 49, 51), radius=2.5 * s / 64, fill=CYAN)
    d.line([(14 * s / 64, 41 * s / 64), (28 * s / 64, 31 * s / 64),
            (43 * s / 64, 21 * s / 64), (52 * s / 64, 10 * s / 64)],
           fill=CYAN, width=max(1, round(2.75 * s / 64)), joint="curve")
    for cx, cy, r, color in ((28, 31, 2.6, WHITE), (52, 10, 3.6, CYAN)):
        d.ellipse(box(cx - r, cy - r, cx + r, cy + r), fill=color)

    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 32, 48]
    render(sizes[-1]).save(
        OUT,
        format="ICO",
        sizes=[(n, n) for n in sizes],
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
