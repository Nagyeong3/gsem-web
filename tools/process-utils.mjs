import { spawn } from 'node:child_process';
import { resolvePythonCommand } from './python-command.mjs';

export function spawnFastApi({
  host = process.env.GSEM_API_HOST ?? '127.0.0.1',
  port = Number(process.env.GSEM_API_PORT ?? 4010),
  reload = false,
  stdio = 'inherit',
} = {}) {
  return spawn(resolvePythonCommand(), [
    '-m', 'uvicorn', 'backend.app.main:app', '--host', host, '--port', String(port),
    ...(reload ? ['--reload'] : []),
  ], {
    stdio,
    env: { ...process.env, GSEM_API_PORT: String(port) },
  });
}

export async function waitForUrl(url, child, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`FastAPI가 준비되기 전에 종료되었습니다(코드 ${child.exitCode}).`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 서버가 포트를 열 때까지 짧게 재시도한다.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`FastAPI 준비 시간을 초과했습니다: ${url}`);
}

export function stopChild(child) {
  if (child && !child.killed && child.exitCode === null) child.kill('SIGTERM');
}
