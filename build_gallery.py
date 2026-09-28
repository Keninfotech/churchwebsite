#!/usr/bin/env python3
"""
build_gallery.py

Builds the photo gallery from assets/OLS_Gallery/:

  assets/OLS_Gallery/<Section Gallery>/<photo>              -> single album
  assets/OLS_Gallery/<Section Gallery>/<Album>/<photo>      -> tabbed albums

For every photo it writes two WebP files into assets/gallery/:
  <section>/<album>/NN-t.webp   400x400 square thumbnail (shown in the grid)
  <section>/<album>/NN.webp     max 1600px full image (loaded only on click)

Then it rewrites the section bodies in gallery/index.html between the
`gallery:<slug>:start` / `gallery:<slug>:end` markers.

Usage:
    python build_gallery.py            # only (re)encode new/changed photos
    python build_gallery.py --force    # re-encode everything
"""

import argparse
import html
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow is required. Install it with:\n    pip install Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "assets" / "OLS_Gallery"
OUT = ROOT / "assets" / "gallery"
PAGE = ROOT / "gallery" / "index.html"

EXTS = {".jpg", ".jpeg", ".png", ".webp"}
THUMB = 400
FULL = 1600
THUMB_Q = 62
FULL_Q = 78

# Order the sections appear on the page (folder name -> markers slug)
SECTIONS = [
    "Parish Gallery",
    "Catechism Gallery",
    "Youth Ministry Gallery",
    "Mathruvedi Gallery",
    "Pithruvedi Gallery",
    "Vincent de Paul Gallery",
]


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def natural_key(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


def images_in(folder):
    return sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS), key=natural_key)


def encode(job):
    src, full, thumb, force = job
    if not force and full.exists() and thumb.exists() and full.stat().st_mtime >= src.stat().st_mtime:
        with Image.open(full) as im:
            return im.size
    full.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        big = im.copy()
        big.thumbnail((FULL, FULL), Image.LANCZOS)
        big.save(full, "WEBP", quality=FULL_Q, method=6)
        small = ImageOps.fit(im, (THUMB, THUMB), Image.LANCZOS, centering=(0.5, 0.4))
        small.save(thumb, "WEBP", quality=THUMB_Q, method=6)
        return big.size


def collect():
    """Returns [(section_name, [(album_name|None, [src paths])])]"""
    result = []
    for name in SECTIONS:
        folder = SRC / name
        if not folder.is_dir():
            print(f"  ! missing folder: {folder}")
            continue
        albums = []
        loose = images_in(folder)
        if loose:
            albums.append((None, loose))
        for sub in sorted((d for d in folder.iterdir() if d.is_dir()), key=natural_key):
            imgs = images_in(sub)
            if imgs:
                albums.append((sub.name, imgs))
        result.append((name, albums))
    return result


def grid_html(section, album, items, indent):
    label = album or section
    rows = [f'{indent}<div class="ols-grid" data-gallery>']
    for i, (full, thumb, (w, h)) in enumerate(items, 1):
        alt = html.escape(f"{label} – photo {i}")
        rows.append(
            f'{indent}  <button type="button" class="ols-grid__item" data-full="../{full}" data-w="{w}" data-h="{h}">'
            f'<img src="../{thumb}" alt="{alt}" width="{THUMB}" height="{THUMB}" loading="lazy" decoding="async"></button>'
        )
    rows.append(f"{indent}</div>")
    return "\n".join(rows)


def section_html(section, albums):
    ind = "    "
    if len(albums) == 1:
        album, items = albums[0]
        return grid_html(section, album, items, ind)
    sslug = slugify(section)
    out = [f'{ind}<div class="ols-albums" data-albums>', f'{ind}  <div class="ols-tabs" role="tablist" aria-label="{html.escape(section)} albums">']
    for i, (album, items) in enumerate(albums):
        aid = f"{sslug}-{slugify(album or 'photos')}"
        sel = ' aria-selected="true"' if i == 0 else ' aria-selected="false" tabindex="-1"'
        out.append(
            f'{ind}    <button type="button" role="tab" id="tab-{aid}" aria-controls="{aid}"{sel}>'
            f'{html.escape(album or "Photos")} <span>{len(items)}</span></button>'
        )
    out.append(f"{ind}  </div>")
    for i, (album, items) in enumerate(albums):
        aid = f"{sslug}-{slugify(album or 'photos')}"
        hidden = "" if i == 0 else " hidden"
        out.append(f'{ind}  <div class="ols-album" role="tabpanel" id="{aid}" aria-labelledby="tab-{aid}"{hidden}>')
        out.append(grid_html(section, album, items, ind + "    "))
        out.append(f"{ind}  </div>")
    out.append(f"{ind}</div>")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    data = collect()
    jobs, index = [], []
    for section, albums in data:
        for album, srcs in albums:
            base = OUT / slugify(section) / (slugify(album) if album else "")
            for n, src in enumerate(srcs, 1):
                full = base / f"{n:02d}.webp"
                thumb = base / f"{n:02d}-t.webp"
                jobs.append((src, full, thumb, args.force))
                index.append((full, thumb))

    print(f"Encoding {len(jobs)} photos...")
    with ProcessPoolExecutor() as ex:
        sizes = list(ex.map(encode, jobs, chunksize=4))

    rel = lambda p: p.relative_to(ROOT).as_posix()
    it = iter(zip(index, sizes))
    page = PAGE.read_text(encoding="utf-8")
    for section, albums in data:
        built = [(album, [(rel(f), rel(t), s) for (f, t), s in (next(it) for _ in srcs)]) for album, srcs in albums]
        slug = slugify(section)
        pat = re.compile(rf"(<!-- gallery:{slug}:start -->).*?(\n[ \t]*<!-- gallery:{slug}:end -->)", re.S)
        if not pat.search(page):
            print(f"  ! no markers for {slug} in {PAGE.name}")
            continue
        page = pat.sub(lambda m: m.group(1) + "\n" + section_html(section, built) + m.group(2), page)
    PAGE.write_text(page, encoding="utf-8")

    total = lambda pat: sum(p.stat().st_size for p in OUT.rglob(pat))
    print(f"Thumbnails: {total('*-t.webp') / 1e6:.1f} MB | all output: {total('*.webp') / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
