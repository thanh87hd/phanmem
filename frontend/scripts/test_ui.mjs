import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[Page Error] ${error.message}`);
    console.log(error.stack);
  });

  console.log('Navigating to http://localhost:5173...');
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('Page loaded.');
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.log(`Navigation error: ${err.message}`);
  }

  await browser.close();
})();
