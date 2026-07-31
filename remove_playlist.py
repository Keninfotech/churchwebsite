import os
import glob
from bs4 import BeautifulSoup

def remove_playlist_sections():
    files = glob.glob('**/*.html', recursive=True)
    count = 0
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'Playlist' not in content:
            continue
            
        soup = BeautifulSoup(content, 'html.parser')
        modified = False
        
        # Find h2 tags with text 'Playlist'
        for h2 in soup.find_all('h2'):
            if 'Playlist' in h2.get_text():
                section = h2.find_parent('section')
                if section:
                    section.decompose()
                    modified = True
                else:
                    print(f'Warning: No parent section found for Playlist in {file}')
        
        if modified:
            # We want to preserve formatting as much as possible, 
            # but BeautifulSoup might alter it slightly. 
            # However, for HTML this is usually fine.
            with open(file, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print(f'Removed Playlist from {file}')
            count += 1
            
    print(f'Removed from {count} files.')

if __name__ == '__main__':
    remove_playlist_sections()
