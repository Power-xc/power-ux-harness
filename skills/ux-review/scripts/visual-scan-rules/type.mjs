// visual-scan-disable-file: 규칙 예시 문자열이 있어 스캐너가 이 파일을 건너뛴다
import { COMPONENT_EXTS, HANGUL, R, rx, lineHits, has } from "./helpers.mjs";
import { isSelector, eachDecl } from "./css-blocks.mjs";

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

const firstHangulLine = (file) => file.lines.findIndex((l) => HANGUL.test(l));

const SCREEN_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte", ".html"]);

const REACT_NATIVE = /from\s*["']react-native["']/;
const MIN_FONT_PX = 16;
const ROOT_FONT_PX = 16;

const px = (value, unit) => (unit === "px" ? Number(value) : Number(value) * ROOT_FONT_PX);

export const TYPE_RULES = [
  R({
    id: "type-variation-wght",
    level: "warn",
    scope: "line",
    message: "font-variation-settings 로 wght·opsz 를 직접 지정한다",
    fix: "font-weight·font-optical-sizing 속성으로 바꾼다",
    test: rx(/font-variation-settings['"]?\s*:[^;]*["'](?:wght|opsz)["']/),
    examples: { hit: ['font-variation-settings: "wght" 450;'], miss: ['font-variation-settings: "wdth" 90;'] },
  }),
  R({
    id: "type-feature-tnum",
    level: "warn",
    scope: "line",
    message: "font-feature-settings 로 tnum·zero 를 켠다",
    fix: "font-variant-numeric: tabular-nums·slashed-zero 로 바꾼다",
    test: rx(/font-feature-settings['"]?\s*:[^;]*["'](?:tnum|zero)["']/),
    examples: { hit: ['font-feature-settings: "tnum" 1;'], miss: ['font-feature-settings: "liga" 0;'] },
  }),
  R({
    id: "type-line-height-unit",
    level: "warn",
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
    scope: "line",
    message: "letter-spacing 이 px 단위다",
    fix: "글자 크기에 비례하도록 em 단위로 쓴다",
    test: rx(/(?<![\w-])letter-?spacing['"]?\s*:\s*['"]?-?[\d.]+px|(?<![\w-])tracking-\[-?[\d.]+px\]/i),
    examples: { hit: ["letter-spacing: 1px;", '<h1 className="tracking-[2px]">'], miss: ["letter-spacing: 0.02em;"] },
  }),
  R({
    id: "type-thin-weight",
    level: "info",
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
    scope: "line",
    message: "text-align: justify 를 쓴다",
    fix: "왼쪽 정렬(start)로 둔다. 글자 사이 틈이 벌어진다",
    test: rx(/text-align\s*:\s*justify|(?<![\w-])text-justify(?![\w-])/),
    examples: { hit: ["text-align: justify;", '<p className="text-justify">'], miss: ["text-align: center;"] },
  }),
  R({
    id: "type-line-clamp-box",
    level: "warn",
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
    scope: "line",
    message: "text-decoration-skip-ink: none 을 쓴다",
    fix: "기본값(auto)으로 둔다. 밑줄이 글자 아래 획과 겹친다",
    test: rx(/text-decoration-skip-ink\s*:\s*none/),
    examples: { hit: ["text-decoration-skip-ink: none;"], miss: ["text-decoration-skip-ink: auto;"] },
  }),
  R({
    id: "type-font-synthesis-none",
    level: "warn",
    scope: "line",
    message: "font-synthesis: none 을 쓴다",
    fix: "필요한 굵기·기울임 글꼴 파일을 싣고 이 선언은 지운다",
    test: rx(/font-synthesis\s*:\s*none/),
    examples: { hit: ["font-synthesis: none;"], miss: ["font-synthesis: weight;"] },
  }),
  R({
    id: "type-user-select-none",
    level: "info",
    scope: "line",
    message: "user-select: none 으로 글자 선택을 막는다",
    fix: "버튼 라벨 같은 조작 요소에만 쓰고 읽을 글에는 쓰지 않는다",
    test: rx(/user-select\s*:\s*none|(?<![\w-])select-none(?![\w-])/),
    examples: { hit: ["user-select: none;", '<div className="select-none">'], miss: ["user-select: text;"] },
  }),
  R({
    id: "type-ascii-ellipsis",
    level: "warn",
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
    scope: "project",
    message: "한글 화면이 있는데 word-break: keep-all 이 어디에도 없다",
    fix: '본문 루트에 word-break: keep-all(break-keep)을 둔다. 한국어 화면 기준. React Native 파일은 뺀다(iOS 는 lineBreakStrategyIOS="hangul-word")',
    test: (files) => {
      const screen = files.find(
        (f) => SCREEN_EXTS.has(f.ext) && firstHangulLine(f) >= 0 && !REACT_NATIVE.test(f.lines.join("\n")),
      );
      const keepAll = files.some((f) =>
        /word-break\s*:\s*keep-all|(?<![\w-])break-keep(?![\w-])/.test(f.lines.join("\n")),
      );
      return screen && !keepAll ? [{ file: screen.path, line: firstHangulLine(screen) }] : [];
    },
    examples: {
      hit: [{ files: { "a.tsx": "<p>안녕하세요</p>" } }],
      miss: [
        { files: { "a.tsx": "<p>안녕하세요</p>", "a.css": "body { word-break: keep-all; }" } },
        { files: { "a.tsx": 'import { Text } from "react-native";\n<Text>안녕하세요</Text>' } },
      ],
    },
  }),
];
