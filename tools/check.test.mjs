import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runSteps } from './check.mjs';

function fixture(t) {
  const logDir = mkdtempSync(join(tmpdir(), 'phpusing-check-'));
  t.after(() => rmSync(logDir, { recursive: true, force: true }));
  return logDir;
}
const step = (name, code) => [name, process.execPath, ['-e', code]];

test('runs every gate in order and preserves output larger than a pipe buffer', (t) => {
  const logDir = fixture(t);
  assert.equal(
    runSteps(
      [
        step('first', 'console.log("x".repeat(200000))'),
        step('second', 'console.error("diagnostic")'),
      ],
      { logDir },
    ),
    0,
  );
  assert.ok(readFileSync(join(logDir, 'first.log')).length > 200000);
  assert.match(readFileSync(join(logDir, 'second.log'), 'utf8'), /diagnostic/);
});

test('returns the failure code and never runs later gates', (t) => {
  const logDir = fixture(t);
  assert.equal(
    runSteps(
      [
        step('broken', 'console.error("decisive error"); process.exit(7)'),
        step('later', 'process.exit(0)'),
      ],
      { logDir },
    ),
    7,
  );
  assert.throws(() => readFileSync(join(logDir, 'later.log')), { code: 'ENOENT' });
});

test('missing commands fail closed', (t) => {
  assert.equal(
    runSteps([['missing', 'phpusing-nonexistent-command', []]], {
      logDir: fixture(t),
    }),
    1,
  );
});

test('timeouts fail closed', (t) => {
  assert.equal(
    runSteps([step('timeout', 'setInterval(() => {}, 1000)')], {
      logDir: fixture(t),
      timeout: 100,
    }),
    1,
  );
});
