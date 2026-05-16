const fs = require('fs');
let content = fs.readFileSync('app/api/news/route.js', 'utf8');
// Find and fix only the Financial Services section
const lines = content.split('\n');
const out = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Detect the duplicate block - second occurrence of bad queries line
  if (line.includes("'Financial Services'") && i > 0 && lines.slice(0,i).some(l => l.includes("'Financial Services'"))) {
    // Skip this duplicate block until the closing }
    skip = true;
  }
  // Also fix the broken line with "] instead of ']
  if (line.includes('Sensex Nifty"]')) {
    out.push(line.replace('Sensex Nifty"]', "Sensex Nifty']"));
    skip = false;
    continue;
  }
  if (skip) {
    if (line.trim() === '},') { skip = false; }
    continue;
  }
  out.push(line);
}
fs.writeFileSync('app/api/news/route.js', out.join('\n'), 'utf8');
console.log('Fixed. Lines:', out.length);
