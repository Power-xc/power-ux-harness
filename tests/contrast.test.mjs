import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'skills',
  'ux-a11y',
  'scripts',
  'contrast-from-pixels.mjs',
);
const dir = mkdtempSync(join(tmpdir(), 'uxh-contrast-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => (buf.reduce((c, b) => CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

function chunk(type, body) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([head, typed, crc]);
}

// colorAt(x, y) → [r, g, b] 로 그린 8비트 RGB PNG를 쓴다.
function png(name, width, height, colorAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(0);
    for (let x = 0; x < width; x++) rows.push(...colorAt(x, y));
  }
  const file = join(dir, name);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  writeFileSync(
    file,
    Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(Buffer.from(rows))),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
  return file;
}

// 96×48 캡처에 글자 획 대신 세로 막대 셋을 그린다.
const bars = (barWidth) => (x, y) => y >= 8 && y < 40 && [10, 40, 70].some((left) => x >= left && x < left + barWidth);

function measure(...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('흰 바탕의 검은 글자는 21:1로 PASS한다', () => {
  const file = png('black.png', 96, 48, (x, y) => (bars(8)(x, y) ? [0, 0, 0] : [255, 255, 255]));
  const { code, out } = measure(file);
  assert.equal(code, 0, out);
  assert.match(out, /글자색 {2}#000000/);
  assert.match(out, /21\.00:1 {2}기준 4\.5:1 {2}PASS/);
});

test('부모 opacity로 흐려진 글자는 렌더된 색으로 재서 FAIL한다', () => {
  const file = png('faded.png', 96, 48, (x, y) => (bars(8)(x, y) ? [128, 128, 128] : [255, 255, 255]));
  const { out } = measure(file);
  assert.match(out, /글자색 {2}#808080/);
  assert.match(out, /3\.94:1 {2}기준 4\.5:1 {2}FAIL/);
});

test('배경이 고르지 않으면 대비가 가장 낮은 칸의 배경으로 잰다', () => {
  const file = png('split.png', 96, 48, (x, y) =>
    bars(8)(x, y) ? [0, 0, 0] : x < 48 ? [255, 255, 255] : [187, 187, 187],
  );
  const { out } = measure(file);
  assert.match(out, /배경색 {2}#bbbbbb/);
  assert.match(out, /10\.93:1 .* PASS/);
});

test('어두운 바탕의 밝은 글자도 글자와 배경을 나눈다', () => {
  const file = png('light.png', 96, 48, (x, y) => (bars(8)(x, y) ? [255, 255, 255] : [51, 51, 51]));
  const { out } = measure(file);
  assert.match(out, /글자색 {2}#ffffff/);
  assert.match(out, /배경색 {2}#333333/);
});

test('획이 가장자리 폭보다 가늘면 배경에서 가장 먼 절반으로 글자색을 잡는다', () => {
  const file = png('thin.png', 96, 48, (x, y) => (bars(3)(x, y) ? [0, 0, 0] : [255, 255, 255]));
  const { out } = measure(file);
  assert.match(out, /가장 먼 절반/);
  assert.match(out, /21\.00:1/);
});

test('상자가 이미지 밖이면 사용법 오류로 끝난다', () => {
  const file = png('box.png', 96, 48, (x, y) => (bars(8)(x, y) ? [0, 0, 0] : [255, 255, 255]));
  const { code, out } = measure(file, '80', '0', '40', '48');
  assert.equal(code, 2);
  assert.match(out, /이미지\(96×48\) 밖/);
});
