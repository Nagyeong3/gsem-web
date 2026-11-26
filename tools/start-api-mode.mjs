import { spawn } from 'node:child_process';
import { spawnFastApi, stopChild } from './process-utils.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const api = spawnFastApi();
const frontend = spawn(
  npmCommand,
  ['run', 'dev', '--', '--host', '127.0.0.1', '--mode', 'api', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, VITE_DATA_SOURCE: 'api' },
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopChild(frontend);
    stopChild(api);
  });
}

frontend.on('exit', (code) => {
  process.exitCode = code ?? 0;
  stopChild(api);
});

api.on('exit', (code) => {
  if (code !== null && code !== 0) {
    process.exitCode = code;
    stopChild(frontend);
  }
});
