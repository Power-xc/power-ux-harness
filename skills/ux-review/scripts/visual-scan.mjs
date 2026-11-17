#!/usr/bin/env node
// 코드에서 시각 디테일 단서(글자·색·배치·표면·접근성·문구)를 찾아 `파일:줄`로 낸다. 의존성 없음.
// 기준 문서는 규칙마다 doc 에 이름으로 적는다. 단서는 확정이 아니므로 맥락을 보고 판정한다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = `사용법: node visual-scan.mjs <파일·폴더…> [--level error|warn|info] [--json] [--rules]

  <파일·폴더…>  검사할 대상. 폴더는 재귀로 돈다(.css .scss .sass .less .html .htm .jsx .tsx .js .ts .mjs .cjs .vue .svelte .astro)
  --level       보여 줄 가장 낮은 등급 (기본 warn)
  --json        결과를 JSON 배열로 낸다
  --rules       규칙 표를 내고 끝낸다

  종료 코드: 0 오류 등급 없음 · 1 오류 등급 있음 · 2 사용법·파일 읽기 실패`;

const LEVELS = ["error", "warn", "info"];
const TARGET_EXTS = new Set([
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".jsx",
  ".tsx",
  ".js",
  ".ts",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".astro",
]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".svelte-kit",
  "coverage",
  "storybook-static",
  "vendor",
  "third_party",
]);
const SKIP_FILE = /(?:\.min\.[^.]+|\.map|\.d\.ts|\.snap)$/;
const COMPONENT_EXTS = [".tsx", ".jsx", ".vue", ".svelte"];
const STYLE_EXTS = [".css", ".scss", ".sass", ".less"];
const BLOCK_EXTS = [...STYLE_EXTS, ".vue", ".svelte", ".html", ".htm", ".astro"];
const STYLE_TAG_EXTS = new Set([".vue", ".svelte", ".html", ".htm", ".astro"]);
const SCREEN_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte", ".html"]);
const MAX_LINE_LENGTH = 2000;
const SNIPPET_LENGTH = 100;
const MIN_FONT_PX = 16;
const MIN_PRESS_SCALE = 0.96;
const MAX_SAFE_CHROMA = 0.2;
const USAGE_ERROR_CODE = 2;
const HANGUL = /[가-힣]/;
const GPU_PROPS = new Set(["transform", "translate", "scale", "rotate", "opacity", "filter", "auto"]);
const COLOR_NAMES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const HEX = "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b";
const COLOR_FN = "(?<![\\w-])(?:rgba?|hsla?|oklch|oklab)\\((?!\\s*var\\()";
const COLOR_LITERAL_COMPONENT = new RegExp(`(?<![&\\w])${HEX}|${COLOR_FN}`);
const COLOR_LITERAL_CSS = new RegExp(`${HEX}|${COLOR_FN}`, "i");

class UsageError extends Error {}

// ───────── CSS 블록 파서 ─────────

function stripInline(raw) {
  return raw
    .replace(/#\{[^}]*\}/g, "X")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/(?<![:\w])\/\/.*$/, "");
}

// 중괄호 깊이를 따라 { header, parent, own:[{line,text}], startLine } 목록을 만든다
function parseBlocks(cssLines) {
  const blocks = [];
  const stack = [];
  let seg = "";
  let segLine = -1;
  const flush = (line) => {
    const text = seg.trim();
    const owner = stack[stack.length - 1];
    if (text && owner) owner.own.push({ line: segLine < 0 ? line : segLine, text });
    seg = "";
    segLine = -1;
  };
  cssLines.forEach((raw, i) => {
    for (const ch of stripInline(raw)) {
      if (ch === "{") {
        const block = {
          header: seg.trim(),
          parent: stack[stack.length - 1] ?? null,
          own: [],
          startLine: segLine < 0 ? i : segLine,
        };
        blocks.push(block);
        stack.push(block);
        seg = "";
        segLine = -1;
      } else if (ch === "}") {
        flush(i);
        stack.pop();
      } else if (ch === ";") {
        seg += ch;
        flush(i);
      } else {
        if (segLine < 0 && !/\s/.test(ch)) segLine = i;
        seg += ch;
      }
    }
    seg += " ";
  });
  return blocks;
}

// .css 계열은 전체, .vue·.svelte·.html 은 <style> 안만 남긴다
function styleLines(lines, ext) {
  if (STYLE_EXTS.includes(ext)) return lines;
  if (!STYLE_TAG_EXTS.has(ext)) return [];
  let inside = false;
  return lines.map((line) => {
    let text = line;
    let keep = inside;
    const open = text.match(/<style\b[^>]*>/i);
    if (!inside && open) {
      text = text.slice(open.index + open[0].length);
      inside = true;
      keep = true;
    }
    const close = text.search(/<\/style>/i);
    if (inside && close >= 0) {
      text = text.slice(0, close);
      inside = false;
    }
    return keep ? text : "";
  });
}

const chain = (block) => {
  const list = [];
  for (let b = block; b; b = b.parent) list.push(b.header);
  return list;
};
const underAtRule = (block, re) => chain(block).some((h) => h.startsWith("@") && re.test(h));
const isSelector = (block) => block.header !== "" && !block.header.startsWith("@");

function eachDecl(ctx, visit) {
  const hits = [];
  for (const block of ctx.blocks) {
    block.own.forEach((decl, index) => {
      if (visit(block, decl, index)) hits.push(decl.line);
    });
  }
  return hits;
}

// ───────── 규칙 ─────────

const R = (def) => def;
const rx = (re) => (line) => re.test(line);
const lineHits = (ctx, re) => ctx.lines.flatMap((l, i) => (re.test(l) ? [i] : []));
const has = (ctx, re) => re.test(ctx.lines.join("\n"));
const px = (value, unit) => (unit === "px" ? Number(value) : Number(value) * MIN_FONT_PX);
const firstHangulLine = (file) => file.lines.findIndex((l) => HANGUL.test(l));
const TEXT_ALPHA = new RegExp(
  "(?<![\\w-])text-(?!(?:xs|sm|base|lg|xl|\\dxl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)\\b)" +
    "(?!\\[[\\d.]+(?:px|rem|em)\\])[\\w[\\]#.-]+\\/\\d+",
);
const GLYPH_LABEL =
  /^\s*(?:x|×|icon|아이콘|trash|trash ?can|휴지통|bin|cross|pencil|연필|gear|톱니바퀴?|hamburger|햄버거|chevron(?:[- ]\w+)?|arrow(?:[- ]\w+)?)\s*$|\bicon\b|아이콘/i;

function willChangeOther(line) {
  const m = line.match(/will-?change['"]?\s*:\s*['"]?([^;'"}]+)/i);
  if (!m || /var\(/.test(m[1])) return false;
  return m[1]
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .some((v) => v && v !== "all" && !GPU_PROPS.has(v));
}

function pressScale(line) {
  if (/(?<![\w-])active:scale-(?:90|95)(?![\d.])/.test(line)) return true;
  const values = [...line.matchAll(/(?<![\w-])(?:[\w:]*:)?scale-\[(0?\.\d+)\]/g)].map((m) => m[1]);
  const tap = line.match(/whileTap\s*=\s*\{\{\s*scale\s*:\s*(0?\.\d+)/);
  if (tap) values.push(tap[1]);
  return values.some((v) => Number(v) < MIN_PRESS_SCALE);
}

function pluralHack(line) {
  return (
    /===?\s*1\s*\?\s*(["'`])\1\s*:\s*(["'`])e?s\2/.test(line) ||
    /!==?\s*1\s*\?\s*(["'`])e?s\1\s*:\s*(["'`])\2/.test(line)
  );
}

function emptyAlt(line) {
  const tags = [...line.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  return tags.some((tag) => !/(?<![\w-])alt\s*=/.test(tag) && !/\{\s*\.\.\./.test(tag));
}

function pasteBlock(line, ctx) {
  if (/@paste\.prevent|onpaste\s*=\s*["']return false/i.test(line)) return true;
  if (!/onPaste\s*=/.test(line)) return false;
  const window = ctx.lines.slice(ctx.i, ctx.i + 4).join(" ");
  return /preventDefault/.test(window);
}

function inputSmall(ctx) {
  const small = /(?<![\w-])text-(?:xs|sm)(?![\w-])/;
  const base = /(?<![\w-])text-base(?![\w-])|text-\[16px\]/;
  const hits = ctx.lines.flatMap((l, i) =>
    /<(?:input|textarea|select)\b/i.test(l) && small.test(l) && !base.test(l) ? [i] : [],
  );
  const field = /(^|[\s,>+~])(?:input|textarea|select)(?![\w-])/;
  const css = eachDecl(ctx, (block, decl) => {
    const m = decl.text.match(/^font-size\s*:\s*([\d.]+)(px|rem|em)\b/);
    return Boolean(m) && isSelector(block) && field.test(block.header) && px(m[1], m[2]) < MIN_FONT_PX;
  });
  return [...hits, ...css];
}

function balanceParagraph(ctx) {
  const hits = lineHits(ctx, /<p(?:\s|>)[^\n]*(?<![\w-])text-balance(?![\w-])/);
  const paragraph = /(^|[\s,>+~])p(?![\w-])/;
  const css = eachDecl(
    ctx,
    (b, d) => isSelector(b) && paragraph.test(b.header) && /^text-wrap\s*:\s*balance/.test(d.text),
  );
  return [...hits, ...css];
}

function vhHits(ctx) {
  const re = /(?<![\w-])(?:min-)?height['"]?\s*:\s*['"]?100vh\b|(?<![\w-])(?:min-)?h-(?:screen|\[100vh\])(?![\w-])/;
  return ctx.lines.flatMap((l, i) => {
    if (!re.test(l) || /dvh/.test(l)) return [];
    const block = ctx.lineBlock[i];
    return block?.own.some((d) => /dvh/.test(d.text)) ? [] : [i];
  });
}

function activeScaleDisabled(ctx) {
  const tailwind = lineHits(ctx, /(?<![\w-])active:scale-/).filter(
    (i) => !/(?<![\w-])(?:enabled|disabled):/.test(ctx.lines[i]),
  );
  const guarded = /:not\(\s*(?::disabled|\[disabled\])\s*\)|:enabled/;
  const css = eachDecl(
    ctx,
    (b, d) =>
      isSelector(b) &&
      /:active/.test(b.header) &&
      !guarded.test(b.header) &&
      /^(?:scale\s*:|transform\s*:[^;]*scale)/.test(d.text),
  );
  return [...tailwind, ...css];
}

function gamutNoFallback(ctx) {
  return eachDecl(ctx, (block, decl, index) => {
    const m = decl.text.match(/oklch\(\s*[\d.]+%?\s+([\d.]+)/);
    if (!m || Number(m[1]) <= MAX_SAFE_CHROMA || underAtRule(block, /color-gamut/)) return false;
    return !block.own.slice(0, index).some((d) => /#[0-9a-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?)\(/i.test(d.text));
  });
}

function minWidthZero(line) {
  const grid = line.match(/grid-template-columns['"]?\s*:\s*['"]?([^;'"}]*)/);
  const stripped = grid ? grid[1].replace(/minmax\([^)]*\)/g, "") : "";
  if (/(?<![\d.])1fr\b/.test(stripped)) return true;
  const arbitrary = line.match(/grid-cols-\[([^\]]*)\]/);
  return Boolean(arbitrary) && !/minmax\(0/.test(arbitrary[1]) && /(?<![\d.])1fr\b/.test(arbitrary[1]);
}

function imeEnter(ctx) {
  const text = ctx.lines.join("\n");
  const keys = /onKeyDown|keydown/i.test(text) || /@keydown\.enter/.test(text);
  if (!keys || /isComposing|keyCode\s*===?\s*229|\.which\s*===?\s*229/.test(text)) return [];
  return lineHits(ctx, /["']Enter["']|keyCode\s*===?\s*13|@keydown\.enter|v-on:keydown\.enter/);
}

function learnMore(ctx) {
  const hits = lineHits(ctx, /(?:>|["'`])\s*(?:Learn more|자세히 보기)\s*(?:<|["'`])/);
  return hits.length >= 2 ? hits : [];
}

export const RULES = [
  // ── 글자 ──
  R({
    id: "type-variation-wght",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "font-variation-settings 로 wght·opsz 를 직접 지정한다",
    fix: "font-weight·font-optical-sizing 속성으로 바꾼다",
    test: rx(/font-variation-settings['"]?\s*:[^;]*["'](?:wght|opsz)["']/),
    examples: { hit: ['font-variation-settings: "wght" 450;'], miss: ['font-variation-settings: "wdth" 90;'] },
  }),
  R({
    id: "type-feature-tnum",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "font-feature-settings 로 tnum·zero 를 켠다",
    fix: "font-variant-numeric: tabular-nums·slashed-zero 로 바꾼다",
    test: rx(/font-feature-settings['"]?\s*:[^;]*["'](?:tnum|zero)["']/),
    examples: { hit: ['font-feature-settings: "tnum" 1;'], miss: ['font-feature-settings: "liga" 0;'] },
  }),
  R({
    id: "type-line-height-unit",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "line-height 가 px·rem 단위다",
    fix: "단위 없는 배수(1.5 등)로 쓴다",
    test: rx(/(?<![\w-])line-?height['"]?\s*:\s*['"]?[\d.]+(?:px|rem)\b|(?<![\w-])leading-\[[\d.]+(?:px|rem)\]/i),
    examples: {
      hit: ["line-height: 24px;", '<p className="leading-[1.5rem]">'],
      miss: ["line-height: 1.5;", '<p className="leading-6">'],
    },
  }),
  R({
    id: "type-letter-spacing-px",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "letter-spacing 이 px 단위다",
    fix: "글자 크기에 비례하도록 em 단위로 쓴다",
    test: rx(/(?<![\w-])letter-?spacing['"]?\s*:\s*['"]?-?[\d.]+px|(?<![\w-])tracking-\[-?[\d.]+px\]/i),
    examples: { hit: ["letter-spacing: 1px;", '<h1 className="tracking-[2px]">'], miss: ["letter-spacing: 0.02em;"] },
  }),
  R({
    id: "type-thin-weight",
    level: "info",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "font-weight 100~300 을 쓴다",
    fix: "18px 미만 글자는 400 이상으로 둔다",
    test: rx(/(?<![\w-])font-?weight['"]?\s*:\s*['"]?[123]00(?!\d)|(?<![\w-])font-(?:thin|extralight|light)(?![\w-])/i),
    examples: {
      hit: ["font-weight: 300;", '<p className="font-light">'],
      miss: ["font-weight: 400;", '<p className="font-medium">'],
    },
  }),
  R({
    id: "type-justify",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "text-align: justify 를 쓴다",
    fix: "왼쪽 정렬(start)로 둔다. 글자 사이 틈이 벌어진다",
    test: rx(/text-align\s*:\s*justify|(?<![\w-])text-justify(?![\w-])/),
    examples: { hit: ["text-align: justify;", '<p className="text-justify">'], miss: ["text-align: center;"] },
  }),
  R({
    id: "type-line-clamp-box",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "file",
    message: "-webkit-line-clamp 가 있는데 display: -webkit-box 가 없다",
    fix: "display: -webkit-box 와 -webkit-box-orient: vertical 을 함께 둔다",
    test: (ctx) => (has(ctx, /-webkit-box/) ? [] : lineHits(ctx, /-webkit-line-clamp|WebkitLineClamp/)),
    examples: {
      hit: [{ ext: ".css", text: ".t { -webkit-line-clamp: 2; overflow: hidden; }" }],
      miss: [
        { ext: ".css", text: ".t { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }" },
      ],
    },
  }),
  R({
    id: "type-skip-ink-none",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "text-decoration-skip-ink: none 을 쓴다",
    fix: "기본값(auto)으로 둔다. 밑줄이 글자 아래 획과 겹친다",
    test: rx(/text-decoration-skip-ink\s*:\s*none/),
    examples: { hit: ["text-decoration-skip-ink: none;"], miss: ["text-decoration-skip-ink: auto;"] },
  }),
  R({
    id: "type-font-synthesis-none",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "font-synthesis: none 을 쓴다",
    fix: "필요한 굵기·기울임 글꼴 파일을 싣고 이 선언은 지운다",
    test: rx(/font-synthesis\s*:\s*none/),
    examples: { hit: ["font-synthesis: none;"], miss: ["font-synthesis: weight;"] },
  }),
  R({
    id: "type-user-select-none",
    level: "info",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "user-select: none 으로 글자 선택을 막는다",
    fix: "버튼 라벨 같은 조작 요소에만 쓰고 읽을 글에는 쓰지 않는다",
    test: rx(/user-select\s*:\s*none|(?<![\w-])select-none(?![\w-])/),
    examples: { hit: ["user-select: none;", '<div className="select-none">'], miss: ["user-select: text;"] },
  }),
  R({
    id: "type-ascii-ellipsis",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    message: "글자 뒤에 마침표 세 개(...)를 쓴다",
    fix: "줄임표 문자(…) 하나로 바꾼다",
    test: rx(/[\p{L}\p{N}]\.\.\.(?=["'`<]|\s*$)/u),
    examples: {
      hit: ['<p>"Loading..."</p>', "<a>더 보기...</a>"],
      miss: ['<p>"Loading…"</p>', "const next = { ...prev };", "run(...args);"],
    },
  }),
  R({
    id: "type-input-small",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "file",
    message: "입력 칸 글자가 16px 미만이다",
    fix: "입력 칸은 16px 이상(text-base)으로 둔다. iOS 에서 포커스 때 화면이 확대된다",
    test: inputSmall,
    examples: {
      hit: ['<input className="text-sm" />', { ext: ".css", text: "input { font-size: 14px; }" }],
      miss: ['<input className="text-base" />', { ext: ".css", text: "input { font-size: 16px; }" }],
    },
  }),
  R({
    id: "type-balance-paragraph",
    level: "warn",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "file",
    message: "문단(p)에 text-wrap: balance 를 쓴다",
    fix: "balance 는 제목 같은 짧은 글에만 쓰고 문단은 pretty 로 둔다",
    test: balanceParagraph,
    examples: {
      hit: ['<p className="text-balance">긴 글</p>', { ext: ".css", text: "p { text-wrap: balance; }" }],
      miss: ['<h1 className="text-balance">제목</h1>', { ext: ".css", text: "h1 { text-wrap: balance; }" }],
    },
  }),
  R({
    id: "type-smoothing-component",
    level: "info",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "line",
    exts: COMPONENT_EXTS,
    message: "컴포넌트 class 에 antialiased 를 둔다",
    fix: "루트(body)에 한 번만 둔다",
    test: (line) => /(?<![\w-])antialiased(?![\w-])/.test(line) && !/<(?:body|html)\b/.test(line),
    examples: { hit: ['<button className="antialiased">'], miss: ['<body className="antialiased">'] },
  }),
  R({
    id: "type-keep-all-missing",
    level: "info",
    area: "글자",
    doc: "ux-spec/references/visual-type.md",
    scope: "project",
    message: "한글 화면이 있는데 word-break: keep-all 이 어디에도 없다",
    fix: "본문 루트에 word-break: keep-all(break-keep)을 둔다. 한국어 화면 기준",
    test: (files) => {
      const screen = files.find((f) => SCREEN_EXTS.has(f.ext) && firstHangulLine(f) >= 0);
      const keepAll = files.some((f) =>
        /word-break\s*:\s*keep-all|(?<![\w-])break-keep(?![\w-])/.test(f.lines.join("\n")),
      );
      return screen && !keepAll ? [{ file: screen.path, line: firstHangulLine(screen) }] : [];
    },
    examples: {
      hit: [{ files: { "a.tsx": "<p>안녕하세요</p>" } }],
      miss: [{ files: { "a.tsx": "<p>안녕하세요</p>", "a.css": "body { word-break: keep-all; }" } }],
    },
  }),

  // ── 색 ──
  R({
    id: "color-literal-in-component",
    level: "warn",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "line",
    exts: COMPONENT_EXTS,
    message: "컴포넌트에 색 값(#hex·rgb·hsl·oklch)을 직접 쓴다",
    fix: "의미 토큰(var(--…) 또는 토큰 class)으로 바꾼다",
    test: rx(COLOR_LITERAL_COMPONENT),
    examples: {
      hit: ['<div style={{ color: "#333" }} />', '<div className="bg-[#0a0a0a]" />'],
      miss: ['<div className="bg-surface text-fg" />', '<div style={{ color: "rgb(var(--fg))" }} />'],
    },
  }),
  R({
    id: "color-literal-in-css",
    level: "info",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "file",
    exts: BLOCK_EXTS,
    message: "CSS 선언 값에 색 값을 직접 쓴다",
    fix: "토큰 정의(--이름)에 두고 var() 로 쓴다",
    test: (ctx) =>
      eachDecl(ctx, (block, decl) => {
        if (
          /^(?:--|[$@][\w-]+\s*:)/.test(decl.text) ||
          chain(block).some((h) => /^@theme|:root|:host|^@property/.test(h))
        )
          return false;
        return COLOR_LITERAL_CSS.test(decl.text);
      }),
    examples: {
      hit: [".btn { background: #3b82f6; }"],
      miss: [".btn { background: var(--color-accent); }", ":root { --color-accent: #3b82f6; }"],
    },
  }),
  R({
    id: "color-tailwind-primitive",
    level: "info",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "line",
    exts: COMPONENT_EXTS,
    message: "Tailwind 기본 색 이름(blue-500 등)을 직접 쓴다",
    fix: "의미 토큰을 거쳐 쓴다",
    test: rx(
      new RegExp(
        `(?<![\\w-])(?:bg|text|border|ring|fill|stroke|outline|from|to|via)-(?:${COLOR_NAMES})-(?:50|[1-9]00|950)\\b`,
      ),
    ),
    examples: { hit: ['<div className="bg-blue-500">'], miss: ['<div className="bg-accent">'] },
  }),
  R({
    id: "color-primary-collision",
    level: "warn",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "file",
    message: "--color-primary 와 --color-text-primary 가 한 파일에 함께 있다",
    fix: "브랜드색은 accent 처럼 다른 역할 이름으로 구분한다. primary 가 브랜드색인지 주 글자색인지 헷갈린다",
    test: (ctx) => (has(ctx, /--color-text-primary\s*:/) ? lineHits(ctx, /--color-primary\s*:/) : []),
    examples: {
      hit: [{ ext: ".css", text: ":root { --color-primary: #06f; --color-text-primary: #111; }" }],
      miss: [{ ext: ".css", text: ":root { --color-accent: #06f; --color-text-primary: #111; }" }],
    },
  }),
  R({
    id: "color-white-on-500",
    level: "warn",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "line",
    message: "text-white 를 bg-<색>-500 위에 쓴다",
    fix: "대부분 4.5:1 에 못 미친다. 배경을 600 이상으로 하고 대비를 잰다",
    test: (line) => /(?<![\w-])text-white(?![\w-])/.test(line) && /(?<![\w-])bg-[a-z]+-500(?![\w/-])/.test(line),
    examples: {
      hit: ['<button className="bg-blue-500 text-white">'],
      miss: ['<button className="bg-blue-600 text-white">'],
    },
  }),
  R({
    id: "color-text-alpha",
    level: "info",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "line",
    message: "글자색에 투명도를 쓴다",
    fix: "배경 위에 그려진 결과 색으로 대비를 잰다",
    test: (line) =>
      TEXT_ALPHA.test(line) ||
      /(?<![\w-])color\s*:\s*(?:rgba?|hsla?)\([^)]*(?:,\s*|\/\s*)(?:0?\.\d+|\d{1,2}%)\s*\)/.test(line),
    examples: {
      hit: ['<p className="text-black/60">', "color: rgba(0, 0, 0, 0.6);"],
      miss: ['<p className="text-sm/6">', "color: rgb(0, 0, 0);"],
    },
  }),
  R({
    id: "color-two-switches",
    level: "warn",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "project",
    message: "prefers-color-scheme 와 .dark 가 둘 다 토큰을 정의한다",
    fix: "테마 전환 스위치를 하나로 모은다",
    test: (files) => {
      const defines = (b) => b.own.some((d) => d.text.startsWith("--"));
      const media = (b) => defines(b) && underAtRule(b, /prefers-color-scheme/);
      const dark = (b) => defines(b) && isSelector(b) && /\.dark(?![\w-])/.test(b.header);
      const hasMedia = files.some((f) => f.blocks.some(media));
      for (const f of files) {
        const block = f.blocks.find(dark);
        if (hasMedia && block) return [{ file: f.path, line: block.startLine }];
      }
      return [];
    },
    examples: {
      hit: [
        {
          files: {
            "a.css": "@media (prefers-color-scheme: dark) {\n  :root { --bg: #000; }\n}\n.dark { --bg: #000; }",
          },
        },
      ],
      miss: [{ files: { "a.css": ".dark { --bg: #000; }" } }],
    },
  }),
  R({
    id: "color-gamut-no-fallback",
    level: "info",
    area: "색",
    doc: "ux-spec/references/visual-color.md",
    scope: "file",
    exts: BLOCK_EXTS,
    message: "채도 0.2 를 넘는 oklch 에 sRGB 값이 먼저 없다",
    fix: "sRGB 값을 먼저 쓰고 @media (color-gamut: p3) 안에 선명한 값을 둔다",
    test: gamutNoFallback,
    examples: {
      hit: [".a { color: oklch(0.7 0.25 30); }"],
      miss: [
        ".a { color: #ff0000; }\n@media (color-gamut: p3) {\n  .a { color: oklch(0.7 0.25 30); }\n}",
        ".a { color: oklch(0.7 0.1 30); }",
      ],
    },
  }),

  // ── 배치 ──
  R({
    id: "layout-100vw",
    level: "warn",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "line",
    message: "width: 100vw 를 쓴다",
    fix: "100% 로 쓴다. 세로 스크롤바 폭만큼 가로 스크롤이 생긴다",
    test: rx(/(?<![\w-])width['"]?\s*:\s*['"]?100vw\b|(?<![\w-])w-(?:screen|\[100vw\])(?![\w-])/),
    examples: { hit: ["width: 100vw;", '<div className="w-screen">'], miss: ["width: 100%;"] },
  }),
  R({
    id: "layout-100vh",
    level: "warn",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "file",
    message: "높이를 100vh 로 쓴다",
    fix: "100dvh 를 쓰거나 vh 값 아래에 dvh 값을 덧붙인다. 모바일 주소창이 가린다",
    test: vhHits,
    examples: {
      hit: [{ ext: ".css", text: ".page { min-height: 100vh; }" }, '<main className="min-h-screen">'],
      miss: [
        { ext: ".css", text: ".page { min-height: 100vh; min-height: 100dvh; }" },
        '<main className="min-h-screen min-h-dvh">',
      ],
    },
  }),
  R({
    id: "layout-safe-area-no-cover",
    level: "warn",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "project",
    message: "env(safe-area-inset-…)을 쓰는데 viewport-fit=cover 가 어디에도 없다",
    fix: "viewport 메타에 viewport-fit=cover 를 더한다. 없으면 inset 값이 0 이다",
    test: (files) => {
      const cover = files.some((f) => /viewport-?fit['"]?\s*[:=]\s*['"]?cover/i.test(f.lines.join("\n")));
      if (cover) return [];
      for (const f of files) {
        const i = f.lines.findIndex((l) => l.includes("env(safe-area-inset-"));
        if (i >= 0) return [{ file: f.path, line: i }];
      }
      return [];
    },
    examples: {
      hit: [{ files: { "a.css": "body { padding-top: env(safe-area-inset-top); }" } }],
      miss: [
        {
          files: {
            "a.css": "body { padding-top: env(safe-area-inset-top); }",
            "index.html": '<meta name="viewport" content="width=device-width, viewport-fit=cover">',
          },
        },
      ],
    },
  }),
  R({
    id: "layout-sticky-no-scroll-padding",
    level: "info",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "project",
    message: "sticky 요소가 있는데 scroll-padding 이 어디에도 없다",
    fix: "고정 헤더 높이만큼 scroll-padding-top(scroll-pt-)을 둔다. 앵커 이동 때 가려진다",
    test: (files) => {
      const sticky =
        /position['"]?\s*:\s*['"]?sticky|(?:class|className|@apply|cn\(|clsx\().*(?<![\w-])sticky(?![\w-])/;
      if (files.some((f) => /scroll-padding|scroll-pt-/.test(f.lines.join("\n")))) return [];
      for (const f of files) {
        const i = f.lines.findIndex((l) => sticky.test(l));
        if (i >= 0) return [{ file: f.path, line: i }];
      }
      return [];
    },
    examples: {
      hit: [{ files: { "a.css": ".bar { position: sticky; top: 0; }" } }],
      miss: [{ files: { "a.css": ".bar { position: sticky; top: 0; }\nhtml { scroll-padding-top: 64px; }" } }],
    },
  }),
  R({
    id: "layout-media-in-component",
    level: "info",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "line",
    exts: COMPONENT_EXTS,
    message: "컴포넌트 안에서 @media 로 폭에 따라 나눈다",
    fix: "컨테이너 쿼리(@container)로 바꾼다. 컴포넌트는 놓인 자리 폭을 따른다",
    test: rx(/@media\s*\(\s*(?:max|min)-width/),
    examples: { hit: ["@media (max-width: 640px) {"], miss: ["@container (min-width: 400px) {"] },
  }),
  R({
    id: "layout-float-physical",
    level: "info",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "line",
    message: "float: left·right 처럼 물리 방향을 쓴다",
    fix: "float: inline-start·inline-end 로 바꾼다. RTL 에서 뒤집힌다",
    test: rx(/(?<![\w-])float\s*:\s*(?:left|right)\b|(?<![\w-])float-(?:left|right)(?![\w-])/),
    examples: { hit: ["float: left;", '<img className="float-right">'], miss: ["float: inline-start;"] },
  }),
  R({
    id: "layout-order-change",
    level: "info",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "line",
    message: "order·row-reverse 로 보이는 순서를 바꾼다",
    fix: "보이는 순서와 DOM 순서(탭 순서)가 같은지 확인한다",
    test: rx(
      /(?<![\w-])order\s*:\s*-?\d|(?<![\w-])order-(?:\d+|first|last)(?![\w-])|(?<![\w-])(?:flex-)?row-reverse(?![\w-])/,
    ),
    examples: {
      hit: ["order: 2;", '<div className="flex-row-reverse">'],
      miss: ['<div className="border-2 flex-row">'],
    },
  }),
  R({
    id: "layout-min-width-zero",
    level: "info",
    area: "배치",
    doc: "ux-spec/references/visual-layout.md",
    scope: "line",
    message: "grid-template-columns 에 1fr 단독을 쓴다",
    fix: "긴 글·넓은 표면에 밀리지 않게 minmax(0, 1fr) 로 쓴다",
    test: minWidthZero,
    examples: {
      hit: ["grid-template-columns: 1fr 1fr;", "grid-template-columns: repeat(2, 1fr);"],
      miss: [
        "grid-template-columns: repeat(2, minmax(0, 1fr));",
        "grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));",
      ],
    },
  }),

  // ── 표면·움직임 ──
  R({
    id: "ui-transition-all",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "transition: all 을 쓴다",
    fix: "움직일 속성(opacity·transform 등)만 적는다",
    test: rx(/(?<![\w-])transition(?:-property|Property)?['"]?\s*:\s*['"]?all\b|(?<![\w-])transition-all(?![\w-])/),
    examples: {
      hit: ["transition: all 200ms;", '<div className="transition-all">'],
      miss: ["transition: opacity 200ms;", '<div className="transition-colors">'],
    },
  }),
  R({
    id: "ui-will-change-all",
    level: "error",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "will-change: all 을 쓴다",
    fix: "움직일 속성(transform·opacity)만 적거나 지운다",
    test: rx(/will-?change['"]?\s*:\s*['"]?all\b/i),
    examples: { hit: ["will-change: all;"], miss: ["will-change: transform;"] },
  }),
  R({
    id: "ui-will-change-other",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "will-change 값이 transform·translate·scale·rotate·opacity·filter 밖이다",
    fix: "GPU 에서 처리되는 속성만 쓴다",
    test: (line) => willChangeOther(line) || /(?<![\w-])will-change-(?:scroll|contents)(?![\w-])/.test(line),
    examples: {
      hit: ["will-change: left, top;", '<div className="will-change-scroll">'],
      miss: ["will-change: transform, opacity;", "will-change: auto;"],
    },
  }),
  R({
    id: "ui-press-scale",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "눌림 크기 변화가 0.96 미만이다",
    fix: "scale 0.96~0.98 안에 둔다",
    test: pressScale,
    examples: {
      hit: ['<button className="active:scale-90">', "<motion.button whileTap={{ scale: 0.9 }}>"],
      miss: ['<button className="active:scale-[0.97]">', "<motion.button whileTap={{ scale: 0.97 }}>"],
    },
  }),
  R({
    id: "ui-active-scale-disabled",
    level: "info",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "file",
    message: "눌림 scale 이 비활성 상태를 거르지 않는다",
    fix: "enabled: 접두사나 :not(:disabled) 를 붙여 비활성 버튼은 눌리지 않게 한다",
    test: activeScaleDisabled,
    examples: {
      hit: ['<button className="active:scale-95">', { ext: ".css", text: ".btn:active { scale: 0.97; }" }],
      miss: [
        '<button className="enabled:active:scale-95">',
        { ext: ".css", text: ".btn:not(:disabled):active { scale: 0.97; }" },
      ],
    },
  }),
  R({
    id: "ui-bounce",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "스프링에 bounce 값을 준다",
    fix: "UI 전환의 bounce 는 0 으로 둔다",
    test: (line) => {
      const m = line.match(/(?<![\w-])bounce\s*:\s*(-?[\d.]+)/);
      return Boolean(m) && Number(m[1]) !== 0;
    },
    examples: {
      hit: ['transition={{ type: "spring", bounce: 0.3 }}'],
      miss: ['transition={{ type: "spring", bounce: 0 }}'],
    },
  }),
  R({
    id: "ui-hover-animation",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "file",
    message: ":hover 에서 animation 을 켠다",
    fix: "transition 으로 바꾼다. 포인터가 떠나면 중간에서 끊긴다",
    test: (ctx) => [
      ...lineHits(ctx, /(?<![\w-])hover:animate-/),
      ...eachDecl(ctx, (b, d) => isSelector(b) && /:hover/.test(b.header) && /^animation(?:-name)?\s*:/.test(d.text)),
    ],
    examples: {
      hit: ['<div className="hover:animate-bounce">', { ext: ".css", text: ".a:hover { animation: pulse 1s; }" }],
      miss: [{ ext: ".css", text: ".a:hover { transition: opacity 200ms; }" }],
    },
  }),
  R({
    id: "ui-svg-hardcoded-color",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "SVG 의 fill·stroke 에 색 값을 박았다",
    fix: "currentColor 로 쓰고 색은 글자색에서 받는다",
    test: rx(/(?<![\w-])(?:fill|stroke)=\{?["']#[0-9a-fA-F]{3,8}["']/),
    examples: { hit: ['<path fill="#000" />'], miss: ['<path fill="currentColor" />'] },
  }),
  R({
    id: "ui-image-outline-tint",
    level: "warn",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "line",
    message: "이미지 outline 에 회색 계열 색 이름을 쓴다",
    fix: "outline-black/10 · dark:outline-white/10 처럼 투명한 검정·흰색으로 쓴다",
    test: (line) => /<img\b/.test(line) && /outline-(?:slate|zinc|neutral|gray|stone)-/.test(line),
    examples: {
      hit: ['<img className="outline outline-gray-200" />'],
      miss: ['<img className="outline outline-black/10 dark:outline-white/10" />'],
    },
  }),
  R({
    id: "ui-hover-no-media",
    level: "info",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "file",
    exts: BLOCK_EXTS,
    message: ":hover 규칙이 @media (hover: hover) 밖에 있다",
    fix: "@media (hover: hover) 안에 둔다. 터치 화면에서 눌린 채 남는다",
    test: (ctx) =>
      ctx.blocks.flatMap((b) =>
        isSelector(b) && /:hover/.test(b.header) && !underAtRule(b, /\(\s*(?:any-)?hover\s*:\s*hover\s*\)/)
          ? [b.startLine]
          : [],
      ),
    examples: {
      hit: ["a:hover { color: red; }"],
      miss: ["@media (hover: hover) {\n  a:hover { color: red; }\n}"],
    },
  }),
  R({
    id: "ui-overscroll",
    level: "info",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "file",
    exts: BLOCK_EXTS,
    message: "겹침 화면(dialog·drawer·menu 등)의 스크롤 영역에 overscroll-behavior 가 없다",
    fix: "overscroll-behavior: contain 을 더한다. 끝에서 뒤쪽 화면이 같이 스크롤된다",
    test: (ctx) =>
      eachDecl(ctx, (b, d) => {
        if (!isSelector(b) || !/dialog|drawer|modal|menu|sheet|popover|panel/i.test(b.header)) return false;
        return (
          /^overflow(?:-y)?\s*:\s*(?:auto|scroll)\b/.test(d.text) &&
          !b.own.some((o) => /^overscroll-behavior/.test(o.text))
        );
      }),
    examples: {
      hit: [".modal-body { overflow-y: auto; }"],
      miss: [".modal-body { overflow-y: auto; overscroll-behavior: contain; }"],
    },
  }),
  R({
    id: "ui-shadow-ring-no-border",
    level: "info",
    area: "표면·움직임",
    doc: "ux-spec/references/visual-surface-motion.md",
    scope: "file",
    exts: BLOCK_EXTS,
    message: "box-shadow 링(0 0 0 1px)만 있고 border 가 없다",
    fix: "강제 색 모드에서 보이도록 투명 테두리(border: 1px solid transparent)를 더한다",
    test: (ctx) =>
      eachDecl(
        ctx,
        (b, d) =>
          /^box-shadow\s*:\s*0\s+0\s+0\s+1px/.test(d.text) &&
          !b.own.some((o) => /^border(?:-[a-z-]+)?\s*:/.test(o.text)),
      ),
    examples: {
      hit: [".card { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1); }"],
      miss: [".card { border: 1px solid transparent; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1); }"],
    },
  }),

  // ── 접근성 ──
  R({
    id: "a11y-outline-none",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "file",
    message: "포커스 윤곽을 지웠는데 같은 파일에 focus-visible 이 없다",
    fix: ":focus-visible 로 대신할 윤곽을 둔다",
    test: (ctx) =>
      has(ctx, /focus-visible/)
        ? []
        : lineHits(ctx, /(?<![\w-])outline\s*:\s*(?:none|0)(?![\w.%])|(?<![\w-])outline-none(?![\w-])/),
    examples: {
      hit: [{ ext: ".css", text: "button:focus { outline: none; }" }],
      miss: [{ ext: ".css", text: "button:focus { outline: none; }\nbutton:focus-visible { outline: 2px solid; }" }],
    },
  }),
  R({
    id: "a11y-div-onclick",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "div·span 에 클릭 핸들러를 달았다",
    fix: "button 이나 a 로 바꾼다. 키보드·보조기기가 쓸 수 있다",
    test: rx(/<(?:div|span)\b[^>]*?\s(?:onClick|onclick|@click|v-on:click|on:click)\b/),
    examples: { hit: ["<div onClick={open}>열기</div>"], miss: ["<button onClick={open}>열기</button>"] },
  }),
  R({
    id: "a11y-role-no-key",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "file",
    message: "role=button·tab·menuitem 이 있는데 keydown 처리가 없다",
    fix: "Enter·Space(탭·메뉴는 방향키)를 처리하거나 기본 요소로 바꾼다",
    test: (ctx) =>
      has(ctx, /onKeyDown|onkeydown|keydown|@keydown/i) ? [] : lineHits(ctx, /role=["'](?:button|tab|menuitem)["']/),
    examples: {
      hit: ['<div role="button" onClick={f}>x</div>'],
      miss: ['<div role="button" onClick={f} onKeyDown={g}>x</div>'],
    },
  }),
  R({
    id: "a11y-tabindex-positive",
    level: "error",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "tabindex 에 양수를 쓴다",
    fix: "0 이나 -1 만 쓰고 순서는 DOM 순서로 맞춘다",
    test: rx(/tabIndex\s*=\s*\{\s*[1-9]\d*\s*\}|tabindex\s*=\s*["'][1-9]\d*["']/i),
    examples: {
      hit: ["<div tabIndex={1}>", '<div tabindex="2">'],
      miss: ["<div tabIndex={0}>", '<div tabindex="-1">'],
    },
  }),
  R({
    id: "a11y-disabled-submit",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "검증이 끝나기 전에는 제출 버튼을 disabled 로 둔다",
    fix: "버튼은 켜 두고 제출 때 검증해 오류를 알려 준다",
    test: rx(/(?::|v-bind:)?disabled\s*=\s*(?:\{\s*|["'])!\s*[\w.$]*valid/i),
    examples: {
      hit: ["<button disabled={!isValid}>", '<button :disabled="!valid">'],
      miss: ["<button disabled={isLoading}>"],
    },
  }),
  R({
    id: "a11y-assertive",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: 'aria-live="assertive" 를 쓴다',
    fix: "polite 로 두고 사용자의 작업을 끊어야 할 때만 assertive 를 쓴다",
    test: rx(/aria-live\s*=\s*\{?\s*["']assertive["']/),
    examples: { hit: ['<div aria-live="assertive">'], miss: ['<div aria-live="polite">'] },
  }),
  R({
    id: "a11y-img-no-alt",
    level: "error",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "img 에 alt 가 없다",
    fix: '내용 이미지는 설명을, 장식 이미지는 alt="" 를 적는다',
    test: emptyAlt,
    examples: { hit: ['<img src="a.png" />'], miss: ['<img src="a.png" alt="" />', '<img src="a.png" {...rest} />'] },
  }),
  R({
    id: "a11y-zoom-block",
    level: "error",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "확대를 막는 viewport 설정이다",
    fix: "maximum-scale·user-scalable 을 지운다",
    test: rx(
      /maximum-scale\s*=\s*1(?:\.0+)?(?![\d.])|user-scalable\s*=\s*(?:no|0)\b|maximumScale['"]?\s*:\s*1(?![\d.])|userScalable['"]?\s*:\s*false/,
    ),
    examples: {
      hit: [
        '<meta name="viewport" content="width=device-width, maximum-scale=1">',
        '<meta name="viewport" content="user-scalable=no">',
      ],
      miss: ['<meta name="viewport" content="width=device-width, initial-scale=1">'],
    },
  }),
  R({
    id: "a11y-hidden-focusable",
    level: "error",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: '초점을 받는 요소에 aria-hidden="true" 를 달았다',
    fix: "aria-hidden 을 지우거나 요소를 숨기려면 hidden·inert 를 쓴다",
    test: (line) =>
      /<(?:button|a|input|select|textarea)(?=[\s>/])[^>]*aria-hidden\s*=\s*\{?["']true["']/.test(line) &&
      !/type=["']hidden["']/.test(line),
    examples: { hit: ['<button aria-hidden="true">x</button>'], miss: ['<span aria-hidden="true">x</span>'] },
  }),
  R({
    id: "a11y-live-mounted",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "알림 영역(role=status·alert, aria-live)을 조건부로 그린다",
    fix: "빈 영역을 먼저 그려 두고 안의 글만 바꾼다",
    test: rx(/&&\s*<[^>]*(?:role\s*=\s*["'](?:status|alert)["']|aria-live)/),
    examples: { hit: ['{error && <p role="alert">{error}</p>}'], miss: ['<p role="alert">{error}</p>'] },
  }),
  R({
    id: "a11y-drag-alternative",
    level: "info",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "끌기 동작이 있다",
    fix: "한 번 누르기로 같은 일을 하는 대안을 둔다(WCAG 2.5.7)",
    test: rx(/onDragStart|draggable\s*=\s*\{?["']true["']|@dnd-kit|react-beautiful-dnd|(?<![\w-])useDrag\b/),
    examples: {
      hit: ['<li draggable="true">', 'import { DndContext } from "@dnd-kit/core";'],
      miss: ["<li>항목</li>"],
    },
  }),
  R({
    id: "a11y-label-glyph",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "aria-label 이 모양 이름(icon·아이콘·X·Trash)이다",
    fix: "행동 이름(닫기·삭제)으로 쓴다",
    test: (line) => [...line.matchAll(/aria-label\s*=\s*\{?["']([^"']*)["']/g)].some((m) => GLYPH_LABEL.test(m[1])),
    examples: {
      hit: ['<button aria-label="X">', '<button aria-label="휴지통 아이콘">'],
      miss: ['<button aria-label="닫기">', '<button aria-label="Move to trash">'],
    },
  }),
  R({
    id: "a11y-placeholder-only",
    level: "warn",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "file",
    message: "placeholder 만 있고 label 이 없다",
    fix: "보이는 label 을 둔다. 입력을 시작하면 placeholder 가 사라진다",
    test: (ctx) =>
      has(ctx, /<\w*label\b|aria-label|aria-labelledby/i) ? [] : lineHits(ctx, /<input\b[^>]*placeholder\s*=/i),
    examples: {
      hit: ['<input placeholder="이메일" />'],
      miss: ['<label>이메일<input placeholder="you@example.com" /></label>'],
    },
  }),
  R({
    id: "a11y-paste-block",
    level: "error",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "line",
    message: "붙여넣기를 막는다",
    fix: "막지 않는다. 비밀번호 관리자와 보조기기가 붙여넣기를 쓴다",
    test: pasteBlock,
    examples: {
      hit: ["<input onPaste={(e) => e.preventDefault()} />", '<input onpaste="return false">'],
      miss: ["<input onPaste={handlePaste} />"],
    },
  }),
  R({
    id: "a11y-ime-enter",
    level: "info",
    area: "접근성",
    doc: "ux-a11y/references/implementation-patterns.md",
    scope: "file",
    message: "keydown 에서 Enter 를 처리하는데 한글 조합 중 확인(isComposing)이 없다",
    fix: "e.nativeEvent.isComposing 이면 건너뛴다. 조합 중 Enter 가 두 번 처리된다",
    test: imeEnter,
    examples: {
      hit: ['<input onKeyDown={(e) => e.key === "Enter" && send()} />'],
      miss: ['<input onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()} />'],
    },
  }),

  // ── 문구 ──
  R({
    id: "copy-are-you-sure",
    level: "warn",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: "「Are you sure」·「정말 …하시겠」 확인 문구를 쓴다",
    fix: "결과를 적고 버튼 이름을 동사 + 대상으로 쓴다(예: 「프로젝트 삭제」)",
    test: rx(/\bAre you sure\b|정말[^"'`<\n]{0,30}하시겠/i),
    examples: {
      hit: ["<p>Are you sure?</p>", "<p>정말 삭제하시겠습니까?</p>"],
      miss: ["<p>삭제하면 되돌릴 수 없다</p>"],
    },
  }),
  R({
    id: "copy-successfully",
    level: "info",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: "「successfully」·「성공적으로」를 쓴다",
    fix: "결과만 적는다(예: 「저장했다」)",
    test: rx(/\bsuccessfully\b|성공적으로/i),
    examples: { hit: ['toast("Saved successfully")', 'toast("성공적으로 저장했습니다")'], miss: ['toast("Saved")'] },
  }),
  R({
    id: "copy-click-here",
    level: "warn",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: "「click here」·「여기를 클릭」 링크 문구를 쓴다",
    fix: "링크 글자에 갈 곳이나 할 일을 적는다",
    test: rx(/click here|여기를\s*(?:클릭|누르)/i),
    examples: { hit: ["<a>Click here</a>", "<a>여기를 클릭</a>"], miss: ["<a>요금표 보기</a>"] },
  }),
  R({
    id: "copy-oops",
    level: "warn",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: "「Oops」·「앗!」 같은 감탄사로 오류를 연다",
    fix: "무슨 일이 일어났는지와 다음 행동을 적는다",
    test: rx(/\b(?:Oops|Whoops)\b|(?:["'`>]|\s)앗[!,]/i),
    examples: {
      hit: ["<p>Oops! Something went wrong</p>", "<p>앗! 오류가 났다</p>"],
      miss: ["<p>저장하지 못했다. 다시 시도한다</p>"],
    },
  }),
  R({
    id: "copy-plural-hack",
    level: "warn",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: '복수형을 === 1 ? "" : "s" 로 만든다',
    fix: "ICU 복수형(plural)으로 쓴다",
    test: pluralHack,
    examples: { hit: ['{count} item{count === 1 ? "" : "s"}'], miss: ["{t('items', { count })}"] },
  }),
  R({
    id: "copy-date-no-locale",
    level: "info",
    area: "문구",
    doc: "ux-writing/references/ko-rules.md",
    scope: "line",
    message: "인자 없는 toLocale…String() 을 쓴다",
    fix: "Intl.DateTimeFormat 에 사용자 로캘을 명시한다",
    test: rx(/\.toLocale(?:Date|Time)?String\(\s*\)/),
    examples: { hit: ["d.toLocaleDateString()"], miss: ['d.toLocaleDateString("ko-KR")'] },
  }),
  R({
    id: "copy-ok-button",
    level: "info",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "line",
    message: "버튼 이름이 OK·Yes·No 다",
    fix: "동사 + 대상으로 쓴다(예: 「변경 저장」)",
    test: rx(/>\s*(?:OK|Yes|No)\s*</),
    examples: { hit: ["<button>OK</button>"], miss: ["<button>변경 저장</button>"] },
  }),
  R({
    id: "copy-learn-more",
    level: "info",
    area: "문구",
    doc: "ux-writing/references/en-rules.md",
    scope: "file",
    message: "「Learn more」·「자세히 보기」가 한 파일에 둘 이상이다",
    fix: "링크마다 대상을 붙여 구별한다(예: 「요금제 자세히 보기」)",
    test: learnMore,
    examples: {
      hit: ["<a>Learn more</a>\n<a>Learn more</a>"],
      miss: ["<a>Learn more</a>\n<a>Learn more about billing</a>"],
    },
  }),
];

// ───────── 스캔 ─────────

const levelRank = (level) => LEVELS.indexOf(level);

function isCommentLine(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("<!--")) return true;
  return t.startsWith("*") && /^\*(?:[\s/]|$)/.test(t) && !/^\*\s*[{,]/.test(t);
}

export function prepare(text, path) {
  const ext = extname(path).toLowerCase();
  const lines = text.split("\n").map((l) => (isCommentLine(l) || l.length > MAX_LINE_LENGTH ? "" : l));
  const blocks = parseBlocks(styleLines(lines, ext));
  const lineBlock = [];
  for (const block of blocks) for (const decl of block.own) lineBlock[decl.line] = block;
  return { path, ext, raw: text.split("\n"), lines, blocks, lineBlock };
}

const lineCtx = (ctx, i) => ({ lines: ctx.lines, ext: ctx.ext, path: ctx.path, i });
const applies = (rule, ctx) => !rule.exts || rule.exts.includes(ctx.ext);

function makeFinding(rule, ctx, file, line) {
  const snippet = (ctx.raw[line] ?? "").trim().slice(0, SNIPPET_LENGTH);
  return {
    file,
    line: line + 1,
    ruleId: rule.id,
    level: rule.level,
    message: rule.message,
    fix: rule.fix,
    doc: rule.doc,
    snippet,
  };
}

function scanContext(ctx) {
  const found = [];
  for (const rule of RULES) {
    if (rule.scope === "project" || !applies(rule, ctx)) continue;
    const hits =
      rule.scope === "file"
        ? rule.test(ctx)
        : ctx.lines.flatMap((l, i) => (l && rule.test(l, lineCtx(ctx, i)) ? [i] : []));
    for (const line of new Set(hits)) found.push(makeFinding(rule, ctx, ctx.path, line));
  }
  return found;
}

const byPlace = (a, b) =>
  a.line - b.line || RULES.findIndex((r) => r.id === a.ruleId) - RULES.findIndex((r) => r.id === b.ruleId);

export function scanText(text, { path = "input.tsx" } = {}) {
  return scanContext(prepare(text, path)).sort(byPlace);
}

// sources: [{ path, text }] — 줄·파일 규칙은 파일별로, 프로젝트 규칙은 전체를 본 뒤 낸다
export function scanSources(sources) {
  const contexts = sources.map((s) => prepare(s.text, s.path));
  const byFile = new Map(contexts.map((c) => [c.path, scanContext(c)]));
  for (const rule of RULES.filter((r) => r.scope === "project")) {
    const usable = contexts.filter((c) => applies(rule, c));
    for (const hit of rule.test(usable)) {
      const ctx = contexts.find((c) => c.path === hit.file);
      byFile.get(hit.file).push(makeFinding(rule, ctx, hit.file, hit.line));
    }
  }
  return contexts.flatMap((c) => byFile.get(c.path).sort(byPlace));
}

// ───────── CLI ─────────

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files);
    } else if (entry.isFile() && TARGET_EXTS.has(extname(entry.name).toLowerCase()) && !SKIP_FILE.test(entry.name)) {
      files.push(full);
    }
  }
}

function collect(targets) {
  const files = [];
  for (const target of targets) {
    let info;
    try {
      info = statSync(target);
    } catch (error) {
      throw new UsageError(`${target}: 읽을 수 없다 (${error.code ?? error.message})`);
    }
    if (info.isDirectory()) walk(target, files);
    else files.push(target);
  }
  return [...new Map(files.map((f) => [resolve(f), f])).values()];
}

function parseArgs(argv) {
  const opts = { targets: [], level: "warn", json: false, rules: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--rules") opts.rules = true;
    else if (arg === "--level") opts.level = argv[(i += 1)];
    else if (arg.startsWith("--")) throw new UsageError(`알 수 없는 옵션: ${arg}`);
    else opts.targets.push(arg);
  }
  if (levelRank(opts.level) < 0) throw new UsageError(`--level 은 ${LEVELS.join("|")} 중 하나다`);
  if (!opts.rules && opts.targets.length === 0) throw new UsageError("검사할 파일이나 폴더가 필요하다");
  return opts;
}

function printRules() {
  console.log("| id | 등급 | 메시지 | 기준 문서 |");
  console.log("| --- | --- | --- | --- |");
  for (const r of RULES) console.log(`| ${r.id} | ${r.level} | ${r.message.replace(/\|/g, "\\|")} | ${r.doc} |`);
  console.log(`\n규칙 ${RULES.length}개`);
}

function printText(shown, fileCount) {
  let last = null;
  for (const f of shown) {
    if (last !== null && last !== f.file) console.log("");
    last = f.file;
    console.log(`${f.file}:${f.line}  ${f.level}  ${f.ruleId}  ${f.message} — ${f.fix}  (기준: ${f.doc})`);
  }
  const count = (level) => shown.filter((f) => f.level === level).length;
  console.log(
    `${shown.length > 0 ? "\n" : ""}error ${count("error")} · warn ${count("warn")} · info ${count("info")} — 파일 ${fileCount}개 검사`,
  );
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.rules) {
    printRules();
    return 0;
  }
  const files = collect(opts.targets);
  const sources = files.map((file) => {
    try {
      return { path: file, text: readFileSync(file, "utf8") };
    } catch (error) {
      throw new UsageError(`${file}: 읽을 수 없다 (${error.code ?? error.message})`);
    }
  });
  const results = scanSources(sources);
  const shown = results.filter((r) => levelRank(r.level) <= levelRank(opts.level));
  if (opts.json) console.log(JSON.stringify(shown, null, 2));
  else printText(shown, files.length);
  return results.some((r) => r.level === "error") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof UsageError ? `${error.message}\n\n${USAGE}` : error.message);
    process.exitCode = USAGE_ERROR_CODE;
  }
}
