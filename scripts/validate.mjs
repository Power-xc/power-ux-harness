#!/usr/bin/env node
// 스킬 구조·발동 케이스·링크·위생을 검사한다. 규칙의 정본은 CONTRIBUTING.md.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ID = /^ux-[a-z0-9]+(-[a-z0-9]+)*$/;
const CASE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const FRONTMATTER_KEYS = ["name", "description", "license", "metadata"];
const CASE_KEYS = ["id", "prompt", "expectSkill", "shouldNotFire", "why"];
const REQUIRED_H2 = [
  "Trigger",
  "Input",
  "Process",
  "Output",
  "Hard Gates",
  "Skill Chaining",
  "Constraints",
];
const MAX_DESCRIPTION = 300;
const MAX_LINES = 200;
const MAX_WORDS = 1100;
const MIN_POSITIVE_CASES = 2;
const MIN_BOUNDARY_CASES = 1;
const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
];
const SKIP_DIRS = new Set(["node_modules", ".git"]);
const BINARY_EXT = /\.(gif|png|jpe?g|webp|mp4|woff2?|ico|pdf)$/i;
const ALLOW_MARK = "// validate-allow";

const HYGIENE_RULES = [
  { re: /\/Users\/[^/\s]+\//, msg: "사용자 홈 절대 경로" }, // validate-allow
  { re: /\/home\/[^/\s]+\//, msg: "사용자 홈 절대 경로" }, // validate-allow
  { re: /C:\\Users\\/, msg: "사용자 홈 절대 경로" }, // validate-allow
  { re: /\bsk-[A-Za-z0-9_-]{20,}/, msg: "비밀값 형태" }, // validate-allow
  { re: /\bghp_[A-Za-z0-9]{30,}/, msg: "비밀값 형태" }, // validate-allow
  { re: /github_pat_/, msg: "비밀값 형태" }, // validate-allow
  { re: /\bAKIA[0-9A-Z]{16}/, msg: "비밀값 형태" }, // validate-allow
  { re: /\bxox[baprs]-/, msg: "비밀값 형태" }, // validate-allow
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, msg: "비밀값 형태" }, // validate-allow
  { re: /co-authored-by/i, msg: "도구 표기" }, // validate-allow
  { re: /generated with/i, msg: "도구 표기" }, // validate-allow
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const SAFE_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
]);
const MODEL_NAME = /\b(claude|gpt|gemini)-[a-z0-9.-]*\d/i; // validate-allow

const toPosix = (p) => p.split("\\").join("/");
const readText = (path) => readFileSync(path, "utf8");

function parseArgs(argv) {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const i = argv.indexOf("--root");
  return { root: i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : defaultRoot };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function listFiles(root) {
  try {
    const out = execFileSync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const files = out
      .split("\0")
      .filter(Boolean)
      .map((f) => join(root, f));
    return files.filter((f) => existsSync(f));
  } catch {
    return walk(root);
  }
}

// 코드 펜스 밖의 줄만 { text, line } 으로 돌려준다.
function linesOutsideFences(text) {
  const result = [];
  let inFence = false;
  text.split("\n").forEach((text, idx) => {
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) result.push({ text, line: idx + 1 });
  });
  return result;
}

function parseFrontmatter(text) {
  const lines = text.split("\n");
  if (lines[0].trim() !== "---") return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return null;
  const data = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    data[m[1]] = value;
  }
  return data;
}

function listSkills(root) {
  const dir = join(root, "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .sort();
}

function checkSkillFolders(ctx) {
  for (const id of ctx.skills) {
    if (!SKILL_ID.test(id))
      ctx.fail(
        `skills/${id}`,
        "폴더 이름은 ux-로 시작하는 소문자 kebab-case여야 한다",
      );
    if (!existsSync(join(ctx.root, "skills", id, "SKILL.md"))) {
      ctx.fail(`skills/${id}`, "SKILL.md가 없다");
    }
  }
}

function checkFrontmatter(ctx, id, text) {
  const file = `skills/${id}/SKILL.md`;
  const fm = parseFrontmatter(text);
  if (!fm) return ctx.fail(file, "frontmatter(---)가 없거나 닫히지 않았다");
  for (const key of Object.keys(fm)) {
    if (!FRONTMATTER_KEYS.includes(key))
      ctx.fail(file, `허용되지 않은 frontmatter 키: ${key}`);
  }
  if (fm.name !== id)
    ctx.fail(file, `name(${fm.name ?? "없음"})이 폴더명(${id})과 다르다`);
  const length = [...(fm.description ?? "")].length;
  if (length === 0) ctx.fail(file, "description이 비어 있다");
  else if (length > MAX_DESCRIPTION)
    ctx.fail(file, `description이 ${length}자로 ${MAX_DESCRIPTION}자를 넘는다`);
  if (!fm.license) ctx.fail(file, "license가 없다");
}

function h2Headings(text) {
  return linesOutsideFences(text)
    .map((l) => l.text.match(/^## (.+?)\s*$/))
    .filter(Boolean)
    .map((m) => m[1]);
}

function checkSections(ctx, id, text) {
  const file = `skills/${id}/SKILL.md`;
  const headings = h2Headings(text);
  let from = 0;
  for (const name of REQUIRED_H2) {
    const at = headings.indexOf(name, from);
    if (at < 0) {
      const reason = headings.includes(name) ? "순서가 어긋났다" : "없다";
      ctx.fail(file, `필수 섹션 ## ${name}이 ${reason}`);
    } else from = at + 1;
  }
}

function checkSize(ctx, id, text) {
  const file = `skills/${id}/SKILL.md`;
  const lines = text.replace(/\n$/, "").split("\n").length;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (lines > MAX_LINES) ctx.fail(file, `${lines}줄로 ${MAX_LINES}줄을 넘는다`);
  if (words > MAX_WORDS)
    ctx.fail(file, `${words}단어로 ${MAX_WORDS}단어를 넘는다`);
}

function sectionLines(text, name) {
  const out = [];
  let inside = false;
  for (const { text: t } of linesOutsideFences(text)) {
    const m = t.match(/^## (.+?)\s*$/);
    if (m) inside = m[1] === name;
    else if (inside) out.push(t);
  }
  return out;
}

function checkHardGates(ctx, id, text) {
  const file = `skills/${id}/SKILL.md`;
  const numbers = sectionLines(text, "Hard Gates")
    .filter((l) => l.trim().startsWith("|"))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")[0]
        .trim(),
    )
    .map((cell) => cell.match(/^G(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  if (numbers.length === 0)
    return ctx.fail(file, "Hard Gates 표에 G1 이상의 행이 없다");
  numbers.forEach((n, i) => {
    if (n !== i + 1)
      ctx.fail(file, `Hard Gates 번호가 G${i + 1}부터 연속되지 않는다 (G${n})`);
  });
}

function checkSkillMd(ctx) {
  let references = 0;
  for (const id of ctx.skills) {
    const path = join(ctx.root, "skills", id, "SKILL.md");
    if (!existsSync(path)) continue;
    const text = readText(path);
    checkFrontmatter(ctx, id, text);
    checkSections(ctx, id, text);
    checkSize(ctx, id, text);
    checkHardGates(ctx, id, text);
    const refDir = join(ctx.root, "skills", id, "references");
    if (existsSync(refDir))
      references += readdirSync(refDir).filter((f) => f.endsWith(".md")).length;
  }
  ctx.stats.references = references;
}

function checkSkillReferences(ctx) {
  const targets = ctx.mdFiles.filter((f) => {
    const rel = ctx.rel(f);
    return rel.startsWith("skills/") || /^README[^/]*\.md$/.test(rel);
  });
  for (const file of targets) {
    for (const { text, line } of linesOutsideFences(readText(file))) {
      for (const m of text.matchAll(/`(ux-[a-z0-9-]+)`/g)) {
        if (!ctx.skills.includes(m[1]))
          ctx.fail(
            ctx.rel(file),
            `${line}행: 존재하지 않는 스킬 \`${m[1]}\` 참조`,
          );
      }
    }
  }
}

function extractLinks(text) {
  const links = [];
  for (const m of text.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g))
    links.push(m[1]);
  for (const m of text.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/gi))
    links.push(m[1]);
  for (const m of text.matchAll(/\bsrcset="([^"]+)"/gi)) {
    for (const part of m[1].split(",")) links.push(part.trim().split(/\s+/)[0]);
  }
  return links.filter(Boolean);
}

function checkLinks(ctx) {
  for (const file of ctx.mdFiles) {
    for (const link of extractLinks(readText(file))) {
      if (/^(https?:|mailto:|#)/i.test(link)) continue;
      const target = link.split("#")[0].split("?")[0];
      if (!target) continue;
      if (!existsSync(resolve(dirname(file), decodeURI(target)))) {
        ctx.fail(ctx.rel(file), `깨진 상대 링크: ${link}`);
      }
    }
  }
}

// GitHub은 한 줄(표는 한 칸) 안에서 짝을 이룬 물결표를 취소선으로 그린다. 범위는 \~로 쓴다.
function checkTildes(ctx) {
  for (const file of ctx.mdFiles) {
    for (const { text, line } of linesOutsideFences(readText(file))) {
      const plain = text.replace(/`[^`]*`/g, "");
      const cells = plain.trim().startsWith("|") ? plain.split("|") : [plain];
      if (cells.some((c) => (c.match(/(?<!\\)~/g) ?? []).length >= 2))
        ctx.fail(
          ctx.rel(file),
          `${line}행: 물결표 두 개가 취소선으로 렌더링된다 — 범위는 \\~로 쓴다`,
        );
    }
  }
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

function validateCase(ctx, c, i, seen) {
  const where = `evals/cases.json#${i}`;
  if (typeof c !== "object" || c === null || Array.isArray(c))
    return ctx.fail(where, "케이스는 객체여야 한다");
  for (const key of Object.keys(c)) {
    if (!CASE_KEYS.includes(key)) ctx.fail(where, `허용되지 않은 키: ${key}`);
  }
  if (typeof c.id !== "string" || !CASE_ID.test(c.id))
    ctx.fail(where, "id 형식이 맞지 않는다");
  else if (seen.has(c.id)) ctx.fail(where, `id 중복: ${c.id}`);
  else seen.add(c.id);
  if (!isNonEmptyString(c.prompt)) ctx.fail(where, "prompt가 비어 있다");
  if (!isNonEmptyString(c.why)) ctx.fail(where, "why가 비어 있다");
  if (!ctx.skills.includes(c.expectSkill))
    ctx.fail(where, `expectSkill이 실제 스킬이 아니다: ${c.expectSkill}`);
  if ("shouldNotFire" in c) {
    if (!ctx.skills.includes(c.shouldNotFire))
      ctx.fail(where, `shouldNotFire가 실제 스킬이 아니다: ${c.shouldNotFire}`);
    else if (c.shouldNotFire === c.expectSkill)
      ctx.fail(where, "shouldNotFire가 expectSkill과 같다");
  }
}

function checkCoverage(ctx, cases) {
  for (const id of ctx.skills) {
    const positive = cases.filter((c) => c?.expectSkill === id).length;
    const boundary = cases.filter(
      (c) =>
        (c?.expectSkill === id && c.shouldNotFire) || c?.shouldNotFire === id,
    ).length;
    if (positive < MIN_POSITIVE_CASES)
      ctx.fail(
        "evals/cases.json",
        `${id}: 양성 케이스가 ${positive}개로 ${MIN_POSITIVE_CASES}개 미만`,
      );
    if (boundary < MIN_BOUNDARY_CASES)
      ctx.fail("evals/cases.json", `${id}: 경계 케이스가 없다`);
  }
}

function checkEvals(ctx) {
  const path = join(ctx.root, "evals/cases.json");
  ctx.stats.cases = 0;
  if (!existsSync(path)) return ctx.fail("evals/cases.json", "파일이 없다");
  let data;
  try {
    data = JSON.parse(readText(path));
  } catch (e) {
    return ctx.fail("evals/cases.json", `JSON 파싱 실패: ${e.message}`);
  }
  if (!data || !Array.isArray(data.cases))
    return ctx.fail("evals/cases.json", '{ "cases": [...] } 형태여야 한다');
  const seen = new Set();
  data.cases.forEach((c, i) => validateCase(ctx, c, i, seen));
  checkCoverage(ctx, data.cases);
  ctx.stats.cases = data.cases.length;
}

function checkReadmes(ctx) {
  const readmes = ["README.md", "README.en.md"];
  for (const name of readmes) {
    const path = join(ctx.root, name);
    if (!existsSync(path)) {
      if (name === "README.md") ctx.fail(name, "파일이 없다");
      continue;
    }
    const text = readText(path);
    for (const id of ctx.skills) {
      if (!text.includes(id)) ctx.fail(name, `스킬 ${id}가 목록에 없다`);
    }
  }
}

function collectVersions(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => collectVersions(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "version") out.push(v);
      else collectVersions(v, out);
    }
  }
  return out;
}

function checkManifests(ctx) {
  const pkgPath = join(ctx.root, "package.json");
  let pkgVersion;
  try {
    pkgVersion = JSON.parse(readText(pkgPath)).version;
  } catch (e) {
    return ctx.fail("package.json", `읽을 수 없다: ${e.message}`);
  }
  for (const rel of MANIFESTS) {
    const path = join(ctx.root, rel);
    if (!existsSync(path)) {
      ctx.fail(rel, "파일이 없다");
      continue;
    }
    let data;
    try {
      data = JSON.parse(readText(path));
    } catch (e) {
      ctx.fail(rel, `JSON 파싱 실패: ${e.message}`);
      continue;
    }
    for (const v of collectVersions(data)) {
      if (v !== pkgVersion)
        ctx.fail(rel, `version ${v}이 package.json(${pkgVersion})과 다르다`);
    }
  }
}

function checkHygiene(ctx) {
  for (const file of ctx.files) {
    if (BINARY_EXT.test(file)) continue;
    const rel = ctx.rel(file);
    const inSkills = rel.startsWith("skills/");
    readText(file)
      .split("\n")
      .forEach((line, idx) => {
        if (line.includes(ALLOW_MARK)) return;
        const at = `${idx + 1}행`;
        for (const rule of HYGIENE_RULES) {
          if (rule.re.test(line)) ctx.fail(rel, `${at}: ${rule.msg}`);
        }
        for (const m of line.matchAll(EMAIL)) {
          if (!SAFE_EMAIL_DOMAINS.has(m[1].toLowerCase()))
            ctx.fail(rel, `${at}: 이메일 주소`);
        }
        if (inSkills && MODEL_NAME.test(line))
          ctx.fail(rel, `${at}: 모델 이름 고정`);
      });
  }
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const failures = [];
  const files = listFiles(root);
  const ctx = {
    root,
    files,
    mdFiles: files.filter((f) => f.endsWith(".md")),
    skills: listSkills(root),
    stats: {},
    rel: (f) => toPosix(relative(root, f)),
    fail: (where, msg) => failures.push(`✗ ${where}: ${msg}`),
  };
  checkSkillFolders(ctx);
  checkSkillMd(ctx);
  checkSkillReferences(ctx);
  checkLinks(ctx);
  checkTildes(ctx);
  checkEvals(ctx);
  checkReadmes(ctx);
  checkManifests(ctx);
  checkHygiene(ctx);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  const { references, cases } = ctx.stats;
  console.log(
    `✓ validate PASS — ${ctx.skills.length} skills · ${references} references · ${cases} eval cases · ${ctx.mdFiles.length} markdown files`,
  );
}

main();
