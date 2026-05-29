const fs = require('fs');
const content = fs.readFileSync('c:/Users/김윤환/Desktop/antigravity workspace/인사프로그램/src/pages/PayrollManagement.jsx', 'utf8');

let openDivs = 0;
let closeDivs = 0;

const openMatches = content.match(/<div/g) || [];
const closeMatches = content.match(/<\/div>/g) || [];

console.log(`Total <div: ${openMatches.length}`);
console.log(`Total </div>: ${closeMatches.length}`);

// Let's also check { } balance again but strictly
let braceCount = 0;
for (let char of content) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
}
console.log(`Final brace count: ${braceCount}`);
