const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[Browser Page Error] ${error.message}`);
    console.log(error.stack);
  });

  console.log('Navigating to http://localhost:5173...');
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('Page loaded.');
    // wait a bit for any react rendering errors
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.log(`Navigation error: ${err.message}`);
  }

  await browser.close();
})();
