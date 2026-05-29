import re

def check_tags(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find <div and </div
    opens = re.findall(r'<div', content)
    closes = re.findall(r'</div', content)
    
    print(f"Total <div: {len(opens)}, Total </div: {len(closes)}")

    # Check the problematic area around line 720
    lines = content.split('\n')
    stack = 0
    for i, line in enumerate(lines):
        line_num = i + 1
        o = line.count('<div')
        c = line.count('</div')
        stack += o
        stack -= c
        if line_num > 400 and line_num < 420:
             print(f"Line {line_num}: stack {stack} | {line.strip()}")
        if line_num > 715 and line_num < 735:
             print(f"Line {line_num}: stack {stack} | {line.strip()}")
        if line_num > 880:
             print(f"Line {line_num}: stack {stack} | {line.strip()}")

check_tags('src/pages/PayrollManagement.jsx')
