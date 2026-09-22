import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function getAllFiles(dir, exts = ['.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(filePath))) {
      results.push(filePath);
    }
  }
  return results;
}

function modernizeFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf-8');
  let content = original;
  let modifications = [];

  // 1. Universal replace of bordered={false} -> variant="borderless"
  if (content.includes('bordered={false}')) {
    content = content.replace(/\bbordered=\{false\}/g, 'variant="borderless"');
    modifications.push('bordered={false} -> variant="borderless"');
  }

  // 2. Universal replace of bordered={true} -> variant="outlined"
  if (content.includes('bordered={true}')) {
    content = content.replace(/\bbordered=\{true\}/g, 'variant="outlined"');
    modifications.push('bordered={true} -> variant="outlined"');
  }

  // 3. <Card bordered ...> without boolean value -> <Card variant="outlined" ...>
  if (content.includes('<Card bordered ')) {
    content = content.replace(/<Card\s+bordered\s+/g, '<Card variant="outlined" ');
    modifications.push('<Card bordered> -> <Card variant="outlined">');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { filePath, modifications };
  }
  return null;
}

const files = getAllFiles(srcDir);
let changedCount = 0;
const results = [];

for (const file of files) {
  const res = modernizeFile(file);
  if (res) {
    changedCount++;
    results.push(res);
  }
}

console.log(`\n=== Second Pass Complete ===`);
console.log(`Files scanned: ${files.length}`);
console.log(`Files modified: ${changedCount}`);
results.forEach(r => {
  const relative = path.relative(srcDir, r.filePath);
  console.log(` - ${relative}: ${r.modifications.join(', ')}`);
});
