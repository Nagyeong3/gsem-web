import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const mode of ['mock', 'api']) {
  const result = spawnSync(npm, ['run', 'build', '--', '--mode', mode, '--outDir', `dist/${mode}`], {
    cwd, stdio: 'inherit', env: { ...process.env, VITE_DATA_SOURCE: mode, VITE_API_BASE_URL: '/api/v1' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
