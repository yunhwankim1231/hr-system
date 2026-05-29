with open('src/pages/PayrollManagement.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

open_count = content.count('{')
close_count = content.count('}')

print(f"Open: {open_count}, Close: {close_count}")

# Check specific sections
# return ( starts at line 407 approx
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'return (' in line:
        print(f"Return ( at line {i+1}")
    if 'export default function' in line:
        print(f"Function start at line {i+1}")
