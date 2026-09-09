#!/usr/bin/env python3
"""
compress_images.py

Walks through every image in the folder this script is placed in (and all
subfolders), and compresses each image IN PLACE:
  - same filename
  - same file extension / image type
  - same location
  - no duplicate files created
  - if the "compressed" result is not actually smaller than the original,
    the original is kept untouched (compression is rejected)

Prints a per-file report with the compression percentage, and a summary
at the end.

Requirements:
    pip install Pillow

Usage:
    Place this file in your website's root folder, then run:
    python3 compress_images.py

    Optional flags:
    --dry-run     Show what would happen without changing any files
    --quality N   JPEG/WEBP quality, 1-95 (default 82)
"""

import argparse
import os
import shutil
import sys
import tempfile

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit(
        "Pillow is not installed. Install it first with:\n"
        "    pip install Pillow\n"
    )

# Extensions this script knows how to re-compress.
SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"}

# Don't touch the script itself or common non-image junk.
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def compress_image(path, quality):
    """
    Compress a single image in place.
    Returns (original_size, new_size, status) where status is one of:
    'compressed', 'kept_original' (compression didn't help), 'error'
    """
    ext = os.path.splitext(path)[1].lower()
    original_size = os.path.getsize(path)

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext, dir=os.path.dirname(path))
    os.close(tmp_fd)

    try:
        with Image.open(path) as img:
            # Respect EXIF orientation, then drop metadata to save space.
            img = ImageOps.exif_transpose(img)

            save_kwargs = {}

            if ext in (".jpg", ".jpeg"):
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                save_kwargs = dict(format="JPEG", quality=quality,
                                    optimize=True, progressive=True)

            elif ext == ".png":
                save_kwargs = dict(format="PNG", optimize=True)

            elif ext == ".webp":
                save_kwargs = dict(format="WEBP", quality=quality, method=6)

            elif ext == ".gif":
                # Preserve animation if present.
                save_kwargs = dict(format="GIF", optimize=True,
                                    save_all=True)

            elif ext == ".bmp":
                save_kwargs = dict(format="BMP")

            elif ext in (".tif", ".tiff"):
                save_kwargs = dict(format="TIFF", compression="tiff_lzw")

            else:
                os.remove(tmp_path)
                return original_size, original_size, "skipped"

            img.save(tmp_path, **save_kwargs)

        new_size = os.path.getsize(tmp_path)

        if new_size > 0 and new_size < original_size:
            shutil.move(tmp_path, path)
            return original_size, new_size, "compressed"
        else:
            os.remove(tmp_path)
            return original_size, original_size, "kept_original"

    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return original_size, original_size, f"error: {e}"


def main():
    parser = argparse.ArgumentParser(description="Compress images in place.")
    parser.add_argument("--dry-run", action="store_true",
                         help="List files that would be processed, no changes made")
    parser.add_argument("--quality", type=int, default=82,
                         help="JPEG/WEBP quality 1-95 (default: 82)")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(script_dir, "assets")

    if not os.path.isdir(root):
        sys.exit(f"No 'assets' folder found at: {root}")

    total_before = 0
    total_after = 0
    compressed_count = 0
    kept_count = 0
    error_count = 0

    print(f"Scanning: {root}\n")

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTS:
                continue

            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root)

            if args.dry_run:
                print(f"[dry-run] would process: {rel_path}")
                continue

            before, after, status = compress_image(full_path, args.quality)
            total_before += before

            if status == "compressed":
                total_after += after
                compressed_count += 1
                pct = (1 - after / before) * 100 if before else 0
                print(f"[OK]      {rel_path}: {human(before)} -> {human(after)} "
                      f"(-{pct:.1f}%)")
            elif status == "kept_original":
                total_after += before
                kept_count += 1
                print(f"[SKIP]    {rel_path}: already optimal, original kept "
                      f"({human(before)})")
            elif status == "skipped":
                total_after += before
                print(f"[SKIP]    {rel_path}: unsupported format")
            else:
                total_after += before
                error_count += 1
                print(f"[ERROR]   {rel_path}: {status}")

    if args.dry_run:
        return

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Files compressed : {compressed_count}")
    print(f"Files kept as-is : {kept_count}")
    print(f"Errors           : {error_count}")
    print(f"Total before     : {human(total_before)}")
    print(f"Total after      : {human(total_after)}")
    if total_before:
        overall_pct = (1 - total_after / total_before) * 100
        print(f"Overall savings  : {overall_pct:.1f}%")


if __name__ == "__main__":
    main()
