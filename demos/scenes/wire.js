// 와이어프레임 부품 마크업 도우미: 장면에서 반복되는 HTML만 만든다. 움직임은 timeline.js가 맡는다.
(function () {
  const PATHS = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    more: '<circle cx="12" cy="5.5" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="12" cy="18.5" r="1.25"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    camera: '<path d="M4 9a2 2 0 0 1 2-2h2l1.5-2h5L16 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4l.8-12.5M10 11v5.5M14 11v5.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    warning: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17h.01"/>',
    user: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  };
  const icon = (name, size = 24) => `<svg class="wi" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;

  // 상태바 24: 9:41 + 신호·와이파이·배터리(16 격자, 1.5px 선)
  const mini = (d) => `<svg class="wi" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
  const statusBar = () => `<div class="w-status"><span>9:41</span><span class="ico">` +
    mini('<path d="M2.5 12v-1.5M6 12V8M9.5 12V5.5M13 12V3"/>') +
    mini('<path d="M1.5 6.2a9 9 0 0 1 13 0M4 8.9a5.5 5.5 0 0 1 8 0M8 12h.01"/>') +
    mini('<rect x="1.5" y="4.5" width="11" height="7" rx="2"/><path d="M14.5 7v2"/>') + `</span></div>`;

  // 앱바 48: 뒤로 + 제목 16/600 + 선택 동작 아이콘
  const appBar = (title, { back = true, actions = [] } = {}) => `<div class="w-appbar">` +
    (back ? `<span class="w-ib">${icon("back")}</span>` : "") + `<span class="t">${title}</span>` +
    actions.map((a) => `<span class="w-ib">${icon(a)}</span>`).join("") + `</div>`;

  // 이미지 자리표시자: 1px 선 사각형 + 대각선 X
  const placeholder = () => `<svg class="w-ph" viewBox="0 0 40 40" aria-hidden="true"><rect x="0.5" y="0.5" width="39" height="39" rx="4"/><path d="M0.5 0.5L39.5 39.5M39.5 0.5L0.5 39.5"/></svg>`;

  // 목록 행 56: 이미지 자리 40 + 제목 15 / 보조 12 + 오른쪽 아이콘
  const listRow = ({ title, sub, action = "more", id = "" }) =>
    `<div class="w-row"${id ? ` id="${id}"` : ""}>${placeholder()}<div class="tx"><div class="tt">${title}</div><div class="st">${sub}</div></div><span class="w-ib">${icon(action)}</span></div>`;

  // 입력칸: 라벨 12 / 상자 48 / 도움말 12 + 글자 수
  const field = ({ label, value, help = "", count = "", box = 48, id = "" }) =>
    `<div class="w-field"${id ? ` id="${id}"` : ""}><div class="lb">${label}</div><div class="bx${box > 48 ? " multi" : ""}" style="height:${box}px">${value}</div><div class="ft"><span>${help}</span><span>${count}</span></div></div>`;

  const button = (label, { kind = "", h = "", id = "", style = "" } = {}) =>
    `<div class="w-btn ${kind} ${h}"${id ? ` id="${id}"` : ""}${style ? ` style="${style}"` : ""}>${label}</div>`;
  const snackbar = (text, { action = "", id = "" } = {}) =>
    `<div class="w-snack"${id ? ` id="${id}"` : ""}><span>${text}</span>${action ? `<span class="act">${action}</span>` : ""}</div>`;
  const toast = (text, { id = "", style = "" } = {}) => `<div class="w-toast"${id ? ` id="${id}"` : ""}${style ? ` style="${style}"` : ""}>${text}</div>`;

  // 기기 틀: 안쪽 마크업을 감싸고 하단 홈 인디케이터를 붙인다.
  const device = (inner, { id = "", x = 0, y = 0, h = 544 } = {}) =>
    `<div class="w-device"${id ? ` id="${id}"` : ""} style="left:${x}px;top:${y}px;height:${h}px">${inner}<div class="w-home"></div></div>`;

  // #stage 기준 사각형(레이아웃이 고정 높이라 글꼴 로딩과 무관하다)
  function rect(el) {
    const s = document.getElementById("stage").getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { left: r.left - s.left, top: r.top - s.top, right: r.right - s.left, bottom: r.bottom - s.top, width: r.width, height: r.height };
  }

  // 번호 핀: 부품 왼쪽 위 모서리 바깥에 붙인다(중심이 모서리에서 왼쪽 10, 위 6).
  const pinCenter = (r) => ({ x: r.left - 10, y: r.top - 6 });
  const pin = (n, r, id) => { const c = pinCenter(r); return `<div class="num" id="${id}" style="left:${c.x - 10}px;top:${c.y - 10}px">${n}</div>`; };

  // 지시선: [[x,y],...] 꺾은선. 그려지는 정도는 leaderAt으로 정한다.
  const leaders = (w, h, paths) => `<svg class="w-leaders" width="${w}" height="${h}">${paths.map(([id, pts]) =>
    `<path id="${id}" pathLength="1" d="M${pts.map((p) => p.join(" ")).join(" L")}"/>`).join("")}</svg>`;
  const leaderAt = (el, p) => { el.style.strokeDashoffset = 1 - p; };

  // 문제 표시: 부품 둘레 1.5px P1 점선 사각형(반경 6) + P1 칩
  const flag = (r, { pad = 6, id = "" } = {}) =>
    `<div class="w-flag"${id ? ` id="${id}"` : ""} style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"><span class="chip p1">P1</span></div>`;

  // 치수선: 1px accent 선 + 양 끝 틱 + 가운데 라벨. 가로·세로 둘 다 지원한다.
  const TICK = 8;
  function dim({ axis, at, from, to, label, id = "" }) {
    const mid = (from + to) / 2, len = to - from;
    const box = (l, t, w, h) => `<i class="w-dim" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px"></i>`;
    const parts = axis === "v"
      ? [box(at, from, 1, len), box(at - TICK / 2, from, TICK + 1, 1), box(at - TICK / 2, to, TICK + 1, 1)]
      : [box(from, at, len, 1), box(from, at - TICK / 2, 1, TICK + 1), box(to, at - TICK / 2, 1, TICK + 1)];
    const lb = axis === "v" ? `left:${at - 11.5}px;top:${mid - 8}px` : `left:${mid - 12}px;top:${at - 8}px`;
    return `<div${id ? ` id="${id}"` : ""} class="abs" style="left:0;top:0">${parts.join("")}<span class="w-dim lb" style="${lb}">${label}</span></div>`;
  }
  // 연장선: 부품 모서리에서 치수선까지 이어지는 1px 선
  const ext = ({ axis, at, from, to }) => axis === "h"
    ? `<i class="w-dim" style="left:${Math.min(from, to)}px;top:${at}px;width:${Math.abs(to - from)}px;height:1px"></i>`
    : `<i class="w-dim" style="left:${at}px;top:${Math.min(from, to)}px;width:1px;height:${Math.abs(to - from)}px"></i>`;

  // 축소 썸네일: 기기 안 화면 HTML을 배율만큼 줄여 놓고 이름·부제 캡션을 아래에 붙인다.
  const thumb = (inner, { x = 0, y = 0, h = 544, scale = 0.3, id = "", name = "", sub = "", on = false } = {}) => {
    const w = 300 * scale, bw = +(1 / scale).toFixed(3);
    return `<div class="w-thumb${on ? " on" : ""}"${id ? ` id="${id}"` : ""} style="left:${x}px;top:${y}px;width:${w}px">` +
      `<div class="scr" style="width:${w}px;height:${h * scale}px"><div class="w-device" style="left:0;top:0;height:${h}px;border-width:${bw}px;transform:scale(${scale})">${inner}<div class="w-home"></div></div></div>` +
      (name || sub ? `<div class="cap"><b>${name}</b>${sub}</div>` : "") + `</div>`;
  };

  // 흐름 화살표: [[x,y],...] 직각 꺾은선 끝에 열린 화살촉. 자기 bbox만 덮는 svg라 fade로 따로 다룰 수 있다.
  const HEAD_LEN = 7, HEAD_HALF = 4, DASH = 4, ARROW_PAD = 8;
  function arrow(pts, { dash = false, id = "" } = {}) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const ox = Math.min(...xs) - ARROW_PAD, oy = Math.min(...ys) - ARROW_PAD;
    const q = pts.map(([x, y]) => [x - ox, y - oy]);
    const [[x0, y0], [x1, y1]] = [q[q.length - 2], q[q.length - 1]];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    const wing = (s) => `${x1 - ux * HEAD_LEN - uy * HEAD_HALF * s} ${y1 - uy * HEAD_LEN + ux * HEAD_HALF * s}`;
    let total = 0;
    for (let i = 1; i < q.length; i++) total += Math.abs(q[i][0] - q[i - 1][0]) + Math.abs(q[i][1] - q[i - 1][1]);
    const w = Math.max(...xs) - Math.min(...xs) + ARROW_PAD * 2, h = Math.max(...ys) - Math.min(...ys) + ARROW_PAD * 2;
    return `<svg class="w-arrow${dash ? " dash" : ""}"${id ? ` id="${id}"` : ""} data-len="${total}" width="${w}" height="${h}" style="left:${ox}px;top:${oy}px">` +
      `<path class="ln" pathLength="${dash ? total : 1}" d="M${q.map((p) => p.join(" ")).join(" L")}"/>` +
      `<path class="hd" d="M${wing(1)} L${x1} ${y1} L${wing(-1)}"/></svg>`;
  }
  // 그려지는 정도 p(0~1). 점선은 보이는 길이까지만 같은 간격의 점선을 만든다. 화살촉은 선이 닿은 뒤에 나온다.
  function arrowAt(el, p) {
    const ln = el.querySelector(".ln"), done = p >= 1;
    if (el.classList.contains("dash")) {
      const total = Number(el.dataset.len), seen = total * p, cycles = Math.floor(seen / (DASH * 2));
      ln.style.strokeDasharray = "4 4 ".repeat(cycles) + `${Math.min(DASH, seen - cycles * DASH * 2)} ${total}`;
      ln.style.strokeDashoffset = 0;
    } else ln.style.strokeDashoffset = 1 - p;
    el.querySelector(".hd").style.opacity = done ? 1 : 0;
  }

  window.W = { icon, statusBar, appBar, placeholder, listRow, field, button, snackbar, toast, device, rect, pinCenter, pin, leaders, leaderAt, flag, dim, ext, thumb, arrow, arrowAt };
})();
