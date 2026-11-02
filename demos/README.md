# demos

README에 들어가는 데모 GIF를 만드는 결정적 렌더러와 장면 모음이에요.

## 장면

| 장면 | 크기 | 길이 | 보여 주는 것 |
| --- | --- | --- | --- |
| `hero` | 880×560 | 약 13.3초 | 한 문장 요청이 하네스 9단계를 지나가요 |
| `simulate` | 880×460 | 약 12.5초 | 조사 → 합성 페르소나 → 후보안 시뮬레이션 → 추천 (`ux-simulate`) |
| `review` | 880×400 | 약 10초 | 삭제 토스트 판정과 스낵바 + 되돌리기 수정 (`ux-review`) |
| `writing` | 880×400 | 약 10초 | 오류 문구와 버튼 문구 고치기 (`ux-writing`) |
| `a11y` | 880×400 | 약 10.5초 | 대상 크기·명도 대비·포커스 가려짐 점검 (`ux-a11y`) |
| `dark-patterns` | 880×400 | 약 10.5초 | 해지 화면의 기만 패턴 4건과 고친 화면 (`ux-dark-patterns`) |
| `spec` | 880×420 | 약 10초 | 화면 설계서 한 장 (`ux-spec`) |
| `flow` | 880×380 | 약 9.5초 | 해지 흐름도 (`ux-flow`) |
| `metrics` | 880×420 | 약 9.5초 | HEART × 목표–신호–지표 표 (`ux-metrics`) |
| `research` | 880×400 | 약 11초 | 연구 방법 고르기와 질문 고치기 (`ux-research`) |
| `ai` | 880×420 | 약 10초 | 출처·중지·피드백이 있는 대화 화면 (`ux-ai`) |
| `social` | 1280×640 | 정지 | GitHub 소셜 미리보기 PNG (라이트만) |

결과는 `assets/demos/<scene>-light.gif`, `<scene>-dark.gif`, `social-preview.png`에 써요.

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
