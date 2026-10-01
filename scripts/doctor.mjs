import { preflight } from './local-dev.mjs';
try {
  await preflight();
  console.log('\nEntorno listo para npm run dev.');
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
