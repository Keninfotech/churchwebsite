#!/usr/bin/env python3
"""
compress_assets.py

Recursively finds images inside an "assets" folder (anywhere under the
script's location) and compresses them in place.

Rules:
- If compression would make the file bigger (or exactly the same size),
  the original is kept untouched (skipped).
- Supports: .jpg, .jpeg, .png, .webp, .bmp, .tiff/.tif, .gif (static frame only)
- Prints per-file results and an overall summary at the end.

Requirements:
    pip install Pillow

Usage:
    python compress_assets.py
    python compress_assets.py --path /some/other/assets
    python compress_assets.py --quality 80
    python compress_assets.py --dry-run
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is required. Install it with:\n    pip install Pillow")
    sys.exit(1)

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif", ".gif"}


def human_size(num_bytes: float) -> str:
    """Convert bytes to a human readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f}{unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f}TB"


def find_assets_folders(root: Path):
    """Find every folder literally named 'assets' under root (case-insensitive),
    including root itself if it's named 'assets'."""
    found = []
    if root.name.lower() == "assets":
        found.append(root)
    for dirpath, dirnames, _ in os.walk(root):
        for d in dirnames:
            if d.lower() == "assets":
                found.append(Path(dirpath) / d)
    return found


def find_images(folder: Path):
    """Recursively yield all image files under folder."""
    for dirpath, _, filenames in os.walk(folder):
        for fname in filenames:
            ext = Path(fname).suffix.lower()
            if ext in SUPPORTED_EXTS:
                yield Path(dirpath) / fname


def compress_image(path: Path, quality: int, dry_run: bool):
    """
    Compress a single image in place if it results in a smaller file.
    Returns (status, original_size, new_size)
    status: "compressed" | "skipped_no_gain" | "error"
    """
    original_size = path.stat().st_size
    ext = path.suffix.lower()
    tmp_path = path.with_suffix(path.suffix + ".tmp")

    try:
        with Image.open(path) as img:
            img_format = img.format  # e.g. JPEG, PNG, WEBP, BMP, TIFF, GIF
            save_kwargs = {}

            if ext in (".jpg", ".jpeg"):
                # Ensure no alpha channel issues for JPEG
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                save_kwargs = {
                    "format": "JPEG",
                    "quality": quality,
                    "optimize": True,
                    "progressive": True,
                }
            elif ext == ".png":
                save_kwargs = {
                    "format": "PNG",
                    "optimize": True,
                }
            elif ext == ".webp":
                save_kwargs = {
                    "format": "WEBP",
                    "quality": quality,
                    "method": 6,
                }
            elif ext == ".bmp":
                # Convert BMP to PNG-style compression isn't valid for .bmp,
                # so just re-save with Pillow's own (limited) optimization.
                save_kwargs = {"format": "BMP"}
            elif ext in (".tiff", ".tif"):
                save_kwargs = {
                    "format": "TIFF",
                    "compression": "tiff_deflate",
                }
            elif ext == ".gif":
                save_kwargs = {
                    "format": "GIF",
                    "optimize": True,
                }
            else:
                return ("error", original_size, original_size)

            if dry_run:
                # Still need to know resulting size, so save to tmp anyway
                img.save(tmp_path, **save_kwargs)
            else:
                img.save(tmp_path, **save_kwargs)

        new_size = tmp_path.stat().st_size

        if new_size < original_size:
            if dry_run:
                tmp_path.unlink()
                return ("would_compress", original_size, new_size)
            else:
                os.replace(tmp_path, path)  # atomic overwrite
                return ("compressed", original_size, new_size)
        else:
            tmp_path.unlink()
            return ("skipped_no_gain", original_size, original_size)

    except Exception as e:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
        return ("error", original_size, original_size)


def main():
    parser = argparse.ArgumentParser(description="Recursively compress images in assets folders.")
    parser.add_argument(
        "--path",
        default=".",
        help="Root directory to search for 'assets' folders (default: current directory).",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=85,
        help="Quality for lossy formats like JPEG/WEBP (1-100, default: 85).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without modifying any files.",
    )
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(f"Path does not exist: {root}")
        sys.exit(1)

    assets_folders = find_assets_folders(root)
    if not assets_folders:
        print(f"No 'assets' folder found under: {root}")
        sys.exit(0)

    print(f"Found {len(assets_folders)} assets folder(s):")
    for f in assets_folders:
        print(f"  - {f}")
    print()

    all_images = []
    for folder in assets_folders:
        all_images.extend(find_images(folder))

    if not all_images:
        print("No supported image files found.")
        sys.exit(0)

    print(f"Scanning {len(all_images)} image file(s)...\n")

    compressed_count = 0
    skipped_count = 0
    error_count = 0
    total_original = 0
    total_new = 0
    results = []

    for img_path in sorted(all_images):
        status, orig_size, new_size = compress_image(img_path, args.quality, args.dry_run)
        rel_path = img_path.relative_to(root) if root in img_path.parents or img_path.parent == root else img_path

        if status in ("compressed", "would_compress"):
            saved = orig_size - new_size
            pct = (saved / orig_size * 100) if orig_size else 0
            verb = "Would compress" if status == "would_compress" else "Compressed"
            print(f"[OK] {verb}: {rel_path}")
            print(f"     {human_size(orig_size)} -> {human_size(new_size)}  (saved {human_size(saved)}, {pct:.1f}%)")
            compressed_count += 1
            total_original += orig_size
            total_new += new_size
        elif status == "skipped_no_gain":
            print(f"[--] Skipped (no size gain): {rel_path}")
            skipped_count += 1
            total_original += orig_size
            total_new += orig_size
        else:
            print(f"[!!] Error processing: {rel_path}")
            error_count += 1

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    action_word = "would be compressed" if args.dry_run else "compressed"
    print(f"Total images scanned:   {len(all_images)}")
    print(f"Images {action_word}:{' ' * max(1, 20 - len(action_word))}{compressed_count}")
    print(f"Images skipped (no gain): {skipped_count}")
    print(f"Errors:                 {error_count}")
    print(f"Total size before:      {human_size(total_original)}")
    print(f"Total size after:       {human_size(total_new)}")
    total_saved = total_original - total_new
    pct_saved = (total_saved / total_original * 100) if total_original else 0
    print(f"Total saved:            {human_size(total_saved)} ({pct_saved:.1f}%)")
    if args.dry_run:
        print("\n(Dry run - no files were actually modified.)")


if __name__ == "__main__":
    main()
