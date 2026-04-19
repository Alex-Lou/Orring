"""
Clean white fringes out of greeting icons, auto-crop to the visible glyph,
and fit tightly inside a 128x128 transparent canvas.

Why flood-fill from the edges instead of stripping every white pixel?
— A pure-white strip might exist *inside* the icon (a moon's face, a sun's
  highlight, the glare on the sunset clouds). Killing every white pixel
  destroys those details. By only clearing white pixels that are connected
  to the edge of the image, we safely remove the background + anti-aliasing
  fringe while preserving any white that lives *inside* the shape.

Input: list of file names in the assets folder. Each file is overwritten in
place with its cleaned, tightly-cropped 128x128 RGBA version.
"""
from __future__ import annotations

import os
import sys
from collections import deque
from PIL import Image


ASSETS_DIR = r"C:\Users\34643\Desktop\Brol\OrrniApp\assets"

# Files to clean. All end up as 128x128 RGBA PNGs with transparent backgrounds
# and the glyph tight to the edges.
FILES = [
    "MorningIconNoBg.png",
    "SunIcon.png",
    "SunCoucher.png",
    "NightModeLogo.png",
]


def flood_clear_edge_white(img: Image.Image, white_thresh: int = 232) -> None:
    """Make every near-white pixel that is reachable from the image border
    (via 4-connected neighbours) transparent. Modifies `img` in place."""
    w, h = img.size
    px = img.load()

    def near_white(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r >= white_thresh and g >= white_thresh and b >= white_thresh

    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        idx = y * w + x
        if not visited[idx] and near_white(x, y):
            visited[idx] = 1
            queue.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and near_white(nx, ny):
                    visited[idx] = 1
                    queue.append((nx, ny))


def feather_alpha_edges(img: Image.Image, near_white_thresh: int = 215) -> None:
    """Soften any remaining off-white anti-aliasing ring that survived the
    flood-fill (pixels that were not pure enough to be "near white" but still
    look pale). We scale their alpha down proportionally to how pale they
    are, giving a cleaner silhouette without a hard cut."""
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            m = min(r, g, b)
            if m >= near_white_thresh:
                # Map m ∈ [near_white_thresh, 255] → keep ∈ [1, 0]
                keep = 1.0 - (m - near_white_thresh) / (255 - near_white_thresh)
                px[x, y] = (r, g, b, max(0, int(a * keep)))


def process(path: str, out_size: int = 128) -> None:
    img = Image.open(path).convert("RGBA")

    flood_clear_edge_white(img)
    feather_alpha_edges(img)

    # Crop to the opaque bounding box — removes any leftover transparent
    # margins so the glyph can fill the 128x128 frame as tightly as possible.
    bbox = img.getbbox()
    if bbox is None:
        raise RuntimeError(f"Image {path} is fully transparent after cleaning")
    img = img.crop(bbox)

    # Fit the cropped glyph inside `out_size` preserving aspect.
    img.thumbnail((out_size, out_size), Image.LANCZOS)

    canvas = Image.new("RGBA", (out_size, out_size), (0, 0, 0, 0))
    cx = (out_size - img.width) // 2
    cy = (out_size - img.height) // 2
    canvas.paste(img, (cx, cy), img)
    canvas.save(path, "PNG", optimize=True)


def main() -> int:
    for name in FILES:
        src = os.path.join(ASSETS_DIR, name)
        if not os.path.isfile(src):
            print(f"SKIP  {name} (not found)")
            continue
        process(src)
        w, h = Image.open(src).size
        print(f"OK    {name}  -> {w}x{h}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
