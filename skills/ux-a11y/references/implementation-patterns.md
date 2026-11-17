# 접근성 구현 패턴

출처: jakubkrehel/skills(커밋 6c21201, MIT)의 `better-accessibility` — SKILL.md와 focus-and-keyboard.md · forms.md · hit-areas.md · motion-and-zoom.md · screen-readers.md · semantics-and-aria.md. 원문 문장을 복사하지 않고 이 하네스의 절차에 맞게 다시 썼다. 14절(한국어 화면 기준)은 이 하네스가 더한 것이다.

[`wcag22-checklist.md`](./wcag22-checklist.md)가 「무엇을 지켜야 하나」라면 이 문서는 「코드에서 어떻게 지키나」다. 코드 수준 수정안을 쓸 때와 코드로 먼저 점검할 때 쓴다.

**판정.** finding은 WCAG 2.2 A·AA 기준 번호나 보조기기 사용자가 끝낼 수 없는 구체적 과제를 근거로 한다. AAA·APG 관례·`<h1>` 하나·제목 단계 건너뛰기·44/40px 권장 크기는 권고이고 P1이 아니다. 기준 수치는 정확하고 큰 권장 크기는 휴리스틱이라, 자리 잡은 밀도를 지킨다. 헷갈리면 직접 만들기보다 플랫폼 기본을 쓰고, ARIA는 더하기보다 뺀다.

**리뷰는 두 번 걷는다.** 키보드만으로 모든 흐름을 끝낸다. 그다음 화면 낭독기로 모든 컨트롤의 이름·역할·상태를 확인한다.

## 1. 기본 요소 먼저

| 요소            | 쓸 곳                                 | 이유                                                     |
| --------------- | ------------------------------------- | -------------------------------------------------------- |
| `<button>`      | 행동: 제출·토글·열기·삭제             | 포커스, Enter와 Space 활성화, 폼 의미가 공짜다           |
| `<a href>`      | 이동: 어딘가로 가거나 URL이 바뀌는 것 | Cmd/Ctrl·가운데 클릭, 링크 복사, Enter 활성화가 공짜다   |
| `<div onClick>` | 쓰지 않는다                           | 역할·포커스·키보드가 없고 화면 낭독기는 일반 글로 읽는다 |

```tsx
// 나쁨: 키보드와 화면 낭독기에 보이지 않는다
<div onClick={openSettings}>설정</div>

// 좋음: 포커스·Enter/Space·역할이 따라온다
<button onClick={openSettings}>설정</button>
```

- 이동하는 「버튼」은 `<a>`에 버튼 모양을 입힌 것이고, 행동하는 「링크」는 `<button>`에 링크 모양을 입힌 것이다. 진짜 링크는 Cmd/Ctrl·가운데 클릭이 되어야 한다.
- 기본 요소를 정말 못 쓰면 `role="button"` + `tabindex="0"` + Enter·Space 처리를 모두 직접 단다. 그래서 기본 요소가 코드가 적다.

**ARIA 규칙 4가지.**

1. 필요한 의미와 동작을 가진 기본 HTML 요소가 있으면 다른 요소에 ARIA를 씌우지 말고 그것을 쓴다.
2. 꼭 필요하지 않으면 기본 의미를 바꾸지 않는다.
3. 상호작용하는 ARIA 컨트롤은 모두 키보드로 조작할 수 있어야 한다. 역할은 그 키보드 모델과 상태·동작 전체를 약속한다.
4. 상호작용하는 요소는 모두 접근 이름이 있어야 한다.

틀린 ARIA는 없는 것보다 나쁘다. 화면 낭독기는 선언된 역할을 믿는다.

**랜드마크와 제목.**

- `<header>`·`<nav>`·`<aside>`·`<footer>`는 화면 낭독기 사용자가 건너뛰는 랜드마크다. 보이는 주 `<main>`을 하나 둔다.
- 같은 종류가 여럿이면 이름으로 구별한다: `<nav aria-label="주 메뉴">`, `<nav aria-label="현재 위치">`.
- 제목은 구조다. 크기는 CSS로 정하고 태그는 구조로 고른다.
- `<title>`은 구체적인 것부터 쓴다: `결제 수단 · 설정 · 서비스 이름`(2.4.2).

**흔한 ARIA 실수.**

| 실수                                                    | 실패하는 이유                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 일반 `<div>`·`<span>`에 `aria-label`                    | ARIA 1.2가 `generic` 역할의 이름 붙이기를 금지하고 대부분의 낭독기가 무시한다           |
| `<button role="button">`                                | 중복 역할이라 잡음만 더하고 이득이 없다                                                 |
| 없는 ID를 가리키는 `aria-labelledby`·`aria-describedby` | 이름이나 설명이 조용히 비어 나온다                                                      |
| 내비게이션 목록에 `role="menu"`                         | `menu`는 앱 메뉴의 화살표 키 동작을 약속한다. 사이트 내비게이션은 목록을 담은 `<nav>`다 |

## 2. 비활성

- 정말 쓸 수 없으면 네이티브 `disabled`를 쓴다. 탭 순서에서 빠지고 활성화가 막히며 `:disabled`가 적용되고 폼 제출에서 빠진다.
- 포커스를 남겨야 할 때만 `aria-disabled="true"`를 쓴다. 이것은 상태를 알리기만 한다. 포인터·키보드 활성화와 폼 제출을 코드로 막고, 비활성 모양(강제 색 모드 포함)을 따로 만들고, 왜 못 쓰는지 옆에 글로 적는다.
- 한 요소에 `disabled`와 `aria-disabled`를 함께 쓰지 않는다.
- 기본 `disabled` 컨트롤에는 포인터 이벤트가 없고 탭 순서에서도 빠져 툴팁이 키보드·터치 사용자에게 뜨지 않는다. 이유는 컨트롤 옆 글로 적거나 `aria-disabled`로 바꿔 포커스와 호버를 남긴다.
- 비활성 컨트롤은 대비 기준에서 빠진다(11절). 제출을 「입력이 다 맞을 때까지 비활성」으로 두지 않는다(7절).

## 3. 포커스

**표시.**

- `:focus-visible`을 쓴다. 키보드 포커스에는 링이 보이고 마우스 클릭에는 대체로 안 보이며, 입력 칸에서는 마우스로도 보인다. `:focus`만 쓰지 않는다.
- 브라우저 기본 링이 가장 좋다. 플랫폼과 강제 색 모드를 알아서 따른다. `outline-offset`만 더해도 기본 링이 그대로 남는다.
- 직접 만든 링은 포커스 토큰이나 명시한 색을 쓴다. 색 없이 `outline: 2px solid`만 쓰면 `currentColor`가 되어 지나가는 색과 대비가 모자랄 수 있다.
- 직접 만든 링은 둘레 전체가 지나가는 모든 인접 색(컴포넌트 채움·페이지 면·이미지·그라데이션·hover·선택 상태)과 3:1이어야 한다(1.4.11). 토큰·브랜드 색·`currentColor`는 그려진 결과로 확인한 뒤에만 통과다.
- 2px 실선 둘레에 3:1 변화는 2.4.13(AAA)의 목표다. 권고로 적는다.
- 검증된 대체 없이 `outline: none`을 쓰지 않는다.

```css
/* 가장 좋음: 기본 링을 두고 여유만 준다 */
:focus-visible {
  outline-offset: 2px;
}

/* 디자인상 직접 만들어야 할 때: 프로젝트의 검증된 토큰 */
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

```tsx
// Tailwind: 프로젝트의 포커스 토큰이나 기존 링 유틸리티를 쓴다
<button className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
  저장
</button>
```

- 강제 색 모드(`forced-colors: active`)에서는 기본 색 조정을 두거나 시스템 색(`Highlight`)을 쓴다. `forced-color-adjust: none`은 작성한 색을 고정하니 컨트롤이 여전히 보이는지 확인한 곳에만 쓴다.
- 안쪽 입력이 포커스를 받을 때 바깥 틀이 같이 켜져야 하면 `:focus-within`을 쓴다(아이콘이 테두리 안에 있는 검색 칸).

**가려지지 않게(2.4.11).** 고정 헤더·하단 배너 아래로 포커스 요소가 완전히 가려지면 실패다. 스크롤 컨테이너에 `scroll-padding-block-start`(고정 헤더 높이)와 `scroll-padding-block-end`(고정 푸터·쿠키 배너 높이)를 준다. 앵커 대상 제목에는 `scroll-margin-block-start`를 준다(고정 헤더 아래 예 `80px`).

**건너뛰기 링크.** 문서의 첫 포커스 요소로 두고 `<main id="main">`을 가리킨다. 포커스될 때만 보인다.

```css
.skip-link {
  position: absolute;
  inset-inline-start: -999px;
}
.skip-link:focus {
  inset-inline-start: 16px;
  inset-block-start: 16px;
}
```

```html
<body>
  <a class="skip-link" href="#main">본문으로 건너뛰기</a>
  <header>…</header>
  <main id="main">…</main>
</body>
```

**`tabindex` 규칙.**

| 값   | 쓰는 곳                                                                   |
| ---- | ------------------------------------------------------------------------- |
| `0`  | 기본으로 포커스되지 않는 커스텀 상호작용 요소를 탭 순서에 넣는다          |
| `-1` | `el.focus()`로만 포커스한다. 포커스를 보낼 제목·모달 컨테이너·로빙 구성원 |
| 양수 | 쓰지 않는다. 페이지 전체의 탭 순서를 가로챈다. DOM 순서를 고친다          |

**로빙 tabindex.** 탭·메뉴·툴바·라디오 묶음 같은 복합 위젯은 탭 정지가 하나다. 활성 항목만 `tabindex="0"`이고 나머지는 `-1`이다. 화살표 키가 포커스와 `0`을 함께 이동한다.

```tsx
<div role="tablist">
  {tabs.map((tab, i) => (
    <button
      role="tab"
      tabIndex={i === activeIndex ? 0 : -1}
      aria-selected={i === activeIndex}
      onKeyDown={handleArrowKeys} // 좌우 화살표가 activeIndex를 바꾸고 끝에서 돈다
    >
      {tab.label}
    </button>
  ))}
</div>
```

콤보박스는 DOM 포커스를 입력 칸에 둔다. 입력 칸의 `aria-activedescendant`가 강조된 옵션의 `id`를 가리키게 하고 화살표 키마다 갱신한다.

## 4. 대화상자와 화면 전환

- `<dialog>`와 `showModal()`을 쓴다. 뒤쪽이 비활성이 되고 Esc로 닫힌다.

```tsx
dialogRef.current.showModal(); // 열 때
dialogRef.current.close(); // 닫을 때
triggerRef.current?.focus(); // 연 요소로 포커스를 돌려준다
```

- `<dialog>`를 못 쓰는 직접 만든 오버레이는 `role="dialog"`·`aria-modal="true"`·`aria-labelledby`(이름)를 달고 뒤쪽에 `inert`를 건다. `inert`는 뒤쪽을 탭 순서와 보조기기에서 한 번에 뺀다. 오버레이는 `inert` 컨테이너 바깥(포털이나 형제 요소)에 그린다. 조상에 `inert`가 걸리면 대화상자도 꺼진다.

```tsx
// 열 때
document.getElementById("app-content").inert = true;
const dialog = dialogRef.current;
(dialog.querySelector("[autofocus]") ?? dialog.querySelector("button, [href], input, select, textarea"))?.focus();

// 닫을 때
document.getElementById("app-content").inert = false;
triggerRef.current?.focus();
```

- 열 때 첫 포커스 요소로 간다. 파괴 확인 창은 가장 덜 파괴적인 행동(「닫기」)에 포커스를 둔다.
- 닫을 때 연 요소로 돌려준다. 그 요소가 없어졌으면 가까운 컨테이너로 보낸다.
- Esc는 나중에 열린 것부터 닫는다(툴팁 → 메뉴 → 대화상자).
- SPA 경로 전환은 포커스도 알림도 초기화하지 않는다. `document.title`을 새 맥락에 맞게 갱신하고, 새 화면의 `<h1>`(`tabindex="-1"`)이나 `<main>`으로 포커스를 보낸다. 뒤로·앞으로 가기에서는 스크롤 위치를 복원하고 새 이동에서는 맨 위로 간다.

## 5. 키보드 지도(APG)

기본 요소에는 이 동작이 이미 들어 있다. 직접 만든 위젯은 직접 구현한다.

| 위젯                   | 키                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 대화상자               | Tab/Shift+Tab이 안에서 돈다(끝에서 처음으로). Esc로 닫는다                                                            |
| 탭                     | 화살표로 탭 사이를 이동한다(끝에서 돈다). Tab은 패널로 나간다. Home/End는 처음·마지막 탭                              |
| 메뉴 버튼              | Enter/Space/ArrowDown은 열고 첫 항목으로, ArrowUp은 열고 마지막 항목으로. 화살표로 이동. Esc는 닫고 버튼으로 돌아간다 |
| 펼치기·아코디언        | 머리글은 `<button aria-expanded>`. Enter와 Space가 토글한다                                                           |
| 콤보박스               | ArrowDown은 열거나 목록으로 들어간다. Enter는 선택. Esc는 닫고 입력 칸으로 돌아간다. 입력하면 걸러진다                |
| 리스트박스·라디오 묶음 | 화살표로 선택을 이동한다. 묶음 전체의 탭 정지는 하나                                                                  |

공통 규칙:

- Esc는 마지막에 열린 것부터 닫는다.
- 탭의 활성화는 패널이 바로 그려지면 자동(화살표 포커스에 패널 전환), 전환 비용이 크면 수동(Enter/Space로 활성화)으로 고른다.
- 한 줄 입력의 Enter는 폼을 제출한다. `<textarea>`의 Enter는 줄바꿈이고, ⌘/Ctrl+Enter 제출은 직접 구현해야 생긴다.

## 6. 누르는 영역

| 기준             | 최소 크기          |
| ---------------- | ------------------ |
| WCAG 2.5.8 (AA)  | 24×24px(예외 있음) |
| WCAG 2.5.5 (AAA) | 44×44px            |
| Apple HIG        | 44×44pt            |
| Material Design  | 48×48dp            |

- 작은 대상을 finding으로 적기 전에 예외부터 확인한다: 간격 · 같은 기능의 다른 컨트롤 · 글 속 링크 · 브라우저 기본 컨트롤 · 필수인 경우.
- 간격 예외는 이렇게 계산한다. 대상의 바운딩 상자 중심에 지름 24px 원을 그려 다른 대상이나 다른 작은 대상의 원과 겹치지 않으면 통과다. 단순한 경우 20px 대상은 4px 간격이면 된다.
- 보이는 크기는 작아도 되고 누르는 영역이 커야 한다. 눌러 보이는 것은 보이는 면적 전체에서 눌려야 한다.

**가상 요소로 넓히기.** 20×20 체크박스 같은 보이는 요소가 작으면 `<label>`이나 `<button>`에 가상 요소를 둔다. `<input>`에는 두지 않는다. 폼 컨트롤은 `::before`·`::after`를 안정적으로 그리지 않고, 입력의 `<label>`이 아닌 감싸는 요소는 클릭을 받고도 아무것도 토글하지 못한다.

```css
/* 입력을 감싸는 label에 둔다: 20px 체크박스에 44px 누르는 영역 */
.checkbox-control {
  position: relative;
  width: 20px;
  height: 20px;
}

.checkbox-control::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%; /* 물리 좌표로 가운데: 방향과 무관하다 */
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
}
```

```tsx
<button
  aria-label="완료로 표시"
  className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2"
>
  <CheckIcon aria-hidden="true" />
</button>
```

상자 크기를 실제로 키울 수 있으면 가상 요소 없이 상자가 대상이 되게 한다.

```css
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
}
```

- 넓힌 영역이 다른 상호작용 요소와 겹치면 겹치지 않는 최대 크기로 줄인다.
- 장식 층(그라데이션 막·빛·번짐·전체를 덮는 `::after`)은 아래 컨트롤의 포인터 이벤트를 먹는다. `pointer-events: none`(Tailwind `pointer-events-none`)을 준다. 가상 요소가 아니라 요소면 `aria-hidden="true"`도 준다. 눌러서 닫는 모달 배경은 컨트롤이지 장식이 아니므로 포인터 이벤트를 남긴다.

```css
.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
```

- 끌기는 한 번 누르기 대안이 있어야 한다(2.5.7). 정렬 행의 위·아래 이동 버튼, 칸반 카드의 메뉴가 그 예다.
- 여러 손가락이나 경로를 쓰는 제스처(핀치·스와이프)는 한 점 대안이 있어야 한다(2.5.1).
- `touch-action: none`은 팬·줌·끌기를 직접 구현한 면에만 건다. 브라우저의 스크롤·핀치 확대를 막으므로 페이지 전체에 걸면 스크롤이 사라진다.

## 7. 폼

**라벨.** 모든 입력에 `<label for>`나 감싸는 `<label>`을 단다. 자리표시 글은 라벨이 아니다. 입력하면 사라지고 대비도 모자라기 쉽다. 라벨과 컨트롤은 하나의 누르는 대상이어야 하고 둘 사이에 죽은 영역이 없어야 한다. `required`와 보이는 표시를 쓰고 폼마다 한 번 설명한다(「* 필수」).

```html
<!-- 좋음: 명시적 연결 -->
<label for="email">이메일</label>
<input id="email" type="email" autocomplete="email" />

<!-- 좋음: 감싸는 라벨. 라벨과 컨트롤이 한 대상이다 -->
<label> <input type="checkbox" /> 소식 받기 </label>
```

**`autocomplete`(1.3.5).** 사용자 자신에 관한 칸에는 유효한 토큰을 단다. 설명이 되는 `name`, 진짜 `<form>`을 함께 두고 가짜 입력을 쓰지 않는다. 비밀번호 관리자와 인증 번호 자동 입력이 그래야 된다.

| 칸             | `autocomplete`                                              |
| -------------- | ----------------------------------------------------------- |
| 이름           | `name`(또는 `given-name`·`family-name`)                     |
| 이메일         | `email`                                                     |
| 전화           | `tel`                                                       |
| 주소           | `street-address`, `address-line1`, `postal-code`, `country` |
| 카드           | `cc-number`, `cc-exp`, `cc-csc`, `cc-name`                  |
| 로그인         | `username`, `current-password`                              |
| 가입·재설정    | `username`, `new-password`                                  |
| 인증 번호(2FA) | `one-time-code`                                             |

필요하면 섹션 접두어를 붙인다: `autocomplete="shipping street-address"`.

**`type`과 `inputmode`.** 맞는 모바일 키보드를 부른다.

| 입력              | 쓰는 것                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| 이메일·URL·전화   | `type="email"`, `type="url"`, `type="tel"`                             |
| OTP·PIN·카드 번호 | `type="text" inputmode="numeric"`(글 의미를 유지하고 스핀 버튼이 없다) |
| 금액·소수         | `type="text" inputmode="decimal"`                                      |
| 진짜 수량         | `type="number"`                                                        |

이메일·코드·사용자 이름에는 `spellcheck="false"`를 단다. 붙여넣기를 막지 않는다. 사람들은 비밀번호와 인증 번호를 붙여 넣는다.

**검증.**

- 입력 중에 거르거나 막지 않는다. 자유롭게 받은 뒤 검증한다. 검증 전에 앞뒤 공백을 자른다. 자동 완성과 텍스트 확장이 뒤에 공백을 붙인다.
- 제출을 「다 맞을 때까지 비활성」으로 두지 않는다. 제출 때 검증한다.
- 실패한 칸에 `aria-invalid="true"`를 달고 고치면 뗀다. `aria-describedby`로 칸 아래 오류 글을 가리킨다. 제출하면 첫 오류 칸으로 포커스를 보낸다.
- 빨간 테두리만 바꾸는 것은 색만의 단서다. 아이콘이나 글을 함께 둔다.

```html
<label for="email">이메일</label>
<input id="email" type="email" autocomplete="email" aria-invalid="true" aria-describedby="email-error" />
<p id="email-error">이메일 형식으로 입력해 주세요. 예: name@example.com</p>
```

**제출 중.**

- 요청이 시작될 때까지 제출을 활성으로 둔다.
- 진행 중에는 원래 라벨 옆에 스피너를 둔다. 「저장」과 스피너를 함께 둔다. 라벨이 어느 버튼이 바쁜지 알려 준다.
- 진행 중 버튼에는 `aria-disabled="true"`를 달고 핸들러에서 반복 클릭을 무시한다. 포커스된 버튼에 `disabled`를 걸면 포커스가 `<body>`로 떨어진다.

**결과 알림.** 성공은 polite 영역으로 알린다. 실패는 첫 오류 칸에 포커스를 두면 그것이 알림이다. `role="alert"`는 어느 칸에도 묶이지 않는 폼 전체 오류에만 쓴다(8절).

**그 밖.** 저장 안 한 변경이 있으면 이동 전에 경고한다. 다시 그리기나 하이드레이션이 입력값을 지우거나 포커스를 칸 밖으로 보내지 않게 한다.

## 8. 알리기

**고르는 순서.** 처음 맞는 것에서 멈춘다.

1. 포커스가 어차피 거기로 간다(모달이 열림, 첫 오류 칸). 따로 할 일이 없다. 포커스 이동이 알림이다.
2. 특정 컨트롤에 묶인다(칸 오류, 글자 수): 컨트롤의 `aria-describedby`. 칸과 함께 읽힌다.
3. 급하지 않고 컨트롤에 안 묶인다(토스트, 「저장했어요」, 결과 개수, 로딩 상태): polite 영역 `role="status"`.
4. 급하고 컨트롤에 안 묶인다(폼 전체 실패, 세션 만료): `role="alert"`.

**live region.**

| 방식                                                           | 끼어드는 정도    | 쓰는 곳                                   |
| -------------------------------------------------------------- | ---------------- | ----------------------------------------- |
| `role="status"`(`aria-live="polite"` + `aria-atomic="true"`)   | 쉬는 틈에 읽는다 | 토스트·「저장했어요」·결과 개수·로딩 갱신 |
| `role="alert"`(`aria-live="assertive"` + `aria-atomic="true"`) | 즉시 끼어든다    | 오류와 급한 문제에만                      |

- 반복되는 polite 갱신은 빈 영역을 DOM에 먼저 그려 두고 글만 바꾼다. 글이 든 새 polite 영역을 끼워 넣으면 읽히는 정도가 들쭉날쭉하다.
- 끼워 넣은 `role="alert"`는 대체로 읽히지만 지원이 갈린다. 대상 브라우저와 화면 낭독기 조합으로 확인한다.
- 기본은 polite다. assertive는 읽던 것을 끊는다.
- 메시지는 짧고 그것만으로 뜻이 서야 한다. `aria-atomic="true"`는 바뀔 때 영역 전체를 다시 읽는다.
- 토스트로 포커스를 보내지 않는다. 알리고 포커스는 사용자가 일하던 곳에 둔다.

```tsx
// 처음부터 그려 둔 영역에 나중에 메시지를 넣는다
<div role="status" className="sr-only">
  {statusMessage}
</div>
```

로딩은 갱신되는 영역에 `aria-busy="true"`를 달고 「불러오는 중」을 polite로 알린 뒤 결과(「12건을 불러왔어요」)를 알린다.

**`aria-hidden`.** 요소와 그 하위 전체를 보조기기에서 뺀다. 장식 아이콘과 시각 효과용 중복 내용에 쓴다. 포커스되는 요소나 그 조상에는 쓰지 않는다. 탭으로 갈 수 있는데 낭독기에는 없는 정지가 생긴다. 상호작용하는 것을 숨기려면 탭 순서에서도 뺀다.

**화면 밖 숨김 글(`sr-only`).** 눈에는 안 보이고 접근성 트리에는 남긴다.

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

상자는 `0`이 아닌 `1px`로 둔다. 크기가 0인 요소를 건너뛰는 낭독기가 있다. `white-space: nowrap`은 단어가 붙어 읽히는 것을 막는다. `display: none`이나 `visibility: hidden`은 보조기기에서도 내용을 없애니 쓰지 않는다. Tailwind는 `sr-only`를 준다. 눈으로 보는 사람이 얻는 맥락(「새 탭에서 열림」, 표 캡션, `aria-label`을 못 쓰는 곳의 아이콘 버튼 라벨)에 쓴다.

**대체 글.** 생김새는 보지 말고 쓰임으로 고른다.

| 쓰임                     | 대체 글                                           | 예                                                  |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------- |
| 장식이거나 옆 글과 중복  | `alt=""`(비었지만 있어야 한다)                    | 회사 이름 글 옆의 로고                              |
| 정보                     | 더하는 뜻을 설명                                  | `alt="입장권 QR 코드"`                              |
| 기능(이미지가 링크·버튼) | 행동이나 목적지                                   | 돋보기 아이콘 → `alt="검색"`(`alt="돋보기"`는 틀림) |
| 글자 이미지              | 글자 그대로(가능하면 진짜 글자로)                 | `alt="전 품목 50% 할인"`                            |
| 복잡한 것(차트·도표)     | `alt`에 짧은 요약, 전체 데이터는 표나 글로 근처에 | `alt="분기별 매출, 아래에 설명"`                    |

`alt` 속성 자체가 없으면 낭독기가 파일 이름을 읽어 빈 `alt`보다 나쁘다.

**SVG.**

- 장식 SVG는 `aria-hidden="true"`다. 제목이 필요 없다.
- 의미 있는 인라인 SVG는 `role="img"`와 `aria-label`, 또는 첫 자식 `<title>`을 `aria-labelledby`로 가리킨다.
- 단순하면 SVG 파일을 `<img>`로 불러오고 `alt`를 다는 방식(`<img alt="…">`)이 가장 확실하다.

```tsx
// 이름 있는 버튼 안의 장식 아이콘
<button aria-label="닫기">
  <svg aria-hidden="true">…</svg>
</button>

// 단독으로 뜻이 있는 아이콘
<svg role="img" aria-label="인증된 계정">…</svg>
```

**영상·소리.** 녹화 영상에는 자막(1.2.2), 녹음에는 대본(1.2.1)이 있어야 한다. 소리가 나는 자동 재생은 하지 않고(1.4.2) 컨트롤을 항상 그린다.

## 9. 접근 이름

- 우선순위: `aria-labelledby` > `aria-label` > 기본 라벨(`<label>`·글·`alt`) > `title`.
- 보이는 글이나 `aria-labelledby`를 먼저 쓴다. `aria-label`은 안 보여서 화면과 어긋나기 쉽고 번역 도구가 다루는 방식이 제각각이다.
- 아이콘만 있는 버튼은 행동 이름을 단다. 아이콘에는 `aria-hidden="true"`를 준다.
- 보이는 라벨은 접근 이름에 포함돼야 한다(2.5.3). 「보내기」 버튼에 `aria-label="메시지 제출"`을 달면 「보내기」라고 말하는 음성 조작 사용자가 누르지 못한다.
- 이름은 행동이다(「닫기」). 아이콘 모양(「X 아이콘」)으로 짓지 않는다.

```tsx
// 좋음: 보이는 글에서 이름을 얻고 아이콘은 숨긴다
<button>
  <TrashIcon aria-hidden="true" /> 삭제
</button>

// 좋음: 아이콘만 있으면 이름을 명시한다
<button aria-label="삭제">
  <TrashIcon aria-hidden="true" />
</button>
```

## 10. 움직임·시간·확대

**움직임 줄이기.** 움직임은 `prefers-reduced-motion: no-preference`에서만 켜지게 쓴다. 움직임 줄이기를 요청한 사용자는 애니메이션마다 덮어쓰지 않아도 정적 버전을 얻는다.

```css
.card {
  /* 정적 스타일 */
}
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 200ms ease-out;
  }
}
```

```tsx
// Tailwind: motion-safe / motion-reduce 변형
<div className="motion-safe:transition-transform motion-safe:hover:-translate-y-1" />
```

움직임 줄이기는 전정 자극을 겨냥하며 피드백은 겨냥하지 않는다.

| 끄기                              | 바꾸기                                       | 두기                                  |
| --------------------------------- | -------------------------------------------- | ------------------------------------- |
| 시차 스크롤                       | 슬라이드·스케일·줌 전환 → 투명도 교차 페이드 | 로딩 스피너와 진행 표시               |
| 자동 재생 영상·GIF·반복 장식      | 부드러운 스크롤 → 즉시 이동                  | 즉시 바뀌는 상태(hover 색, 포커스 링) |
| 회전, 화면을 가로지르는 큰 움직임 | 자동으로 도는 캐러셀 → 멈춘 채 시작          | 짧은 기능 피드백(버튼 눌림)           |

**스스로 움직이는 것과 시간.**

- 5초를 넘게 움직이거나 깜박이거나 스크롤되는 것에는 보이는 정지·일시 정지·숨기기 컨트롤을 둔다(2.2.2). 소리 없이 반복되는 히어로 영상도 포함이다. 자동 갱신은 길이와 상관없이 컨트롤이 필요하고 갱신 빈도 조절도 인정된다.
- 자동으로 사라지는 것은 영향이 작은 확인에만 맞다. 행동·오류·필요할 수 있는 정보가 있는 토스트는 닫을 때까지 둔다.
- 시간 제한이 꼭 있는 토스트는 5초 이상 보이고 호버·포커스 동안 타이머를 멈춘다.
- 필요한 정보를 시간 제한 요소에만 두지 않는다. 되돌리기 링크가 사라지는 토스트에만 있으면 정해진 시간 뒤에 데이터를 잃는다.

**확대와 재배치.**

- 글자 200% 확대(1.4.4): 모든 내용과 기능이 글자를 200%로 키워도 남아야 한다. 글 컨테이너는 `height` 대신 `min-height`를 쓴다.
- 320px 재배치(1.4.10): 1280px 화면에서 400% 확대(320px 폭과 같다)해도 세로 스크롤만으로 쓸 수 있어야 한다. 표·지도·코드처럼 진짜 2차원인 내용은 자기 컨테이너 안에서 스크롤한다.
- 미디어 쿼리는 코드베이스가 허락하면 `rem`이나 `em`으로 쓴다. 브라우저 글자 크기를 키우면 글이 필요로 할 때 좁은 배치로 바뀐다. `px` 쿼리는 그렇지 않다.
- viewport 메타에 `maximum-scale=1`이나 `user-scalable=no`를 쓰지 않는다. iOS의 입력 확대는 `ux-spec`의 `visual-type.md` 16px 규칙으로 막는다.

## 11. 대비 기준

이 하네스에서 어느 짝이 몇을 넘어야 하는지 정한다.

| 기준      | 적용 대상                                 | 최소  |
| --------- | ----------------------------------------- | ----- |
| 1.4.3 AA  | 글자                                      | 4.5:1 |
| 1.4.3 AA  | 큰 글자(24px 이상 또는 18.67px 이상 굵게) | 3:1   |
| 1.4.11 AA | 컨트롤 경계·상태·의미 있는 그래픽         | 3:1   |

비활성 컨트롤과 로고는 예외다. 색과 함께 둘째 단서(아이콘·글·밑줄)를 둔다(1.4.1). 재는 법은 [`../scripts/contrast-from-pixels.mjs`](../scripts/contrast-from-pixels.mjs)를 쓴다. 실패하면 짝과 못 넘은 기준을 보고하고, 색을 고치는 법은 `ux-spec`의 `visual-color.md`를 따른다.

## 12. 끝내기 전 찾을 것

| 패턴                                                                    | 고침                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `outline: none`·`outline-none`인데 가까이에 `focus-visible` 대체가 없음 | 브라우저 링을 되살리거나 검증된 직접 링을 단다       |
| `<div onClick`·`<span onClick`                                          | `<button>`, 이동이면 `<a href>`                      |
| `role="button"`·`role="tab"`인데 `onKeyDown`이 없음                     | 기본 요소로 바꾸거나 APG 키 지도를 구현한다          |
| `tabIndex={1}` 등 양수 `tabindex`                                       | DOM 순서를 고치고 `0`을 쓴다                         |
| 제출 단추에 `disabled={!isValid}`                                       | 활성으로 두고 제출 때 검증한다                       |
| 제출 중 포커스된 버튼에 `disabled`                                      | `aria-disabled="true"`로 바꾸고 반복 클릭을 무시한다 |
| `{msg && <div role="status">`처럼 영역을 글과 함께 그림                 | 빈 영역을 먼저 그리고 글만 바꾼다                    |
| 성공 토스트에 `aria-live="assertive"`                                   | `role="status"`                                      |
| 토스트가 뜨면 포커스를 토스트로 보냄                                    | 알리기만 하고 포커스는 그대로 둔다                   |
| `<img`에 `alt` 속성이 없음                                              | 장식이면 `alt=""`, 아니면 쓰임을 적는다              |
| `aria-label` 글이 보이는 라벨을 포함하지 않음                           | 보이는 글로 이름을 시작한다                          |
| 버튼·링크·입력의 조상에 `aria-hidden`                                   | 떼거나 그 하위를 inert로 만든다                      |
| 낭독 전용 글을 `display: none`·`visibility: hidden`으로 숨김            | `sr-only` 패턴을 쓴다                                |
| `maximum-scale=1`·`user-scalable=no`                                    | 뺀다                                                 |
| 기본 `disabled` 컨트롤에 툴팁                                           | 옆 글을 두거나 `aria-disabled`로 포커스를 남긴다     |
| `onDragStart`나 끌기 라이브러리에 버튼 대안이 없음                      | 같은 결과를 내는 한 점 경로를 더한다                 |
| 자리표시 글만 있고 라벨이 없음                                          | `<label for>`를 단다                                 |
| 붙여넣기 막기(`onPaste` 차단)                                           | 막지 않는다                                          |
| 대화상자를 닫아도 포커스가 연 요소로 안 돌아옴                          | `trigger.focus()`를 닫을 때 부른다                   |
| 움직임이 `prefers-reduced-motion` 가드 없이 켜져 있음                   | `no-preference` 안에 넣는다                          |

## 13. 점검할 때 심각도

- HIGH(과제를 막음·보조기기에서 숨김·체계적 실패) → P1
- MEDIUM → P2
- LOW → P3

이 영역의 바로 P1 항목은 `../../ux-review/references/heuristics.md` 5절과 같다: 이름 없음, 포커스 표시 없음, 키보드 경로 없음, 움직임 줄이기 무시, 320px·200% 손실, 색만으로 뜻을 전함. 이 항목이 확인되면 화면이 작아도 낮추지 않는다.

**확인 방법.**

- 브라우저 없이: 모든 상호작용 요소의 이름, 기본이 아닌 컨트롤의 키보드 처리, 포커스 스타일, 움직임 줄이기 가드, 입력과 라벨의 연결.
- 화면에서: Tab으로 흐름을 순서대로 돌기, 접근성 트리에서 이름·역할 읽기, 모든 정지점에서 포커스 표시 확인, 자동 검사. 못 한 확인은 `NOT_CHECKED`로 적는다.

## 14. 한국어 화면 기준

- **한글 입력 조합 중 Enter.** 한글을 조합하는 동안 Enter를 누르면 일부 브라우저가 조합을 끝내는 keydown을 한 번 더 보낸다. 마지막 글자가 중복되거나 두 번 제출된다. 키 처리에서 `event.isComposing`이면 무시한다.

```tsx
<input
  onKeyDown={(e) => {
    if (e.nativeEvent.isComposing) return; // 조합 중 Enter는 제출이 아니다
    if (e.key === "Enter") submit();
  }}
/>
```

- **언어.** 한국어 화면의 접근 이름·대체 글은 한국어로 쓰고 문서 `lang="ko"`와 맞춘다. 영어 이름을 한국어 화면에 넣으면 낭독기가 한국어 음성으로 영어를 읽어 알아듣기 어렵다.
