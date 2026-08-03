import { pathToFileURL } from 'node:url';
import { createGsemApiServer } from './server.mjs';

export { createGsemApiServer } from './server.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.GSEM_API_PORT ?? 4010);
  const host = process.env.GSEM_API_HOST ?? '127.0.0.1';
  const server = createGsemApiServer();
  server.listen(port, host, () => {
    process.stdout.write(`GSEM API: http://${host}:${port}\n`);
  });
}
