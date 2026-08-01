import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DATA_SOURCE: 'api' },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
