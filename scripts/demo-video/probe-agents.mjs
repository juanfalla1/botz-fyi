import { chromium } from "playwright";

const url = process.argv[2] || "https://www.botz.fyi/start/agents";
const outDir = "artifacts/demo-video";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (msg) => console.log(`[console:${msg.type()}] ${msg.text().slice(0, 300)}`));
page.on("pageerror", (err) => console.log(`[pageerror] ${err.message}`));
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: `${outDir}/probe-agents.png`, fullPage: false });
const text = await page.locator("body").innerText({ timeout: 10000 }).catch((e) => `ERR:${e.message}`);
console.log(text.slice(0, 5000));
await browser.close();
