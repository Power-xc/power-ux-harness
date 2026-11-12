import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { TABLE_DOC_PATH, loadLexicon, renderDoc, scanText } from "../skills/ux-writing/scripts/wording.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "ux-writing", "scripts", "wording.mjs");
const lexicon = loadLexicon();
const ids = (text, kind = "md") => scanText(text, { kind, lexicon }).map((f) => f.id);
const dir = mkdtempSync(join(tmpdir(), "uxh-wording-"));
after(() => rmSync(dir, { recursive: true, force: true }));

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
}

function file(name, text) {
  writeFileSync(join(dir, name), text);
  return name;
}

test("낱말 목록의 모든 항목은 걸리는 예문과 걸리지 않는 예문을 가진다", () => {
  const rules = [...lexicon.entries, ...lexicon.docRules];
  assert.ok(rules.length >= 120, `항목 ${rules.length}개`);
  for (const rule of rules) {
    assert.ok(rule.examples?.bad?.length >= 1 && rule.examples?.ok?.length >= 1, `${rule.id}: 예문이 없다`);
    for (const bad of rule.examples.bad) assert.ok(ids(bad).includes(rule.id), `${rule.id}: 걸려야 한다 — ${bad}`);
    for (const ok of rule.examples.ok) assert.ok(!ids(ok).includes(rule.id), `${rule.id}: 걸리면 안 된다 — ${ok}`);
  }
});

test("「꾸려」와 「잣대」는 오류 등급으로 걸리고 바꿀 말을 낸다", () => {
  const found = scanText("팀을 꾸려 같은 잣대로 본다", { kind: "md", lexicon });
  assert.deepEqual(
    found.map((f) => [f.found, f.level]),
    [
      ["꾸려", "error"],
      ["잣대", "error"],
    ],
  );
  assert.ok(found[0].suggest.includes("구성하다"));
  assert.ok(found[1].suggest.includes("기준"));
});

test("「」·백틱·코드 펜스·인용 줄 안은 건너뛴다", () => {
  assert.equal(ids("예: 「팀을 꾸려」는 쓰지 않는다").length, 0);
  assert.equal(ids("명령은 `꾸려`로 쓴다").length, 0);
  assert.equal(ids("```\n팀을 꾸려\n```").length, 0);
  assert.equal(ids("> 팀을 꾸려 일을 나눈다").length, 0);
});

test("wording-allow 는 같은 줄과 바로 다음 줄에만 적용된다", () => {
  assert.equal(ids("팀을 꾸려 일을 나눈다 <!-- wording-allow: 인용 -->").length, 0);
  assert.equal(ids("<!-- wording-allow: 인용 -->\n팀을 꾸려 일을 나눈다").length, 0);
  assert.equal(ids("<!-- wording-allow: 인용 -->\n\n팀을 꾸려 일을 나눈다").length, 1);
});

test("코드 파일은 한글이 있는 줄만 보고 문자열 안의 문구를 검사한다", () => {
  assert.equal(ids('const label = "팀을 꾸려 보세요";', "code").length, 1);
  assert.equal(ids("const unlock = () => seamless();", "code").length, 0);
});

test("남발 규칙은 한 파일에 3회부터 한 건으로 알린다", () => {
  assert.equal(ids("검사를 통해 확인한다").length, 0);
  assert.deepEqual(ids("검사를 통해 본다. 설정을 통해 바꾼다. 로그를 통해 찾는다."), ["ko-doc-tonghae"]);
});

test("오류 등급이 있으면 종료 코드 1, 경고만 있으면 0 이다", () => {
  const bad = run([file("bad.md", "팀을 꾸려 일을 나눈다\n")]);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /bad\.md:1:4 error ko-A-kkurida 「꾸려」 → 구성하다/);
  const warn = run([file("warn.md", "기준을 문서에 옮겼다\n")]);
  assert.equal(warn.status, 0);
  assert.match(warn.stdout, / warn /);
  assert.equal(run([file("clean.md", "팀을 구성해 일을 나눈다\n")]).stdout, "");
});

test("--level 과 --json 으로 출력을 고른다", () => {
  const name = file("info.md", "호출 횟수를 센다\n");
  assert.equal(run([name]).stdout, "");
  assert.match(run([name, "--level", "info"]).stdout, / info /);
  const json = JSON.parse(run([file("json.md", "같은 잣대로 본다\n"), "--json"]).stdout);
  assert.equal(json[0].id, "ko-C-jatdae");
  assert.equal(json[0].file, "json.md");
});

test("사용법이 틀리거나 파일을 읽지 못하면 종료 코드 2 다", () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(["--level", "x", "a.md"]).status, 2);
  assert.equal(run(["없는파일.md"]).status, 2);
  assert.equal(run(["--render", "a.md"]).status, 2);
});

test("저장소 문서에 오류 등급 낱말이 없다", () => {
  const root = join(dirname(SCRIPT), "..", "..", "..");
  const listed = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "*.md"], { cwd: root, encoding: "utf8" });
  const files = listed.stdout.split("\n").filter(Boolean);
  assert.ok(files.length > 20, `문서 ${files.length}개`);
  const result = spawnSync(process.execPath, [SCRIPT, "--level", "error", ...files], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout);
});

test("plain-korean.md 의 표는 낱말 목록에서 만든 것과 같다", () => {
  const doc = readFileSync(TABLE_DOC_PATH, "utf8");
  assert.equal(renderDoc(doc, lexicon), doc);
  assert.equal(run(["--check-render"]).status, 0);
});
