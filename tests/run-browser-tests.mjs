// Drives tests/harness/index.html with Playwright and fails the process
// unless the harness reports "ALL N CHECKS PASSED" and no console/page/network
// error was observed. Usage:
//   node run-browser-tests.mjs <url> [screenshot-on-failure.png]

import { chromium } from 'playwright';

const target = process.argv[2];
const screenshotPath = process.argv[3];

if (!target) {
	console.error('usage: node run-browser-tests.mjs <url> [screenshot.png]');
	process.exit(2);
}

const browser = await chromium.launch({
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('console', (msg) => {
	if (msg.type() === 'error')
		errors.push('console.error: ' + msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + (err?.stack || String(err))));
page.on('requestfailed', (req) =>
	errors.push('requestfailed: ' + req.url() + ' ' + (req.failure()?.errorText || '')));
page.on('response', (res) => {
	if (res.status() >= 400 && !/favicon\.ico$/.test(res.url()))
		errors.push('http ' + res.status() + ': ' + res.url());
});

let exitCode = 0;
try {
	await page.goto(target, { waitUntil: 'load', timeout: 30000 });

	// The harness prepends an <h4> summary into #harness-log when finished.
	await page.waitForFunction(() => {
		const log = document.getElementById('harness-log');
		return !!log && !!log.querySelector('h4');
	}, { timeout: 30000, polling: 200 });
	await page.waitForTimeout(300);

	const report = await page.$eval('#harness-report', (el) => el.innerText);
	console.log(report);

	const allPassed = /^ALL \d+ CHECKS PASSED$/m.test(report) &&
		!/FAIL|HARNESS ERROR/.test(report);

	if (!allPassed || errors.length > 0) {
		exitCode = 1;
		console.error('\n--- failure details ---');
		for (const e of errors)
			console.error(e);
		if (screenshotPath) {
			await page.screenshot({ path: screenshotPath, fullPage: true });
			console.error('screenshot written: ' + screenshotPath);
		}
	}
} catch (e) {
	exitCode = 1;
	console.error('runner error:', e);
	if (screenshotPath) {
		try {
			await page.screenshot({ path: screenshotPath, fullPage: true }); }
		catch { /* screenshot best-effort */ }
	}
} finally {
	await browser.close();
}

process.exit(exitCode);
