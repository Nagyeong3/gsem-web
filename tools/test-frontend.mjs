import { spawn } from 'node:child_process';
import { spawnFastApi, stopChild, waitForUrl } from './process-utils.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const api = spawnFastApi({ port: 4011 });
let tests;

try {
  await waitForUrl('http://127.0.0.1:4011/health', api);
  tests = spawn(npmCommand, ['exec', '--', 'vitest', 'run'], {
    stdio: 'inherit',
    env: { ...process.env, GSEM_TEST_API_URL: 'http://127.0.0.1:4011/api/v1' },
  });
  const code = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('exit', resolve);
  });
  process.exitCode = code ?? 1;
} finally {
  stopChild(tests);
  stopChild(api);
}
