#!/usr/bin/env python3
"""
optimize_images.py

Converts every JPG/PNG that the site actually references into a resized,
compressed WebP next to the original, then points the HTML/CSS/JS at the WebP.

    python optimize_images.py            # convert + rewrite references
    python optimize_images.py --dry-run  # only report what would change

- Originals are left untouched on disk (delete them yourself once you are happy).
- Images are resized so the longest side is at most MAX_PORTRAIT px for people
  photos (they are shown as small cards), MAX_HERO px for hero backgrounds and
  MAX_DEFAULT px for everything else.
- An image is skipped if the WebP would not be at least 10% smaller.
- Safe to re-run: already-converted references point at .webp and are ignored.

Requires: pip install Pillow
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

ROOT = Path(__file__).resolve().parent
QUALITY = 80
MAX_DEFAULT = 1920
MAX_PORTRAIT = 720
MAX_HERO = 2560  # full-width hero backgrounds stay sharp on 2560px+ screens
HERO_DIRS = ("assets/hero section images/",)
# Folders that hold head-shot style photos shown at card size
PORTRAIT_DIRS = ("assets/OLS/", "assets/Parish Council/", "assets/Images/", "assets/Catechism/",
                 "assets/Constrction Committee/", "assets/Obituaries/", "assets/Church heirarchy/")
SOURCE_GLOBS = ["*.html", "*/index.html", "assets/*.css", "assets/*.js", "partials/*.html"]
# src="..."  href="..."  url(...)  '...jpg'
REF = re.compile(r"""(?P<q>")(?P<u>[^"<>]*?\.(?:jpe?g|png))(?P<e>")"""
                 r"""|(?P<q2>')(?P<u2>[^'"<>]*?\.(?:jpe?g|png))(?P<e2>')"""
                 r"""|(?P<q3>`)(?P<u3>[^`"'<>]*?\.(?:jpe?g|png))(?P<e3>`)"""
                 r"""|(?P<q4>url\()(?P<u4>[^"'()<>]*?\.(?:jpe?g|png))(?P<e4>\))""", re.I)


MANIFEST = ROOT / "assets" / "webp-manifest.json"  # source -> webp this script generated


def target_for(src: Path, manifest: dict) -> Path:
    rel = src.relative_to(ROOT).as_posix()
    if rel in manifest:
        return ROOT / manifest[rel]
    out = src.with_suffix(".webp")
    if out.exists() or out.relative_to(ROOT).as_posix() in manifest.values():
        # a different image already uses that name, e.g. St.Alphonsa.jpg + St.Alphonsa.webp
        out = src.with_name(src.stem + "." + src.suffix.lstrip(".").lower() + ".webp")
    return out


def convert(src: Path, dst: Path, dry: bool):
    rel = src.relative_to(ROOT).as_posix()
    limit = MAX_PORTRAIT if rel.startswith(PORTRAIT_DIRS) else MAX_HERO if rel.startswith(HERO_DIRS) else MAX_DEFAULT
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)  # keep phone photos the right way up
        if max(im.size) > limit:
            im.thumbnail((limit, limit), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "transparency" in im.info or im.mode in ("LA", "P") else "RGB")
        if dry:
            return True
        tmp = dst.with_suffix(".tmp.webp")
        im.save(tmp, "WEBP", quality=QUALITY, method=6)
    if tmp.stat().st_size > src.stat().st_size * 0.9:
        tmp.unlink()
        return False
    os.replace(tmp, dst)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted({p for g in SOURCE_GLOBS for p in ROOT.glob(g)})
    mapping, before, after = {}, 0, 0
    manifest = json.loads(MANIFEST.read_text(encoding="utf8")) if MANIFEST.exists() else {}

    for f in files:
        with open(f, encoding="utf8", newline="") as fh:
            text = fh.read()
        base = f.parent if f.suffix == ".html" else ROOT / "assets"

        def repl(m):
            nonlocal before, after
            k = next(n for n in ("", "2", "3", "4") if m.group("u" + n) is not None)
            q, u, e = m.group("q" + k), m.group("u" + k), m.group("e" + k)
            if re.match(r"(https?:|data:|//)", u) or "${" in u:
                return m.group(0)
            src = (base / urllib.parse.unquote(u)).resolve()
            if not src.is_file() or ROOT not in src.parents:
                return m.group(0)
            if src not in mapping:
                dst = target_for(src, manifest)
                rel = src.relative_to(ROOT).as_posix()
                ok = rel in manifest and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime
                if not ok:
                    ok = convert(src, dst, args.dry_run)
                    if ok and not args.dry_run:
                        manifest[rel] = dst.relative_to(ROOT).as_posix()
                mapping[src] = dst if ok else None
                if ok and args.dry_run:
                    print(f"{src.stat().st_size // 1024:>6}K -> (convert)  {dst.relative_to(ROOT)}")
                elif ok and dst.exists():
                    before += src.stat().st_size
                    after += dst.stat().st_size
                    print(f"{src.stat().st_size // 1024:>6}K -> {dst.stat().st_size // 1024:>4}K  {dst.relative_to(ROOT)}")
            dst = mapping[src]
            if not dst:
                return m.group(0)
            prefix = u.rsplit("/", 1)[0] + "/" if "/" in u else ""
            new_u = prefix + (urllib.parse.quote(dst.name) if "%" in u else dst.name)
            return q + new_u + e

        new = REF.sub(repl, text)
        if new != text and not args.dry_run:
            with open(f, "w", encoding="utf8", newline="") as fh:
                fh.write(new)
            print(f"rewrote references in {f.relative_to(ROOT)}")

    if not args.dry_run:
        MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=True), encoding="utf8")
    print(f"\nTotal: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
