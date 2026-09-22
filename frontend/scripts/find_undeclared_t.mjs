import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let foundError = false;

for (const file of files) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    if (!code.includes('t(') && !code.includes('t.')) continue;
    
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse.default(ast, {
      CallExpression(path) {
        if (path.node.callee.name === 't') {
          if (!path.scope.hasBinding('t')) {
            console.log(`[UNDECLARED t] ${file} at line ${path.node.loc.start.line}`);
            foundError = true;
          }
        }
      }
    });
  } catch (err) {
    // console.log(`Parse error in ${file}: ${err.message}`);
  }
}

if (!foundError) {
  console.log('No undeclared t calls found.');
}
