import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'public', 'screenshots');

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/campaigns/1');
  await page.waitForLoadState('networkidle');

  // Scroll to the API section and screenshot just that card
  const apiCard = page.locator('text=Add Contacts via API').locator('..').locator('..');
  await apiCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await apiCard.screenshot({ path: path.join(screenshotDir, '07-api-contacts.png') });
  console.log('✓ 07-api-contacts.png');

  // Also take a full-page shot showing the updated view
  await page.screenshot({ path: path.join(screenshotDir, '06-contacts-uploaded.png'), fullPage: true });
  console.log('✓ 06-contacts-uploaded.png (updated full page)');

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
