#!/usr/bin/env node
// 렌더된 화면 캡처(PNG)의 글자 상자에서 글자색·배경색을 픽셀로 잡아 WCAG 대비를 잰다.
// 부모 opacity·그림·그라데이션처럼 DOM 계산값이 실제 색과 다른 글자에 쓴다. 의존성 없음.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const USAGE = `사용법: node contrast-from-pixels.mjs <캡처.png> [x y 너비 높이] [--large] [--edge N]

  x y 너비 높이  글자 상자(캡처 픽셀 기준 — CSS 상자 × devicePixelRatio). 없으면 이미지 전체
  --large        큰 글자 기준 3:1 (기본 4.5:1)
  --edge N       글자 획 가장자리에서 뺄 픽셀 수 (기본 2, 안티앨리어싱)`;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };
const MIN_CORE_PIXELS = 20;
const MIN_CELL_PIXELS = 20;
const CELL_SIZE = 24;
const NORMAL_RATIO = 4.5;
const LARGE_RATIO = 3;
const USAGE_ERROR_CODE = 2;

class UsageError extends Error {}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// 8비트 회색·RGB·알파 PNG(인터레이스 없음)를 RGB 배열로 푼다. 투명한 픽셀은 흰 바탕에 합성한다.
function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new UsageError("PNG 파일이 아니다");
  let offset = 8;
  let header = null;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], color: body[9] };
      if (body[12] !== 0) throw new UsageError("인터레이스 PNG는 지원하지 않는다 — 브라우저 캡처를 그대로 쓴다");
    }
    if (type === "IDAT") data.push(body);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  if (!header) throw new UsageError("PNG 머리(IHDR)가 없다");
  const channels = CHANNELS[header.color];
  if (header.depth !== 8 || !channels) throw new UsageError("8비트 회색·RGB·RGBA PNG만 지원한다");
  const raw = inflateSync(Buffer.concat(data));
  const stride = header.width * channels;
  const pixels = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      if (predictor === undefined) throw new UsageError(`알 수 없는 PNG 필터 ${filter}`);
      pixels[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  const rgb = new Uint8Array(header.width * header.height * 3);
  for (let i = 0; i < header.width * header.height; i++) {
    const p = pixels.subarray(i * channels, i * channels + channels);
    const [r, g, b] = channels >= 3 ? [p[0], p[1], p[2]] : [p[0], p[0], p[0]];
    const alpha = channels === 4 ? p[3] / 255 : channels === 2 ? p[1] / 255 : 1;
    rgb.set(
      [r, g, b].map((v) => Math.round(v * alpha + 255 * (1 - alpha))),
      i * 3,
    );
  }
  return { width: header.width, height: header.height, rgb };
}

// WCAG 2.2 상대 휘도
function luminance([r, g, b]) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const gray = ([r, g, b]) => Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

// 밝기 막대그래프를 둘로 나누는 문턱(Otsu)
function otsuThreshold(values) {
  const hist = new Array(256).fill(0);
  for (const v of values) hist[v]++;
  const total = values.length;
  const sumAll = hist.reduce((s, n, v) => s + n * v, 0);
  let [best, threshold, weightLow, sumLow] = [-1, 0, 0, 0];
  for (let t = 0; t < 256; t++) {
    weightLow += hist[t];
    if (weightLow === 0 || weightLow === total) continue;
    sumLow += t * hist[t];
    const meanLow = sumLow / weightLow;
    const meanHigh = (sumAll - sumLow) / (total - weightLow);
    const between = weightLow * (total - weightLow) * (meanLow - meanHigh) ** 2;
    if (between > best) [best, threshold] = [between, t];
  }
  return threshold;
}

function medianColor(colors) {
  const pick = (c) => {
    const sorted = colors.map((p) => p[c]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  return [pick(0), pick(1), pick(2)];
}

// 상자 안 픽셀을 글자(적은 쪽)와 배경으로 나눈 뒤, 글자색은 획 안쪽 중앙값, 배경은 대비가 가장 낮은 칸의 중앙값으로 잡는다.
function measureBox(image, box, edge = 2) {
  const { x, y, width, height } = box;
  if (width < 1 || height < 1 || x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
    throw new UsageError(`상자가 이미지(${image.width}×${image.height}) 밖이다`);
  }
  const color = (px, py) => {
    const i = ((y + py) * image.width + x + px) * 3;
    return [image.rgb[i], image.rgb[i + 1], image.rgb[i + 2]];
  };
  const grays = [];
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) grays.push(gray(color(px, py)));
  const threshold = otsuThreshold(grays);
  const darkCount = grays.filter((g) => g <= threshold).length;
  if (darkCount === 0 || darkCount === grays.length)
    throw new UsageError("상자 안이 한 가지 색이다 — 글자를 포함한 상자를 준다");
  const textIsDark = darkCount <= grays.length - darkCount;
  const isText = (px, py) => grays[py * width + px] <= threshold === textIsDark;
  const nearOther = (px, py, radius, wantText) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const [nx, ny] = [px + dx, py + dy];
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && isText(nx, ny) === wantText) return true;
      }
    }
    return false;
  };

  const textPixels = [];
  const core = [];
  const cells = new Map();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const c = color(px, py);
      if (isText(px, py)) {
        textPixels.push(c);
        if (!nearOther(px, py, edge, false)) core.push(c);
      } else if (!nearOther(px, py, edge, true)) {
        const key = `${Math.floor(px / CELL_SIZE)},${Math.floor(py / CELL_SIZE)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(c);
      }
    }
  }
  // 획이 가장자리 폭보다 가늘면 안쪽이 남지 않는다 — 배경에서 가장 먼 절반으로 대신한다.
  let textColor;
  let textMethod = `획 가장자리 ${edge}px를 뺀 안쪽 ${core.length}픽셀의 중앙값`;
  if (core.length >= MIN_CORE_PIXELS) textColor = medianColor(core);
  else {
    const sorted = [...textPixels].sort((a, b) => (textIsDark ? gray(a) - gray(b) : gray(b) - gray(a)));
    textColor = medianColor(sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2))));
    textMethod = `획이 가늘어 배경에서 가장 먼 절반(${Math.ceil(sorted.length / 2)}픽셀)의 중앙값`;
  }
  const backgrounds = [...cells.values()].filter((c) => c.length >= MIN_CELL_PIXELS).map(medianColor);
  if (backgrounds.length === 0) throw new UsageError("배경 픽셀이 모자란다 — 글자 둘레 여백을 포함한 상자를 준다");
  const worst = backgrounds.reduce((a, b) => (contrastRatio(textColor, a) <= contrastRatio(textColor, b) ? a : b));
  return {
    text: textColor,
    background: worst,
    ratio: contrastRatio(textColor, worst),
    textMethod,
    backgroundMethod: `글자에서 ${edge}px 떨어진 배경을 ${CELL_SIZE}px 칸 ${backgrounds.length}개로 나눠 대비가 가장 낮은 칸의 중앙값`,
  };
}

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
// WCAG는 반올림하지 않는다 — 4.499는 4.5가 아니다.
const floor2 = (n) => Math.floor(n * 100) / 100;

function parseArgs(argv) {
  const opts = { large: false, edge: 2, numbers: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--large") opts.large = true;
    else if (arg === "--edge") opts.edge = Number(argv[++i]);
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else if (!opts.file) opts.file = arg;
    else opts.numbers.push(Number(arg));
  }
  if (opts.help) return opts;
  if (!opts.file) throw new UsageError("캡처 파일이 필요하다");
  if (![0, 4].includes(opts.numbers.length) || opts.numbers.some((n) => !Number.isInteger(n))) {
    throw new UsageError("상자는 정수 네 개(x y 너비 높이)로 준다");
  }
  if (!Number.isInteger(opts.edge) || opts.edge < 0) throw new UsageError("--edge 는 0 이상의 정수다");
  return opts;
}

function run(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return console.log(USAGE);
  const image = decodePng(readFileSync(opts.file));
  const [x, y, width, height] = opts.numbers.length ? opts.numbers : [0, 0, image.width, image.height];
  const result = measureBox(image, { x, y, width, height }, opts.edge);
  const required = opts.large ? LARGE_RATIO : NORMAL_RATIO;
  const ratio = floor2(result.ratio);
  console.log(`글자색  ${hex(result.text)}  (${result.textMethod})`);
  console.log(`배경색  ${hex(result.background)}  (${result.backgroundMethod})`);
  console.log(`대비    ${ratio.toFixed(2)}:1  기준 ${required}:1  ${ratio >= required ? "PASS" : "FAIL"}`);
}

try {
  run(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(`오류: ${e.message}\n\n${USAGE}`);
  process.exit(USAGE_ERROR_CODE);
}
