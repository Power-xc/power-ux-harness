import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'install.mjs');
const made = [];
after(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'uxh-install-'));
  made.push(dir);
  return dir;
}

function install(dir, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, '--dir', dir, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('기본 설치는 .agents/skills 에 스킬 전체를 복사한다', () => {
  const dir = tmp();
  const { code, out } = install(dir);
  assert.equal(code, 0, out);
  assert.ok(existsSync(join(dir, '.agents/skills/ux-review/SKILL.md')));
  assert.ok(existsSync(join(dir, '.agents/skills/ux-review/references')));
  assert.ok(!existsSync(join(dir, '.claude')));
});

test('--tool both 는 두 위치에 설치한다', () => {
  const dir = tmp();
  assert.equal(install(dir, '--tool', 'both').code, 0);
  assert.ok(existsSync(join(dir, '.agents/skills/ux-review/SKILL.md')));
  assert.ok(existsSync(join(dir, '.claude/skills/ux-review/SKILL.md')));
});

test('--only 는 지정한 스킬만 설치한다', () => {
  const dir = tmp();
  assert.equal(install(dir, '--only', 'ux-review', '--tool', 'claude').code, 0);
  assert.ok(existsSync(join(dir, '.claude/skills/ux-review/SKILL.md')));
});

test('바뀐 파일은 --force 없이 보존하고 --force 로 덮어쓴다', () => {
  const dir = tmp();
  install(dir);
  const file = join(dir, '.agents/skills/ux-review/SKILL.md');
  writeFileSync(file, 'mine');
  const kept = install(dir);
  assert.equal(readFileSync(file, 'utf8'), 'mine');
  assert.match(kept.out, /건너뜀 1/);
  install(dir, '--force');
  assert.notEqual(readFileSync(file, 'utf8'), 'mine');
});

test('--dry-run 은 파일을 만들지 않는다', () => {
  const dir = tmp();
  const { code, out } = install(dir, '--dry-run');
  assert.equal(code, 0, out);
  assert.ok(!existsSync(join(dir, '.agents')));
  assert.match(out, /설치 예정/);
});

test('알 수 없는 id 는 종료 코드 2로 실패한다', () => {
  const dir = tmp();
  const { code, out } = install(dir, '--only', 'ux-nope');
  assert.equal(code, 2);
  assert.match(out, /ux-nope/);
  assert.ok(!existsSync(join(dir, '.agents')));
});

test('--list 는 스킬 id 와 첫 문장을 출력한다', () => {
  const { code, out } = install(tmp(), '--list');
  assert.equal(code, 0);
  assert.match(out, /^ux-review {2}.+\.$/m);
});
