import { spawn, spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCommand, ['run', 'build', '--', '--mode', 'api'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DATA_SOURCE: 'api' },
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const children = [
  spawn(process.execPath, ['tools/stub-api.mjs'], {
    stdio: 'inherit',
  }),
  spawn(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--mode', 'api', '--port', '5174', '--strictPort'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DATA_SOURCE: 'api' },
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
