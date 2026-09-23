const fs = require('fs');
const path = require('path');

const pagesDir = path.resolve(__dirname, '../frontend/src/pages');
const appTsx = fs.readFileSync(path.resolve(__dirname, '../frontend/src/App.tsx'), 'utf8');
const mainLayoutTsx = fs.readFileSync(path.resolve(__dirname, '../frontend/src/layout/MainLayout.tsx'), 'utf8');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
console.log('Total page files in frontend/src/pages:', files.length);

const unimportedInApp = [];
const importedInApp = [];

files.forEach(f => {
  const name = f.replace('.tsx', '');
  if (appTsx.includes(name)) {
    importedInApp.push(name);
  } else {
    unimportedInApp.push(name);
  }
});

console.log('\n--- 1. FILES IN PAGES BUT NOT IMPORTED IN APP.TSX ---');
console.log(JSON.stringify(unimportedInApp, null, 2));

console.log('\n--- 2. DETAILED CHECK OF IMPORTS VS ROUTES IN APP.TSX ---');
// Tìm các lazy imports
const lazyImportMatches = [...appTsx.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]\.\/pages\/([^'"]+)['"]\)/g)];
const importedPages = lazyImportMatches.map(m => ({ component: m[1], file: m[2] }));

const unroutedImports = [];
importedPages.forEach(p => {
  const compRegex = new RegExp(`<${p.component}[\\s/>]`);
  if (!compRegex.test(appTsx)) {
    unroutedImports.push(p);
  }
});
console.log('Imported in App.tsx but has NO Route element:', JSON.stringify(unroutedImports, null, 2));

console.log('\n--- 3. ALL ACTIVE ROUTES IN APP.TSX ---');
const routeMatches = [...appTsx.matchAll(/<Route\s+[^>]*path=["']([^"']+)["'][^>]*element={<([^/>\s]+)/g)];
const routes = routeMatches.map(m => ({ path: m[1], component: m[2] }));
console.log('Count of routes with element:', routes.length);

console.log('\n--- 4. MENU ITEMS IN MAINLAYOUT.TSX ---');
const menuMatches = [...mainLayoutTsx.matchAll(/key:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log('Total menu keys:', menuMatches.length);
console.log(JSON.stringify(menuMatches, null, 2));

console.log('\n--- 5. ROUTES MISSING FROM MAINLAYOUT MENU ---');
const menuKeySet = new Set(menuMatches.map(k => k.split('?')[0].replace(/^\//, '')));
const routesNotInMenu = routes.filter(r => {
  const clean = r.path.split('?')[0].replace(/^\//, '');
  if (clean === 'login' || clean === '*' || clean === '') return false;
  return !menuKeySet.has(clean);
});
console.log(JSON.stringify(routesNotInMenu, null, 2));
