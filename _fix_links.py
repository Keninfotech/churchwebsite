import os

def fix_links(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace href="/..." with href="./..."
                # but we need to ensure we don't double replace if we run it again
                if 'href="/' in content:
                    new_content = content.replace('href="/', 'href="./')
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed {file_path}")

if __name__ == '__main__':
    fix_links('.')
