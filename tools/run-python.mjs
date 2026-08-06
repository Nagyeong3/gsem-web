import { spawn } from 'node:child_process';
import { resolvePythonCommand } from './python-command.mjs';

const child = spawn(resolvePythonCommand(), process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  process.stderr.write(`Python 실행에 실패했습니다: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
