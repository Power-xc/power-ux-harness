// 결정적 타임라인 도우미: 화면 상태는 전부 render(t)의 t(ms)로만 정한다.
(function () {
  const q = new URLSearchParams(location.search);
  document.documentElement.dataset.theme = q.get("theme") === "dark" ? "dark" : "light";

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const progress = (t, start, dur) => clamp((t - start) / dur);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInCubic = (p) => p * p * p;
  const lerp = (a, b, p) => a + (b - a) * p;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // 한 글자 단위로 보이는 부분 문자열
  function typeText(full, t, start, cps = 24) {
    const n = Math.floor(clamp(((t - start) / 1000) * cps, 0, full.length));
    return full.slice(0, n);
  }
  const blink = (t) => Math.floor(t / 500) % 2 === 0;

  // 등장 240ms easeOutCubic(아래에서 6px), 퇴장 180ms easeInCubic
  function fade(el, t, start, dur = 240, outStart = Infinity, outDur = 180, dy = 6) {
    const pIn = easeOutCubic(progress(t, start, dur));
    const pOut = easeInCubic(progress(t, outStart, outDur));
    const o = pIn * (1 - pOut);
    el.style.opacity = o;
    el.style.transform = `translateY(${(1 - pIn) * dy}px)`;
    el.style.visibility = o === 0 ? "hidden" : "visible";
    return o;
  }
  // 이동 없는 불투명도 전환(교차 페이드용)
  function opacityAt(el, o) {
    el.style.opacity = o;
    el.style.visibility = o === 0 ? "hidden" : "visible";
  }
  // 타이핑: 보이는 글자 + 레이아웃 자리만 차지하는 나머지(visibility:hidden) + 2px 캐럿
  function typeInto(el, full, t, start, cps = 24, caret = true, caretUntil = Infinity) {
    const n = Math.floor(clamp(((t - start) / 1000) * cps, 0, full.length));
    const typing = t >= start && n < full.length;
    const showCaret = caret && t >= start && (typing || t < caretUntil) && (typing || blink(t));
    el.innerHTML =
      esc(full.slice(0, n)) +
      `<span class="caret" style="visibility:${showCaret ? "visible" : "hidden"}"></span>` +
      `<span class="hide">${esc(full.slice(n))}</span>`;
    return n;
  }
  // 키프레임 경로: [{t,x,y,...}] 사이를 easeOutCubic으로 보간
  function path(t, kf, keys = ["x", "y"]) {
    if (t <= kf[0].t) return Object.fromEntries(keys.map((k) => [k, kf[0][k]]));
    for (let i = 1; i < kf.length; i++) {
      if (t <= kf[i].t) {
        const p = easeOutCubic(progress(t, kf[i - 1].t, kf[i].t - kf[i - 1].t));
        return Object.fromEntries(keys.map((k) => [k, lerp(kf[i - 1][k], kf[i][k], p)]));
      }
    }
    return Object.fromEntries(keys.map((k) => [k, kf[kf.length - 1][k]]));
  }
  // 취소선이 그려지는 정도
  const strike = (el, t, start, dur = 200) => {
    el.style.transform = `scaleX(${progress(t, start, dur)})`;
  };

  // 마지막 상태를 HOLD 만큼 유지한 뒤 처음 상태로 교차 페이드해 반복 이음새를 만든다.
  const HOLD = 2400,
    SEAM = 400,
    SEAM_FADE = 300;
  function defineDemo({ width, height, end, draw }) {
    const stage = document.getElementById("stage");
    stage.style.width = width + "px";
    stage.style.height = height + "px";
    let snap = null;
    const prepare = () => {
      draw(0);
      snap = stage.cloneNode(true);
      snap.removeAttribute("id");
      snap.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      snap.classList.add("snap");
      snap.setAttribute("aria-hidden", "true");
      snap.style.opacity = 0;
      stage.parentNode.insertBefore(snap, stage.nextSibling);
    };
    return {
      width,
      height,
      duration: end + HOLD + SEAM,
      render(t) {
        if (!snap) prepare();
        draw(Math.min(t, end));
        snap.style.opacity = easeInCubic(progress(t, end + HOLD, SEAM_FADE));
      },
    };
  }

  Object.assign(window, {
    clamp,
    progress,
    easeOutCubic,
    easeInCubic,
    lerp,
    typeText,
    typeInto,
    blink,
    fade,
    opacityAt,
    path,
    strike,
    defineDemo,
  });
  window.$ = (id) => document.getElementById(id);
  window.svg = (d, extra = "") => `<svg class="ic" viewBox="0 0 24 24" ${extra}>${d}</svg>`;
})();
