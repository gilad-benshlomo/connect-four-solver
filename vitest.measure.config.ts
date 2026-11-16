import { defineConfig } from 'vitest/config';

// Speed measurements, run with `npm run measure`, never with `npm test`:
// timings vary from run to run, and tests must be fast and repeatable.
export default defineConfig({
  test: {
    include: ['src/**/*.measure.ts'],
    silent: false, // show the printed results even though the checks pass
    testTimeout: 10 * 60 * 1000,
  },
});