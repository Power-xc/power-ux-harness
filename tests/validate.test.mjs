import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'validate.mjs');
const made = [];
after(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

const GATES = '| ID | FAIL 조건 |\n| -- | -- |\n| G1 | 근거 없음 |\n| G2 | 우선순위 없음 |';
const SECTIONS = {
  Trigger: '- `@ux review`',
  Input: '- target',
  Process: '1. 본다',
  Output: '- 표',
  'Hard Gates': GATES,
  'Skill Chaining': '- 없음',
  Constraints: '- 하지 않는다',
};

function skillMd(id, { sections = SECTIONS, extra = '' } = {}) {
  const body = Object.entries(sections).map(([h, t]) => `## ${h}\n\n${t}\n`).join('\n');
  return `---\nname: ${id}\ndescription: "${id} 설명이다."\nlicense: MIT\n---\n\n# ${id}\n\n${body}\n${extra}`;
}

const CASES = {
  cases: [
    { id: 'a-1', prompt: 'p', expectSkill: 'ux-a', why: 'w' },
    { id: 'a-2', prompt: 'p', expectSkill: 'ux-a', why: 'w' },
    { id: 'a-3', prompt: 'p', expectSkill: 'ux-b', shouldNotFire: 'ux-a', why: 'w' },
    { id: 'b-1', prompt: 'p', expectSkill: 'ux-b', why: 'w' },
  ],
};

function makeRepo(patch = (files) => files) {
  const files = patch({
    'package.json': JSON.stringify({ name: 'fx', version: '1.0.0' }),
    'README.md': '# fx\n\n`ux-a` · `ux-b`\n',
    'skills/ux-a/SKILL.md': skillMd('ux-a'),
    'skills/ux-b/SKILL.md': skillMd('ux-b'),
    'evals/cases.json': JSON.stringify(CASES),
    '.claude-plugin/plugin.json': JSON.stringify({ version: '1.0.0' }),
    '.claude-plugin/marketplace.json': JSON.stringify({ plugins: [{ version: '1.0.0' }] }),
    '.codex-plugin/plugin.json': JSON.stringify({ version: '1.0.0' }),
  });
  const dir = mkdtempSync(join(tmpdir(), 'uxh-validate-'));
  made.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

function validate(dir) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', dir], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

function assertFails(patch, message) {
  const { code, out } = validate(makeRepo(patch));
  assert.equal(code, 1, out);
  assert.match(out, message);
}

test('규약을 지킨 최소 저장소는 PASS한다', () => {
  const { code, out } = validate(makeRepo());
  assert.equal(code, 0, out);
  assert.match(out, /✓ validate PASS — 2 skills · 0 references · 4 eval cases/);
});

test('폴더명과 name이 다르면 FAIL한다', () => {
  assertFails((f) => ({ ...f, 'skills/ux-a/SKILL.md': skillMd('ux-z') }), /name\(ux-z\)이 폴더명/);
});

test('필수 섹션이 빠지면 FAIL한다', () => {
  const { Constraints, ...rest } = SECTIONS;
  assertFails((f) => ({ ...f, 'skills/ux-a/SKILL.md': skillMd('ux-a', { sections: rest }) }), /## Constraints/);
});

test('Hard Gates 번호를 건너뛰면 FAIL한다', () => {
  const sections = { ...SECTIONS, 'Hard Gates': '| ID | FAIL |\n| -- | -- |\n| G1 | a |\n| G3 | b |' };
  assertFails((f) => ({ ...f, 'skills/ux-a/SKILL.md': skillMd('ux-a', { sections }) }), /G2부터 연속/);
});

test('깨진 상대 링크는 FAIL한다', () => {
  assertFails((f) => ({ ...f, 'README.md': f['README.md'] + '[x](docs/none.md)\n' }), /깨진 상대 링크: docs\/none\.md/);
});

test('존재하지 않는 스킬을 백틱으로 참조하면 FAIL한다', () => {
  assertFails((f) => ({ ...f, 'skills/ux-a/SKILL.md': skillMd('ux-a', { extra: '`ux-ghost`\n' }) }), /`ux-ghost`/);
});

test('스킬에 경계 케이스가 없으면 FAIL한다', () => {
  const cases = { cases: CASES.cases.map(({ shouldNotFire, ...c }) => c) };
  assertFails((f) => ({ ...f, 'evals/cases.json': JSON.stringify(cases) }), /경계 케이스가 없다/);
});

test('케이스에 허용되지 않은 키가 있으면 FAIL한다', () => {
  const cases = { cases: [{ ...CASES.cases[0], note: 'x' }, ...CASES.cases.slice(1)] };
  assertFails((f) => ({ ...f, 'evals/cases.json': JSON.stringify(cases) }), /허용되지 않은 키: note/);
});

test('README에 스킬 id가 빠지면 FAIL한다', () => {
  assertFails((f) => ({ ...f, 'README.md': '# fx\n\n`ux-a`\n' }), /README\.md: 스킬 ux-b/);
});

test('비밀값 형태 문자열은 FAIL한다', () => {
  const secret = 'ghp_' + 'a'.repeat(36);
  assertFails((f) => ({ ...f, 'notes.txt': `token ${secret}\n` }), /notes\.txt: 1행: 비밀값 형태/);
});

test('200줄을 넘으면 FAIL한다', () => {
  const extra = Array.from({ length: 200 }, (_, i) => `줄 ${i}`).join('\n') + '\n';
  assertFails((f) => ({ ...f, 'skills/ux-a/SKILL.md': skillMd('ux-a', { extra }) }), /200줄을 넘는다/);
});

test('매니페스트 버전이 package.json과 다르면 FAIL한다', () => {
  assertFails((f) => ({ ...f, '.codex-plugin/plugin.json': JSON.stringify({ version: '2.0.0' }) }), /version 2\.0\.0/);
});

test('validate-allow 표시가 있는 줄은 위생 검사에서 빠진다', () => {
  const line = `${'Co-Authored-' + 'By'}: x // validate-allow\n`;
  const { code, out } = validate(makeRepo((f) => ({ ...f, 'notes.txt': line })));
  assert.equal(code, 0, out);
});

test('한 줄에 짝을 이룬 물결표는 취소선이 되므로 FAIL하고, \\~는 통과한다', () => {
  assertFails((f) => ({ ...f, 'README.md': f['README.md'] + '페르소나 3~5명이 후보안 2~3개\n' }), /물결표 두 개/);
  const { code, out } = validate(makeRepo((f) => ({ ...f, 'README.md': f['README.md'] + '페르소나 3\\~5명이 후보안 2\\~3개\n' })));
  assert.equal(code, 0, out);
});
