// 규칙 파일이 함께 쓰는 상수·도우미. id 접두사가 영역과 기준 문서를 정한다.
export const COMPONENT_EXTS = [".tsx", ".jsx", ".vue", ".svelte"];
export const STYLE_EXTS = [".css", ".scss", ".sass", ".less"];
export const STYLE_TAG_EXTS = [".vue", ".svelte", ".html", ".htm", ".astro"];
export const BLOCK_EXTS = [...STYLE_EXTS, ...STYLE_TAG_EXTS];
// 마크업·스크립트 패턴 규칙이 도는 확장자(CSS 계열 제외)
export const MARKUP_EXTS = [".tsx", ".jsx", ".vue", ".svelte", ".html", ".htm", ".astro", ".js", ".ts", ".mjs", ".cjs"];
export const HANGUL = /[가-힣]/;

// id 접두사 → [영역, 기준 문서]. 규칙에서 area·doc·exts 를 적으면 그 값이 이긴다.
// a11y-·copy- 규칙은 exts 를 안 적으면 마크업·스크립트 파일에서만 돈다(exts: null 이면 모든 파일)
const PREFIXES = {
  type: ["글자", "ux-spec/references/visual-type.md"],
  color: ["색", "ux-spec/references/visual-color.md"],
  layout: ["배치", "ux-spec/references/visual-layout.md"],
  ui: ["표면·움직임", "ux-spec/references/visual-surface-motion.md"],
  a11y: ["접근성", "ux-a11y/references/implementation-patterns.md"],
  copy: ["문구", "ux-writing/references/en-rules.md"],
};

export function R(def) {
  const entry = PREFIXES[def.id.split("-")[0]];
  if (!entry) throw new Error(`${def.id}: 알 수 없는 id 접두사`);
  const markupOnly = ["a11y", "copy"].includes(def.id.split("-")[0]) && !("exts" in def);
  return { area: entry[0], doc: entry[1], ...(markupOnly ? { exts: MARKUP_EXTS } : {}), ...def };
}

export const rx = (re) => (line) => re.test(line);
export const lineHits = (ctx, re) => ctx.lines.flatMap((l, i) => (re.test(l) ? [i] : []));
export const has = (ctx, re) => re.test(ctx.lines.join("\n"));
