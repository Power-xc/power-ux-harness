#!/usr/bin/env node
// 화면 문구·문서에서 실무에서 잘 쓰지 않는 낱말을 찾아 바꿀 말과 함께 낸다. 의존성 없음.
// 낱말 목록은 ../references/plain-korean.json, 사람이 읽는 표는 plain-korean.md(--render 로 생성).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const USAGE = `사용법: node wording.mjs <파일…> [--level error|warn|info] [--json]
       node wording.mjs --render | --check-render

  <파일…>         검사할 파일. .md·.mdx·.txt 는 문서로, 그 밖은 코드로 본다(한글이 있는 줄만)
  --level         보여 줄 가장 낮은 등급 (기본 warn)
  --json          결과를 JSON 으로 낸다
  --render        plain-korean.md 의 표를 낱말 목록에서 다시 만든다
  --check-render  표가 낱말 목록과 같은지만 본다

  종료 코드: 0 오류 등급 없음 · 1 오류 등급 있음 · 2 사용법·파일 읽기 실패`;

const REFERENCES = join(dirname(fileURLToPath(import.meta.url)), "..", "references");
export const LEXICON_PATH = join(REFERENCES, "plain-korean.json");
export const TABLE_DOC_PATH = join(REFERENCES, "plain-korean.md");
const TABLE_MARKER = "<!-- wording:table -->";
const SKIP_FILES = ["plain-korean.json", "plain-korean.md"];
const LEVELS = ["error", "warn", "info"];
const HANGUL = /[가-힣]/;
const ALLOW_COMMENT = /^\s*(?:\/\/|#|<!--|\/\*|\*|--|;)\s*wording-allow\b/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u;
const USAGE_ERROR_CODE = 2;

class UsageError extends Error {}

const levelRank = (level) => LEVELS.indexOf(level);
const kindOf = (file) => (/\.(?:md|mdx|txt)$/i.test(file) ? "md" : "code");
const isSkipped = (file) => SKIP_FILES.some((name) => file.replace(/\\/g, "/").endsWith(`/${name}`) || file === name);

function compile(item, label) {
  for (const key of ["id", "category", "avoid", "match", "level"]) {
    if (typeof item[key] !== "string" || !item[key]) throw new Error(`${label}: ${key} 필드가 없다`);
  }
  if (!LEVELS.includes(item.level)) throw new Error(`${item.id}: level 은 ${LEVELS.join("|")} 중 하나다`);
  if (!Array.isArray(item.suggest)) throw new Error(`${item.id}: suggest 는 배열이다`);
  return { ...item, re: new RegExp(item.match, "giu") };
}

export function loadLexicon(path = LEXICON_PATH) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw.version !== 1 || !Array.isArray(raw.entries) || !Array.isArray(raw.docRules)) {
    throw new Error(`${path}: version 1, entries[], docRules[] 형식이 아니다`);
  }
  const entries = raw.entries.map((e, i) => compile(e, `entries[${i}]`));
  const docRules = raw.docRules.map((e, i) => compile(e, `docRules[${i}]`));
  const ids = [...entries, ...docRules].map((e) => e.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${path}: id 가 겹친다`);
  return { entries, docRules };
}

function fencedLines(lines) {
  const fenced = new Array(lines.length).fill(false);
  let open = null;
  lines.forEach((line, i) => {
    const mark = line.match(FENCE);
    if (!mark) {
      fenced[i] = open !== null;
      return;
    }
    fenced[i] = true;
    if (!open) open = { char: mark[1][0], length: mark[1].length };
    else if (mark[1][0] === open.char && mark[1].length >= open.length) open = null;
  });
  return fenced;
}

const blank = (text) => " ".repeat(text.length);

// 건너뛸 구간을 같은 길이의 공백으로 바꿔 열 번호를 보존한다
function maskLines(lines, kind) {
  const fenced = kind === "md" ? fencedLines(lines) : null;
  return lines.map((line, i) => {
    if (fenced?.[i]) return "";
    if (kind === "md" && /^\s{0,3}>/.test(line)) return "";
    if (line.includes("wording-allow")) return "";
    if (i > 0 && ALLOW_COMMENT.test(lines[i - 1])) return "";
    const quoted = line.replace(/「[^」]*」/g, blank);
    return kind === "md" ? quoted.replace(/`[^`]*`/g, blank) : quoted;
  });
}

function finding(rule, line, col, found) {
  return { line, col, level: rule.level, id: rule.id, found, suggest: rule.suggest, except: rule.except ?? "" };
}

function scanEntries(lines, entries) {
  const found = [];
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    for (const entry of entries) {
      for (const m of line.matchAll(entry.re)) found.push(finding(entry, i + 1, m.index + 1, m[0]));
    }
  });
  return found;
}

function scanDocRules(lines, docRules) {
  const found = [];
  for (const rule of docRules) {
    const perLine = lines.map((line) => [...line.matchAll(rule.re)]);
    if (rule.kind === "line-count") {
      perLine.forEach((ms, i) => {
        if (ms.length >= rule.min) found.push(finding(rule, i + 1, ms[0].index + 1, `${ms.length}개`));
      });
      continue;
    }
    const total = perLine.reduce((sum, ms) => sum + ms.length, 0);
    if (total < rule.min) continue;
    const first = perLine.findIndex((ms) => ms.length > 0);
    found.push(finding(rule, first + 1, perLine[first][0].index + 1, `${total}회`));
  }
  return found;
}

export function scanText(text, { kind = "code", lexicon } = {}) {
  const masked = maskLines(text.split("\n"), kind);
  const lines = kind === "code" ? masked.map((line) => (HANGUL.test(line) ? line : "")) : masked;
  return [...scanEntries(lines, lexicon.entries), ...scanDocRules(lines, lexicon.docRules)].sort(
    (a, b) => a.line - b.line || a.col - b.col,
  );
}

const LEVEL_LABEL = { error: "오류", warn: "경고", info: "참고" };
const SECTIONS = [
  ["A", "A. 예스럽거나 문어적인 동사"],
  ["B", "B. 일상 동사의 추상적 쓰임"],
  ["C", "C. 비유 명사"],
  ["D", "D. 비유 동사구"],
  ["E", "E. 문어 부사·수식"],
  ["F", "F. 과장"],
  ["G", "G. 번역투"],
  ["H", "H. 결산·예고 문장"],
  ["EN", "영어 표현"],
  ["DOC", "문서 단위 규칙"],
];
const INFO_TITLE = "참고 등급 (기본 검사에서는 숨김)";
const TABLE_HEAD = ["피할 표현", "바꿀 표현", "써도 되는 경우", "등급"];

const width = (text) => [...text].reduce((sum, ch) => sum + (WIDE.test(ch) ? 2 : 1), 0);
const pad = (text, size) => text + " ".repeat(size - width(text));
const cell = (value) => String(value).replace(/\|/g, "\\|").replace(/~/g, "\\~").replace(/\n/g, " ");

function table(rows) {
  const body = rows.map((r) => [
    cell(r.avoid),
    cell(r.suggest.join(", ")),
    cell(r.except || "—"),
    LEVEL_LABEL[r.level],
  ]);
  const sizes = TABLE_HEAD.map((head, i) => Math.max(width(head), 3, ...body.map((row) => width(row[i]))));
  const line = (cells) => `| ${cells.map((c, i) => pad(c, sizes[i])).join(" | ")} |`;
  return [line(TABLE_HEAD), line(sizes.map((size) => "-".repeat(size))), ...body.map(line)].join("\n");
}

export function renderTable(lexicon) {
  const rows = [...lexicon.entries, ...lexicon.docRules];
  const shown = rows.filter((r) => r.level !== "info");
  const parts = SECTIONS.map(([category, title]) => [title, shown.filter((r) => r.category === category)])
    .filter(([, list]) => list.length > 0)
    .map(([title, list]) => `## ${title}\n\n${table(list)}`);
  const info = rows.filter((r) => r.level === "info");
  if (info.length > 0) parts.push(`## ${INFO_TITLE}\n\n${table(info)}`);
  return `${parts.join("\n\n")}\n`;
}

export function renderDoc(docText, lexicon) {
  const lines = docText.split("\n");
  const at = lines.findIndex((line) => line.trim() === TABLE_MARKER);
  if (at < 0) throw new Error(`${TABLE_MARKER} 줄이 없다`);
  return `${lines.slice(0, at + 1).join("\n")}\n\n${renderTable(lexicon)}`;
}

function parseArgs(argv) {
  const opts = { files: [], level: "warn", json: false, render: false, checkRender: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--render") opts.render = true;
    else if (arg === "--check-render") opts.checkRender = true;
    else if (arg === "--level") opts.level = argv[(i += 1)];
    else if (arg.startsWith("--")) throw new UsageError(`알 수 없는 옵션: ${arg}`);
    else opts.files.push(arg);
  }
  if (levelRank(opts.level) < 0) throw new UsageError(`--level 은 ${LEVELS.join("|")} 중 하나다`);
  const renders = opts.render || opts.checkRender;
  if (renders && opts.files.length > 0) throw new UsageError("--render 와 --check-render 는 파일과 함께 쓰지 않는다");
  if (!renders && opts.files.length === 0) throw new UsageError("검사할 파일이 필요하다");
  return opts;
}

function scanFiles(files, lexicon) {
  const results = [];
  for (const file of files) {
    if (isSkipped(file)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch (error) {
      throw new UsageError(`${file}: 읽을 수 없다 (${error.code ?? error.message})`);
    }
    for (const f of scanText(text, { kind: kindOf(file), lexicon })) results.push({ file, ...f });
  }
  return results;
}

function runRender(checkOnly, lexicon) {
  const current = readFileSync(TABLE_DOC_PATH, "utf8");
  const next = renderDoc(current, lexicon);
  if (checkOnly) {
    if (next === current) return 0;
    console.error("plain-korean.md 표가 plain-korean.json 과 다르다. --render 로 다시 만든다");
    return 1;
  }
  if (next !== current) writeFileSync(TABLE_DOC_PATH, next);
  console.log(next === current ? "표가 이미 최신이다" : "plain-korean.md 표를 다시 썼다");
  return 0;
}

function formatFinding(r) {
  const exception = r.except ? ` (써도 되는 경우: ${r.except})` : "";
  return `${r.file}:${r.line}:${r.col} ${r.level} ${r.id} 「${r.found}」 → ${r.suggest.join(", ")}${exception}`;
}

function main(argv) {
  const opts = parseArgs(argv);
  const lexicon = loadLexicon();
  if (opts.render || opts.checkRender) return runRender(opts.checkRender, lexicon);
  const results = scanFiles(opts.files, lexicon);
  const shown = results.filter((r) => levelRank(r.level) <= levelRank(opts.level));
  if (opts.json) console.log(JSON.stringify(shown, null, 2));
  else for (const r of shown) console.log(formatFinding(r));
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
