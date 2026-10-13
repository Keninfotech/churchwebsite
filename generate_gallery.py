#!/usr/bin/env python3
"""
generate_gallery.py
-------------------
Automated thumbnail generator and manifest updater for the OLS Church photo gallery.
Maintains the 6 distinct gallery sections:
  1. Parish Gallery (parish-gallery)
  2. Catechism Gallery (catechism-gallery)
  3. Youth Ministry Gallery (youth-ministry-gallery)
  4. Mathruvedi Gallery (mathruvedi-gallery)
  5. Pithruvedi Gallery (pithruvedi-gallery)
  6. Vincent de Paul Gallery (vincent-de-paul-gallery)

Folder structure:
  gallery/
  ├── full/
  │   └── <section-id>/
  │       └── <Album or Category Name>/
  │           └── <photos...>
  └── thumbs/
      └── <section-id>/
          └── <Album or Category Name>/
              └── <compressed webp thumbnails...>

Usage:
  py generate_gallery.py
"""

import os
import sys
import json
import re
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Error: Pillow (PIL) is not installed. Install it with: pip install Pillow")
    sys.exit(1)

ROOT_DIR = Path(__file__).resolve().parent
GALLERY_DIR = ROOT_DIR / "gallery"
FULL_DIR = GALLERY_DIR / "full"
THUMBS_DIR = GALLERY_DIR / "thumbs"
MANIFEST_FILE = GALLERY_DIR / "images.json"

IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".jfif"}
THUMB_MAX_SIZE = (480, 480)
THUMB_QUALITY = 65

SECTION_CONFIG = [
    {
        "id": "parish-gallery",
        "title": "Parish Gallery",
        "priority_albums": [
            "Parish Feast 25", "Parish Feast 24", "Parish Feast 23",
            "Onam 26", "Onam 25", "Onam 23",
            "Holy Week 26", "Holy Week 25", "Way of the Cross 25",
            "Fr. Riju B'day 25", "Parish Construction"
        ]
    },
    {
        "id": "catechism-gallery",
        "title": "Catechism Gallery",
        "priority_albums": [
            "Catechism Inauguration", "First Holy Communion",
            "Inauguration of Holychildhood", "Teachers Training"
        ]
    },
    {
        "id": "youth-ministry-gallery",
        "title": "Youth Ministry Gallery",
        "priority_albums": [
            "Christmas 24", "Easter 2025", "Youth Holy Week 25",
            "Youth Trip 26", "Smash 25", "Nest 26", "Nest 25",
            "Turnover 24", "Youth Activities", "Youth Meeting",
            "Good Friday 25", "Good Friday 24", "Maundy Thursday 25",
            "Monthly Rosary 25", "Oath Ceremony 2025", "Youth Onam", "Youth Onam 25",
            "Perunal 25", "Tug of War", "Vachanolsavam 25", "Youth Election 25",
            "Vehicle Blessing 25", "Xmas 24"
        ]
    },
    {
        "id": "mathruvedi-gallery",
        "title": "Mathruvedi Gallery",
        "priority_albums": ["Mathruvedi", "Women's Day 25"]
    },
    {
        "id": "pithruvedi-gallery",
        "title": "Pithruvedi Gallery",
        "priority_albums": ["Pithruvedi"]
    },
    {
        "id": "vincent-de-paul-gallery",
        "title": "Vincent de Paul Gallery",
        "priority_albums": ["Vincent de Paul"]
    }
]


def natural_sort_key(s: str):
    """Sort strings with numbers naturally (e.g. '2.webp' before '10.webp')."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r"(\d+)", s)]


def create_thumbnail(src_path: Path, dst_path: Path) -> bool:
    """Generate a compressed WebP thumbnail (approx 450-480px, quality 65)."""
    try:
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                pass
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.thumbnail(THUMB_MAX_SIZE, Image.Resampling.LANCZOS)
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(dst_path, "WEBP", quality=THUMB_QUALITY, method=4)
            return True
    except Exception as e:
        print(f"  [WARN] Failed thumbnail for {src_path.name}: {e}")
        return False


def main():
    if not FULL_DIR.exists():
        print(f"Error: Full images folder not found at {FULL_DIR}")
        sys.exit(1)

    print("==================================================")
    print(" OLS Church Photo Gallery Generator (6 Sections)")
    print("==================================================")
    print(f"Scanning: {FULL_DIR}")

    known_section_ids = [s["id"] for s in SECTION_CONFIG]
    all_section_dirs = [d for d in FULL_DIR.iterdir() if d.is_dir()]

    # Sort sections according to SECTION_CONFIG order, any new sections at the end
    def section_order(d: Path):
        try:
            return known_section_ids.index(d.name)
        except ValueError:
            return len(known_section_ids) + 10

    all_section_dirs.sort(key=section_order)

    manifest_sections = []
    total_images = 0
    new_thumbnails = 0
    skipped_thumbnails = 0

    for sec_dir in all_section_dirs:
        sec_id = sec_dir.name
        # Find config or generate default
        cfg = next((s for s in SECTION_CONFIG if s["id"] == sec_id), None)
        title = cfg["title"] if cfg else sec_id.replace("-", " ").title()
        priority_albums = cfg["priority_albums"] if cfg else []

        album_dirs = [d for d in sec_dir.iterdir() if d.is_dir()]

        # Sort albums: priority ones first, then alphabetical
        def album_order(d: Path):
            try:
                return (priority_albums.index(d.name), d.name.lower())
            except ValueError:
                return (len(priority_albums) + 10, d.name.lower())

        album_dirs.sort(key=album_order)

        sec_albums = {}
        for album_dir in album_dirs:
            album_name = album_dir.name
            thumb_album_dir = THUMBS_DIR / sec_id / album_name
            thumb_album_dir.mkdir(parents=True, exist_ok=True)

            images = [
                f.name
                for f in album_dir.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS and not f.name.startswith(".")
            ]

            if not images:
                continue

            images.sort(key=natural_sort_key)
            sec_albums[album_name] = images
            total_images += len(images)

            for filename in images:
                src = album_dir / filename
                dst = thumb_album_dir / filename

                if dst.exists() and dst.stat().st_size > 0:
                    skipped_thumbnails += 1
                else:
                    if create_thumbnail(src, dst):
                        new_thumbnails += 1

        if sec_albums:
            manifest_sections.append({
                "id": sec_id,
                "title": title,
                "albums": sec_albums
            })

    output_data = {"sections": manifest_sections}

    MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print("\n--------------------------------------------------")
    print(f"[OK] Done!")
    print(f"  - Sections: {len(manifest_sections)}")
    print(f"  - Total images: {total_images}")
    print(f"  - New thumbnails created: {new_thumbnails}")
    print(f"  - Existing thumbnails skipped: {skipped_thumbnails}")
    print(f"  - Manifest written to: {MANIFEST_FILE.relative_to(ROOT_DIR)}")
    print("==================================================")


if __name__ == "__main__":
    main()
