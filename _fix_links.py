#!/usr/bin/env python3
"""
Convert root-absolute paths to relative paths for all HTML files.
Makes the site work on GitHub Pages, GoDaddy, Firebase, Netlify, Vercel,
Apache, Nginx, and local development without any code changes after deployment.

Usage: python _fix_links.py
Run from the project root: ols-parish-redesign-v3/
"""

import os
import re
import sys

# ─── Configuration ────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))

# All internal pages (slug -> depth).  depth=0 = root, depth=1 = one folder deep
PAGE_SLUGS = [
    "business-directory",
    "catechism",
    "catholic-mission-league",
    "construction-committee",
    "contact-us",
    "cri-electronics-city",
    "digital-media-committee",
    "donate-to-parish",
    "gallery",
    "holy-childhood",
    "laity-commission",
    "mathruvedi",
    "news-events",
    "obituaries",
    "our-church-hierarchy",
    "our-patroness",
    "parish-choir",
    "parish-council-2",
    "parish-history",
    "pithruvedi",
    "saints-in-syro-malabar-church",
    "vicars-message",
    "vincent-de-paul",
    "wards",
    "young-couples-apostolate",
    "youth-ministry",
]

# Assets that live at root level
ROOT_ASSETS = [
    "favicon.ico",
    "favicon.png",
    "logo.png",
    "jesus.mp4",
    "jesuscentre.jpeg",
]

# ─── Helper ───────────────────────────────────────────────────────────────────

def rel_prefix(depth: int) -> str:
    """Return the prefix to navigate to root from a given depth."""
    return "../" * depth if depth > 0 else "./"


def convert_html(filepath: str, depth: int) -> tuple[str, int]:
    """
    Read an HTML file, replace all root-absolute internal references with
    relative paths, and return (new_content, change_count).
    """
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    original = content
    prefix = rel_prefix(depth)
    changes = 0

    # ── 1. href="/" (root home link) ──────────────────────────────────────────
    # Match   href="/"  but NOT href="//..." (protocol-relative) or href="/some-page/"
    def replace_root_href(m):
        nonlocal changes
        # Only replace bare "/" — not paths
        if m.group(1) == "/":
            changes += 1
            return f'href="{prefix}"'
        return m.group(0)

    content = re.sub(r'href="(/)"', replace_root_href, content)

    # ── 2. href="/page-name/" internal page links ──────────────────────────────
    for slug in PAGE_SLUGS:
        pattern = re.compile(rf'href="/{re.escape(slug)}/"')
        new_val = f'href="{prefix}{slug}/"'
        count_before = len(pattern.findall(content))
        content = pattern.sub(new_val, content)
        changes += count_before

    # ── 3. Root-level assets (favicon, logo, video, etc.) ─────────────────────
    for asset in ROOT_ASSETS:
        # href or src attributes
        for attr in ["href", "src"]:
            pattern = re.compile(rf'{attr}="/{re.escape(asset)}"')
            new_val = f'{attr}="{prefix}{asset}"'
            count_before = len(pattern.findall(content))
            content = pattern.sub(new_val, content)
            changes += count_before

    # ── 4. /assets/ references ────────────────────────────────────────────────
    # e.g. href="/assets/redesign.css" or src="/assets/redesign.js"
    def replace_assets(m):
        nonlocal changes
        attr = m.group(1)
        rest = m.group(2)  # e.g. "redesign.css" or "redesign.js?v=2"
        changes += 1
        return f'{attr}="{prefix}assets/{rest}"'

    content = re.sub(r'(href|src)="/assets/([^"]+)"', replace_assets, content)

    return content, changes


def process_all():
    total_files = 0
    total_changes = 0
    errors = []

    # ── Process root index.html (depth 0) ─────────────────────────────────────
    root_index = os.path.join(ROOT, "index.html")
    if os.path.exists(root_index):
        new_content, n = convert_html(root_index, depth=0)
        with open(root_index, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)
        print(f"  [root] index.html  — {n} replacements")
        total_files += 1
        total_changes += n
    else:
        print("  [WARN] root index.html not found")

    # ── Process each page/index.html (depth 1) ────────────────────────────────
    for slug in PAGE_SLUGS:
        page_dir = os.path.join(ROOT, slug)
        page_file = os.path.join(page_dir, "index.html")
        if not os.path.exists(page_file):
            print(f"  [skip] {slug}/index.html  — not found")
            continue
        try:
            new_content, n = convert_html(page_file, depth=1)
            with open(page_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_content)
            print(f"  [ok]   {slug}/index.html  — {n} replacements")
            total_files += 1
            total_changes += n
        except Exception as e:
            errors.append((slug, str(e)))
            print(f"  [ERR]  {slug}/index.html  — {e}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print(f"Done. {total_files} files processed, {total_changes} link replacements.")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for slug, msg in errors:
            print(f"  {slug}: {msg}")
    return len(errors) == 0


if __name__ == "__main__":
    print(f"Root: {ROOT}")
    print("Converting root-absolute links to relative paths...\n")
    ok = process_all()
    sys.exit(0 if ok else 1)
