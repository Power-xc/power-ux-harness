import { R, rx, lineHits, has } from "./helpers.mjs";

const GLYPH_LABEL =
  /^\s*(?:x|×|icon|아이콘|trash|trash ?can|휴지통|bin|cross|pencil|연필|gear|톱니바퀴?|hamburger|햄버거|chevron(?:[- ]\w+)?|arrow(?:[- ]\w+)?)\s*$|\bicon\b|아이콘/i;

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

function imeEnter(ctx) {
  const text = ctx.lines.join("\n");
  const keys = /onKeyDown|keydown/i.test(text) || /@keydown\.enter/.test(text);
  if (!keys || /isComposing|keyCode\s*===?\s*229|\.which\s*===?\s*229/.test(text)) return [];
  return lineHits(ctx, /["']Enter["']|keyCode\s*===?\s*13|@keydown\.enter|v-on:keydown\.enter/);
}

const TAB_ORDER_OUT = /tabIndex\s*=\s*\{\s*-1\s*\}|tabindex\s*=\s*["']-1["']/i;
const MAX_TAG_LINES = 8;

// 같은 줄이나 같은 여는 태그에 tabindex -1 이 있으면 프로그램으로만 초점을 받는 요소다
function programmaticFocusOnly(ctx, i) {
  let from = i;
  while (from > 0 && i - from < MAX_TAG_LINES && !/<[A-Za-z]/.test(ctx.lines[from])) from -= 1;
  let to = i;
  while (to < ctx.lines.length - 1 && to - i < MAX_TAG_LINES && !/>/.test(ctx.lines[to])) to += 1;
  return TAB_ORDER_OUT.test(ctx.lines.slice(from, to + 1).join(" "));
}

export const A11Y_RULES = [
  R({
    id: "a11y-outline-none",
    level: "warn",
    scope: "file",
    exts: null,
    message: "포커스 윤곽을 지웠는데 같은 파일에 focus-visible 이 없다",
    fix: ":focus-visible 로 대신할 윤곽을 둔다",
    test: (ctx) =>
      has(ctx, /focus-visible/)
        ? []
        : lineHits(ctx, /(?<![\w-])outline\s*:\s*(?:none|0)(?![\w.%])|(?<![\w-])outline-none(?![\w-])/).filter(
            (i) => !programmaticFocusOnly(ctx, i),
          ),
    examples: {
      hit: [{ ext: ".css", text: "button:focus { outline: none; }" }],
      miss: [
        { ext: ".css", text: "button:focus { outline: none; }\nbutton:focus-visible { outline: 2px solid; }" },
        '<h2 ref={headingRef} tabIndex={-1} className="focus:outline-none">',
        '<h2\n  tabindex="-1"\n  class="outline-none"\n>',
      ],
    },
  }),
  R({
    id: "a11y-div-onclick",
    level: "warn",
    scope: "line",
    message: "div·span 에 클릭 핸들러를 달았다",
    fix: "button 이나 a 로 바꾼다. 키보드·보조기기가 쓸 수 있다",
    test: rx(/<(?:div|span)\b[^>]*?\s(?:onClick|onclick|@click|v-on:click|on:click)\b/),
    examples: { hit: ["<div onClick={open}>열기</div>"], miss: ["<button onClick={open}>열기</button>"] },
  }),
  R({
    id: "a11y-role-no-key",
    level: "warn",
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
    scope: "line",
    message: 'aria-live="assertive" 를 쓴다',
    fix: "polite 로 두고 사용자의 작업을 끊어야 할 때만 assertive 를 쓴다",
    test: rx(/aria-live\s*=\s*\{?\s*["']assertive["']/),
    examples: { hit: ['<div aria-live="assertive">'], miss: ['<div aria-live="polite">'] },
  }),
  R({
    id: "a11y-img-no-alt",
    level: "error",
    scope: "line",
    message: "img 에 alt 가 없다",
    fix: '내용 이미지는 설명을, 장식 이미지는 alt="" 를 적는다',
    test: emptyAlt,
    examples: { hit: ['<img src="a.png" />'], miss: ['<img src="a.png" alt="" />', '<img src="a.png" {...rest} />'] },
  }),
  R({
    id: "a11y-zoom-block",
    level: "error",
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
    scope: "line",
    message: "알림 영역(role=status·alert, aria-live)을 조건부로 그린다",
    fix: "빈 영역을 먼저 그려 두고 안의 글만 바꾼다",
    test: rx(/&&\s*<[^>]*(?:role\s*=\s*["'](?:status|alert)["']|aria-live)/),
    examples: { hit: ['{error && <p role="alert">{error}</p>}'], miss: ['<p role="alert">{error}</p>'] },
  }),
  R({
    id: "a11y-drag-alternative",
    level: "info",
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
    scope: "file",
    message: "keydown 에서 Enter 를 처리하는데 한글 조합 중 확인(isComposing)이 없다",
    fix: "e.nativeEvent.isComposing 이면 건너뛴다. 조합 중 Enter 가 두 번 처리된다",
    test: imeEnter,
    examples: {
      hit: ['<input onKeyDown={(e) => e.key === "Enter" && send()} />'],
      miss: ['<input onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()} />'],
    },
  }),
];
