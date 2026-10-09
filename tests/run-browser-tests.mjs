// Drives tests/harness/shell.html with Playwright at two viewports
// (1280px desktop bar, 390px wrapped bar) and fails the process unless
// EVERY stage reports "ALL N CHECKS PASSED" with no console/page/network
// error observed. Usage:
//   node run-browser-tests.mjs <url> [screenshot-on-failure.png]

import { chromium } from 'playwright';
import { dirname, basename, join } from 'path';

const target = process.argv[2];
const screenshotPath = process.argv[3];

if (!target) {
	console.error('usage: node run-browser-tests.mjs <url> [screenshot.png]');
	process.exit(2);
}

const STAGES = [
	{ name: 'desktop', width: 1280, height: 900 },
	{ name: 'narrow', width: 390, height: 844 }
];

const browser = await chromium.launch({
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});

let exitCode = 0;

for (const stage of STAGES) {
	const context = await browser.newContext({
		viewport: { width: stage.width, height: stage.height }
	});
	const page = await context.newPage();

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

	console.log(`\n=== stage ${stage.name} ${stage.width}x${stage.height} ===`);
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
			console.error(`\n--- ${stage.name} failure details ---`);
			for (const e of errors)
				console.error(e);
			if (screenshotPath) {
				const dot = basename(screenshotPath).lastIndexOf('.');
				const name = dot > 0 ? basename(screenshotPath).slice(0, dot) : basename(screenshotPath);
				const ext = dot > 0 ? basename(screenshotPath).slice(dot) : '.png';
				const out = join(dirname(screenshotPath), `${name}-${stage.name}${ext}`);
				await page.screenshot({ path: out, fullPage: true });
				console.error('screenshot written: ' + out);
			}
		}
	} catch (e) {
		exitCode = 1;
		console.error(`runner error (${stage.name}):`, e);
		if (screenshotPath) {
			try {
				const dot = basename(screenshotPath).lastIndexOf('.');
				const name = dot > 0 ? basename(screenshotPath).slice(0, dot) : basename(screenshotPath);
				const ext = dot > 0 ? basename(screenshotPath).slice(dot) : '.png';
				await page.screenshot({
					path: join(dirname(screenshotPath), `${name}-${stage.name}${ext}`),
					fullPage: true
				});
			} catch { /* screenshot best-effort */ }
		}
	}

	await context.close();
}

await browser.close();
process.exit(exitCode);
