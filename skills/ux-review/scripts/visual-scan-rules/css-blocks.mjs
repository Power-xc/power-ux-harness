// CSS 블록 파서: 중괄호 깊이를 따라 { header, parent, own:[{line,text}], startLine } 목록을 만든다
import { STYLE_EXTS, STYLE_TAG_EXTS } from "./helpers.mjs";

// ───────── CSS 블록 파서 ─────────

function stripInline(raw) {
  return raw
    .replace(/#\{[^}]*\}/g, "X")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/(?<![:\w])\/\/.*$/, "");
}

// 중괄호 깊이를 따라 { header, parent, own:[{line,text}], startLine } 목록을 만든다
export function parseBlocks(cssLines) {
  const blocks = [];
  const stack = [];
  let seg = "";
  let segLine = -1;
  const flush = (line) => {
    const text = seg.trim();
    const owner = stack[stack.length - 1];
    if (text && owner) owner.own.push({ line: segLine < 0 ? line : segLine, text });
    seg = "";
    segLine = -1;
  };
  cssLines.forEach((raw, i) => {
    for (const ch of stripInline(raw)) {
      if (ch === "{") {
        const block = {
          header: seg.trim(),
          parent: stack[stack.length - 1] ?? null,
          own: [],
          startLine: segLine < 0 ? i : segLine,
        };
        blocks.push(block);
        stack.push(block);
        seg = "";
        segLine = -1;
      } else if (ch === "}") {
        flush(i);
        stack.pop();
      } else if (ch === ";") {
        seg += ch;
        flush(i);
      } else {
        if (segLine < 0 && !/\s/.test(ch)) segLine = i;
        seg += ch;
      }
    }
    seg += " ";
  });
  return blocks;
}

// .css 계열은 전체, .vue·.svelte·.html 은 <style> 안만 남긴다
export function styleLines(lines, ext) {
  if (STYLE_EXTS.includes(ext)) return lines;
  if (!STYLE_TAG_EXTS.includes(ext)) return [];
  let inside = false;
  return lines.map((line) => {
    let text = line;
    let keep = inside;
    const open = text.match(/<style\b[^>]*>/i);
    if (!inside && open) {
      text = text.slice(open.index + open[0].length);
      inside = true;
      keep = true;
    }
    const close = text.search(/<\/style>/i);
    if (inside && close >= 0) {
      text = text.slice(0, close);
      inside = false;
    }
    return keep ? text : "";
  });
}

export const chain = (block) => {
  const list = [];
  for (let b = block; b; b = b.parent) list.push(b.header);
  return list;
};
export const underAtRule = (block, re) => chain(block).some((h) => h.startsWith("@") && re.test(h));
export const isSelector = (block) => block.header !== "" && !block.header.startsWith("@");

export function eachDecl(ctx, visit) {
  const hits = [];
  for (const block of ctx.blocks) {
    block.own.forEach((decl, index) => {
      if (visit(block, decl, index)) hits.push(decl.line);
    });
  }
  return hits;
}
