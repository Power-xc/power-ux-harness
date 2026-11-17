// visual-scan-disable-file: 규칙 예시 문자열이 있어 스캐너가 이 파일을 건너뛴다
import { COMPONENT_EXTS, R, rx } from "./helpers.mjs";

function vhHits(ctx) {
  const re = /(?<![\w-])(?:min-)?height['"]?\s*:\s*['"]?100vh\b|(?<![\w-])(?:min-)?h-(?:screen|\[100vh\])(?![\w-])/;
  return ctx.lines.flatMap((l, i) => {
    if (!re.test(l) || /dvh/.test(l)) return [];
    const block = ctx.lineBlock[i];
    return block?.own.some((d) => /dvh/.test(d.text)) ? [] : [i];
  });
}

function minWidthZero(line) {
  const grid = line.match(/grid-template-columns['"]?\s*:\s*['"]?([^;'"}]*)/);
  const stripped = grid ? grid[1].replace(/minmax\([^)]*\)/g, "") : "";
  if (/(?<![\d.])1fr\b/.test(stripped)) return true;
  const arbitrary = line.match(/grid-cols-\[([^\]]*)\]/);
  return Boolean(arbitrary) && !/minmax\(0/.test(arbitrary[1]) && /(?<![\d.])1fr\b/.test(arbitrary[1]);
}

export const LAYOUT_RULES = [
  R({
    id: "layout-100vw",
    level: "warn",
    scope: "line",
    message: "width: 100vw 를 쓴다",
    fix: "100% 로 쓴다. 세로 스크롤바 폭만큼 가로 스크롤이 생긴다",
    test: rx(/(?<![\w-])width['"]?\s*:\s*['"]?100vw\b|(?<![\w-])w-(?:screen|\[100vw\])(?![\w-])/),
    examples: { hit: ["width: 100vw;", '<div className="w-screen">'], miss: ["width: 100%;"] },
  }),
  R({
    id: "layout-100vh",
    level: "warn",
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
    scope: "line",
    message: "float: left·right 처럼 물리 방향을 쓴다",
    fix: "float: inline-start·inline-end 로 바꾼다. RTL 에서 뒤집힌다",
    test: rx(/(?<![\w-])float\s*:\s*(?:left|right)\b|(?<![\w-])float-(?:left|right)(?![\w-])/),
    examples: { hit: ["float: left;", '<img className="float-right">'], miss: ["float: inline-start;"] },
  }),
  R({
    id: "layout-order-change",
    level: "info",
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
];
