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
const CHROME =
  process.env.CHROME_PATH ||
  path.join(
    homedir(),
    ".cache/puppeteer/chrome/mac_arm-155.0.8059.84/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  );
const ALL = [
  "hero",
  "simulate",
  "review",
  "writing",
  "a11y",
  "dark-patterns",
  "spec",
  "flow",
  "metrics",
  "research",
  "ai",
];

const args = process.argv.slice(2);
const opt = { theme: "both", fps: 12, scale: null, colors: null, at: null };
// 장면마다 다른 기본값: spec·ai는 예산(600KB)에 맞추려고 색 수를 낮추고, hero는 예산(1.5MB)에 맞추려고 배율과 색 수를 낮추고, 0번 프레임을 시작 틀로 둔다.
const DEFAULTS = { hero: { scale: 1.25, colors: 64, fromEnd: false }, spec: { colors: 64 }, ai: { colors: 64 } };
// 장면 GIF는 끝 상태(고친 후)에서 시작한다. 정지 화면으로 보는 사용자에게도 결과가 보이게 하려는 것이다.
const fromEndOf = (scene) => DEFAULTS[scene]?.fromEnd ?? true;
const scaleOf = (scene) => (opt.scale ? Number(opt.scale) : (DEFAULTS[scene]?.scale ?? 1.5));
const colorsOf = (scene) => (opt.colors ? Number(opt.colors) : (DEFAULTS[scene]?.colors ?? 96));
const scenes = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (!(k in opt)) throw new Error(`알 수 없는 옵션: ${a}`);
    opt[k] = args[++i];
  } else scenes.push(a);
}
opt.fps = Number(opt.fps);
if (!["light", "dark", "both"].includes(opt.theme)) throw new Error("--theme은 light|dark|both");
if (!existsSync(CHROME)) throw new Error(`Chrome을 찾을 수 없어요: ${CHROME} (CHROME_PATH로 지정)`);
const targets = scenes.length ? scenes : ALL;
const themes = opt.theme === "both" ? ["light", "dark"] : [opt.theme];
mkdirSync(OUT, { recursive: true });

const url = (scene, theme) => pathToFileURL(path.join(here, "scenes", `${scene}.html`)).href + `?theme=${theme}`;

async function open(browser, scene, theme, scale) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => {
    throw e;
  });
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
      const { page, width, height } = await open(browser, scene, theme, scaleOf(scene));
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
      const { duration, end } = await page.evaluate(() => ({ duration: DEMO.duration, end: DEMO.end }));
      const n = Math.round((duration / 1000) * opt.fps);
      const offset = fromEndOf(scene) ? end : 0; // 끝 상태에서 시작해 유지 → 교차 페이드 → 처음부터 재생한 뒤 다시 끝 상태로 이어진다.
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => DEMO.render(t), (offset + (i * 1000) / opt.fps) % duration);
        await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, "0")}.png`) });
      }
      await page.close();
      const pattern = path.join(dir, "f%04d.png");
      const palette = path.join(dir, "palette.png");
      const gif = path.join(OUT, `${scene}-${theme}.gif`);
      execFileSync(FFMPEG, [
        "-y",
        "-v",
        "error",
        "-framerate",
        String(opt.fps),
        "-i",
        pattern,
        "-vf",
        `palettegen=stats_mode=diff:max_colors=${colorsOf(scene)}`,
        palette,
      ]);
      execFileSync(FFMPEG, [
        "-y",
        "-v",
        "error",
        "-framerate",
        String(opt.fps),
        "-i",
        pattern,
        "-i",
        palette,
        "-lavfi",
        "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
        "-loop",
        "0",
        gif,
      ]);
      rows.push({
        scene,
        theme,
        frames: n,
        px: `${Math.round(width * scaleOf(scene))}x${Math.round(height * scaleOf(scene))}`,
        mb: statSync(gif).size / 1048576,
      });
    }
  }
} finally {
  await browser.close();
}

if (rows.length) {
  console.log("\n| 장면 | 테마 | 프레임 | 픽셀 | 크기(MB) | 예산 |");
  console.log("| --- | --- | ---: | --- | ---: | --- |");
  for (const r of rows) {
    const budget = 1.5;
    const ok = r.mb <= budget ? "OK" : `초과(>${budget})`;
    console.log(`| ${r.scene} | ${r.theme} | ${r.frames} | ${r.px} | ${r.mb.toFixed(2)} | ${ok} |`);
  }
}
