# 글자 표시 기준

출처: jakubkrehel/skills(커밋 6c21201, MIT, Copyright (c) 2026 Jakub Krehel)의 `better-typography` — SKILL.md, spacing-and-sizing.md, wrapping-and-punctuation.md, details-and-accessibility.md, variable-fonts-and-opentype.md, choosing-fonts.md, css-cheat-sheet.md. 원문 문장을 복사하지 않고 이 하네스의 절차에 맞게 다시 썼다. 값은 원본과 같다. 14절의 한글 항목은 이 하네스가 한국어 화면 기준으로 더했다.

설계서에서 글자 크기 체계·행간·굵기를 정할 때(`ux-spec`)와 만든 화면의 글자를 점검할 때(`ux-review`) 같은 문서를 기준으로 쓴다. 색은 [`visual-color.md`](./visual-color.md), 간격·잘린 값의 길은 [`visual-layout.md`](./visual-layout.md), 글자에 주는 움직임은 [`visual-surface-motion.md`](./visual-surface-motion.md)가 맡는다. 문구 자체는 `ux-writing`, 제목 구조와 대비 요구는 `ux-a11y`다.

판정 원칙:

- 정확한 값은 어기면 finding이다. 단위 없는 행간, 18px 미만 굵기 400 이상, 긴 글 폭 60\~75자, iOS 입력 16px, 바뀌는 숫자의 `tabular-nums`가 여기에 든다.
- 시작값(자간, 글꼴 짝, 크기 비율)은 프로젝트 자체 체계와 어긋날 때만 finding이다. 프로젝트가 일관되게 고른 것은 finding이 아니다. 같은 일을 프로젝트 안에서 두 방식으로 하면 finding이다.
- 프로젝트에 글자 토큰·스타일이 있으면 그것을 먼저 쓴다. 과제가 글꼴 교체가 아니면 새 글꼴을 제안하지 않는다(유료·무료 모두).

## 1. 정확한 값 한눈에

| 항목             | 값                                                                                      | 어기면                      |
| ---------------- | --------------------------------------------------------------------------------------- | --------------------------- |
| 행간             | 단위 없는 숫자(`1.5`). `px`·`rem` 고정값은 글자 크기가 바뀌어도 그대로다                | finding                     |
| 굵기             | 18px 미만은 400 이상. 100\~300은 28px 이상에서만, 그때도 배경 대비를 확인한다           | finding                     |
| 긴 글 폭         | 한 줄 60\~75자. 상한이 있고 실제 줄 길이가 그 범위에 들면 단위는 자유                   | finding                     |
| iOS 입력 글자    | 16px 이상. 작으면 iOS Safari가 입력할 때 페이지 전체를 확대한다                         | finding                     |
| 바뀌는 숫자      | `font-variant-numeric: tabular-nums`(타이머·카운터·가격·숫자 열). 문장 속 숫자는 그대로 | finding                     |
| 글꼴 수          | 셋 이하(마케팅 페이지는 더 가능)                                                        | 시작값                      |
| 크기 하한        | 긴 본문 16px, 입력·메뉴 14px, 캡션 13px, 12px 아래는 드물게                             | 시작값                      |
| 대문자 라벨 자간 | 14px 이하 `0.05em`                                                                      | 시작값                      |
| 큰 제목 자간     | 24px 이상 `-0.01em`\~`-0.02em`                                                          | 시작값                      |
| 본문 자간        | `0`                                                                                     | 시작값                      |
| 역할별 행간      | 디스플레이 `1.1`, 제목 `1.2`\~`1.3`, 본문 `1.5`\~`1.6`                                  | 시작값                      |
| 세 줄 이상 글    | 행간 `1.4` 이상(높이가 제한된 줄 안에서도)                                              | finding(고정 행간 `1.1` 등) |

iOS 입력 16px은 두 가지로 해결하고 모양이 달라지므로 디자인이 어느 쪽을 원하는지 묻는다.

- 모바일에서 키우기: `text-base sm:text-sm`. 작은 화면에서 입력 모양이 데스크톱과 달라진다.
- 16px을 유지하고 `transform: scale()`로 원하는 크기를 그리기: 모든 화면 폭에서 같게 보이고 코드는 늘어난다. 레시피는 10절.

## 2. 글꼴 수·짝·불러오기

- 글꼴은 셋 이하를 기본으로 한다. 위계는 굵기와 크기가 나르므로 종류가 늘수록 위계가 흐려진다. 마케팅 페이지는 앱보다 더 쓸 수 있다.
- 대비되는 짝으로 고른다. 세리프 제목 + 산세리프 본문은 의도로 읽힌다. 비슷한 산세리프 둘은 실수로 읽힌다.
- 디자인이 쓰는 굵기·기울기는 모두 불러온다. 글꼴 가족에 없는 굵기·기울기는 브라우저가 흉내 내서 글자가 뭉개진다.
- `font-synthesis: none`은 대체 글꼴까지 확인한 뒤, 한 곳에만 쓴다. 한 가지만 끄려면 longhand(`font-synthesis-weight`·`font-synthesis-style`·`font-synthesis-small-caps`·`font-synthesis-position`)를 쓴다.
- 글꼴 다듬기(`-webkit-font-smoothing: antialiased`와 `-moz-osx-font-smoothing: grayscale`)는 루트에 한 번만 둔다. Tailwind의 `antialiased`가 둘을 함께 켠다. 컴포넌트마다 두지 않는다.

```css
.brand-wordmark {
  font-synthesis: none; /* 대체 글꼴까지 확인한 한 곳에만 */
}
```

## 3. 속성 우선, 변수 글꼴, OpenType

CSS 속성이 있으면 속성을 쓴다. 속성은 변수 글꼴이 아닌 대체 글꼴이 그려져도 동작한다. 원시 태그(`font-variation-settings`)는 변수 글꼴이 아니면 조용히 아무 일도 하지 않는다.

| 하려는 일      | 쓸 것                                                 | 쓰지 않을 것                          |
| -------------- | ----------------------------------------------------- | ------------------------------------- |
| 굵기           | `font-weight: 650`                                    | `font-variation-settings: "wght" 650` |
| 숫자 폭        | `font-variant-numeric: tabular-nums`                  | `font-feature-settings: "tnum" 1`     |
| 0 구분         | `font-variant-numeric: slashed-zero`                  | `font-feature-settings: "zero" 1`     |
| 광학 크기      | `font-optical-sizing`은 기본 `auto`를 둔다            | `"opsz"` 직접 지정                    |
| 커스텀 축      | `font-variation-settings: "GRAD" 80`(속성이 없으므로) | —                                     |
| 속성 없는 기능 | `font-feature-settings: "ss01" 1`(속성이 없으므로)    | —                                     |

`"opsz"`를 직접 지정하는 때는 디자인이 광학 크기와 글자 크기를 일부러 떼어 놓을 때뿐이다.

정적 글꼴과 변수 글꼴:

- 정적 글꼴은 파일 하나에 굵기·기울기 하나다. 보통·중간·굵게면 파일 셋이다.
- 변수 글꼴은 범위 전체가 파일 하나이고 `font-weight: 589` 같은 값도 된다. 굵기가 하나나 둘이면 정적 파일이 더 작을 수 있고, 굵기·광학 크기·커스텀 축이 여럿이면 변수 글꼴이 보통 낫다.
- 광학 크기는 변수 글꼴 이전부터 있었다. 많은 글꼴이 `opsz` 축 대신 `Text`와 `Display` 파일로 나눠 낸다.

축(글꼴이 넣은 축만 쓸 수 있다):

| 축        | 태그                   | 하는 일                       |
| --------- | ---------------------- | ----------------------------- |
| 굵기      | `wght`                 | 획 두께(`font-weight`와 같다) |
| 광학 크기 | `opsz`                 | 표시 크기에 맞춘 세부와 자간  |
| 너비      | `wdth`                 | 글자 폭                       |
| 기울기    | `slnt`                 | 기울기 각도                   |
| 커스텀    | `GRAD`(Roboto Flex) 등 | 디자이너가 만든 것            |

Inter 변수 파일의 축은 `wght`와 `opsz`뿐이다.

OpenType 기능(정적·변수 글꼴에서 같게 동작하고, 글꼴이 넣은 기능만 쓸 수 있다):

| 태그           | 기능                             |
| -------------- | -------------------------------- |
| `tnum`         | 숫자 폭이 모두 같은 표 숫자      |
| `zero`         | 빗금 0(`0`과 `O` 구분)           |
| `liga`         | 합자(`fi` 같은 쌍을 한 모양으로) |
| `ss01`\~`ss20` | 스타일 세트(번호 칸)             |
| `cv01`\~`cv99` | 글자 변형(번호 칸)               |

`ss01`은 스타일 세트 1번, `cv11`은 글자 변형 11번이다. 칸의 뜻은 글꼴마다 다르므로 글꼴 문서를 확인한다(Inter는 `ss01`이 열린 숫자, `cv11`이 한 층짜리 `a`).

작은 대문자는 `font-variant-caps`, 위·아래 첨자는 `font-variant-position`으로 켠다. 둘 다 글꼴에 해당 글리프가 있어야 한다.

## 4. 크기 체계와 제목 단계

체계가 없으면 역할 이름으로 정한다. Tailwind의 `text-xs`\~`text-9xl`(크기마다 행간 짝이 있다)을 그대로 써도 좋다. 시작값:

```css
:root {
  --text-caption: 0.8125rem;
  --text-body: 1rem;
  --text-heading: 1.125rem;
  --text-title: 1.5rem;
  --text-display: 2.25rem;
}
```

| 역할       | 크기               | 행간  | 굵기  |
| ---------- | ------------------ | ----- | ----- |
| 디스플레이 | `2.25rem` (36px)   | `1.1` | `600` |
| 제목       | `1.5rem` (24px)    | `1.2` | `600` |
| 소제목     | `1.125rem` (18px)  | `1.3` | `600` |
| 본문       | `1rem` (16px)      | `1.5` | `400` |
| 캡션       | `0.8125rem` (13px) | `1.4` | `400` |

- 크기마다 행간과 굵기를 짝으로 묶어 한 역할이 결정 하나가 되게 한다.
- 혼자 쓰면 `text-sm` 같은 기본 이름도 된다. 팀이면 용도 이름(`text-body-sm`)으로 규칙이 사람이 바뀌어도 남게 한다.
- 같은 역할 안의 강조는 굵기를 한 단계 올린다(400 → 500). 크기는 그대로 둔다.
- 제목 단계가 내려갈수록 크기도 내려간다. 하위 제목이 상위 제목보다 커 보이면 안 된다. 단계가 모자라면 같은 크기를 나눠 쓰고 굵기나 자간으로 구분한다. 제목이 본문보다 작은 것은 의도한 오버라인뿐이다. Tailwind는 단계별 클래스를 인라인에 반복하지 말고 컴포넌트나 `@layer base`에 모은다.

```css
h1 {
  font-size: var(--text-display);
}
h2 {
  font-size: var(--text-title);
}
h3 {
  font-size: var(--text-heading);
}
```

크기 하한:

- 긴 본문은 16px(브라우저 기본)에서 시작한다. 이유를 댈 수 있을 때만 바꾼다(작게 나오는 글꼴, 좁은 폭, 촘촘한 전문가 도구).
- 입력·메뉴 14px, 캡션 13px에서 시작하고 12px 아래는 드물게 쓴다.
- `font-size`는 `rem`으로 써서 사용자의 브라우저 글자 크기 설정이 먹게 한다.

| 단위              | 동작                                      |
| ----------------- | ----------------------------------------- |
| `px`              | 고정                                      |
| `em`              | 현재 글자 크기에 비례한다                 |
| `rem`             | 루트 글자 크기에 비례한다                 |
| `font-size`의 `%` | 부모 글자 크기 기준이라 `em`처럼 동작한다 |

## 5. 행간과 자간

- 행간은 역할별로 디스플레이 `1.1`, 제목 `1.2`\~`1.3`, 본문 `1.5`\~`1.6`이다. 단위 없는 값으로 써서 글자 크기에 비례하게 한다.
- 촘촘한 행간은 짧은 글용이다. 세 줄 이상 감길 수 있는 글은 높이가 제한된 줄에서도 `1.4` 이상이다.
- 자간은 24px 이상 제목 `-0.01em`\~`-0.02em`, 14px 이하 대문자 라벨 `0.05em`, 본문 `0`이다. 단위는 `em`이어야 크기와 함께 간다.
- 커닝은 글꼴에 들어 있고 기본으로 켜져 있다. `font-kerning: none`은 고침이 아니다.

```css
/* 나쁨: 카드 설명에 제목 행간 */
.card-description {
  line-height: 1.1;
}

/* 좋음: 세 줄로 감기므로 본문처럼 */
.card-description {
  line-height: 1.4;
}
```

## 6. 폭 상한

긴 글은 한 줄 60\~75자로 폭 상한을 둔다. 단위는 자유다. `65ch`는 현재 글꼴의 `0` 폭 기준이고, 픽셀·rem 상한도 같다. 16px 본문에서 60\~75자는 글꼴에 따라 대략 560\~680px이다.

| Tailwind      | 폭    |
| ------------- | ----- |
| `max-w-xl`    | 576px |
| `max-w-2xl`   | 672px |
| `max-w-prose` | 65ch  |

본문 글자 크기가 바뀌면 상한을 다시 확인한다.

## 7. 줄바꿈과 잘림

- `text-wrap: balance`(`text-balance`): 제목과 짧은 설명의 줄 길이를 고르게 한다. 문단에는 쓰지 않는다. Chromium은 6줄이 넘으면 무시한다.
- `text-wrap: pretty`(`text-pretty`): 마지막 줄에 한 단어만 남는 것을 막는다. 긴 글을 포함해 모든 문단에 쓸 수 있다.
- `overflow-wrap: break-word`(`break-words`): 긴 낱말·링크·ID가 칸을 넘을 수 있는 곳에 둔다.
- `white-space: nowrap`(`whitespace-nowrap`): 줄이 바뀌면 깨져 보이는 라벨·배지에 둔다.
- 화면 글은 `text-align: start`다. `justify`는 편집 레이아웃에만 쓴다.

잘림:

- 한 줄: `overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`. Tailwind `truncate`가 셋을 함께 켠다.
- 여러 줄: `display: -webkit-box` + `-webkit-box-orient: vertical` + `-webkit-line-clamp: 3` + `overflow: hidden`. Tailwind `line-clamp-3`이 모두 낸다. `-webkit-line-clamp`만 쓰면 동작하지 않는다.
- 잘린 값이 사용자에게 필요하면 전체로 돌아갈 길(펼치기·상세 화면·키보드로도 열리는 툴팁)이 있어야 한다. 이 길은 [`visual-layout.md`](./visual-layout.md) 4절이 맡는다.

## 8. 대소문자와 문장 부호

대소문자는 자연스럽게 저장하고 `text-transform`(`uppercase`·`capitalize`)으로 바꾼다. 리디자인 때 문구를 고쳐 쓰지 않게 하기 위해서다.

화면에 그려지는 글은 조판 문자를 쓴다. 키보드 대용 문자는 쓰지 않는다. 코드는 곧은 따옴표를 그대로 둔다.

| 쓰지 않을 것             | 쓸 것                                                          |
| ------------------------ | -------------------------------------------------------------- |
| 곧은 따옴표 `"…"`        | 글을 감싸며 휘는 둥근 따옴표(코드 안은 곧은 따옴표)            |
| 범위의 하이픈            | en dash: `2010–2020`                                           |
| 하이픈 두 개로 쓴 삽입구 | em dash 문자                                                   |
| 마침표 세 개 `...`       | 한 글자 `…`                                                    |
| `10 km`의 보통 공백      | `&nbsp;`(값과 단위가 갈라지지 않게)                            |
| 제어 없는 낱말 끊김      | `&shy;`로 끊을 자리를 표시하거나 `hyphens: auto`와 맞는 `lang` |

## 9. 밑줄, 선택, 장식 글자

밑줄은 글꼴이 정한 값을 쓰거나 직접 맞춘다.

```css
a {
  text-underline-position: from-font;
  text-decoration-thickness: from-font;
}

/* 약어: 점선 밑줄 */
abbr {
  text-decoration: underline dotted;
}

/* 직접 맞추기 */
a {
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-gray-1000);
  transition: text-decoration-color 200ms ease-out;
}
a:hover {
  text-decoration-color: var(--color-gray-1200);
}
```

- 점선 `text-decoration-style`은 약어나 정의된 말처럼 부가 정보가 있다는 단서다.
- 밑줄 애니메이션은 색만 안정적으로 움직인다. 나머지는 별도 요소가 필요하고 그 움직임은 [`visual-surface-motion.md`](./visual-surface-motion.md)가 맡는다.
- `text-decoration-skip-ink: none`은 쓰지 않는다. 간격은 `text-underline-offset`이나 `from-font`로 맞춘다(기본 `auto`는 내림 획 둘레를 비운다).

선택:

- 글은 기본으로 선택할 수 있게 둔다. `::selection`으로 브랜드를 입히되 선택된 조합이 읽혀야 한다.
- `::target-text`는 공유 링크가 스크롤해 가는 구절을 꾸민다. 검색 일치처럼 직접 고른 범위는 Custom Highlight API로 마크업 없이 꾸민다.
- `user-select: none`(`select-none`)은 끌기·제스처 면에서 우연한 선택이 방해될 때만 쓴다. 화면 전체나 버튼 글자가 선택된다는 이유로 쓰지 않는다.

장식 글자는 CSS로 만든다. 이미지로 만들면 선택·검색이 안 된다.

| 속성                    | 효과                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `::first-letter`        | 드롭캡. 널리 지원                                              |
| `::first-line`          | 첫 줄만 꾸민다                                                 |
| `initial-letter`        | 드롭캡 크기. Safari는 `-webkit-initial-letter`, Firefox 미지원 |
| `background-clip: text` | 배경·그라데이션을 글자 모양으로 자른다                         |
| `-webkit-text-stroke`   | 글자 외곽선. 접두어가 있어도 최신 브라우저에서 동작            |
| `text-shadow`           | `box-shadow`처럼 글자 모양을 따른다                            |

`-webkit-text-stroke`가 글자 안쪽에 선을 그리면 글꼴의 윤곽이 겹쳐 있는 것이다. 변수 글꼴은 병합하지 않은 경우가 많으므로 외곽선 글자에는 정적 글꼴을 쓴다.

## 10. 입력과 편집 글자

- `::placeholder`는 빈 칸의 힌트를 꾸미고, `caret-color`는 깜박이는 삽입 막대 색을 바꾼다. 캐럿을 통째로 만드는 것은 어렵고 가치가 낮다.
- iOS 입력 확대의 해법은 두 가지다.

모바일에서 키우기 — 작은 화면에서 16px, `sm` 이상에서 디자인 크기. 보정할 것이 없다.

```tsx
<input className="text-base sm:text-sm" type="email" />
```

16px 유지 + `scale()` — `font-size`를 16px로 두고 변환으로 원하는 크기를 그린다. 요소 폭을 배율의 역수로 넓혀 컨테이너를 채우게 하고, `line-height`도 같은 배율로 나눈다. 시작 쪽에 붙이려고 `origin-left`(RTL은 `origin-right`)를 쓰고, 분기점 이상에서는 변환을 빼고 실제 크기를 쓴다.

```tsx
// 16px 글자로 13px을 그린다: 13 / 16 = 0.8125
<div className="flex h-10 items-center overflow-hidden rounded-[10px] bg-gray-300 px-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500">
  <input
    className="h-full w-[calc(100%/0.8125)] shrink-0 origin-left rtl:origin-right scale-[0.8125] bg-transparent text-base leading-[calc(1.125/0.8125)] outline-none sm:w-full sm:scale-100 sm:text-[13px]"
    type="email"
  />
</div>
```

- `shrink-0`은 보정한 폭을 flex 안에서 지킨다. 감싸는 요소가 넘치는 레이아웃 상자를 자르고 축소되지 않은 포커스 외곽선을 그린다. 포커스 색은 프로젝트의 것을 쓰고 둘레 면과의 대비를 확인한다.
- 변환은 상자 전체를 줄인다. 글리프만 줄지 않는다. 입력 칸의 면은 감싸는 요소가 그리고 입력 요소는 투명으로 둔다. 축소되는 요소에 배경·테두리·링을 주면 의도한 누르는 영역을 놓친다.

## 11. 언어와 방향

- `lang`을 정해 브라우저와 보조 기술이 맞는 따옴표·하이픈·발음을 고르게 한다. `dir`은 문서에 정하고 방향이 바뀌는 곳에도 정한다.
- 방향이 섞인 값(이름·숫자·URL)은 `<bdi>`로 감싼다. 숫자 순서를 손으로 뒤집지 않는다.
- 세 줄 넘는 문단은 자기 언어 방향으로 정렬한다. RTL 화면 안의 영어 문단은 LTR 시작 정렬이다. `text-align: start`와 맞는 `lang`·`dir`을 문단 요소에 둔다. 한두 줄 조각은 둘러싼 화면 방향을 따른다.
- 전화번호나 「541」은 RTL에서도 같게 읽힌다(유니코드 양방향 알고리즘이 숫자 묶음을 왼쪽에서 오른쪽으로 둔다). 둘레의 RTL 글이 순서를 흩뜨리면 `<bdi>`로 고친다.

## 12. 글자 상자 다듬기: `text-box`

버튼·배지에서 글꼴이 글자 위아래에 남기는 공간 때문에 글자가 아래로 처져 보인다. `text-box`는 점진적 향상으로 이를 잘라 낸다. 어느 가장자리(`trim-both`·`trim-start`·`trim-end`)를, 어디까지 자를지 정한다. `cap`·`ex`·`alphabetic`은 두 번째 가장자리 값이 필요하므로 `trim-start cap`은 무시되고 `trim-start cap text`는 적용된다.

| 키워드       | 자르는 곳                                        |
| ------------ | ------------------------------------------------ |
| `cap`        | 대문자 높이(위)                                  |
| `alphabetic` | 기준선(아래)                                     |
| `text`       | 글꼴 자체의 글자 가장자리. 내림 획 자리를 남긴다 |

```css
.badge {
  text-box: trim-both cap alphabetic;
}
.heading {
  text-box: trim-start cap text;
}
.label {
  text-box: trim-end text alphabetic;
}
```

Chromium 133+, Safari 18.2+ 지원, Firefox 미지원. 미지원 브라우저는 기본 행간을 유지한다.

## 13. 글꼴 고르기

과제가 글꼴 교체일 때만 쓴다.

| 분류       | 특징                                    | 쓰임                                          |
| ---------- | --------------------------------------- | --------------------------------------------- |
| 세리프     | 글자 끝의 작은 획이 눈을 줄 따라 이끈다 | 긴 글, 편집 읽기                              |
| 산세리프   | 고르고 깔끔해 작은 크기에서 또렷하다    | 대부분의 화면 기본(Helvetica, Inter, Geist)   |
| 고정폭     | 모든 글리프 폭이 같다                   | 코드·고정 폭 식별자. 숫자 열은 `tabular-nums` |
| 디스플레이 | 큰 제목용으로 그렸다                    | 마케팅 제목, 히어로 글                        |
| 필기체     | 손글씨 모사                             | 드문 장식 순간                                |

글꼴 이름에 「Display」가 있다고 디스플레이 글꼴은 아니다. SF Pro 같은 글꼴은 큰 크기용 `Display` 컷과 작은 크기용 `Text` 컷을 함께 낸다. 그리는 크기에 맞는 컷을 쓴다.

글꼴을 바꾸라는 요청이면 길이 둘이다. `system-ui`는 운영체제 고유 인터페이스 글꼴을 준다. Helvetica Now 같은 상용 글꼴은 브랜드 결정이고 대체 글꼴 목록이 필요하다.

```css
/* 플랫폼 고유 인터페이스 글꼴 */
html {
  font-family: system-ui, sans-serif;
}

/* 상용 브랜드 글꼴 + 안전한 대체 */
html {
  font-family: "Helvetica Now", "Helvetica Neue", Arial, sans-serif;
}
```

| 형식            | 비고                                                      |
| --------------- | --------------------------------------------------------- |
| `.woff2`        | Brotli 압축, 널리 지원. 웹에서는 이것을 쓴다              |
| `.woff`         | 오래된 압축. 아주 오래된 브라우저용 대체로만              |
| `.ttf` / `.otf` | 압축이 없는 데스크톱 형식이라 크다. 다른 방법이 없을 때만 |

파일을 불러오는 방식은 프로젝트의 몫이다.

글꼴 구조 용어: x-height(소문자 `x` 높이), cap height(대문자 높이), baseline(글자가 앉는 선), ascender(x-height 위로 솟는 부분), descender(기준선 아래로 내려가는 부분). x-height가 큰 글꼴은 같은 `font-size`에서 더 커 보인다.

## 14. 한글 화면 기준

이 절은 이 하네스가 한국어 화면에 맞춰 더했다. 원본에 없다.

| 항목                      | 기준                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 한글 줄바꿈               | `word-break: keep-all`로 어절 중간에서 줄이 바뀌는 것을 막는다. 긴 URL·ID·영문은 `overflow-wrap: anywhere`(또는 `break-word`)를 함께 두어 칸을 넘지 않게 한다. Tailwind: `break-keep` |
| 한글 행간                 | 한글은 글자가 네모 틀을 거의 채워 같은 행간에서 라틴보다 빽빽해 보인다. 본문 행간은 `1.5`\~`1.7`에서 시작해 실제 문단으로 확인한다(시작값, 정확한 값 아님)                            |
| 한글 폭 상한              | `ch`는 숫자 0의 폭이라 한글 한 글자는 `1ch`보다 넓다. 같은 `65ch`에 한글은 그보다 적은 글자가 든다. 글자 수를 세기보다 폭 상한이 있는지, 실제 문단이 읽기 편한지 본다                 |
| 한글 웹 글꼴              | 글자 수가 많아 파일이 크다. `unicode-range`로 나눈 서브셋(다이내믹 서브셋)과 `font-display`를 쓰고, 대체 글꼴 목록에 `"Apple SD Gothic Neo"`, `"Malgun Gothic"`을 둔다                |
| 한글 라벨 자간·`text-box` | 대문자 자간 규칙(`0.05em`)은 라틴 라벨에만 해당한다. `text-box`의 `cap`·`alphabetic`은 라틴 글자 기준이라 한글만 있는 라벨은 화면에서 확인한다                                        |
| 한글 범위 표기            | 한국어 문장의 범위는 물결표(`~`)를 쓰고 영문 범위는 en dash를 쓴다. 말줄임은 `…` 한 글자다                                                                                            |
| 한글 숫자 정렬            | 원 단위 가격·잔액·남은 시간처럼 바뀌는 숫자는 `tabular-nums`를 쓴다. 숫자와 단위(원·분)는 줄이 갈라지지 않게 `&nbsp;`나 `white-space: nowrap`을 쓴다                                  |

```css
.ko-text {
  word-break: keep-all;
  overflow-wrap: anywhere;
  line-height: 1.6;
  font-family: "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
}
```

## 15. CSS와 Tailwind 대응

프로젝트 방식에 맞는 열을 쓴다. 일반 CSS·CSS Modules·styled-components 코드는 선언을, Tailwind 코드는 유틸리티를 쓴다. 유틸리티가 없으면 임의 값 꼴이다.

| 선언                                                                                                | 하는 일                          | Tailwind                                 |
| --------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| `font-family: sans-serif` / `serif` / `monospace`                                                   | 글꼴 가족                        | `font-sans` / `font-serif` / `font-mono` |
| `font-size`                                                                                         | 체계의 크기                      | `text-*`                                 |
| `font-weight`                                                                                       | 1\~1000 값                       | `font-*`                                 |
| `font-style: italic`                                                                                | 기울임                           | `italic`                                 |
| `-webkit-font-smoothing` + `-moz-osx-font-smoothing`                                                | 루트에 한 번                     | `antialiased`                            |
| `font-synthesis: none`                                                                              | 합성 끄기(확인 뒤 한 곳에)       | `[font-synthesis:none]`                  |
| `font-feature-settings`                                                                             | OpenType 기능                    | `[font-feature-settings:"ss01"]`         |
| `font-variation-settings`                                                                           | 변수 글꼴 축                     | `[font-variation-settings:"GRAD"_80]`    |
| `font-optical-sizing: auto`                                                                         | 기본값이라 둔다                  | 필요 없음                                |
| `font-variant-caps`                                                                                 | 진짜 작은 대문자                 | `[font-variant-caps:small-caps]`         |
| `font-variant-position`                                                                             | 진짜 위·아래 첨자                | `[font-variant-position:super]`          |
| `font-variant-numeric: tabular-nums`                                                                | 같은 폭 숫자                     | `tabular-nums`                           |
| `font-variant-numeric: slashed-zero`                                                                | 0과 O 구분                       | `slashed-zero`                           |
| `letter-spacing`                                                                                    | 자간                             | `tracking-*`                             |
| `line-height`                                                                                       | 행간                             | `leading-*`                              |
| `font-kerning`                                                                                      | 커닝 켜고 끄기                   | `[font-kerning:none]`                    |
| `text-box: trim-both cap alphabetic`                                                                | 위아래 여백 자르기               | `[text-box:trim-both_cap_alphabetic]`    |
| 글 칸의 `max-width`                                                                                 | 한 줄 60\~75자 상한              | `max-w-xl` / `max-w-2xl` / `max-w-prose` |
| `text-align`                                                                                        | 줄 시작·끝                       | `text-start` / `text-center`             |
| `text-wrap: balance`                                                                                | 제목 줄 길이 고르기              | `text-balance`                           |
| `text-wrap: pretty`                                                                                 | 마지막 줄 외톨이 방지            | `text-pretty`                            |
| `text-overflow: ellipsis`                                                                           | 잘린 글에 말줄임                 | `text-ellipsis`                          |
| `overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`                              | 한 줄 잘림                       | `truncate`                               |
| `-webkit-line-clamp` + `display: -webkit-box` + `-webkit-box-orient: vertical` + `overflow: hidden` | N줄 잘림                         | `line-clamp-*`                           |
| `overflow-wrap: break-word`                                                                         | 긴 문자열 끊기                   | `break-words`                            |
| `white-space: nowrap`                                                                               | 줄바꿈 막기                      | `whitespace-nowrap`                      |
| `text-transform`                                                                                    | 대소문자 바꾸기                  | `uppercase` / `capitalize`               |
| `hyphens: auto`                                                                                     | `lang`에 맞춰 하이픈             | `hyphens-auto`                           |
| `text-decoration-line: underline`                                                                   | 밑줄                             | `underline`                              |
| `text-decoration-color`                                                                             | 밑줄 색                          | `decoration-*`                           |
| `text-decoration-thickness`                                                                         | 밑줄 두께                        | `decoration-1` / `decoration-2`          |
| `text-underline-offset`                                                                             | 밑줄을 아래로 민다               | `underline-offset-*`                     |
| `text-underline-position: from-font`                                                                | 글꼴이 정한 밑줄 위치            | `[text-underline-position:from-font]`    |
| `text-decoration-style`                                                                             | 점선·파선·물결                   | `decoration-dotted` / `decoration-wavy`  |
| `text-decoration-thickness: from-font`                                                              | 글꼴이 정한 밑줄 두께            | `decoration-from-font`                   |
| `text-decoration-skip-ink`                                                                          | 내림 획 둘레 비움. 기본 `auto`   | `[text-decoration-skip-ink:auto]`        |
| `caret-color`                                                                                       | 글자 커서 색                     | `caret-*`                                |
| `user-select: none`                                                                                 | 끌기·제스처 충돌이 확인된 곳에만 | `select-none`                            |
| `text-shadow`                                                                                       | 글자 뒤 그림자                   | `text-shadow-*`                          |
| `-webkit-text-stroke`                                                                               | 글자 외곽선                      | `[-webkit-text-stroke:1px_black]`        |
| `background-clip: text`                                                                             | 배경을 글자에 맞춰 자름          | `bg-clip-text`                           |
| `initial-letter`                                                                                    | 드롭캡 크기                      | `[initial-letter:3]`                     |

## 16. 끝내기 전 찾을 것

| 찾을 것                                                           | 고칠 것                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 불러온 `@font-face` 파일에 없는 굵기의 `font-weight` 값           | 그 굵기를 불러오거나 글꼴 가족이 내는 굵기를 쓴다                            |
| 본문·화면 글자에 걸린 `font-synthesis: none`                      | 지운다. 대체 글꼴을 확인한 뒤 원치 않는 longhand만 둔다                      |
| `font-variation-settings: "wght"` 또는 `"opsz"`                   | `font-weight`로 쓰고 `"opsz"`는 빼서 `font-optical-sizing: auto`가 먹게 한다 |
| `font-feature-settings: "tnum"` 또는 `"zero"`                     | `font-variant-numeric: tabular-nums` 또는 `slashed-zero`                     |
| `px`·`rem` 단위의 `line-height`                                   | 단위 없는 값                                                                 |
| 줄이 감길 수 있는 설명·카드 본문의 `leading-none`·`leading-tight` | `1.4` 이상                                                                   |
| `px` 단위의 `letter-spacing`                                      | 같은 값을 `em`으로                                                           |
| `px` 단위의 본문 `font-size`                                      | `rem`                                                                        |
| 18px 미만 글자의 굵기 `100`\~`300`, `font-thin`, `font-light`     | `400` 이상                                                                   |
| 문단에 건 `text-wrap: balance`                                    | `text-wrap: pretty`                                                          |
| 앱 화면의 `text-align: justify`                                   | `text-align: start`                                                          |
| `display: -webkit-box` 없이 쓴 `-webkit-line-clamp`               | `display: -webkit-box`와 `-webkit-box-orient: vertical`을 더한다             |
| `tabular-nums` 없는 타이머·카운터·가격·숫자 열                    | `font-variant-numeric: tabular-nums`                                         |
| 화면 글자의 `...`, `--`, 하이픈으로 쓴 범위                       | `…`, em dash, en dash                                                        |
| `text-decoration-skip-ink: none`                                  | 지우고 `text-underline-offset`이나 `from-font`로 맞춘다                      |
| `text-sm`이나 `14px`이고 모바일 보정이 없는 `<input>`             | 1절의 iOS 입력 16px 해법 둘 중 하나(레시피는 10절)                           |
| 컴포넌트 안의 `-webkit-font-smoothing`·`antialiased`              | 루트에 둔다                                                                  |
| `<bdi>`나 `dir` 없이 놓인 이름·숫자·URL 같은 방향 섞인 값         | `<bdi>`로 감싼다                                                             |
| 레이아웃 루트나 글 컨테이너의 `user-select: none`·`select-none`   | 지운다. 끌기·제스처 면에만 둔다                                              |

## 17. 점검할 때 심각도와 확인

| 등급 | 기준                                                                                        |
| ---- | ------------------------------------------------------------------------------------------- |
| P1   | 글자를 읽을 수 없다. 돌아갈 길 없이 내용이 잘린다. 320px 폭이나 200% 확대에서 글자가 잘린다 |
| P2   | 글자 체계나 제목 위계가 깨진다                                                              |
| P3   | 한 곳에 그친 다듬기                                                                         |

P1 중 「돌아갈 길 없는 잘림」과 「320px·200% 확대에서 잘림」은 표면이 작아도 바로 P1이다(원본이 등급을 올리는 조건으로 둔 항목).

코드가 있으면 `ux-review`의 `scripts/visual-scan.mjs`로 이 문서의 기계로 찾을 수 있는 항목을 먼저 훑는다(규칙 id 접두사 `type-`). 걸린 규칙은 단서일 뿐이라 이 문서의 기준으로 판정한다.

브라우저 없이 확인할 것:

- 제목 단계별로 선언된 크기와 굵기가 각 의미 구역 안에서 내려가는지 본다.
- 선언된 행간·단위·폭 상한을 본다.
- 잘림 규칙을 실제 길이의 문자열에 대어 본다.

브라우저에서 확인할 것:

- 계산된 값을 비교한다.
- 뷰포트 폭을 바꿔 가며 실제 내용으로 줄바꿈·마지막 줄 외톨이·잘림을 본다.
- 한글만 있는 라벨의 `text-box` 모양을 본다.

못 한 확인은 「확인 못 함」으로 적는다. 보지 않은 범위는 통과로 적지 않는다.
