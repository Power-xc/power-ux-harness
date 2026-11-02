#!/usr/bin/env node
// 스킬을 프로젝트의 .agents/skills 또는 .claude/skills 로 복사한다.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(PACKAGE_ROOT, "skills");
const USAGE_ERROR_CODE = 2;
const TOOL_DIRS = { agents: ".agents/skills", claude: ".claude/skills" };
const TOOL_CHOICES = ["agents", "claude", "both"];
const FIRST_SENTENCE = /^.*?[.。](?=\s|$)/;

const USAGE = `사용법: npx github:Power-xc/power-ux-harness [옵션]

옵션:
  --tool <agents|claude|both>  설치 위치 (기본 agents)
                               agents → <dir>/.agents/skills  (Codex·Cursor·Gemini CLI·GitHub Copilot 등)
                               claude → <dir>/.claude/skills
  --only <id,id>               지정한 스킬만 설치
  --dir <프로젝트>             설치할 프로젝트 폴더 (기본 현재 폴더)
  --force                      내용이 다른 기존 파일을 덮어쓴다
  --dry-run                    파일을 쓰지 않고 할 일만 출력한다
  --list                       설치 가능한 스킬 목록을 출력한다
  -h, --help                   이 도움말`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = {
    tool: "agents",
    only: null,
    dir: process.cwd(),
    force: false,
    dryRun: false,
    list: false,
  };
  const valueOf = (i, flag) => {
    if (argv[i + 1] === undefined) throw new UsageError(`${flag} 값이 필요하다`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tool") opts.tool = valueOf(i++, arg);
    else if (arg === "--only")
      opts.only = valueOf(i++, arg)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else if (arg === "--dir") opts.dir = resolve(valueOf(i++, arg));
    else if (arg === "--force") opts.force = true;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--list") opts.list = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else throw new UsageError(`알 수 없는 옵션: ${arg}`);
  }
  if (!TOOL_CHOICES.includes(opts.tool)) throw new UsageError(`--tool 은 ${TOOL_CHOICES.join("|")} 중 하나여야 한다`);
  return opts;
}

function listSkillIds() {
  return readdirSync(SKILLS_DIR)
    .filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory())
    .sort();
}

function descriptionOf(id) {
  const text = readFileSync(join(SKILLS_DIR, id, "SKILL.md"), "utf8");
  const m = text.match(/^description:\s*"?(.*?)"?\s*$/m);
  const description = m ? m[1] : "";
  return (description.match(FIRST_SENTENCE) ?? [description])[0];
}

function listFilesRecursive(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) listFilesRecursive(full, base, out);
    else out.push(full.slice(base.length + 1));
  }
  return out;
}

// 한 파일을 복사하고 'installed' | 'skipped' | 'same' 을 돌려준다.
function copyFile(src, dest, { force, dryRun }) {
  const content = readFileSync(src);
  if (existsSync(dest)) {
    if (readFileSync(dest).equals(content)) return "same";
    if (!force) return "skipped";
  }
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  return "installed";
}

function installSkill(id, targetRoot, opts, tally) {
  const srcDir = join(SKILLS_DIR, id);
  for (const rel of listFilesRecursive(srcDir)) {
    const dest = join(targetRoot, id, rel);
    const result = copyFile(join(srcDir, rel), dest, opts);
    const shown = join(id, rel);
    if (result === "installed") {
      tally.installed++;
      console.log(`${opts.dryRun ? "설치 예정" : "설치"}  ${join(targetRoot, shown)}`);
    } else if (result === "skipped") {
      tally.skipped++;
      console.log(`건너뜀  ${join(targetRoot, shown)} (내용이 달라 보존, 덮어쓰려면 --force)`);
    }
  }
}

function targetRoots(opts) {
  const tools = opts.tool === "both" ? ["agents", "claude"] : [opts.tool];
  return tools.map((t) => join(opts.dir, TOOL_DIRS[t]));
}

function run(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return console.log(USAGE);
  const all = listSkillIds();
  if (opts.list) {
    for (const id of all) console.log(`${id}  ${descriptionOf(id)}`);
    return;
  }
  const ids = opts.only ?? all;
  const unknown = ids.filter((id) => !all.includes(id));
  if (unknown.length > 0) {
    throw new UsageError(`알 수 없는 스킬: ${unknown.join(", ")}\n설치 가능: ${all.join(", ")}`);
  }
  const tally = { installed: 0, skipped: 0 };
  const roots = targetRoots(opts);
  for (const root of roots) for (const id of ids) installSkill(id, root, opts, tally);
  console.log(
    `${opts.dryRun ? "[dry-run] " : ""}설치 ${tally.installed} · 건너뜀 ${tally.skipped} · 위치 ${roots.join(", ")}`,
  );
}

try {
  run(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(`오류: ${e.message}\n\n${USAGE}`);
  process.exit(USAGE_ERROR_CODE);
}
