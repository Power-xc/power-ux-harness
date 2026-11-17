// visual-scan-disable-file: 규칙 예시 문자열이 있어 스캐너가 이 파일을 건너뛴다
import { R, rx, lineHits } from "./helpers.mjs";

function pluralHack(line) {
  return (
    /===?\s*1\s*\?\s*(["'`])\1\s*:\s*(["'`])e?s\2/.test(line) ||
    /!==?\s*1\s*\?\s*(["'`])e?s\1\s*:\s*(["'`])\2/.test(line)
  );
}

function learnMore(ctx) {
  const hits = lineHits(ctx, /(?:>|["'`])\s*(?:Learn more|자세히 보기)\s*(?:<|["'`])/);
  return hits.length >= 2 ? hits : [];
}

export const COPY_RULES = [
  R({
    id: "copy-are-you-sure",
    level: "warn",
    scope: "line",
    message: "「Are you sure」·「정말 …하시겠」 확인 문구를 쓴다",
    fix: "결과를 적고 버튼 이름을 동사 + 대상으로 쓴다(예: 「프로젝트 삭제」)",
    test: rx(/\bAre you sure\b|정말[^"'`<\n]{0,30}하시겠/i),
    examples: {
      hit: ["<p>Are you sure?</p>", "<p>정말 삭제하시겠습니까?</p>"],
      miss: ["<p>삭제하면 되돌릴 수 없다</p>"],
    },
  }),
  R({
    id: "copy-successfully",
    level: "info",
    scope: "line",
    message: "「successfully」·「성공적으로」를 쓴다",
    fix: "결과만 적는다(예: 「저장했다」)",
    test: rx(/\bsuccessfully\b|성공적으로/i),
    examples: { hit: ['toast("Saved successfully")', 'toast("성공적으로 저장했습니다")'], miss: ['toast("Saved")'] },
  }),
  R({
    id: "copy-click-here",
    level: "warn",
    scope: "line",
    message: "「click here」·「여기를 클릭」 링크 문구를 쓴다",
    fix: "링크 글자에 갈 곳이나 할 일을 적는다",
    test: rx(/click here|여기를\s*(?:클릭|누르)/i),
    examples: { hit: ["<a>Click here</a>", "<a>여기를 클릭</a>"], miss: ["<a>요금표 보기</a>"] },
  }),
  R({
    id: "copy-oops",
    level: "warn",
    scope: "line",
    message: "「Oops」·「앗!」 같은 감탄사로 오류를 연다",
    fix: "무슨 일이 일어났는지와 다음 행동을 적는다",
    test: rx(/\b(?:Oops|Whoops)\b|(?:["'`>]|\s)앗[!,]/i),
    examples: {
      hit: ["<p>Oops! Something went wrong</p>", "<p>앗! 오류가 났다</p>"],
      miss: ["<p>저장하지 못했다. 다시 시도한다</p>"],
    },
  }),
  R({
    id: "copy-plural-hack",
    level: "warn",
    scope: "line",
    message: '복수형을 === 1 ? "" : "s" 로 만든다',
    fix: "ICU 복수형(plural)으로 쓴다",
    test: pluralHack,
    examples: { hit: ['{count} item{count === 1 ? "" : "s"}'], miss: ["{t('items', { count })}"] },
  }),
  R({
    id: "copy-locale-default",
    level: "info",
    doc: "ux-writing/references/ko-rules.md",
    scope: "line",
    message: "날짜·숫자 형식에 locale 인자가 없다(toLocale…String())",
    fix: "Intl 로 사용자 locale 을 명시한다. 서버 코드의 기본 locale 은 서버 설정을 따라 사용자와 어긋난다",
    test: rx(/\.toLocale(?:Date|Time)?String\(\s*\)/),
    examples: {
      hit: ["d.toLocaleDateString()", "price.toLocaleString()"],
      miss: ['d.toLocaleDateString("ko-KR")', 'price.toLocaleString("ko-KR")'],
    },
  }),
  R({
    id: "copy-ok-button",
    level: "info",
    scope: "line",
    message: "버튼 이름이 OK·Yes·No 다",
    fix: "동사 + 대상으로 쓴다(예: 「변경 저장」)",
    test: rx(/>\s*(?:OK|Yes|No)\s*</),
    examples: { hit: ["<button>OK</button>"], miss: ["<button>변경 저장</button>"] },
  }),
  R({
    id: "copy-learn-more",
    level: "info",
    scope: "file",
    message: "「Learn more」·「자세히 보기」가 한 파일에 둘 이상이다",
    fix: "링크마다 대상을 붙여 구별한다(예: 「요금제 자세히 보기」)",
    test: learnMore,
    examples: {
      hit: ["<a>Learn more</a>\n<a>Learn more</a>"],
      miss: ["<a>Learn more</a>\n<a>Learn more about billing</a>"],
    },
  }),
];
