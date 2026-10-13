"""
Compresses every .webp image in this folder and ALL its subfolders.

- Same file name, same location: each file is replaced by a smaller version
- Nothing is deleted, no folders are touched, other file types are ignored
- A file is replaced ONLY if the new version is actually smaller
- Safe to re-run: files already compressed by this script are skipped,
  so quality is not lowered again and again (see .compress_manifest.json)

Where to put this script: in the root of your assets folder.

Setup (once):   pip install pillow
Run:            python compress_webp.py
"""

import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

# ---- Settings you can change ----
QUALITY = 75        # 65 = smaller files, 80 = better quality
MAX_SIDE = None     # e.g. 1600 to also shrink huge images; None keeps the same dimensions
MIN_KB = 20         # files smaller than this are skipped (not worth it, protects tiny icons)
WORKERS = max(1, (os.cpu_count() or 2) - 1)
# ---------------------------------

MANIFEST_NAME = ".compress_manifest.json"


def compress(args):
    path_str, quality, max_side = args
    src = Path(path_str)
    tmp = src.with_name(src.name + ".tmp")
    try:
        before = src.stat().st_size
        with Image.open(src) as im:
            if getattr(im, "is_animated", False) and getattr(im, "n_frames", 1) > 1:
                return ("animated", path_str, before, before, "animated WebP left untouched")
            im.load()
            has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
            exif = im.info.get("exif")
            icc = im.info.get("icc_profile")
            if max_side and max(im.size) > max_side:
                im.thumbnail((max_side, max_side), Image.LANCZOS)
            im = im.convert("RGBA" if has_alpha else "RGB")
            kwargs = {"format": "WEBP", "quality": quality, "method": 6}
            if exif:
                kwargs["exif"] = exif
            if icc:
                kwargs["icc_profile"] = icc
            im.save(tmp, **kwargs)

        after = tmp.stat().st_size
        if after < before:
            os.replace(tmp, src)
            return ("ok", path_str, before, after, "")
        tmp.unlink()
        return ("not_smaller", path_str, before, before, "")
    except Exception as e:
        try:
            if tmp.exists():
                tmp.unlink()
        except Exception:
            pass
        return ("failed", path_str, 0, 0, str(e))


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024


def main():
    root = Path(__file__).resolve().parent
    manifest_path = root / MANIFEST_NAME
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        manifest = {}

    print(f"Working inside: {root}\n")

    todo = []
    already = small = 0
    total_before_all = 0
    for p in root.rglob("*"):
        if p.is_symlink() or not p.is_file() or p.suffix.lower() != ".webp":
            continue
        size = p.stat().st_size
        total_before_all += size
        key = p.relative_to(root).as_posix()
        if manifest.get(key) == size:
            already += 1
        elif size < MIN_KB * 1024:
            small += 1
        else:
            todo.append(p)

    print(f"WebP files found            : {already + small + len(todo)}  ({human(total_before_all)})")
    print(f"Already compressed (skipped): {already}")
    print(f"Too small (skipped)         : {small}")
    print(f"To compress now             : {len(todo)}")

    if not todo:
        print("\nNothing to do.")
        return 0

    print("\nFiles keep the same name and location. Nothing is deleted.")
    print("Each file is replaced by a smaller version of itself.")
    if input("Type YES to continue: ").strip() != "YES":
        print("Cancelled. Nothing was changed.")
        return 0

    jobs = [(str(p), QUALITY, MAX_SIDE) for p in todo]
    total = len(jobs)
    saved = 0
    counts = {"ok": 0, "not_smaller": 0, "animated": 0, "failed": 0}
    problems = []

    try:
        with ProcessPoolExecutor(max_workers=WORKERS) as pool:
            for i, (status, path, before, after, msg) in enumerate(pool.map(compress, jobs, chunksize=4), 1):
                counts[status] += 1
                key = Path(path).relative_to(root).as_posix()
                if status == "ok":
                    saved += before - after
                    manifest[key] = after
                elif status in ("not_smaller", "animated"):
                    manifest[key] = before  # don't retry these next time
                    if status == "animated":
                        problems.append(f"ANIMATED (left untouched): {path}")
                else:
                    problems.append(f"FAILED: {path} ({msg})")
                if i % 25 == 0 or i == total:
                    print(f"{i}/{total}  compressed={counts['ok']} already-optimal={counts['not_smaller']} failed={counts['failed']}  saved so far={human(saved)}")
    finally:
        try:
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        except Exception:
            pass

    if problems:
        log = root / "compress_log.txt"
        log.write_text("\n".join(problems), encoding="utf-8")
        print(f"\nSome files need attention. See: {log}")

    print(f"\nDone. Total space saved: {human(saved)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
