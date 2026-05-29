const fs = require('fs');
const content = fs.readFileSync('c:/Users/김윤환/Desktop/antigravity workspace/인사프로그램/src/pages/PayrollManagement.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
    }
    // Check if component function or return block ends prematurely
    if (i > 400 && i < 870) {
       if (braceCount <= 1) { // 1 because it's inside the function
           // console.log(`Potential premature close at line ${i+1}: Braces ${braceCount}`);
       }
    }
}
console.log(`Final counts - Braces: ${braceCount}, Parens: ${parenCount}`);

// Let's find the line where return ( finishes
let returnStarted = false;
let returnParenCount = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('return (')) {
        returnStarted = true;
        returnParenCount = 0;
    }
    if (returnStarted) {
        for (let char of lines[i]) {
            if (char === '(') returnParenCount++;
            if (char === ')') returnParenCount--;
        }
        if (returnParenCount === 0) {
            console.log(`Return ( closed at line ${i + 1}`);
            returnStarted = false;
        }
    }
}
