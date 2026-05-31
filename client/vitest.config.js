import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom provides localStorage (used by the Zustand persist middleware)
    // and a DOM for any component tests added later.
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    testTimeout: 10000,
  },
});
