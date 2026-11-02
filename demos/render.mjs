#!/usr/bin/env node
// 사용: node demos/render.mjs [scene ...] [--theme light|dark|both] [--fps 12] [--scale 1.5] [--colors 96] [--at 3.2,12]
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../assets/demos");
const FRAMES = path.join(here, ".frames");
const FFMPEG = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const CHROME = process.env.CHROME_PATH || path.join(homedir(), ".cache/puppeteer/chrome/mac_arm-155.0.8059.84/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const ALL = ["hero", "simulate", "review", "writing", "a11y", "dark-patterns", "spec", "flow", "metrics", "research", "ai"];

const args = process.argv.slice(2);
const opt = { theme: "both", fps: 12, scale: 1.5, colors: 96, at: null };
const scenes = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (!(k in opt)) throw new Error(`알 수 없는 옵션: ${a}`);
    opt[k] = args[++i];
  } else scenes.push(a);
}
opt.fps = Number(opt.fps); opt.scale = Number(opt.scale); opt.colors = Number(opt.colors);
if (!["light", "dark", "both"].includes(opt.theme)) throw new Error("--theme은 light|dark|both");
if (!existsSync(CHROME)) throw new Error(`Chrome을 찾을 수 없어요: ${CHROME} (CHROME_PATH로 지정)`);
const targets = scenes.length ? scenes : ALL; // social-preview.png는 render-reel.mjs가 만든다
const themes = opt.theme === "both" ? ["light", "dark"] : [opt.theme];
mkdirSync(OUT, { recursive: true });

const url = (scene, theme) => pathToFileURL(path.join(here, "scenes", `${scene}.html`)).href + `?theme=${theme}`;

async function open(browser, scene, theme, scale) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => { throw e; });
  await page.goto(url(scene, theme));
  const { width, height } = await page.evaluate(() => ({ width: DEMO.width, height: DEMO.height }));
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.evaluate(() => document.fonts.ready);
  return { page, width, height };
}

const rows = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, timeout: 120000 });
try {
  for (const scene of targets) {
    for (const theme of themes) {
      const { page, width, height } = await open(browser, scene, theme, opt.scale);
      const dir = path.join(FRAMES, `${scene}-${theme}`);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      if (opt.at) {
        for (const s of String(opt.at).split(",")) {
          await page.evaluate((t) => DEMO.render(t), Number(s) * 1000);
          await page.screenshot({ path: path.join(dir, `at-${s}.png`) });
        }
        await page.close();
        console.log(`${scene}-${theme}: ${dir}/at-*.png`);
        continue;
      }
      const duration = await page.evaluate(() => DEMO.duration);
      const n = Math.round(duration / 1000 * opt.fps);
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => DEMO.render(t), i * 1000 / opt.fps);
        await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, "0")}.png`) });
      }
      await page.close();
      const pattern = path.join(dir, "f%04d.png");
      const palette = path.join(dir, "palette.png");
      const gif = path.join(OUT, `${scene}-${theme}.gif`);
      execFileSync(FFMPEG, ["-y", "-v", "error", "-framerate", String(opt.fps), "-i", pattern, "-vf", `palettegen=stats_mode=diff:max_colors=${opt.colors}`, palette]);
      execFileSync(FFMPEG, ["-y", "-v", "error", "-framerate", String(opt.fps), "-i", pattern, "-i", palette, "-lavfi", "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle", "-loop", "0", gif]);
      rows.push({ scene, theme, frames: n, px: `${Math.round(width * opt.scale)}x${Math.round(height * opt.scale)}`, mb: statSync(gif).size / 1048576 });
    }
  }
} finally {
  await browser.close();
}

if (rows.length) {
  console.log("\n| 장면 | 테마 | 프레임 | 픽셀 | 크기(MB) | 예산 |");
  console.log("| --- | --- | ---: | --- | ---: | --- |");
  for (const r of rows) {
    const budget = r.scene === "hero" ? 2.5 : 1.5;
    const ok = r.mb <= budget ? "OK" : `초과(>${budget})`;
    console.log(`| ${r.scene} | ${r.theme} | ${r.frames} | ${r.px} | ${r.mb.toFixed(2)} | ${ok} |`);
  }
}
