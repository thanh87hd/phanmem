const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
console.log(`Checking ${files.length} files...`);

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (/<Tabs\b/.test(content) || /\bTabs\./.test(content)) {
    const hasImport = /import\s+[^;]*\bTabs\b[^;]*from/.test(content) || /const\s+[^;]*\bTabs\b[^;]*=/.test(content);
    if (!hasImport) {
      console.log(`MISSING TABS IMPORT in: ${f}`);
    }
  }
}
console.log('Done checking.');
