# 표면·아이콘·움직임 값

출처: jakubkrehel/skills(커밋 6c21201, MIT, Copyright (c) 2026 Jakub Krehel)의 `better-ui` — SKILL.md, surfaces.md, animations.md, enter-exit.md, icon-transitions.md, icons.md, performance.md. 원문 문장을 복사하지 않고 이 하네스의 절차에 맞게 다시 썼다. 값은 원본과 같다. 한국어 화면 기준으로 더한 항목은 없다.

설계서에서 모서리·그림자·아이콘·움직임의 정확한 값을 정할 때(`ux-spec`)와 만든 화면의 시각 디테일을 점검할 때(`ux-review`) 같은 문서를 기준으로 쓴다. 밑바탕 상호작용이 먼저 제대로 되어 있어야 하고, 다듬기 finding은 고장 난 상호작용보다 앞서지 않는다. 글자 줄바꿈·숫자 폭은 [`visual-type.md`](./visual-type.md), 간격·중단점·공간적 RTL은 [`visual-layout.md`](./visual-layout.md), 색 토큰과 대비는 [`visual-color.md`](./visual-color.md), 누르는 영역·키보드·ARIA·움직임 줄이기 요구는 `ux-a11y`가 맡는다.

판정 원칙:

- 값은 정확한 값이다. 근사하지 않는다. `cubic-bezier(0.2, 0, 0, 1)`은 `cubic-bezier(0.4, 0, 0.2, 1)`과 다르고 `0.96`은 `0.95`와 다르다.
- 광학 보정(2절)과 겹 모서리의 24px 상한만 눈으로 판단하는 시작값이다.
- 프로젝트의 컴포넌트 라이브러리·토큰·밀도를 유지하고, 이 문서가 값을 주지 않는 곳은 프로젝트의 움직임 언어를 따른다. 그림자를 쓰지 않는 스타일처럼 일관된 선택은 취향이지 finding이 아니다. 같은 디테일을 프로젝트 안에서 두 방식으로 하면 finding이다.
- 프로젝트가 정한 곡선이 있으면 그 곡선을 쓰고, 정해진 것이 없으면 이 문서 값(ease-out)을 쓴다. 퇴장이 등장보다 짧은 것은 공통이다.

## 1. 겹 모서리: 바깥 = 안쪽 + 여백 + 테두리

중첩된 면이 눈에 보이는 고른 안쪽 여백을 공유하면 바깥 반지름은 안쪽 반지름 + 여백 + 테두리 두께다.

```
outerRadius = innerRadius + padding + borderWidth
```

```css
/* 좋음: 겹 반지름 */
.card {
  border-radius: 20px; /* 12 + 8 */
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}

/* 나쁨: 둘 다 같은 반지름 */
.card {
  border-radius: 12px;
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}
```

```tsx
// 좋음: 바깥 반지름이 여백을 반영
<div className="rounded-2xl p-2">       {/* 반지름 16px, 여백 8px */}
  <div className="rounded-lg">          {/* 반지름 8px = 16 - 8 */}
    ...
  </div>
</div>

// 나쁨: 둘 다 같은 반지름
<div className="rounded-xl p-2">
  <div className="rounded-xl">
    ...
  </div>
</div>
```

여백이 `24px`을 넘거나 일부러 비대칭이면 두 겹을 별개 면으로 보고 각 면의 반지름 토큰을 둔다.

## 2. 광학 정렬

기하학적 중앙이 어색해 보이는 곳은 눈으로 맞춘다.

- 글자와 아이콘이 있는 버튼: 아이콘 쪽 여백을 글자 쪽보다 `2px` 덜 준다(16/14에서 시작해 눈으로 확인). 같은 여백이면 아이콘이 바깥으로 밀려 보인다.

```css
/* 좋음: 뒤쪽 아이콘 쪽 여백이 적다 */
.button-with-icon {
  padding-inline-start: 16px;
  padding-inline-end: 14px;
}

/* 나쁨: 같은 여백은 아이콘을 바깥으로 민다 */
.button-with-icon {
  padding-inline: 16px;
}
```

```tsx
// Tailwind
<button className="ps-4 pe-3.5 flex items-center gap-2">
  <span>계속</span>
  <ArrowRightIcon />
</button>
```

- 재생 삼각형: 기하학적 중심이 시각 중심보다 왼쪽이므로 뾰족한 쪽으로 `2px` 민다. 재생 아이콘은 뒤집히지 않으므로 물리 방향을 일부러 쓴다.

```css
.play-button svg {
  transform: translateX(2px); /* 재생 아이콘은 뒤집지 않으므로 물리 값 */
}
```

- 무게가 쏠린 아이콘(별·화살표·캐럿): SVG의 `viewBox`나 경로에서 고쳐서 컴포넌트가 따로 보정하지 않게 한다. 에셋을 못 고치면 감싸는 요소를 `1px` 민다.

```tsx
<span className="translate-x-px">
  <StarIcon />
</span>
```

## 3. 깊이: 그림자, 테두리, 이미지 외곽선

깊이만을 위한 테두리는 겹친 투명 `box-shadow`로 바꾼다. 테두리를 남기는 곳은 구분선·표 칸·선택 상태, 그리고 경계가 3:1 비글자 대비를 요구하는 입력 칸이다. 포커스 링은 `ux-a11y`가 맡는다.

밝은 모드는 3겹이다. 첫 겹은 1px 링, 둘째는 들림, 셋째는 주변 깊이다.

```css
:root {
  --shadow-border:
    0px 0px 0px 1px oklch(0 0 0 / 0.06), 0px 1px 2px -1px oklch(0 0 0 / 0.06), 0px 2px 4px 0px oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px oklch(0 0 0 / 0.08), 0px 1px 2px -1px oklch(0 0 0 / 0.08), 0px 2px 4px 0px oklch(0 0 0 / 0.06);
}
```

어두운 모드는 깊이 그림자가 어두운 바탕에서 사라지므로 흰 링 하나를 둔다. 프로젝트의 어두운 선택자 아래에서 다시 정의한다.

```css
--shadow-border: 0 0 0 1px oklch(1 0 0 / 0.08);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
```

사용: 강제 색 모드는 `box-shadow`를 모두 지운다. 그림자 링 아래에 `border: 1px solid transparent`를 두어 그 모드에서도 가장자리가 그려지게 한다. 투명 테두리는 대체한 테두리와 상자 크기를 같게 유지한다.

```css
.card {
  border: 1px solid transparent; /* 강제 색 모드는 box-shadow를 버리고 이 테두리를 그린다 */
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.card:hover {
  box-shadow: var(--shadow-border-hover);
}
```

이미지 외곽선: 콘텐츠 이미지에는 1px 외곽선을 1px 안쪽으로 둔다. 밝은 모드는 `oklch(0 0 0 / 0.1)`, 어두운 모드는 `oklch(1 0 0 / 0.1)`이다. 팔레트의 근검정·색이 든 무채색·강조색은 쓰지 않는다. 색이 이미지 가장자리에 색 테두리로 비치기 때문이다. 로고·일러스트 같은 투명 그림은 제외한다.

```css
:root {
  --image-outline: oklch(0 0 0 / 0.1);
}
/* 프로젝트의 어두운 선택자 아래에서 다시 정의 */
--image-outline: oklch(1 0 0 / 0.1);

.content-image {
  outline: 1px solid var(--image-outline);
  outline-offset: -1px;
}
```

```tsx
<img className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" src={src} alt={alt} />
```

- `outline-slate-*`·`outline-zinc-*`·`outline-neutral-*`나 `#111827` 같은 팔레트 근검정은 쓰지 않는다.
- `border` 대신 `outline`을 쓰는 이유는 이미지 크기를 바꾸지 않기 때문이다. `outline-offset: -1px`이면 가장자리 안쪽에 앉고 모서리 반지름을 따른다.

## 4. 인터랙션 전환: transition, 누름, 빈도

상호작용 상태 변화는 CSS transition이나 모션 라이브러리의 스프링으로 만든다. 사용자가 중간에 되돌리면 방향을 바꾼다. keyframes는 정해진 시간선을 돌고 되돌릴 수 없으므로 한 번 도는 시퀀스에만 쓴다.

|               | CSS transition                | CSS keyframes                   |
| ------------- | ----------------------------- | ------------------------------- |
| 동작          | 최신 상태로 보간한다          | 고정 시간선에서 돈다            |
| 중간에 끊기면 | 중간에서 방향을 바꿔 되돌린다 | 튀거나 처음부터 다시 시작한다   |
| 쓰임          | 호버·토글·열고 닫기           | 등장·로딩처럼 한 번 도는 시퀀스 |

```css
/* 좋음: 움직이는 중에 다시 눌러도 부드럽게 되돌아간다 */
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease-out;
}
.drawer.open {
  transform: translateX(0);
}

/* 나쁨: 움직이는 중에 닫으면 튄다 */
.drawer.open {
  animation: slideIn 200ms ease-out forwards;
}
```

눌림: 누른 버튼은 `150ms`, `ease-out`으로 `0.96`까지 줄고, 비활성 버튼은 줄지 않는다. 움직임이 방해가 되는 버튼에는 끄는 옵션을 둔다(컴포넌트의 변형 API나 `static` prop).

```css
.button {
  transition-property: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.button:not(:disabled):active {
  scale: 0.96;
}
```

```tsx
// Tailwind
<button className="transition-transform duration-150 ease-out enabled:active:scale-[0.96]">
  누르기
</button>

// Motion
<motion.button whileTap={disabled ? undefined : { scale: 0.96 }} disabled={disabled}>
  누르기
</motion.button>
```

버튼에 변형 API가 없으면 `static` prop으로 클래스를 조건부로 붙인다.

```tsx
const tapScale = "enabled:active:scale-[0.96]";

function Button({ static: isStatic, className, children, ...props }) {
  return (
    <button className={cn("transition-transform duration-150 ease-out", !isStatic && tapScale, className)} {...props}>
      {children}
    </button>
  );
}

// 사용
<Button>누르기</Button>           {/* 누르면 줄어든다 */}
<Button static>제출</Button>       {/* 줄지 않는다 */}
```

빈도:

- 자주 일어나는 상호작용(타자·줄 호버·탭 전환)은 즉시 반응하거나 `150ms` 이하의 `opacity`·`background-color` 전환을 쓴다.
- 표현적 움직임은 드문 순간에 쓴다. 화면의 첫 로드, 성공 상태, 빈 상태가 그렇다.
- 움직이는 모든 상태 변화 뒤에는 정지 단서(색·아이콘·글)가 남는다. 움직임이 유일한 피드백 경로가 되면 안 된다.

```css
/* 좋음: 자주 일어나는 호버에는 최소한의 전환 */
.row:hover {
  background-color: var(--surface-hover);
  transition: background-color 100ms ease-out;
}

/* 나쁨: 호버할 때마다 전체 등장이 다시 재생된다 */
.row:hover .row-icon {
  animation: bounceIn 500ms;
}
```

## 5. 움직임 줄이기 게이트

요구 사항 자체는 `ux-a11y`가 정한다. 이 문서의 어떤 레시피도 이 게이트 없이 쓰지 않는다. 이동·크기·흐림은 `prefers-reduced-motion: no-preference` 안에서만 돈다. 줄이기 설정에서는 요소를 곧바로 없애지 않고 opacity 교차 페이드로 대체한다.

opacity 페이드는 모두에게 돌고, 이동·크기·흐림은 설정이 없을 때만 더해진다.

```css
.panel {
  transition: opacity 150ms ease-out;
}

@media (prefers-reduced-motion: no-preference) {
  .panel {
    transition-property: opacity, translate, scale, filter;
    transition-duration: 300ms;
  }
}
```

- Tailwind: 이동·크기·흐림 유틸리티 앞에 `motion-safe:`를 붙인다.
- Motion: 앱을 `<MotionConfig reducedMotion="user">`로 감싼다. 설정이 켜지면 transform과 레이아웃 애니메이션이 꺼지고 opacity는 남는다. blur는 그래도 도므로 레시피가 `filter`를 움직이는 곳에서는 `useReducedMotion()`으로 분기한다.

## 6. 등장

단계별 등장은 드문 순간(첫 화면 등장)에만 쓰고 일상 상호작용에는 금지다. 내용이 순서로 위계를 전달할 때, 뜻 묶음(제목·설명·행동)으로 나눠서 쓴다.

1. 내용을 뜻 묶음으로 나눈다.
2. 묶음을 `100ms` 간격으로 엇갈린다.
3. 짧은 큰 제목을 낱말로 나눠 읽히게 하려면 낱말을 `80ms` 간격으로 엇갈린다.
4. 묶음마다 `opacity` + 흐림 `4px` + `translateY` `12px`를 `300ms`, `ease-out`으로 합친다.

```tsx
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

function PageHeader() {
  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
      <motion.h1 variants={item}>환영합니다</motion.h1>
      <motion.p variants={item}>화면 설명입니다.</motion.p>
      <motion.div variants={item}>
        <Button>시작하기</Button>
      </motion.div>
    </motion.div>
  );
}
```

CSS: 숨김 상태는 `from` 키프레임에 두고 `animation-fill-mode: both`를 쓴다. 애니메이션이 돌지 않는 항목은 보이는 채로 남는다. 줄이기 설정에서는 opacity 키프레임만 남는다.

```css
.stagger-item {
  animation: fade-in 300ms ease-out both;
}

@media (prefers-reduced-motion: no-preference) {
  .stagger-item {
    animation-name: fade-in-up;
  }
}

.stagger-item:nth-child(2) {
  animation-delay: 100ms;
}
.stagger-item:nth-child(3) {
  animation-delay: 200ms;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
    filter: blur(4px);
  }
}
```

`display: none`에서 등장: 팝오버·대화상자처럼 `display: none`에서 켜지는 요소는 전환할 이전 스타일이 없다. `@starting-style`이 이전 스타일을 주고 `transition-behavior: allow-discrete`가 퇴장 동안 렌더를 유지한다. 열린 상태의 시간이 등장에, 닫힌 상태의 시간이 퇴장에 적용된다.

```css
[popover] {
  opacity: 0;
  transition-property: opacity, display, overlay;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
  transition-behavior: allow-discrete;
}

[popover]:popover-open {
  opacity: 1;
  transition-duration: 300ms;
}

@starting-style {
  [popover]:popover-open {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: no-preference) {
  [popover] {
    translate: 0 12px;
    transition-property: opacity, translate, display, overlay;
  }

  [popover]:popover-open {
    translate: 0 0;
  }

  @starting-style {
    [popover]:popover-open {
      translate: 0 12px;
    }
  }
}
```

`@starting-style`과 `display`의 불연속 전환은 Baseline 2024다. `overlay`는 Chromium에서만 되고 미지원 브라우저는 즉시 보이고 사라진다.

## 7. 퇴장

퇴장은 등장보다 짧고 작다. `opacity` + 흐림 `4px` + 고정 `-12px` `translateY`를 `150ms`, `ease-out`으로 한다. 컨테이너 전체 높이로 날리지 않는다.

```tsx
<motion.div
  exit={{
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: { duration: 0.15, ease: "easeOut" },
  }}
>
  {content}
</motion.div>
```

끝까지 미는 퇴장은 목적지가 뜻을 가질 때만 쓴다(카드가 목록으로 돌아감, 서랍이 닫힘). `200ms`다.

```tsx
<motion.div
  exit={{
    opacity: 0,
    x: "-100%",
    transition: { duration: 0.2, ease: "easeOut" },
  }}
>
  {content}
</motion.div>
```

```css
/* 좋음: 작은 퇴장 */
.item-exit {
  opacity: 0;
  transform: translateY(-12px);
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

/* 나쁨: 시선을 빼앗는 큰 퇴장 */
.item-exit {
  opacity: 0;
  transform: translateY(-100%) scale(0.5);
  transition: all 400ms ease-out;
}

/* 움직임이 정보를 주지 못하면 바로 제거하는 것이 맞다 */
.item-exit {
  display: none;
}
```

## 8. 첫 렌더에서 상태 애니메이션 건너뛰기

상태를 바꿔 끼우는 `AnimatePresence`에는 `initial={false}`를 두어 기본 상태가 마운트 때 등장하지 않게 한다. 아이콘 교체·토글·탭·세그먼트 컨트롤처럼 첫 로드에 기본 상태가 있는 것에 맞다.

의도한 첫 등장(단계별 히어로)을 감싸는 곳에는 쓰지 않는다. 그 등장을 통째로 건너뛴다. 넣기 전에 전체 새로 고침으로 컴포넌트를 확인한다.

```tsx
// 나쁨: initial={false}가 단계별 페이지 등장을 건너뛴다
<AnimatePresence initial={false}>
  <motion.div initial="hidden" animate="visible" variants={...}>
    ...
  </motion.div>
</AnimatePresence>
```

## 9. 아이콘 교차 페이드

드문 상태 변화로 아이콘이 바뀔 때(재생 → 일시정지, 복사 → 복사됨) 교차 페이드한다. scale `0.25` → `1`, opacity `0` → `1`, blur `4px` → `0px`이다. 모션 라이브러리가 있으면 `{ type: "spring", duration: 0.3, bounce: 0 }`이고 bounce는 항상 `0`이다. 라이브러리가 없으면 두 아이콘을 DOM에 두고 `300ms`, `cubic-bezier(0.2, 0, 0, 1)`로 교차 페이드한다. 탭 아이콘 교체와 줄 호버로 나타나는 행동은 4절의 빈도 규칙이라 즉시 바꾼다.

| 애니메이션을 준다                                               | 주지 않는다                      |
| --------------------------------------------------------------- | -------------------------------- |
| 드문 상태 교체(재생 → 일시정지, 좋아요 → 좋아함, 복사 → 복사됨) | 목록 줄에서 호버로 나타나는 행동 |
| 선택하면 나타나는 툴바의 아이콘                                 | 탭·내비게이션 아이콘 교체        |
| 로딩·성공 표시                                                  | 장식용이거나 늘 보이는 아이콘    |

어떤 라이브러리인지는 `package.json`에서 본다. `motion`이 설치되어 있으면 `"motion/react"`에서, `framer-motion`이면 `"framer-motion"`에서 가져온다. 둘 다 있으면 컴포넌트나 가까운 이웃이 이미 쓰는 import를 따른다. 둘 다 없으면 CSS 교차 페이드를 쓰고, 아이콘 전환만을 위해 의존성을 더하지 않는다.

```tsx
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

function IconButton({ isActive, icon: Icon }) {
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: "blur(4px)" };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: "blur(0px)" };
  return (
    <button>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isActive ? "active" : "inactive"}
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
```

`initial={false}`는 기본 아이콘이 마운트 때 등장하지 않게 한다. `useReducedMotion()`은 줄이기 설정에서 scale과 blur를 빼서 opacity 교차 페이드만 돌게 한다.

CSS(두 아이콘을 DOM에): 둘이 한 grid 칸에 마운트되어 등장과 퇴장이 모두 움직이고 큰 아이콘이 크기를 정한다. `motion-reduce:` 클래스가 줄이기 설정에서 opacity 페이드만 남긴다.

```tsx
const layer = cn(
  "[grid-area:1/1] transition-[opacity,filter,scale] duration-300",
  "ease-[cubic-bezier(0.2,0,0,1)]",
  "motion-reduce:scale-100 motion-reduce:blur-[0px]",
);
const shown = "scale-100 opacity-100 blur-[0px]";
const hidden = "scale-[0.25] opacity-0 blur-[4px]";

function IconButton({ isActive, ActiveIcon, InactiveIcon }) {
  return (
    <button>
      <span className="grid place-items-center">
        <span className={cn(layer, isActive ? shown : hidden)}>
          <ActiveIcon />
        </span>
        <span className={cn(layer, isActive ? hidden : shown)}>
          <InactiveIcon />
        </span>
      </span>
    </button>
  );
}
```

Tailwind 4의 `scale-*`는 `scale` 속성을 쓰므로 `transition-[...scale]`이 움직인다. Tailwind 3의 것은 `transform`을 쓰므로 전환에 `transform`을 적는다.

## 10. 테마 전환 때 transition 끄기

테마를 바꿀 때 모든 transition을 끄고, 스타일 계산을 강제로 마치고, 다음 프레임 뒤 되돌린다. 아니면 모든 색 전환이 한꺼번에 돌아 전환이 번진다. 순서는 스타일 넣기 → 강제 스타일 계산 → 다음 프레임 뒤 제거다.

```tsx
"use client";

import { useEffect } from "react";

export function DisableThemeTransitions() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const style = document.createElement("style");
      style.append(document.createTextNode("*,*::before,*::after{transition:none !important}"));
      document.head.append(style);

      void document.body.offsetHeight; // 동기 스타일 계산을 강제한다

      requestAnimationFrame(() => {
        requestAnimationFrame(() => style.remove());
      });
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return null;
}
```

덮어쓰기가 문서에 남아 있는 동안 새 테마가 풀리므로 전환이 시작되지 않는다. 중첩한 `requestAnimationFrame`이 그 그리기 뒤에 덮어쓰기를 지운다. 이것은 OS 수준 변화다. 앱 안 토글도 자기 전환 둘레에 같은 순서(덮어쓰기 적용, 테마 바꿈, 계산 강제, 제거)를 둔다. `next-themes`는 이것을 `disableTransitionOnChange`로 낸다.

## 11. 성능: 전환 속성, `will-change`, 호버, 스크롤

`transition-property`는 바뀌는 것만 적는다. `transition: all`은 테마가 바뀔 때의 색처럼 아무도 의도하지 않은 속성까지 움직인다. `width`·`padding` 같은 레이아웃 속성에서는 프레임마다 레이아웃을 다시 돌린다. Tailwind의 맨 `transition`은 `all`이 아닌 정해진 목록이지만 대부분의 요소가 바꾸는 것보다 넓다.

```css
/* 좋음: 바뀌는 것만 */
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

/* 나쁨: 전부 */
.button {
  transition: all 150ms ease-out;
}
```

```tsx
// 좋음: 속성을 명시
<button className="transition-[scale,background-color] duration-150 ease-out">

// 나쁨: transition all
<button className="transition-all duration-150 ease-out">
```

Tailwind 4에서 `transition-transform`은 `transform, translate, scale, rotate`를 덮고 Tailwind 3에서는 `transform`만 덮는다. transform만 움직일 때 쓴다. transform과 다른 속성을 섞으면 `transition-[scale,opacity,filter]` 같은 대괄호 문법을 쓴다.

`will-change`는 첫 프레임이 끊기는 것을 본 뒤에만 쓰고, 움직이는 속성 이름을 적는다(`scale`은 `scale`, `transform`은 `transform`). 쓰기 전에 미리 넣지 않는다. 브라우저는 애니메이션이 시작될 때 요소를 합성 층으로 올리고 그 한 번의 승격이 첫 프레임에서 끊길 수 있다. 층이 늘 때마다 메모리가 든다. `all`은 쓰지 않는다.

```css
/* 좋음: 움직이는 속성 이름 */
.animated-card {
  will-change: scale, opacity;
}

/* 나쁨: all은 쓰지 않는다 */
.animated-card {
  will-change: all;
}

/* 나쁨: 합성되지 않는 속성 */
.animated-card {
  will-change: background-color, padding;
}
```

| 속성                                        | `will-change`를 쓸 만한가                    |
| ------------------------------------------- | -------------------------------------------- |
| `transform`, `translate`, `scale`, `rotate` | 그렇다                                       |
| `opacity`                                   | 그렇다                                       |
| `filter`                                    | 그렇다                                       |
| `clip-path`                                 | 드물게. 합성이 브라우저마다 믿을 만하지 않다 |
| `top`, `left`, `width`, `height`            | 아니다                                       |
| `background`, `border`, `color`             | 아니다                                       |

transform 계열이나 `filter`의 `will-change`는 그 요소를 자손의 `position: fixed` 기준 상자로 만들어, 안의 고정 모달·툴팁이 뷰포트에 고정되지 않는다. 이 값은 쌓임 맥락도 만들어 형제와의 `z-index` 순서를 바꿀 수 있다.

호버는 `@media (hover: hover)` 안에 둔다. 터치에서는 `:hover`가 탭한 뒤에도 남아 선택된 상태가 걸린 것처럼 읽힌다. Tailwind 4의 `hover:` 변형은 이미 그 쿼리 안에서 컴파일되고 Tailwind 3의 것은 그렇지 않다. 컨트롤이 직접 눌린 상태를 그리면 기본 회색 번쩍임이 겹치지 않도록 `-webkit-tap-highlight-color: transparent`를 둔다.

스크롤되는 대화상자·서랍·메뉴·옆 패널에는 `overscroll-behavior: contain`을 둔다. 끝까지 스크롤해도 뒤의 페이지가 스크롤되지 않게 한다.

## 12. 아이콘

아이콘의 렌더된 선 두께는 옆 글자의 굵기를 따른다. 값은 렌더 픽셀이다.

| 옆 글자                            | 렌더된 선 두께 |
| ---------------------------------- | -------------- |
| 보통(400), 14\~16px                | `1.5px`        |
| 중간·세미볼드(500\~600)            | `2px`          |
| 굵게(700), 또는 강조된 단독 아이콘 | `2.5px`        |

24px 격자 아이콘을 16px로 그리면 선 두께가 16/24로 줄어서 `stroke-width="2"`가 약 `1.33px`로 그려진다. 라이브러리의 절대 선 두께 옵션(Lucide `absoluteStrokeWidth`)이나 SVG 도형의 `vector-effect: non-scaling-stroke`를 쓴다.

```tsx
// 좋음: 세미볼드 라벨에 맞춘 선 두께
<button className="flex items-center gap-2 font-semibold">
  <Plus size={16} strokeWidth={2} absoluteStrokeWidth />
  새 프로젝트
</button>

// 나쁨: 굵은 라벨 옆의 1.5px 선
<button className="flex items-center gap-2 font-bold">
  <Plus size={16} strokeWidth={1.5} absoluteStrokeWidth />
  새 프로젝트
</button>
```

- 한 표면에는 아이콘 라이브러리 하나를 쓴다. 한 툴바에 라이브러리를 섞지 않는다. 라이브러리에 선 두께 변형이 없으면 기본 선 두께를 두고 크기나 색으로 강조한다.
- 글 속 아이콘은 옆 글자 크기의 `1em`\~`1.25em`으로 해서 함께 커지고 줄게 한다.

`currentColor`와 상태별 색: 모든 아이콘을 `currentColor`로 그리고 CSS 상태가 색을 바꾸게 한다. 가져올 때 `fill="#666"` 같은 고정 채움을 `currentColor`로 바꾼다. 호버·선택·비활성은 따로 에셋을 두지 않고 CSS 색과 opacity로 낸다. SVG 안에 `fill="#…"`을 두지 않는다.

```html
<svg fill="none" stroke="currentColor" stroke-width="2">…</svg>
```

```css
/* 프로젝트의 색 토큰을 쓴다 */
.icon-button {
  color: var(--icon-muted);
}
.icon-button:hover {
  color: var(--icon-strong);
}
.icon-button[aria-pressed="true"] {
  color: var(--icon-active);
}
.icon-button:disabled {
  opacity: 0.4;
}
```

```html
<!-- Tailwind, 프로젝트의 토큰 이름으로 -->
<button class="text-icon-muted hover:text-icon-strong aria-pressed:text-icon-active disabled:opacity-40">
  <BookmarkIcon />
</button>
```

외곽선은 기본이고 채움은 활성이다. 아이콘 세트가 외곽선과 채움 변형을 모두 내면 상태 짝으로 쓰고 섞어 쓰지 않는다.

| 변형   | 쓰임                                            |
| ------ | ----------------------------------------------- |
| 외곽선 | 툴바·목록 줄·글 속의 기본 상태                  |
| 채움   | 선택·활성 상태(활성 탭, 켜진 북마크, 누른 하트) |

```tsx
// 좋음: 변형이 상태를 전달한다
<TabIcon variant={isActive ? "solid" : "outline"} />

// 나쁨: 어디나 채움이라 활성 탭에 상태 신호가 없다
<TabIcon variant="solid" />
```

북마크·좋아요처럼 드문 변화에만 9절 값으로 교차 페이드한다. 활성 탭은 즉시 바꾼다.

렌더 크기에서 설계한다.

- 모든 아이콘을 가장 작게 그려지는 크기(대개 16px)에서 시험한다. 거기서 알아볼 수 있어야 한다.
- 작은 자리에는 자세한 그림을 줄이지 않고 단순한 글리프를 쓴다.
- 세트가 크기별 격자(`16`·`20`·`24`)를 내면 렌더 크기에 맞는 격자를 쓴다. 24px 그림을 16px로 줄이면 픽셀 격자에서 벗어나 흐리게 그려진다.
- 항상 SVG이고 래스터는 쓰지 않는다.

`dir="rtl"` 아이콘 뒤집기: 읽는 방향에 뜻이 묶인 아이콘만 뒤집고 나머지는 그대로 둔다.

| 뒤집는다                                 | 그대로 둔다                  |
| ---------------------------------------- | ---------------------------- |
| 앞·뒤 화살표, 내비게이션 쉐브론          | 로고·브랜드 마크             |
| 정렬·목록·들여쓰기 같은 글 덩어리 글리프 | 체크 표시                    |
| 스피커·소리 물결                         | 시계·컵·연필 같은 물건       |
| 「보내기」 같은 방향 글리프              | 미디어 재생(관례로 LTR 유지) |

요소마다 한 방식만 쓴다. 한 아이콘에 뒤집기가 둘이면 겹쳐서 다시 원래대로 돌아갈 수 있다. 합성 아이콘은 부분별로 따진다. 배지나 빗금 오버레이는 위치를 두고 바탕 글리프만 뒤집을 수 있다. 아이콘 버튼의 접근 가능한 이름은 `ux-a11y`다.

```css
[dir="rtl"] .icon-directional {
  scale: -1 1;
}
```

```tsx
// Tailwind
<ChevronRightIcon className="rtl:-scale-x-100" />
```

## 13. 끝내기 전 찾을 것

| 찾을 것                                                                                                             | 고칠 것                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 여백이 있는 부모와 자식이 같은 `rounded-*`·`border-radius`                                                          | 바깥 반지름에 여백을 더한다                                |
| 옆에 `border`가 없는 `box-shadow: 0 0 0 1px` 링                                                                     | `border: 1px solid transparent`                            |
| `img`의 `outline-slate-*`·`outline-zinc-*`나 hex 외곽선 색                                                          | `outline-black/10`과 `dark:outline-white/10`               |
| `transition-all`·`transition: all`                                                                                  | 바뀌는 속성을 적는다                                       |
| `:hover`·`.open` 같은 토글 클래스에 건 `animation:`                                                                 | 같은 속성에 transition                                     |
| `0.96` 아래의 `active:scale-95`·`scale-90`·`whileTap`                                                               | `0.96`                                                     |
| `:disabled` 제외 없는 `:active` 크기 조절                                                                           | `enabled:active:`나 `:not(:disabled):active`               |
| `0`이 아닌 `bounce:`                                                                                                | `bounce: 0`                                                |
| `animation`만 보이게 하는 기본 규칙의 `opacity: 0`                                                                  | 숨김 상태를 `from` 키프레임에, `animation-fill-mode: both` |
| `prefers-reduced-motion`·`motion-safe:`·`MotionConfig` 보호 없는 `translate`·`scale`·`filter`·`motion.*` 애니메이션 | 게이트를 두고 줄이기 설정에서는 opacity로 교차 페이드      |
| 테마 토글이 있는데 `disableTransitionOnChange`나 덮어쓰기 없는 색 전환                                              | 10절의 테마 전환 억제 순서                                 |
| `will-change: all`, 또는 움직이지 않는 요소의 `will-change`                                                         | 움직이는 속성 이름을 적거나 지운다                         |
| 아이콘 SVG 안의 `fill="#..."`·`stroke="#..."`                                                                       | `currentColor`                                             |
| `@media (hover: hover)` 밖의 일반 CSS `:hover`나 Tailwind 3 `hover:`                                                | 그 쿼리로 감싼다                                           |
| `overscroll-behavior` 없는 대화상자·서랍·메뉴의 `overflow: auto`·`overflow-y-auto`                                  | `overscroll-behavior: contain`                             |

## 14. 점검할 때 심각도와 확인

| 등급 | 기준                                                                      |
| ---- | ------------------------------------------------------------------------- |
| P1   | 상호작용이 깨진다. 되돌릴 수 없는 keyframes 토글, 터치에서 남는 호버 상태 |
| P2   | 표면·아이콘·움직임에서 눈에 보이는 불일치                                 |
| P3   | 한 곳에 그친 다듬기                                                       |

P1 중 둘은 표면이 작아도 바로 P1이다(원본이 등급을 올리는 조건으로 둔 항목).

- `prefers-reduced-motion`을 무시하는 움직임.
- 움직임만으로 전달하는 상태 변화.

코드가 있으면 `ux-review`의 `scripts/visual-scan.mjs`로 이 문서의 기계로 찾을 수 있는 항목을 먼저 훑는다(규칙 id 접두사 `ui-`). 걸린 규칙은 단서일 뿐이라 이 문서의 기준으로 판정한다.

브라우저 없이 확인할 것: 컴포넌트가 정의한 모든 상태(호버·눌림·선택·로딩·빈 상태)를 코드에서 읽고 그 시간과 곡선을 대어 본다.

브라우저에서 확인할 것: 각 상태를 직접 눌러 보고, 브라우저 Animations 패널에서 10% 속도로 움직임을 다시 본다.

못 한 확인은 「확인 못 함」으로 적는다. 보지 않은 범위는 통과로 적지 않는다.
