import { spawnFastApi, stopChild } from './process-utils.mjs';

const child = spawnFastApi({ reload: process.argv.includes('--reload') });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopChild(child));
}

child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
