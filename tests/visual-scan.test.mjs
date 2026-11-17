import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { RULES, scanSources, scanText } from "../skills/ux-review/scripts/visual-scan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "skills", "ux-review", "scripts", "visual-scan.mjs");
const dir = mkdtempSync(join(tmpdir(), "uxh-visual-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const DEFAULT_EXT = ".tsx";
const CODES = { clean: 0, error: 1, usage: 2 };

function run(args, cwd = dir) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
}

function put(root, name, text) {
  const full = join(root, name);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
  return full;
}

const normalize = (rule, example) =>
  typeof example === "string" ? { ext: rule.exts?.[0] ?? DEFAULT_EXT, text: example } : example;
const ruleIds = (text, path) => scanText(text, { path }).map((f) => f.ruleId);

test("모든 규칙은 필수 필드와 걸리는·걸리지 않는 예시를 가진다", () => {
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of RULES) {
    assert.match(r.id, /^(?:type|color|layout|ui|a11y|copy)-/);
    assert.ok(["error", "warn", "info"].includes(r.level), r.id);
    assert.ok(["line", "file", "project"].includes(r.scope), r.id);
    assert.ok(r.message && r.fix && r.doc && r.area, r.id);
    assert.ok(r.examples.hit.length >= 1 && r.examples.miss.length >= 1, r.id);
  }
});

for (const rule of RULES.filter((r) => r.scope === "line")) {
  test(`${rule.id}: hit 예시는 이 규칙을 내고 miss 예시는 내지 않는다`, () => {
    for (const hit of rule.examples.hit) {
      const { ext, text } = normalize(rule, hit);
      assert.ok(ruleIds(text, `a${ext}`).includes(rule.id), `걸려야 한다: ${text}`);
    }
    for (const miss of rule.examples.miss) {
      const { ext, text } = normalize(rule, miss);
      assert.ok(!ruleIds(text, `a${ext}`).includes(rule.id), `걸리면 안 된다: ${text}`);
    }
  });
}

function jsonRun(args) {
  const out = run([...args, "--json", "--level", "info"]);
  return JSON.parse(out.stdout);
}

test("file 규칙: 예시 파일을 CLI 로 돌리면 hit 는 나오고 miss 는 나오지 않는다", () => {
  const root = mkdtempSync(join(tmpdir(), "uxh-visual-file-"));
  try {
    const expected = [];
    for (const rule of RULES.filter((r) => r.scope === "file")) {
      for (const kind of ["hit", "miss"]) {
        rule.examples[kind].forEach((example, n) => {
          const { ext, text } = normalize(rule, example);
          expected.push({ rule, kind, file: put(root, join(rule.id, `${kind}${n}`, `a${ext}`), text) });
        });
      }
    }
    const found = jsonRun([root]);
    for (const { rule, kind, file } of expected) {
      const got = found.some((f) => f.file === file && f.ruleId === rule.id);
      assert.equal(got, kind === "hit", `${rule.id} ${kind}: ${file}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project 규칙: 예시 파일 묶음을 CLI 로 돌리면 hit 는 나오고 miss 는 나오지 않는다", () => {
  const root = mkdtempSync(join(tmpdir(), "uxh-visual-project-"));
  try {
    for (const rule of RULES.filter((r) => r.scope === "project")) {
      for (const kind of ["hit", "miss"]) {
        rule.examples[kind].forEach((example, n) => {
          const base = join(root, rule.id, `${kind}${n}`);
          for (const [name, text] of Object.entries(example.files)) put(base, name, text);
          const got = jsonRun([base]).some((f) => f.ruleId === rule.id);
          assert.equal(got, kind === "hit", `${rule.id} ${kind}`);
        });
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("종료 코드: 위반 없음 0, error 등급 1, 인자 없음·없는 파일·잘못된 옵션 2", () => {
  const clean = put(dir, "exit/clean.css", ".a { color: var(--fg); }\n");
  const bad = put(dir, "exit/bad.css", ".a { will-change: all; }\n");
  assert.equal(run([clean]).status, CODES.clean);
  assert.equal(run([bad]).status, CODES.error);
  assert.equal(run([]).status, CODES.usage);
  assert.match(run([]).stderr, /사용법/);
  assert.equal(run([join(dir, "exit", "none.css")]).status, CODES.usage);
  assert.equal(run([clean, "--level", "loud"]).status, CODES.usage);
  assert.equal(run([clean, "--nope"]).status, CODES.usage);
});

test("--json 은 필드와 순서가 안정적이다", () => {
  const file = put(
    dir,
    "json/a.tsx",
    '<img src="a.png" />\n<p className="text-justify">x</p>\n<div style={{ willChange: "all" }} />\n',
  );
  const first = run([file, "--json"]);
  const list = JSON.parse(first.stdout);
  assert.deepEqual(Object.keys(list[0]), ["file", "line", "ruleId", "level", "message", "fix", "doc", "snippet"]);
  assert.deepEqual(
    list.map((f) => [f.line, f.ruleId]),
    [
      [1, "a11y-img-no-alt"],
      [2, "type-justify"],
      [3, "ui-will-change-all"],
    ],
  );
  assert.equal(list[0].snippet, '<img src="a.png" />');
  assert.equal(run([file, "--json"]).stdout, first.stdout);
});

test("--level 은 error·warn·info 로 거른다", () => {
  const file = put(
    dir,
    "level/a.tsx",
    '<img src="a.png" />\n<p className="text-justify select-none">x</p>\n<div className="font-light" />\n',
  );
  const levels = (level) =>
    [...new Set(JSON.parse(run([file, "--json", "--level", level]).stdout).map((f) => f.level))].sort();
  assert.deepEqual(levels("error"), ["error"]);
  assert.deepEqual(levels("warn"), ["error", "warn"]);
  assert.deepEqual(levels("info"), ["error", "info", "warn"]);
  assert.deepEqual(
    JSON.parse(run([file, "--json"]).stdout)
      .map((f) => f.level)
      .includes("info"),
    false,
  );
});

test("텍스트 출력은 파일:줄·등급·규칙 id·기준과 끝 요약을 낸다", () => {
  const file = put(dir, "text/a.tsx", '<p className="text-justify">x</p>\n');
  const out = run([file]).stdout;
  assert.match(out, /a\.tsx:1 {2}warn {2}type-justify {2}.+ — .+ {2}\(기준: ux-spec\/references\/visual-type\.md\)/);
  assert.match(out, /error 0 · warn 1 · info 0 — 파일 1개 검사/);
});

test("node_modules 같은 건너뛰는 폴더와 .min·.map·.d.ts·.snap 파일은 검사하지 않는다", () => {
  const root = join(dir, "skip");
  const bad = '<p className="text-justify">x</p>\n';
  put(root, "src/ok.tsx", bad);
  for (const name of [
    "node_modules/x/a.tsx",
    "dist/a.tsx",
    ".git/a.tsx",
    "vendor/a.tsx",
    "a.min.js",
    "a.js.map",
    "a.d.ts",
    "a.snap",
  ]) {
    put(root, name, bad);
  }
  assert.deepEqual([...new Set(jsonRun([root]).map((f) => f.file))], [join(root, "src", "ok.tsx")]);
});

test("주석 줄은 건너뛴다", () => {
  const text = [
    "// width: 100vw;",
    "/* will-change: all; */",
    " * text-align: justify;",
    '<!-- <img src="a.png"> -->',
    ".a { width: 100vw; }",
  ].join("\n");
  assert.deepEqual(
    scanText(text, { path: "a.css" }).map((f) => f.line),
    [5],
  );
});

test("프로젝트 규칙은 스캔한 모든 파일을 본 뒤 판단한다", () => {
  const hit = scanSources([{ path: "a.css", text: "body { padding: env(safe-area-inset-top); }" }]);
  assert.deepEqual(
    hit.map((f) => f.ruleId),
    ["layout-safe-area-no-cover"],
  );
  const miss = scanSources([
    { path: "a.css", text: "body { padding: env(safe-area-inset-top); }" },
    { path: "b.html", text: '<meta name="viewport" content="viewport-fit=cover">' },
  ]);
  assert.deepEqual(miss, []);
});

test("--rules 는 규칙 표를 내고 끝낸다", () => {
  const result = run(["--rules"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^\| id \| 등급 \| 메시지 \| 기준 문서 \|/);
  for (const r of RULES) assert.ok(result.stdout.includes(`| ${r.id} | ${r.level} |`), r.id);
  assert.match(result.stdout, new RegExp(`규칙 ${RULES.length}개`));
});

test("이 저장소 skills/ 아래 .mjs 에 돌려도 읽기 실패(종료 코드 2)는 없다", () => {
  const result = run([join(ROOT, "skills")]);
  assert.notEqual(result.status, CODES.usage, result.stderr);
  assert.match(result.stdout, /파일 \d+개 검사/);
});
