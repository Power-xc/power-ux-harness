# 간격·배치·반응형

출처: jakubkrehel/skills(커밋 6c21201, MIT, Copyright (c) 2026 Jakub Krehel)의 `better-layout` — SKILL.md, grouping-and-alignment.md, spacing-and-adaptivity.md. 원문 문장을 복사하지 않고 이 하네스의 절차에 맞게 다시 썼다. 값은 원본과 같다. 9절의 한글 항목은 이 하네스가 한국어 화면 기준으로 더했다.

설계서에서 간격·묶음·정렬·반응형 구조를 정할 때(`ux-spec`)와 만든 화면을 점검할 때(`ux-review`) 같은 문서를 기준으로 쓴다. 누르는 영역 크기와 포커스는 `ux-a11y`, 모서리·그림자·움직임은 [`visual-surface-motion.md`](./visual-surface-motion.md), 줄 길이·글자 간격·잘림 방식은 [`visual-type.md`](./visual-type.md), 문구는 `ux-writing`이 맡는다. 행동의 색은 [`visual-color.md`](./visual-color.md)가 맡는다.

판정 원칙:

- 프로젝트에 간격 체계나 밀도 체계가 있으면 그 토큰을 쓴다. 아래 숫자는 체계가 없을 때의 시작값이다.
- finding은 보여 줄 수 있는 실패다. 잘림·겹침·뒤집기(RTL) 실패·잘못 읽힌 묶음이 그렇다. 시작값과 다르다는 것만으로는 finding이 아니다.
- 같은 일을 프로젝트 안에서 두 방식으로 하면 finding이다.

## 1. 묶기, 구분, 정렬

묶는 도구는 간격 → 배경 면 → 구분선 순서로 쓴다. 앞의 도구가 구조를 못 세울 때만 다음 도구로 간다.

1. 여백(기본).
2. 배경 면: 선택 가능한 행이나 끌 수 있는 카드처럼 묶음이 한 단위로 읽혀야 할 때.
3. 구분선: 표와 긴 설정 목록처럼 간격이 비싼 촘촘한 데이터.

묶음 사이 간격은 묶음 안 간격의 2배 이상이다. 안이 8px이면 사이는 16px 이상이다. 구분선이 필요하면 낮은 대비의 가는 선으로 두고, 큰 간격이 이미 한 일에 겹쳐 쓰지 않는다.

```css
/* 좋음: 간격만으로 묶음이 전달된다 */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 나쁨: 일정한 간격에 선으로 보상 */
.form > * {
  margin-bottom: 12px;
  border-bottom: 1px solid var(--separator);
}
```

```html
<!-- 좋음: Tailwind -->
<div class="space-y-6">
  <div class="space-y-2">…필드 묶음…</div>
  <div class="space-y-2">…필드 묶음…</div>
</div>
```

컨트롤은 옆의 글과 구분되어야 한다. 모든 누를 수 있는 요소는 배경 면·테두리·밑줄·정해진 자리(툴바 같은) 중 하나를 갖는다. 옆의 설명 글과 똑같이 꾸민 행동은 컨트롤로 읽히지 않는다. 반대도 같다. 버튼과 같은 모양의 누를 수 없는 배지는 헛클릭을 모은다.

```html
<!-- 나쁨: 행동이 옆 설명 글과 똑같이 보인다 -->
<p class="text-zinc-600">체험이 곧 끝나요. 지금 업그레이드</p>

<!-- 좋음: 밑줄이 행동을 표시한다 -->
<p class="text-zinc-600">체험이 곧 끝나요.</p>
<button class="font-medium underline underline-offset-2">지금 업그레이드</button>
```

공유 정렬선 몇 개를 정하고 모든 것을 그 위에 둔다. 중첩 한 단계에는 간격 한 단계를 쓰고(기본 시작값 `16px`) 깊어질수록 같은 단계를 반복한다. 흔한 어긋남은 글 가장자리에서 2px 벗어난 아이콘, 이웃과 안쪽 여백이 다른 카드다. 표의 숫자는 `text-align: end`, 글은 `text-align: start`이다. 표 숫자 폭은 `tabular-nums`([`visual-type.md`](./visual-type.md))가 맡는다.

```css
/* 좋음: 공유 시작선 하나, 들여쓰기 한 단계 */
.section {
  padding-inline: 24px;
}
.section .child {
  margin-inline-start: 16px;
}

/* 나쁨: 한 열에 서로 무관한 시작선 셋 */
.header {
  padding-inline-start: 20px;
}
.list-item {
  padding-inline-start: 14px;
}
.footer {
  padding-inline-start: 24px;
}
```

## 2. 거울처럼 뒤집히는 것은 논리 속성으로

방향에 따라 달라지는 배치는 시작·끝으로 쓴다: `margin-inline-start`·`padding-inline-end`·`inset-inline-start`·`text-align: start`. 물리 왼쪽·오른쪽은 안전 영역 같은 물리 기하에만 쓴다.

| 물리                     | 논리                        |
| ------------------------ | --------------------------- |
| `margin-left`            | `margin-inline-start`       |
| `padding-right`          | `padding-inline-end`        |
| `left: 0`                | `inset-inline-start: 0`     |
| `text-align: left`       | `text-align: start`         |
| `border-right`           | `border-inline-end`         |
| `float: left`            | `float: inline-start`       |
| `border-top-left-radius` | `border-start-start-radius` |

```html
<!-- 좋음: Tailwind 논리 유틸리티 -->
<div class="ms-4 pe-6 text-start">…</div>

<!-- 나쁨: RTL에서 깨진다 -->
<div class="ml-4 pr-6 text-left">…</div>
```

- flex 행과 grid 열은 인라인 방향을 따르므로 `dir="rtl"`에서 저절로 뒤집힌다. 그 안의 물리 값, `translateX`, `background-position`, `left`·`right`로 손수 놓은 위치는 뒤집히지 않는다.
- 별점·단계 표시·진행 막대처럼 배치가 진행을 나타내면 순서가 RTL에서 뒤집힌다. 별은 시작 쪽에서 채워지고 RTL에서는 오른쪽이다. 숫자 안의 자리 순서는 뒤집히지 않는다(양방향 규칙은 [`visual-type.md`](./visual-type.md) 11절).

## 3. 중요한 순서와 주요 행동

- 가장 중요한 내용은 위쪽과 시작 쪽에 둔다. 한 줄 안에서는 식별 정보가 앞, 부가 정보와 행동이 뒤다.
- 보이는 순서는 DOM 순서와 같다. `order`·`row-reverse`·그리드 배치로 내용의 보이는 위치를 소스 순서와 다르게 바꾸지 않는다.
- 사용자가 찾아온 숫자 하나를 부가 정보 줄 밑에 묻지 않는다. 부가 정보는 접힌 구역·탭·상세 화면으로 내린다.

```html
<!-- 좋음: 핵심 사실이 먼저, 상세는 내려 둠 -->
<div>
  <p class="text-2xl font-semibold">4,320,000원</p>
  <p class="text-sm text-zinc-500">사용할 수 있는 잔액</p>
</div>

<!-- 나쁨: 핵심 사실이 메타데이터 아래 맨 끝 -->
<div>
  <p class="text-sm">계좌 4402 · 개설 2019 · 일반 등급</p>
  <p class="text-sm">마지막 명세서: 6월 30일</p>
  <p class="text-sm">잔액: 4,320,000원</p>
</div>
```

- 화면당 주요 행동은 하나다. 보조 행동이 3개를 넘으면 메뉴 뒤로 보낸다. 모든 것을 맨 위에 다 보여 주는 긴 화면보다, 짧은 화면에서 더 깊은 화면으로 링크하는 편이 낫다. 행동의 색은 [`visual-color.md`](./visual-color.md) 8절이다.

## 4. 숨은 내용에는 단서가 있다

화면 밖이나 접힌 내용은 모두 눈에 보이는 단서가 있어야 한다. 프로젝트가 정한 단서를 쓰고, 없으면 다음 항목 중에서 고른다.

- 엿보기: 카드 줄이 컨테이너 끝에서 딱 끝나면 완결로 보여 아무도 스크롤하지 않는다. 다음 항목이 스크롤 가장자리 밖으로 `16px`\~`32px` 엿보이게 한다.
- 펼치기 컨트롤: 접힌 구역에 쉐브론이나 무엇이 숨었는지 말하는 「더 보기」가 있다. 「결과 12개 더 보기」이지 「더 보기」가 아니다.
- 잘린 값: 잘림에 펼치기 컨트롤, 상세 화면 링크, 키보드 포커스에도 열리는 툴팁 중 하나를 짝지어 전체 값으로 가는 길을 준다. 마우스를 올려야만 보이는 `title` 속성은 길이 아니다. 키보드·터치 사용자는 그것을 보지 못한다. 잘림 방식은 [`visual-type.md`](./visual-type.md) 7절이다.

엿보기 폭 계산: 항목 폭 = `100%` + 간격 − 엿보기(`100%`는 컨테이너 콘텐츠 상자). 스크롤 패딩이 스냅된 항목을 콘텐츠 가장자리에 둔다.

```css
.scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-inline: 24px;
  scroll-padding-inline: 24px;
  scroll-snap-type: x mandatory;
}
.scroller > * {
  flex: 0 0 calc(100% - 12px); /* 콘텐츠 상자 + 간격 12px - 엿보기 24px */
  scroll-snap-align: start;
}
```

```html
<!-- Tailwind: 같은 24px 엿보기 -->
<div class="flex gap-3 overflow-x-auto px-6 scroll-px-6 snap-x snap-mandatory">
  <div class="w-[calc(100%-12px)] shrink-0 snap-start">…</div>
  <div class="w-[calc(100%-12px)] shrink-0 snap-start">…</div>
</div>
```

## 5. 컨트롤 간격과 가장자리

프로젝트에 밀도 체계가 없으면 시작값은 아래와 같다.

| 사이                                              | 시작값      |
| ------------------------------------------------- | ----------- |
| 테두리가 있거나 채워진 인접 컨트롤(버튼·입력)     | `12px`      |
| 테두리 없는 글자·아이콘 컨트롤의 보이는 글자 사이 | `24px`      |
| 서로 무관한 컨트롤 묶음                           | `24px` 이상 |

- 테두리 없는 누름 대상은 어디서 끝나는지 표시가 없으므로 간격이 경계다. 24px은 각 버튼 자신의 안쪽 여백을 포함한 값이다.
- 이미 정해진 쓸 만한 밀도는 이 값에 맞추려고 컨트롤을 키우지 않고 보존한다. 촘촘한 화면은 줄여도 되지만 누르는 영역이 겹치면 안 되고 컨트롤이 서로 구분되어야 한다. 누르는 영역 크기와 확장은 `ux-a11y`다. 확장한 영역끼리 겹치지 않게 간격을 둔다.

```html
<!-- 좋음: 테두리 있는 버튼 12px -->
<div class="flex gap-3">
  <button class="rounded-lg border px-4 py-2">취소</button>
  <button class="rounded-lg bg-blue-600 px-4 py-2 text-white">저장</button>
</div>

<!-- 나쁨: 테두리 없는 아이콘 버튼 셋을 4px로 -->
<div class="flex gap-1">
  <button><TrashIcon /></button>
  <button><ArchiveIcon /></button>
  <button><ShareIcon /></button>
</div>
```

버튼은 가장자리에서 안쪽으로 띄운다. 화면 가장자리에 붙은 버튼은 시스템 UI로 읽히고 둥근 모서리와 제스처 영역에 잘린다. 콘텐츠 레이아웃에서 전폭 버튼은 레이아웃 여백 안에 둔다. 모바일은 좌우 `16px`부터다. 가장자리까지 닿는 행동은 플랫폼 관례를 따르고, 안전 영역을 감안하고, 시스템 UI와 구분될 때만 맞다. 버튼은 여백 안쪽에서 콘텐츠 폭 전체를 채울 수 있다.

```css
/* 좋음: 여백 안쪽의 행동 막대 */
.action-bar {
  padding-inline: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.action-bar button {
  width: 100%;
}

/* 나쁨: 가장자리 세 곳에 붙은 버튼, 100vw는 스크롤바 폭을 더한다 */
.action-bar button {
  width: 100vw;
  position: fixed;
  bottom: 0;
}
```

## 6. 콘텐츠는 끝까지, 컨트롤은 여백 안

배경과 미디어는 뷰포트 가장자리까지 뻗고, 컨트롤과 글자는 레이아웃 여백과 안전 영역 안에 둔다.

```css
/* 좋음: 제한된 글 안의 전폭 미디어 */
.article {
  display: grid;
  grid-template-columns: 1fr min(65ch, calc(100% - 48px)) 1fr;
}
.article > * {
  grid-column: 2;
}
.article > .full-bleed {
  grid-column: 1 / -1;
}
```

- `env(safe-area-inset-*)`는 viewport meta에 `viewport-fit=cover`가 있어야 0이 아니다.
- 안전 영역 인셋은 물리 값이다. 플로팅 버튼은 물리 변마다 자기 인셋을 짝지어 쓰고 RTL에서 덮어쓴다.
- 콘텐츠는 고정 크롬 아래로 스크롤된다. 고정 헤더 높이만큼 `scroll-padding-block-start`를 주어 앵커 목표와 포커스된 요소가 헤더 밑에 가려지지 않게 한다.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

```css
.fab {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
}
[dir="rtl"] .fab {
  right: auto;
  left: calc(16px + env(safe-area-inset-left));
}

/* 고정 헤더가 앵커 목표나 포커스된 요소를 덮지 않게 */
html {
  scroll-padding-block-start: var(--header-height);
}
```

## 7. 구조는 깨질 때까지 유지한다

- 중단점은 기기 프리셋이 아닌 내용에서 온다. 사이드바가 콘텐츠를 최소 폭 밑으로 짜내거나 카드 격자가 쓸 만한 열 폭 밑으로 내려가는 곳에서 끊는다. `768px`이어서가 아니다.
- 펼친 레이아웃은 맞지 않을 때까지 유지한 뒤 접는다. 컴포넌트 수준의 적응은 컨테이너 쿼리(`@container`)를 쓴다. 가장 작은 크기와 가장 큰 크기부터 시험한다.

```css
/* 좋음: 컴포넌트가 컨테이너에 맞춰 적응 */
.card-list {
  container-type: inline-size;
}
@container (width < 400px) {
  .card {
    grid-template-columns: 1fr;
  }
}

/* 나쁨: 뷰포트 미디어 쿼리는 좁은 사이드바 안의 카드를 못 접는다 */
@media (max-width: 768px) {
  .card {
    grid-template-columns: 1fr;
  }
}
```

- 컨테이너 쿼리는 컨테이너의 자손만 꾸미고 컨테이너 자신은 꾸미지 않는다.
- `container-type: inline-size`는 크기 격리를 더해 컨테이너가 내용에서 폭을 얻지 못한다. 폭이 없는 flex 항목·inline-block·absolute 요소처럼 내용 폭에 맞춰지는 컨테이너는 0으로 접힌다. 정해진 폭을 준다.

## 8. 늘어남과 잘림

번역하면 글이 길어지고 짧은 글일수록 늘어나는 비율이 크다. 한 단어 버튼 라벨이 화면에서 가장 위험하다.

```css
/* 좋음: 라벨이 크기를 정하고 행은 감긴다 */
.button {
  padding-inline: 16px;
  max-width: 100%;
}
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* 나쁨: 독일어가 넘치거나 잘린다 */
.button {
  width: 96px;
  overflow: hidden;
}
```

- 글 컨테이너는 `max-width`·`min-height`로 잡고 고정 `width`·`height`를 쓰지 않는다. 행은 감기게 한다.
- 가짜 번역(pseudo-localization)과 긴 언어(독일어)로 시험한다.
- 중요한 행동은 크기 조절·확대·스크롤에 잘리는 곳에 두지 않는다. 일반 흐름이나 안정된 크롬에 둔다.
- grid 트랙이나 flex 항목은 내용의 최소 폭 밑으로 줄지 않아 긴 낱말·넓은 표가 레이아웃을 뷰포트 밖으로 민다. `grid-template-columns: minmax(0, 1fr)`와 flex 자식의 `min-width: 0`을 쓴다.
- 고정 높이 컨테이너는 200% 확대와 긴 언어에서 글을 자른다. 바닥이 필요하면 `min-height`를 쓴다. 높이 상한이 필요하면 `max-height`와 `overflow-y: auto`를 짝짓는다.
- 잘리기 쉬운 곳: 크기를 조절하는 패널의 아래 가장자리, 뷰포트보다 큰 모달의 아래, 화면 키보드가 덮는 모든 곳.
- 전체 높이 패널은 `100vh`가 아니라 `100dvh`를 쓴다(`100vh`는 모바일 브라우저 툴바를 무시한다).
- 화면보다 큰 모달은 `max-height: 100dvh`, 스크롤되는 본문, 스크롤 밖의 행동 줄을 둔다.
- 화면 키보드는 보이는 영역(visual viewport)만 줄인다. 주요 행동은 안정된 크롬에 둔다. 하단 고정 영역에 두거나 뷰의 위쪽에 둔다.
- `width: 100vw`는 스크롤바 폭을 포함해 데스크톱에서 가로로 스크롤된다. `width: 100%`를 쓴다.

## 9. 한글 화면 기준

이 절은 이 하네스가 한국어 화면에 맞춰 더했다. 원본에 없다.

| 항목                | 기준                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 한글 늘어남 시험    | 한국어 전용 서비스도 긴 상품명·사용자 닉네임·영문 전환으로 글이 늘어난다. 한 단어 버튼 시험에 가장 긴 실제 상품명·닉네임을 넣어 본다                               |
| 한글 줄바꿈과 칸 폭 | 한글은 `word-break: keep-all`이면 어절 단위로 줄이 바뀌어 칸이 더 일찍 넘친다. 좁은 칸에서는 어절이 칸을 넘지 않는지(`overflow-wrap: anywhere`)를 실제 문구로 본다 |

## 10. 끝내기 전 찾을 것

| 찾을 것                                                                               | 고칠 것                                                                                       |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 긴 글이나 넓은 표를 담은, 트랙을 넘치는 `grid-template-columns: … 1fr` 또는 flex 자식 | 트랙에 `minmax(0, 1fr)`, flex 자식에 `min-width: 0`                                           |
| `width: 100vw`                                                                        | `width: 100%`. `100vw`는 스크롤바를 포함해 데스크톱에서 가로로 스크롤된다                     |
| 모바일 전체 높이 패널의 `height: 100vh`                                               | `100dvh`가 툴바를 따른다. 화면 키보드는 보이는 영역만 줄이므로 하단 행동은 안정된 크롬에 둔다 |
| 글이 든 상자에 고정 길이 `height:`                                                    | `min-height`, 또는 `max-height`와 `overflow-y: auto`                                          |
| 재사용 컴포넌트 안의 `@media (max-width: …)`                                          | 컴포넌트 부모의 `@container`                                                                  |
| 폭이 없는 flex 항목·inline-block·absolute 요소의 `container-type: inline-size`        | 정해진 폭을 준다. 크기 격리가 내용 폭에 맞춰지는 상자를 0으로 접는다                          |
| viewport meta에 `viewport-fit=cover` 없이 쓴 `env(safe-area-inset-*)`                 | 더한다. 아니면 인셋이 `0`이 된다                                                              |
| `safe-area-inset-left`·`-right`와 함께 쓴 `inset-inline-*`·`*-inline-*`               | 물리 `left`·`right`와 맞는 인셋, 그리고 `[dir="rtl"]` 덮어쓰기                                |
| 뒤집히는 UI의 `float: left`                                                           | `float: inline-start`                                                                         |
| 뒤집히는 UI의 `translateX`·`background-position: left`                                | `[dir="rtl"]` 덮어쓰기. 둘 다 논리 형태가 없다                                                |
| `scroll-padding-block-start` 없는 고정 헤더                                           | 헤더 높이로 정한다                                                                            |

## 11. 점검할 때 심각도와 확인

| 등급 | 기준                                                                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | 지원하는 뷰포트에서 내용이나 행동을 막는다. 320px 폭이나 200% 확대에서 잘림·겹침. 전체 값으로 가는 길이 없는 잘림. 눈에 보이는 단서 없이 스크롤 가장자리 밖이나 접힌 뒤에 있는 내용 |
| P2   | 위계·읽는 순서·적응성을 해친다                                                                                                                                                      |
| P3   | 한 곳에 그친 정렬·간격 다듬기                                                                                                                                                       |

P1 중 「320px 폭·200% 확대에서 잘림이나 겹침」, 「돌아갈 길 없는 잘림」, 「단서 없는 숨은 내용」은 표면이 작아도 바로 P1이다(원본이 등급을 올리는 조건으로 둔 항목).

브라우저 없이 확인할 것:

- 물리 속성 대신 논리 속성을 썼는지 본다.
- 컨테이너·미디어 쿼리를 지원 뷰포트 목록과 대어 본다.
- DOM 순서와 보이는 순서를 대어 본다.

브라우저에서 확인할 것:

- 지원하는 모든 폭, 320px, 200% 확대, RTL 뒤집기를 본다.
- 가장 긴 실제 상품명·닉네임을 넣은 한 단어 버튼을 본다.

못 한 확인은 「확인 못 함」으로 적는다. 보지 않은 범위는 통과로 적지 않는다.
