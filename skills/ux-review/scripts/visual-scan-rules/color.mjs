// visual-scan-disable-file: 규칙 예시 문자열이 있어 스캐너가 이 파일을 건너뛴다
import { COMPONENT_EXTS, BLOCK_EXTS, R, rx, lineHits, has } from "./helpers.mjs";
import { chain, underAtRule, isSelector, eachDecl } from "./css-blocks.mjs";

const COLOR_NAMES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const HEX = "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b";

const COLOR_FN = "(?<![\\w-])(?:rgba?|hsla?|oklch|oklab)\\((?!\\s*var\\()";

const COLOR_LITERAL_COMPONENT = new RegExp(`(?<![&\\w])${HEX}|${COLOR_FN}`);

const COLOR_LITERAL_CSS = new RegExp(`${HEX}|${COLOR_FN}`, "i");

const MAX_SAFE_CHROMA = 0.2;

const TEXT_ALPHA = new RegExp(
  "(?<![\\w-])text-(?!(?:xs|sm|base|lg|xl|\\dxl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)\\b)" +
    "(?!\\[[\\d.]+(?:px|rem|em)\\])[\\w[\\]#.-]+\\/\\d+",
);

function gamutNoFallback(ctx) {
  return eachDecl(ctx, (block, decl, index) => {
    const m = decl.text.match(/oklch\(\s*[\d.]+%?\s+([\d.]+)/);
    if (!m || Number(m[1]) <= MAX_SAFE_CHROMA || underAtRule(block, /color-gamut/)) return false;
    return !block.own.slice(0, index).some((d) => /#[0-9a-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?)\(/i.test(d.text));
  });
}

export const COLOR_RULES = [
  R({
    id: "color-literal-in-component",
    level: "warn",
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
];
