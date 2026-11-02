# demos

README에 들어가는 데모 GIF를 만드는 결정적 렌더러와 장면 모음이에요.

## 장면

| 장면 | 크기 | 길이 | 보여 주는 것 |
| --- | --- | --- | --- |
| `hero` | 880×560 | 약 13.3초 | 한 문장 요청이 하네스 9단계를 지나가요 |
| `simulate` | 880×632 | 약 12.7초 | 조사 → 합성 페르소나 → 후보안 시뮬레이션 → 추천 (`ux-simulate`) |
| `review` | 880×440 | 약 11.4초 | 삭제 토스트 판정과 스낵바 + 되돌리기 수정 (`ux-review`) |
| `writing` | 880×464 | 약 11.2초 | 결제 화면의 오류 문구와 버튼 문구를 같은 기기에서 고치기 (`ux-writing`) |
| `a11y` | 880×544 | 약 13.0초 | 대상 크기·명도 대비·포커스 가려짐을 점검하고 같은 기기에서 고치기 (`ux-a11y`) |
| `dark-patterns` | 880×544 | 약 12.3초 | 해지 화면의 기만 패턴 4건을 찾아 같은 기기에서 고치기 (`ux-dark-patterns`) |
| `spec` | 880×624 | 약 13.8초 | 번호 주석을 단 화면 설계서 한 장 (`ux-spec`) |
| `flow` | 880×624 | 약 12.5초 | 화면 썸네일로 잇는 주문 흐름도와 점선 예외 경로 (`ux-flow`) |
| `metrics` | 880×528 | 약 10.2초 | 공유 시트 화면의 번호 핀과 HEART × 목표–신호–지표 표 (`ux-metrics`) |
| `research` | 880×552 | 약 12.5초 | 방법 지도가 있는 리서치 계획서와 질문·과제 고치기 (`ux-research`) |
| `ai` | 880×640 | 약 13.7초 | 출처·주의 문구·중지와 다시 생성·이유 있는 피드백을 번호 주석으로 짚은 대화 화면 (`ux-ai`) |

결과는 `assets/demos/<scene>-light.gif`, `<scene>-dark.gif`에 써요.

## 렌더

```sh
cd demos && npm install        # puppeteer-core만 설치해요 (브라우저는 내려받지 않아요)
node render.mjs                # 전부
node render.mjs hero review --theme dark --fps 10
node render.mjs a11y --at 3,6  # 지정한 시각(초)의 PNG만 .frames/ 에 저장해 눈으로 확인
```

옵션: `--theme light|dark|both`(기본 both), `--fps 12`, `--scale 1.5`, `--colors 96`, `--at 초,초`.
Chrome 경로는 `CHROME_PATH`, ffmpeg 경로는 `FFMPEG_PATH`(기본 `/opt/homebrew/bin/ffmpeg`)로 바꿀 수 있어요.
끝에 장면·테마·프레임 수·픽셀·파일 크기 표를 출력해요. 예산은 장면당 1.5MB, `hero` 2.5MB예요.

## 규칙

- 장면은 `window.DEMO = { width, height, duration, render(t) }`를 노출하고, `render(t)`는 시각 t(ms)만으로 화면 전체를 정해요. `setTimeout`·`requestAnimationFrame`·CSS transition은 쓰지 않아요. 도우미는 `scenes/timeline.js`에 있어요.
- 테마는 `?theme=light|dark`로 정하고 색은 `scenes/shared.css`의 변수만 써요.
- 마지막 상태를 2.4초 유지한 뒤 0.3초 동안 처음 상태로 교차 페이드해 반복 이음새를 맞춰요.
- 프로젝트 이름은 `scenes/brand.js` 한 곳에서 바꿔요.

## 와이어프레임 문법

화면을 그리는 장면은 `scenes/wire.css`와 `scenes/wire.js`의 부품으로 만들어요. 기준 장면은 `spec`(번호 주석)과 `review`(전후 비교)예요. 장면 `<head>`에서 `shared.css`, `wire.css`, `timeline.js`, `wire.js`를 이 순서로 불러요.

### 부품

| 부품 | 클래스 · 도우미 | 크기 | 규칙 |
| --- | --- | --- | --- |
| 기기 틀 | `.w-device` · `W.device` | 폭 300, 반경 28, 1px `--line` | 높이는 장면이 정해요. 하단 홈 인디케이터 120×4 |
| 상태바 | `W.statusBar` | 24 | `9:41` 12/600, 신호·와이파이·배터리 1.5px 선 |
| 앱바 | `W.appBar(title, {back, actions})` | 48 | 제목 16/600, 아이콘 터치 44 |
| 목록 행 | `W.listRow` | 56 | 이미지 자리 40×40, 제목 15 / 보조 12 muted, 오른쪽 아이콘 |
| 입력칸 | `W.field` | 상자 48, 반경 8 | 라벨 12 muted, 도움말 12 muted, 글자 수 `0/20`. 여러 줄은 `box`로 높이를 줘요 |
| 버튼 | `W.button(label, {kind})` | 48 | 주 = accent 채움, 보조 = 1px 테두리, `disabled` = `--subtle` 채움 + `--muted` 글자. 높이 44가 필요하면 `h44` |
| 선택 부품 | `.w-check` `.w-radio` `.w-toggle` `.w-div` | 20 · 20 · 40×24 · 1px | 테두리 1.5px, `on`이면 accent |
| 스낵바 | `W.snackbar(text, {action})` | 48, 반경 8 | `--fg` 채움 + `--bg` 글자. 행동 글자는 `--accent-inv` |
| 토스트 | `W.toast` | 40, 알약 | 반전 면. 폭은 `style`로 고정해요 |
| 스낵바 자리 | `.w-slot` | 48 | 1px 점선, 아직 뜨지 않은 자리 |
| 하단 시트 | `.w-sheet` | 위 반경 16 | 손잡이 32×4 |
| 아이콘 | `W.icon(name, size)` | 24 격자, 1.5px 선 | `back` `chevron` `search` `more` `close` `check` `camera` `trash` `info` `warning` `user` `thumbUp` `thumbDown` `stop` `refresh` `send`. 새 아이콘은 `wire.js`의 `PATHS`에 더해요 |
| 축소 썸네일 | `W.thumb(inner, {x, y, h, scale, name, sub, on})` | 폭 300×배율 | 기기를 `transform: scale`로 줄이고 테두리는 1px로 보이게 `1/배율`로 맞춰요. 캡션은 이름 13/600 + 부제 12 muted이고 읽혀야 해요. `on`이면 accent 테두리 |
| 흐름 화살표 | `W.arrow(pts, {dash})` · `W.arrowAt(el, p)` | 1px `--muted` | `[[x,y],…]` 직각 꺾은선 + 열린 화살촉(7×4). `dash`는 예외 경로예요. `arrowAt`으로 0~1만큼 그려요(점선도 같은 간격으로 그려져요) |
| 말풍선 | `W.bubble(text)` | 높이 40, 최대 폭 220 | 사용자 요청. `--subtle` 채움 + 1px 선, 오른쪽 아래만 반경 4 |
| 답변 | `W.answer(html)` | 15/24 | 말풍선 없이 왼쪽 정렬. 글 사이에 출처 칩을 넣어요 |
| 출처 칩 | `W.cite(label)` | 높이 24, 알약 | 1px accent 선 + accent 글자 12/600. 문장 안 링크라서 24예요 |
| 생성 중 표시 | `W.working(text)` | 24 | `AI` 표시 + 진행 문구 12 muted + 점 셋. 점의 깜박임은 장면이 정해요 |
| 입력 바 | `W.inputBar(placeholder)` | 높이 44, 알약 | 안내 문구 15 muted + 오른쪽 보내기 아이콘 |

### 주석층

- **핀**: `.num`(20px 원, accent 1px). 부품 왼쪽 위 모서리의 바깥에 붙여요(중심이 모서리에서 왼쪽 10, 위 6). `W.pin(n, rect, id)`.
- **지시선**: 1px accent 꺾은선 `W.leaders`. 핀에서 오른쪽 설명 열의 번호 원까지 이어요. 기기 안에서는 부품 사이 빈틈(핀 높이)만 지나가고, 기기 밖 여백에서 설명 줄 높이로 꺾어요. 번호가 클수록 꺾는 x를 오른쪽에 둬서 선이 엇갈리지 않게 해요(`352 · 364 · 376 · 388`). 같은 줄에 핀이 둘이면 뒤의 핀은 버튼 줄 아래 빈틈으로 돌아가요.
- **설명 행**: `.w-note` = 번호 + **부품 이름**(15/600) + 규격(13 muted, 최대 2줄). 줄 간격 64로 고정해요.
- **판정 행**: `.w-vrow` = 라벨 13 muted + 값 15. 전후 판정 열에 써요.
- **문제 표시**: `W.flag(rect)` = 부품 둘레 6px 바깥에 1.5px `--p1` 점선(반경 6) + 오른쪽 위 모서리에 P1 칩.
- **통과 표시**: `.chip.ok`(`PASS`).
- **치수선**: `W.dim` = 1px accent 선 + 양 끝 틱 8 + 가운데 라벨 12/600. 부품 모서리에서 `W.ext`로 연장선을 이어요.
- 좌표는 `W.rect(el)`로 `#stage` 기준 실측해서 써요. 부품을 옮겨도 핀과 선이 따라와요.

### 크기·색

- 글자 크기는 16 · 15 · 13 · 12만 써요. 간격은 8pt 격자예요(라벨과 도움말 사이만 4). 터치 대상은 44 이상이에요.
- 색은 `shared.css` 토큰만 써요: `--fg --muted --line --subtle --accent --p1 --p2 --ok`, 반전 면의 행동 글자는 `--accent-inv`. 새 색은 토큰으로 더한 뒤 라이트·다크 둘 다 대비를 확인해요.
- 그라데이션, 그림자, 흐림은 쓰지 않아요. 구분은 1px 선과 채움 한 겹으로만 해요.
- 내용은 진짜 같은 한국어로 써요. 회색 막대로 대신하지 않아요.
- 장면 폭은 880, 높이는 640 이하예요. GIF는 장면당 600KB 이하로 맞춰요(넘으면 높이 → 길이 → `--colors` 순으로 줄여요).

### 전후 표기

- 「고치기 전」(`.chip.before`, muted)과 「고친 후」(`.chip.after`, accent) 칩을 기기 왼쪽 위에 둬요.
- 880 폭에서 15px 글자가 읽히도록 기기는 하나만 두고, 같은 기기에서 상태를 바꿔요. 칩은 240ms 교차 페이드로 바꿔요.
- 판정 열은 위에 고치기 전(문제·근거), 아래에 고친 후(수정·통과 조건)를 나란히 쌓아요. 두 블록 모두 끝 화면에 남아 있어요.

### 움직임 리듬

- 등장은 `fade` 240ms(아래에서 6px). 퇴장은 180ms.
- 설계서: 화면(300) → 치수선 → 핀 200ms 간격 → 지시선 450ms로 그리기(250ms 간격) → 설명 행은 선이 닿는 순간 → 상태 썸네일 400ms 간격 → 접근성·이벤트 줄 → 포인터 시연.
- 비교: 포인터 이동 400~800ms, 누름 파문 320ms, 행 접힘·펼침 240ms. 토스트는 2초 보인 뒤 사라지고, P1 표시는 0.8초 더 남겨요.
- 마지막 상태를 2.4초 유지한 뒤 0.3초 교차 페이드로 처음에 이어요(`defineDemo`).
- 포인터는 `.w-pointer` / `.w-ripple`을 써요. bg 테두리가 있어서 반전 면 위에서도 보여요.

### 새 장면 순서

1. 기기 안 화면을 `W.*`로 만들고 `W.device`로 감싸요.
2. `W.rect`로 부품 좌표를 재서 핀·지시선·점선을 얹어요.
3. 설명 열과 판정 열을 `.w-note` · `.w-vrow`로 놓아요.
4. `draw(t)`는 `t`만으로 모든 상태를 정해요.
5. `node render.mjs <scene> --at 1.5,4,7,9.5`로 라이트·다크 프레임을 눈으로 확인한 뒤 전체 렌더로 크기를 확인해요.

## 링크 공유 표지

```sh
node demos/render-social.mjs   # assets/demos/social-preview.png (1280×640, 라이트)
```

`scenes/social.html`을 한 장 찍어요. 저장소 이름과 한 줄 설명, 「UX 스킬 10개」, 와이어프레임 셋(`ux-review` 전후, `ux-spec` 번호 핀, `ux-flow` 썸네일)을 평면으로 놓았어요. 움직임은 없어요.
