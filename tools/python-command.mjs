import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function resolvePythonCommand() {
  if (process.env.GSEM_PYTHON) return process.env.GSEM_PYTHON;
  const local = process.platform === 'win32'
    ? resolve('.venv', 'Scripts', 'python.exe')
    : resolve('.venv', 'bin', 'python');
  if (existsSync(local)) return local;
  return process.platform === 'win32' ? 'python' : 'python3';
}
