import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(process.execPath, ['tools/stub-api.mjs'], {
    stdio: 'inherit',
  }),
  spawn(npmCommand, ['run', 'dev:api', '--', '--port', '5174', '--strictPort'], {
    stdio: 'inherit',
  }),
];

let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

for (const child of children) {
  child.on('exit', (code) => {
    if (shuttingDown) return;
    process.exitCode = code ?? 1;
    shutdown();
  });
}
