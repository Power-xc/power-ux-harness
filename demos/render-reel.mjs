#!/usr/bin/env node
// 홍보 미디어: 릴스 MP4, 릴스 표지 2안, 링크 공유 표지(social-preview.png)를 한 번에 다시 만든다.
// 사용: node demos/render-reel.mjs [--only reel|covers|social]
// 장면은 CSS 변환(벡터)으로 키워서 매 프레임 다시 렌더한다. 비트맵을 늘리지 않는다.
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, existsSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const MEDIA = path.join(ROOT, "media");
const FRAMES = path.join(here, ".frames", "reel");
const FFMPEG = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const CHROME = process.env.CHROME_PATH || path.join(homedir(), ".cache/puppeteer/chrome/mac_arm-155.0.8059.84/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "all";
if (!existsSync(CHROME)) throw new Error(`Chrome을 찾을 수 없어요: ${CHROME} (CHROME_PATH로 지정)`);
mkdirSync(MEDIA, { recursive: true });

const FPS = 30, W = 1080, H = 1920, DURATION = 34.5, SEAM_FRAMES = 9;
const WIN = { x: 60, y: 290, w: 960, h: 680 }; // 릴스 데모 영역
const ACCENT = "#4493f8";
const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const mapT = (kf, r) => {
  if (r <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) if (r <= kf[i][0]) return kf[i - 1][1] + (kf[i][1] - kf[i - 1][1]) * (r - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0]);
  return kf[kf.length - 1][1];
};
const K = 960 / 880;
const centered = (k, x = 0) => ({ k, x, y: 0 });

// 릴스 구간: 장면, 릴스 시각(초), 릴스→장면 시각 대응, 카메라(x,y는 장면 좌표의 왼쪽 위)
const SEGMENTS = [
  { scene: "simulate", from: 0, to: 14, kf: [[0, 0.1], [3, 1.9], [5.2, 3.3], [7.4, 4.7], [9.6, 8.0], [11.8, 9.5], [12, 9.7], [14, 9.7]],
    cam: (r) => ({ k: 1.5, x: 268 * ease((r - 7.2) / 1.0), y: 0 }) },
  { scene: "hero", from: 14, to: 21, kf: [[14, 1.0], [15.4, 2.8], [19.6, 9.2], [20.3, 9.9], [21, 10.5]], cam: () => centered(960 / 816, 32) },
  { scene: "review", from: 21, to: 22.75, kf: [[21, 3.6], [22.75, 5.6]], cam: () => centered(1.25, 36) },
  { scene: "a11y", from: 22.75, to: 24.5, kf: [[22.75, 0.6], [24.5, 2.4]], cam: () => centered(1.2, 50) },
  { scene: "dark-patterns", from: 24.5, to: 26.25, kf: [[24.5, 2.9], [26.25, 4.7]], cam: () => centered(1.2, 50) },
  { scene: "writing", from: 26.25, to: 28, kf: [[26.25, 4.4], [28, 6.3]], cam: () => centered(1.25, 36) },
  { scene: "reel-skills", from: 28, to: 34.5, kf: [[28, 0], [34.5, 6.5]], cam: () => centered(2) },
];
// 자막: 숫자는 같은 순간 화면의 숫자와 맞춘다. [..]는 강조색(한 가지)
const CAPTIONS = [
  [-1, 3, "기획서만 넣으면<br>[가상 사용자]가 먼저 써 봐요"],
  [3, 5.2, "자료부터 열어 [조사]하고"],
  [5.2, 7.4, "출처 붙은 페르소나 [4명]이"],
  [7.4, 9.6, "후보안 [3개]를 직접 써 보고"],
  [9.6, 12, "가장 [덜 막히는 안]을 추천해요"],
  [12, 14, "결과는 [가설] →<br>실제 사용자로 확인"],
  [14, 21, "설계부터 출시 전 점검까지<br>[9단계]로"],
  [21, 22.75, "삭제를 토스트로만?<br>→ [되돌리기]"],
  [22.75, 24.5, "터치 영역 [24px] 미만은<br>FAIL"],
  [24.5, 26.25, "해지가 가입보다 깊으면 [P1]"],
  [26.25, 28, "[무엇이·왜·어떻게]<br>고치는지"],
  [28, 31, "AI 코딩 에이전트에 바로 설치<br>스킬 [10개] · 무료 오픈소스"],
  [31, 34.5, "팔로우 + 댓글 [「링크」]<br>→ DM으로 보내드려요"],
];

const sceneUrl = (name, theme) => pathToFileURL(path.join(here, "scenes", `${name}.html`)).href + `?theme=${theme}`;
async function open(browser, name, theme, vw, vh) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => { throw e; });
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
  await page.goto(sceneUrl(name, theme));
  await page.evaluate(() => document.fonts.ready);
  return page;
}
// 장면 stage를 잘라 보여 주는 창으로 옮긴다
const prep = (page, win) => page.evaluate((win) => {
  DEMO.render(0);
  document.querySelectorAll(".snap").forEach((n) => n.remove());
  const stage = document.getElementById("stage");
  const el = document.createElement("div");
  el.id = "win";
  el.style.cssText = `position:absolute;left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;overflow:hidden`;
  document.body.appendChild(el); el.appendChild(stage);
  Object.assign(stage.style, { position: "absolute", left: "0", top: "0", transformOrigin: "0 0" });
  document.body.style.position = "relative";
  return { w: DEMO.width, h: DEMO.height };
}, win);
const place = (page, t, cam, win) => page.evaluate((t, cam, win) => {
  DEMO.render(t);
  const s = document.getElementById("stage"), sw = DEMO.width * cam.k, sh = DEMO.height * cam.k;
  const tx = -cam.x * cam.k + Math.max(0, (win.w - sw) / 2), ty = -cam.y * cam.k + Math.max(0, (win.h - sh) / 2);
  s.style.transform = `translate(${tx}px,${ty}px) scale(${cam.k})`;
}, t, cam, win);

// ---- 릴스 ----
async function reel(browser) {
  rmSync(FRAMES, { recursive: true, force: true }); mkdirSync(FRAMES, { recursive: true });
  const N = Math.round(DURATION * FPS);
  for (const seg of SEGMENTS) {
    const page = await open(browser, seg.scene, "dark", W, H);
    await prep(page, WIN);
    await page.evaluate((caps, accent) => {
      const css = document.createElement("style");
      css.textContent = `body{background:var(--bg)} .cap{position:absolute;left:0;top:0;width:960px;color:#fff;font:800 80px/1.25 "Pretendard Variable",Pretendard,sans-serif;letter-spacing:-0.02em;word-break:keep-all;opacity:0}
        .cap em{font-style:normal;color:${accent}} #wm{position:absolute;left:60px;top:1560px;font:500 24px/1.2 "Pretendard Variable",Pretendard,sans-serif;color:var(--muted);opacity:.55}`;
      document.head.appendChild(css);
      const box = document.createElement("div"); box.id = "caps"; box.style.cssText = "position:absolute;left:60px;top:1000px;width:960px";
      document.body.appendChild(box);
      const els = caps.map(([, , html]) => { const d = document.createElement("div"); d.className = "cap"; d.innerHTML = html.replace(/\[/g, "<em>").replace(/\]/g, "</em>"); box.appendChild(d); return d; });
      // 모든 자막이 2줄 안에 들어가는 가장 큰 크기(76~84px)로 통일
      let size = 84;
      for (; size >= 76; size -= 2) { els.forEach((e) => { e.style.opacity = 0; e.style.fontSize = size + "px"; e.style.visibility = "hidden"; });
        if (els.every((e) => e.getBoundingClientRect().height <= size * 1.25 * 2 + 2)) break; }
      if (size < 76) throw new Error("자막이 2줄에 들어가지 않아요");
      els.forEach((e) => { e.style.visibility = "visible"; });
      window.__capSize = size;
      const wm = document.createElement("div"); wm.id = "wm"; wm.textContent = "Power-xc"; document.body.appendChild(wm);
      window.__caps = els;
    }, CAPTIONS, ACCENT);
    const a = Math.round(seg.from * FPS), b = seg === SEGMENTS.at(-1) ? N : Math.round(seg.to * FPS);
    for (let i = a; i < b; i++) {
      const r = i / FPS;
      await place(page, mapT(seg.kf, r) * 1000, seg.cam(r), WIN);
      await page.evaluate((r, local, caps, first) => {
        document.getElementById("win").style.opacity = first ? 1 : (1 - Math.pow(1 - Math.min(1, local / 0.1), 3));
        caps.forEach(([s, e], k) => fade(window.__caps[k], r * 1000, s * 1000, 240, e * 1000 - 180));
      }, r, r - seg.from, CAPTIONS, seg === SEGMENTS[0]);
      await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(4, "0")}.png`) });
    }
    console.log(`reel ${seg.scene}: ${a}-${b - 1} (자막 ${await page.evaluate(() => window.__capSize)}px)`);
    await page.close();
  }
  // 반복 이음새: 마지막 0.3초를 첫 프레임으로 교차 페이드
  for (let j = 0; j < SEAM_FRAMES; j++) {
    const i = N - SEAM_FRAMES + j, p = ((j + 1) / (SEAM_FRAMES + 1)).toFixed(3);
    const f = path.join(FRAMES, `f${String(i).padStart(4, "0")}.png`), tmp = f + ".tmp.png";
    execFileSync(FFMPEG, ["-y", "-v", "error", "-i", f, "-i", path.join(FRAMES, "f0000.png"), "-filter_complex", `blend=all_expr='A*(1-${p})+B*${p}'`, "-frames:v", "1", tmp]);
    renameSync(tmp, f);
  }
  const out = path.join(MEDIA, "power-ux-harness-reel.mp4");
  execFileSync(FFMPEG, ["-y", "-v", "error", "-framerate", String(FPS), "-i", path.join(FRAMES, "f%04d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", "-movflags", "+faststart", out]);
  console.log(`reel: ${out} ${(statSync(out).size / 1048576).toFixed(2)}MB`);
}

// 손으로 그린 듯한 원(SVG 경로): 시드 고정으로 결정적
function handCircle(cx, cy, rx, ry, seed, sq = 0.6) {
  let s = seed;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a0 = -2.2, turn = Math.PI * 2 * 1.07, n = 72, ph = rnd() * 6;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + turn * u;
    const f = 0.97 + 0.07 * u + 0.025 * Math.sin(2 * a + ph) + 0.015 * (rnd() - 0.5);
    const sp = (v) => Math.sign(v) * Math.pow(Math.abs(v), sq); // 1보다 작은 지수: 모서리가 살아 있는 둥근 사각형
    pts.push(`${(cx + sp(Math.cos(a)) * rx * f).toFixed(1)} ${(cy + sp(Math.sin(a)) * ry * f * (1 + 0.04 * Math.sin(a + ph))).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

// ---- 표지: 시뮬레이션 결과 표를 높은 배율로 다시 렌더한 크롭 ----
async function cover(browser, name, titleHtml, circle) {
  const page = await open(browser, "simulate", "dark", W, H);
  const k = 1.5, x0 = 252, y0 = 0, win = { x: 60, y: 900, w: 960, h: 674 };
  await prep(page, win);
  await place(page, 9700, { k, x: x0, y: y0 }, win);
  const pageX = (sx) => win.x + (sx - x0) * k, pageY = (sy) => win.y + (sy - y0) * k;
  const d = handCircle(pageX(circle.cx), pageY(circle.cy), circle.rx * k, circle.ry * k, circle.seed, circle.sq);
  await page.evaluate((titleHtml, d, accent) => {
    const css = document.createElement("style");
    css.textContent = `body{background:var(--bg)} #t{position:absolute;left:60px;top:370px;width:960px;color:#fff;font:800 168px/1.12 "Pretendard Variable",Pretendard,sans-serif;letter-spacing:-0.03em;word-break:keep-all} #t em{font-style:normal;color:${accent}}`;
    document.head.appendChild(css);
    const t = document.createElement("div"); t.id = "t"; t.innerHTML = titleHtml.replace(/\[/g, "<em>").replace(/\]/g, "</em>"); document.body.appendChild(t);
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("width", "1080"); s.setAttribute("height", "1920"); s.style.cssText = "position:absolute;left:0;top:0";
    s.innerHTML = `<path d="${d}" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    document.body.appendChild(s);
  }, titleHtml, d, ACCENT);
  const out = path.join(MEDIA, `power-ux-harness-reel-cover-${name}.jpg`);
  await page.screenshot({ path: out, type: "jpeg", quality: 92 });
  await page.close();
  console.log(`cover ${name}: ${out} ${(statSync(out).size / 1024).toFixed(0)}KB`);
}

// ---- 링크 공유 표지 1280x640 (라이트) ----
async function social(browser) {
  const page = await open(browser, "simulate", "light", 1280, 640);
  const k = 1.6, win = { x: 700, y: 48, w: 528, h: 544 };
  await prep(page, win);
  await place(page, 9700, { k, x: 548, y: 0 }, win);
  await page.evaluate(() => {
    const css = document.createElement("style");
    css.textContent = `#t{position:absolute;left:72px;top:206px;font:800 68px/1.3 "Pretendard Variable",Pretendard,sans-serif;letter-spacing:-0.03em;color:var(--fg);word-break:keep-all} #l{position:absolute;left:72px;top:60px;font:500 20px/1.2 var(--mono);color:var(--muted)}`;
    document.head.appendChild(css);
    const t = document.createElement("div"); t.id = "t"; t.innerHTML = "가상 사용자 4명이<br>먼저 써 봤어요"; document.body.appendChild(t);
    const l = document.createElement("div"); l.id = "l"; l.textContent = "power-ux-harness"; document.body.appendChild(l);
  });
  const out = path.join(ROOT, "assets", "demos", "social-preview.png");
  await page.screenshot({ path: out });
  await page.close();
  console.log(`social: ${out} ${(statSync(out).size / 1024).toFixed(0)}KB`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, timeout: 120000 });
try {
  if (only === "all" || only === "social") await social(browser);
  if (only === "all" || only === "covers") {
    await cover(browser, "a", "기획서만<br>[넣었는데]", { cx: 736, cy: 150, rx: 54, ry: 154, seed: 7, sq: 0.7 }); // B안 열
    await cover(browser, "b", "가상 사용자<br>[4명]이 써 봄", { cx: 401, cy: 168, rx: 144, ry: 134, seed: 11, sq: 0.6 }); // P1~P4
  }
  if (only === "all" || only === "reel") await reel(browser);
} finally { await browser.close(); }
