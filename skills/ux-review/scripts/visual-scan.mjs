#!/usr/bin/env node
// 코드에서 시각 디테일 단서(글자·색·배치·표면·접근성·문구)를 찾아 `파일:줄`로 낸다. 의존성 없음.
// 기준 문서는 규칙마다 doc 에 이름으로 적는다. 단서는 확정이 아니므로 맥락을 보고 판정한다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseBlocks, styleLines } from "./visual-scan-rules/css-blocks.mjs";
import { RULES } from "./visual-scan-rules/index.mjs";

export { RULES };

const USAGE = `사용법: node visual-scan.mjs <파일·폴더…> [--level error|warn|info] [--json] [--rules]

  <파일·폴더…>  검사할 대상. 폴더는 재귀로 돈다(.css .scss .sass .less .html .htm .jsx .tsx .js .ts .mjs .cjs .vue .svelte .astro)
  --level       보여 줄 가장 낮은 등급 (기본 warn)
  --json        결과를 JSON 배열로 낸다
  --rules       규칙 표를 내고 끝낸다

  종료 코드: 0 오류 등급 없음 · 1 오류 등급 있음 · 2 사용법·파일 읽기 실패`;

const LEVELS = ["error", "warn", "info"];
const TARGET_EXTS = new Set([
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".jsx",
  ".tsx",
  ".js",
  ".ts",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".astro",
]);
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "storybook-static",
  "vendor",
  "third_party",
]);
const TEST_FILE = /\.(?:test|spec)\.[^.]+$/;
const TEST_DIRS = new Set(["__tests__", "__mocks__"]);
const SKIP_FILE = /(?:\.min\.[^.]+|\.map|\.d\.ts|\.snap)$/;
const MAX_LINE_LENGTH = 2000;
const SNIPPET_LENGTH = 100;
const USAGE_ERROR_CODE = 2;

class UsageError extends Error {}

// ───────── 스캔 ─────────

const levelRank = (level) => LEVELS.indexOf(level);

function isCommentLine(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("<!--")) return true;
  return t.startsWith("*") && /^\*(?:[\s/]|$)/.test(t) && !/^\*\s*[{,]/.test(t);
}

export function prepare(text, path) {
  const ext = extname(path).toLowerCase();
  const lines = text.split("\n").map((l) => (isCommentLine(l) || l.length > MAX_LINE_LENGTH ? "" : l));
  const blocks = parseBlocks(styleLines(lines, ext));
  const lineBlock = [];
  for (const block of blocks) for (const decl of block.own) lineBlock[decl.line] = block;
  return { path, ext, raw: text.split("\n"), lines, blocks, lineBlock };
}

const lineCtx = (ctx, i) => ({ lines: ctx.lines, ext: ctx.ext, path: ctx.path, i });
const applies = (rule, ctx) => !rule.exts || rule.exts.includes(ctx.ext);

function makeFinding(rule, ctx, file, line) {
  const snippet = (ctx.raw[line] ?? "").trim().slice(0, SNIPPET_LENGTH);
  return {
    file,
    line: line + 1,
    ruleId: rule.id,
    level: rule.level,
    message: rule.message,
    fix: rule.fix,
    doc: rule.doc,
    snippet,
  };
}

function scanContext(ctx) {
  const found = [];
  for (const rule of RULES) {
    if (rule.scope === "project" || !applies(rule, ctx)) continue;
    const hits =
      rule.scope === "file"
        ? rule.test(ctx)
        : ctx.lines.flatMap((l, i) => (l && rule.test(l, lineCtx(ctx, i)) ? [i] : []));
    for (const line of new Set(hits)) found.push(makeFinding(rule, ctx, ctx.path, line));
  }
  return found;
}

const byPlace = (a, b) =>
  a.line - b.line || RULES.findIndex((r) => r.id === a.ruleId) - RULES.findIndex((r) => r.id === b.ruleId);

export function scanText(text, { path = "input.tsx" } = {}) {
  return scanContext(prepare(text, path)).sort(byPlace);
}

// sources: [{ path, text }] — 줄·파일 규칙은 파일별로, 프로젝트 규칙은 전체를 본 뒤 낸다
export function scanSources(sources) {
  const contexts = sources.map((s) => prepare(s.text, s.path));
  const byFile = new Map(contexts.map((c) => [c.path, scanContext(c)]));
  for (const rule of RULES.filter((r) => r.scope === "project")) {
    const usable = contexts.filter((c) => applies(rule, c));
    for (const hit of rule.test(usable)) {
      const ctx = contexts.find((c) => c.path === hit.file);
      byFile.get(hit.file).push(makeFinding(rule, ctx, hit.file, hit.line));
    }
  }
  return contexts.flatMap((c) => byFile.get(c.path).sort(byPlace));
}

// ───────── CLI ─────────

// 이름이 .으로 시작하는 폴더(.next-e2e·.vercel·.expo 등 빌드 출력·도구 폴더)는 모두 건너뛴다
const isSkippedDir = (name) => name.startsWith(".") || SKIP_DIRS.has(name) || TEST_DIRS.has(name);

function walk(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isSkippedDir(entry.name)) walk(full, files);
    } else if (
      entry.isFile() &&
      TARGET_EXTS.has(extname(entry.name).toLowerCase()) &&
      !SKIP_FILE.test(entry.name) &&
      !TEST_FILE.test(entry.name)
    ) {
      files.push(full);
    }
  }
}

function collect(targets) {
  const files = [];
  for (const target of targets) {
    let info;
    try {
      info = statSync(target);
    } catch (error) {
      throw new UsageError(`${target}: 읽을 수 없다 (${error.code ?? error.message})`);
    }
    if (info.isDirectory()) walk(target, files);
    else files.push(target);
  }
  return [...new Map(files.map((f) => [resolve(f), f])).values()];
}

function parseArgs(argv) {
  const opts = { targets: [], level: "warn", json: false, rules: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--rules") opts.rules = true;
    else if (arg === "--level") opts.level = argv[(i += 1)];
    else if (arg.startsWith("--")) throw new UsageError(`알 수 없는 옵션: ${arg}`);
    else opts.targets.push(arg);
  }
  if (levelRank(opts.level) < 0) throw new UsageError(`--level 은 ${LEVELS.join("|")} 중 하나다`);
  if (!opts.rules && opts.targets.length === 0) throw new UsageError("검사할 파일이나 폴더가 필요하다");
  return opts;
}

function printRules() {
  console.log("| id | 등급 | 메시지 | 기준 문서 |");
  console.log("| --- | --- | --- | --- |");
  for (const r of RULES) console.log(`| ${r.id} | ${r.level} | ${r.message.replace(/\|/g, "\\|")} | ${r.doc} |`);
  console.log(`\n규칙 ${RULES.length}개`);
}

function printText(shown, results, level, fileCount) {
  let last = null;
  for (const f of shown) {
    if (last !== null && last !== f.file) console.log("");
    last = f.file;
    console.log(`${f.file}:${f.line}  ${f.level}  ${f.ruleId}  ${f.message} — ${f.fix}  (기준: ${f.doc})`);
  }
  const count = (name) => results.filter((f) => f.level === name).length;
  const label = (name) =>
    levelRank(name) > levelRank(level) && count(name) > 0
      ? `${name} ${count(name)}(숨김, --level ${name}로 보기)`
      : `${name} ${count(name)}`;
  console.log(`${shown.length > 0 ? "\n" : ""}${LEVELS.map(label).join(" · ")} — 파일 ${fileCount}개 검사`);
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.rules) {
    printRules();
    return 0;
  }
  const files = collect(opts.targets);
  const sources = files.map((file) => {
    try {
      return { path: file, text: readFileSync(file, "utf8") };
    } catch (error) {
      throw new UsageError(`${file}: 읽을 수 없다 (${error.code ?? error.message})`);
    }
  });
  const results = scanSources(sources);
  const shown = results.filter((r) => levelRank(r.level) <= levelRank(opts.level));
  if (opts.json) console.log(JSON.stringify(shown, null, 2));
  else printText(shown, results, opts.level, files.length);
  return results.some((r) => r.level === "error") ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof UsageError ? `${error.message}\n\n${USAGE}` : error.message);
    process.exitCode = USAGE_ERROR_CODE;
  }
}
