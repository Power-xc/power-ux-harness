// visual-scan-disable-file: 규칙 예시 문자열이 있어 스캐너가 이 파일을 건너뛴다
import { BLOCK_EXTS, R, rx, lineHits, has } from "./helpers.mjs";
import { underAtRule, isSelector, eachDecl } from "./css-blocks.mjs";

const GPU_PROPS = new Set(["transform", "translate", "scale", "rotate", "opacity", "filter", "auto"]);

const MIN_PRESS_SCALE = 0.96;

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

export const UI_RULES = [
  R({
    id: "ui-transition-all",
    level: "warn",
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
    scope: "line",
    message: "will-change: all 을 쓴다",
    fix: "움직일 속성(transform·opacity)만 적거나 지운다",
    test: rx(/will-?change['"]?\s*:\s*['"]?all\b/i),
    examples: { hit: ["will-change: all;"], miss: ["will-change: transform;"] },
  }),
  R({
    id: "ui-will-change-other",
    level: "warn",
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
    scope: "line",
    message: "SVG 의 fill·stroke 에 색 값을 박았다",
    fix: "currentColor 로 쓰고 색은 글자색에서 받는다",
    test: rx(/(?<![\w-])(?:fill|stroke)=\{?["']#[0-9a-fA-F]{3,8}["']/),
    examples: { hit: ['<path fill="#000" />'], miss: ['<path fill="currentColor" />'] },
  }),
  R({
    id: "ui-image-outline-tint",
    level: "warn",
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
];
