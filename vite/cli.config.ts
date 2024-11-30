import { defineConfig } from 'vite';
import { getAbsolutePath } from './utils/get-absolute-path';

export default defineConfig(() => {
  const isDev = process.argv.includes('--watch');

  return {
    base: './',
    build: {
      minify: !isDev,
      emptyOutDir: false,
      target: 'es2021',
      outDir: getAbsolutePath('dist', 'cli'),
      rollupOptions: {
        input: getAbsolutePath('src', 'cli', 'index.ts'),
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  };
});
