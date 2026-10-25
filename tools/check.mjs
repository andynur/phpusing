import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function runSteps(steps, { logDir, timeout = 300_000 } = {}) {
  if (!logDir) {
    mkdirSync('.agent-logs', { recursive: true, mode: 0o700 });
    logDir = mkdtempSync('.agent-logs/run-');
  }
  mkdirSync(logDir, { recursive: true, mode: 0o700 });
  console.log(`Logs: ${resolve(logDir)}`);
  for (const [name, command, args] of steps) {
    const log = resolve(logDir, `${name}.log`);
    const fd = openSync(log, 'w', 0o600);
    const start = Date.now();
    let result;
    try {
      result = spawnSync(command, args, {
        stdio: ['ignore', fd, fd],
        timeout,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      });
    } finally {
      closeSync(fd);
    }
    const ok = !result.error && !result.signal && result.status === 0;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    if (!ok) {
      if (result.error) console.error(result.error.message);
      if (result.signal) console.error(`Terminated: ${result.signal}`);
      console.error(readFileSync(log, 'utf8').slice(-6000).split('\n').slice(-30).join('\n'));
      console.error(`Full log: ${log}`);
      return result.status || 1;
    }
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  process.exitCode = runSteps(
    ['check:harness', 'lint', 'typecheck', 'test', 'build', 'check:bundle'].map((name) => [
      name,
      pnpm,
      ['--silent', 'run', name],
    ]),
  );
}
