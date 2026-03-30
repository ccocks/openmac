const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { spawn } = require('child_process');
const path = require('path');

chromium.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function startRecording(outputPath, durationSec) {
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'avfoundation',
    '-capture_cursor', '1',
    '-capture_mouse_clicks', '1',
    '-i', '0:',
    '-t', String(durationSec),
    '-r', '24',
    '-vf', 'scale=1280:-2',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', (d) => {
    process.stderr.write(d.toString());
  });

  ffmpeg.on('error', (err) => {
    console.error('ffmpeg error:', err.message);
  });

  return ffmpeg;
}

(async () => {
  const RECORD_SECONDS = 200;
  const outDir = __dirname;

  console.log(`Starting ${RECORD_SECONDS}s screen recording...`);
  const ffmpeg = startRecording(path.join(outDir, 'recording.mp4'), RECORD_SECONDS);
  await sleep(1000);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    geolocation: { latitude: 40.7128, longitude: -74.006 },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    window.chrome = { runtime: {} };
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  });

  const page = await context.newPage();

  await page.goto('https://chat.qwen.ai', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  await sleep(randomBetween(1500, 2500));
  await page.mouse.move(randomBetween(200, 600), randomBetween(150, 450));
  await sleep(randomBetween(300, 700));
  await page.mouse.move(randomBetween(400, 800), randomBetween(250, 550));
  await sleep(randomBetween(500, 1000));
  await page.evaluate(() => window.scrollTo(0, Math.floor(Math.random() * 150) + 50));
  await sleep(randomBetween(500, 800));
  await page.mouse.move(randomBetween(100, 900), randomBetween(300, 600));
  await sleep(randomBetween(1000, 2000));

  await page.screenshot({
    path: path.join(outDir, 'screenshot.png'),
    fullPage: false,
  });
  console.log('Screenshot saved to screenshot.png');
  await sleep(200000)
  await browser.close();

  await new Promise((resolve) => {
    ffmpeg.on('close', resolve);
    if (ffmpeg.exitCode !== null) resolve();
  });

  console.log('Recording saved to recording.mp4');
})();
