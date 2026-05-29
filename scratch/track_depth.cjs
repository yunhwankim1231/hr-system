const fs = require('fs');
const content = fs.readFileSync('c:/Users/김윤환/Desktop/antigravity workspace/인사프로그램/src/pages/PayrollManagement.jsx', 'utf8');

let depth = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let pos = 0;
    while (true) {
        let nextOpen = line.indexOf('<div', pos);
        let nextClose = line.indexOf('</div>', pos);

        if (nextOpen === -1 && nextClose === -1) break;

        if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose)) {
            depth++;
            pos = nextOpen + 4;
            // console.log(`Line ${i+1}: Open div, depth ${depth}`);
        } else {
            depth--;
            pos = nextClose + 6;
            // console.log(`Line ${i+1}: Close div, depth ${depth}`);
        }
    }
}
console.log(`Final depth: ${depth}`);
