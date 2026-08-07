import os

ROOT = r"c:\Users\Sunith K\Downloads\ols-parish-redesign-v3"
SUBPAGES = [
  'business-directory', 'construction-committee', 'contact-us', 'cri-electronics-city',
  'digital-media-committee', 'donate-to-parish', 'gallery', 
  'mass-timings', 'news-events', 'obituaries', 'our-church-hierarchy',
  'our-patroness', 'parish-choir', 'parish-council-2', 'parish-history',
  'saints-in-syro-malabar-church', 'vicars-message', 'wards',
  'young-couples-apostolate'
]

TOP_FILES = ['index.html', 'ministries_combined.html', 'catechism_cml_holychildhood_combined.html']

def update_file(filepath, is_subpage):
    if not os.path.exists(filepath):
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    logo_path = "../logo.png" if is_subpage else "./logo.png"
    
    target = '<h4>Our Lady of Sorrows</h4>'
    replacement = f'''<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
            <img src="{logo_path}" alt="OLS Logo" style="width: 50px; height: auto;">
            <h4 style="margin-bottom: 0;">Our Lady of Sorrows</h4>
          </div>'''
          
    if target in content and replacement not in content:
        content = content.replace(target, replacement)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for f in TOP_FILES:
    update_file(os.path.join(ROOT, f), False)

for sub in SUBPAGES:
    update_file(os.path.join(ROOT, sub, 'index.html'), True)
