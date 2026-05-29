with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

open_count = content.count('{')
close_count = content.count('}')

print(f"Open: {open_count}, Close: {close_count}")
