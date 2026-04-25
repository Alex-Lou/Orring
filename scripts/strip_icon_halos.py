"""Convert the drawer-icon PNGs' baked-in checkerboard background to real
alpha transparency.

The pastel icons in assets/iconesMetier/ were exported with a fake
"transparent background" — the file is actually 100% opaque and the
checkerboard pattern a designer sees behind the artwork is baked into the
pixels. Against the dark drawer theme this renders as a flat light-gray
square behind every icon (user: "les carrés blancs en fond").

We flood-fill from the four corners, treating any pixel that is both
(a) nearly-grayscale and (b) very light (RGB all > 240) as background.
The flood-fill is constrained to reachable-from-corner pixels so interior
whites (the person silhouette inside MonCycleIcone, the calendar body,
the gear core) survive untouched.

Running twice is a no-op once the background has been converted.
"""
from __future__ import annotations
import sys
from collections import deque
from pathlib import Path
from PIL import Image

ICON_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'iconesMetier'
BACKUP_DIR = ICON_DIR / '_halo_backup'
TARGETS = [
    'MonCycleIcone.png',
    'IconeCalendrier.png',
    'IconeHistorique.png',
    'ExplicationIcone.png',
    'ReglageIcone.png',
]

# Any light grayscale pixel is treated as background. The checkerboard
# squares are near-pure grayscale (237–254 across the 5 icons), but so
# are the SHADOW bands baked inside each icon (between the pastel ring
# and the white interior). Color alone can't distinguish the two — both
# are light neutral gray.
#
# So we additionally constrain the flood-fill geometrically: a pixel is
# only eligible if its Chebyshev distance to the nearest image edge is
# ≤ MAX_BORDER_DIST. That safely covers the outer shell (the true bg)
# while leaving the central artwork (>200px from every edge on a 1254px
# image) untouched.
LIGHT_CUT = 230
GRAY_TOL = 2
# The flood-fill accumulates a step-count (depth) as it winds around the
# outer bg shell. The outer bg is roughly 300px thick at its widest, so
# a depth cap of 360 easily lets the flood reach the ring on every side
# without having enough budget to wrap AROUND the ring and leak into the
# inner shadow (which would require depth ~ring_circumference/2 ≈ 1000+).
MAX_DEPTH = 360
# Second-pass "speckle cleanup": after the primary flood converts obvious
# grayscale-checker pixels to transparency, some PNG export noise remains
# as tinted-gray pixels (e.g. 232,229,228) that don't pass the strict is_bg
# filter but are clearly part of the background. We extend transparency
# into any neighbor of an already-transparent pixel whose RGB is light
# (all >= RELAXED_LIGHT_CUT). Because this only advances from existing
# transparency, it can't cross the pastel ring — no risk of reaching the
# interior artwork.
RELAXED_LIGHT_CUT = 200


def is_bg(r: int, g: int, b: int) -> bool:
    if r < LIGHT_CUT or g < LIGHT_CUT or b < LIGHT_CUT:
        return False
    return abs(r - g) <= GRAY_TOL and abs(g - b) <= GRAY_TOL and abs(r - b) <= GRAY_TOL


def strip(path: Path) -> tuple[int, int]:
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    px = img.load()
    visited = bytearray(w * h)  # 0/1 flags
    q: deque[tuple[int, int]] = deque()

    # Seed with every pixel along the 4 edges at depth 0.
    for x in range(w):
        q.append((x, 0, 0))
        q.append((x, h - 1, 0))
    for y in range(h):
        q.append((0, y, 0))
        q.append((w - 1, y, 0))

    zeroed = 0
    while q:
        x, y, depth = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        # Path-depth cap stops the flood before it has a chance to wind
        # all the way around the ring and leak into the interior shadow.
        if depth > MAX_DEPTH:
            continue
        idx = y * w + x
        if visited[idx]:
            continue
        r, g, b, a = px[x, y]
        if a == 0 or not is_bg(r, g, b):
            continue
        visited[idx] = 1
        px[x, y] = (0, 0, 0, 0)
        zeroed += 1
        nd = depth + 1
        q.append((x + 1, y, nd))
        q.append((x - 1, y, nd))
        q.append((x, y + 1, nd))
        q.append((x, y - 1, nd))

    # ── Second pass: speckle cleanup.
    # Re-seed from every already-transparent pixel and spread into any
    # adjacent opaque pixel that's generally "light" (any r,g,b >=
    # RELAXED_LIGHT_CUT). This cleans tinted-gray noise that didn't pass
    # the strict gray filter, without crossing the pastel ring (whose
    # pixels are below 200 in at least one channel).
    q2: deque[tuple[int, int]] = deque()
    for i in range(w * h):
        if visited[i]:
            q2.append((i % w, i // w))
    while q2:
        cx, cy = q2.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            nidx = ny * w + nx
            if visited[nidx]:
                continue
            r, g, b, a = px[nx, ny]
            if a == 0:
                visited[nidx] = 1
                continue
            # Light AND near-grayscale: the pastel ring's edge pixels
            # have wider RGB spread (e.g. 250,170,200) so they fail the
            # tol check and the flood stops — which is what we want to
            # preserve the artwork.
            if (
                r >= RELAXED_LIGHT_CUT
                and g >= RELAXED_LIGHT_CUT
                and b >= RELAXED_LIGHT_CUT
                and abs(r - g) <= 6
                and abs(g - b) <= 6
                and abs(r - b) <= 6
            ):
                visited[nidx] = 1
                px[nx, ny] = (0, 0, 0, 0)
                zeroed += 1
                q2.append((nx, ny))

    img.save(path, 'PNG', optimize=True)
    return zeroed, w * h


def main() -> int:
    BACKUP_DIR.mkdir(exist_ok=True)
    for name in TARGETS:
        src = ICON_DIR / name
        if not src.exists():
            print(f'[skip] {name}: not found')
            continue
        backup = BACKUP_DIR / name
        if not backup.exists():
            backup.write_bytes(src.read_bytes())
            print(f'[backup] {name} -> _halo_backup/')
        zeroed, total = strip(src)
        print(f'[strip] {name}: zeroed {zeroed}/{total} px ({zeroed / total * 100:.1f}%)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
