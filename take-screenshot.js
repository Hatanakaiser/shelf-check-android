import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function run() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('🌐 Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 本棚タブに移動して「＋ 作品追加」モーダルを開く
  console.log('📚 Navigating to Bookshelf tab...');
  await page.locator('button:has-text("本棚 (Kindle)")').click();
  await page.waitForTimeout(500);

  console.log('➕ Clicking "＋ 作品追加" button...');
  await page.locator('button:has-text("作品追加")').click();
  await page.waitForTimeout(500);

  // 手動タブで「ゆゆ式」(既に初期データにある作品)を入力して重複警告をトリガー
  console.log('✍️ Switching to manual tab & entering existing title "ゆゆ式"...');
  await page.locator('button:has-text("手動入力")').click();
  await page.waitForTimeout(300);

  const titleInput = page.locator('input[placeholder*="葬送のフリーレン"]');
  await titleInput.fill('ゆゆ式');
  await page.waitForTimeout(500);

  const artifactDir = 'C:\\Users\\hatan\\.gemini\\antigravity-cli\\brain\\58c8a22b-b57a-4caa-9820-b78295b0af39';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const screenshotPath = path.join(artifactDir, 'duplicate_warning_modal.png');
  console.log(`📸 Saving duplicate warning screenshot -> ${screenshotPath}`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('✅ Screenshot captured!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Error capturing screenshot:', err);
  process.exit(1);
});
