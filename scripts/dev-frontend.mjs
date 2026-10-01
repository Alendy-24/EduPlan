import { createServer } from 'vite';
import { join } from 'node:path';
import { root, waitFor } from './local-dev.mjs';
try {
  await Promise.all([
    waitFor('http://127.0.0.1:8080/api/me/preferences', 401),
    waitFor('http://127.0.0.1:3001/health', 200),
  ]);
  const server = await createServer({ root: join(root, 'frontend') });
  await server.listen();
  console.log('Frontend listo: http://localhost:3005');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
