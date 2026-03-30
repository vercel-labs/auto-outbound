import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'public', 'screenshots');

const BASE = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. Campaigns list page
  await page.goto(`${BASE}/campaigns`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotDir, '01-campaigns-list.png') });
  console.log('✓ 01-campaigns-list.png');

  // 2. Click "New Campaign"
  await page.click('a[href="/campaigns/new"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotDir, '02-new-campaign-empty.png') });
  console.log('✓ 02-new-campaign-empty.png');

  // 3. Fill in campaign form for AWS re:Invent booth outreach
  await page.fill('#name', 'AWS re:Invent 2025 — Booth Visitors');
  await page.fill('#description', 'Follow up with contacts who visited our booth at AWS re:Invent');
  await page.fill('#systemPrompt', `You are writing a follow-up email to someone who visited our booth at AWS re:Invent 2025. They showed interest in our AI-powered developer tools.

Key talking points:
- Reference the specific conversation or demo they saw at our booth
- Highlight our new AI code review and deployment automation features
- Offer a personalized demo or free trial
- Keep the tone warm, concise, and technical — they are engineers and engineering leaders

Use the research context to personalize each email. Mention their company's tech stack or recent initiatives when relevant.`);

  // Enable both research checkboxes
  const companyResearch = page.locator('#researchEnabled');
  if (!(await companyResearch.isChecked())) {
    await companyResearch.check();
  }
  const peopleResearch = page.locator('#peopleResearchEnabled');
  if (!(await peopleResearch.isChecked())) {
    await peopleResearch.check();
  }

  // Set follow-ups to 2
  await page.selectOption('#numberOfFollowUps', '2');

  await page.screenshot({ path: path.join(screenshotDir, '03-campaign-form-filled.png'), fullPage: true });
  console.log('✓ 03-campaign-form-filled.png');

  // 4. Submit the form
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/campaigns\/\d+/);
  await page.waitForLoadState('networkidle');
  // Small extra wait for any client-side rendering
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotDir, '04-campaign-detail-empty.png'), fullPage: true });
  console.log('✓ 04-campaign-detail-empty.png');

  // Grab campaign URL for later
  const campaignUrl = page.url();
  const campaignId = campaignUrl.match(/\/campaigns\/(\d+)/)?.[1];
  console.log(`Campaign created with ID: ${campaignId}`);

  // 5. Upload CSV - find the file input and upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(path.join(__dirname, '..', 'example-contacts.csv'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(screenshotDir, '05-csv-preview.png'), fullPage: true });
  console.log('✓ 05-csv-preview.png');

  // 6. Click Upload button
  const uploadButton = page.getByRole('button', { name: /upload/i });
  await uploadButton.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '06-contacts-uploaded.png'), fullPage: true });
  console.log('✓ 06-contacts-uploaded.png');

  console.log('\nAll screenshots saved to public/screenshots/');
  console.log(`Campaign ID: ${campaignId}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
