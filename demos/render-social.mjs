#!/usr/bin/env node
// 링크 공유 표지(assets/demos/social-preview.png, 1280×640 라이트)를 scenes/social.html에서 다시 만든다.
// 사용: node demos/render-social.mjs
import puppeteer from "puppeteer-core";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../assets/demos/social-preview.png");
const CHROME =
  process.env.CHROME_PATH ||
  path.join(
    homedir(),
    ".cache/puppeteer/chrome/mac_arm-155.0.8059.84/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  );
if (!existsSync(CHROME)) throw new Error(`Chrome을 찾을 수 없어요: ${CHROME} (CHROME_PATH로 지정)`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, timeout: 120000 });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto(pathToFileURL(path.join(here, "scenes", "social.html")).href + "?theme=light");
  await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT });
  console.log(`social: ${OUT} ${(statSync(OUT).size / 1024).toFixed(0)}KB`);
} finally {
  await browser.close();
}
