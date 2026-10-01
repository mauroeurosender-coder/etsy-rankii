import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';

const outdir = 'dist';
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: {
    content: 'src/content/content.tsx',
    background: 'src/background/background.ts',
    options: 'src/options/options.ts',
    popup: 'src/options/popup.ts',
  },
  bundle: true,
  outdir,
  format: 'iife',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  // A content script runs on every matching page load, so it must ship React's
  // production build (this define strips its dev-mode warnings/checks), not the
  // much larger unminified development build esbuild would otherwise include.
  define: { 'process.env.NODE_ENV': '"production"' },
});

cpSync('manifest.json', `${outdir}/manifest.json`);
cpSync('options.html', `${outdir}/options.html`);
cpSync('popup.html', `${outdir}/popup.html`);
cpSync('icons', `${outdir}/icons`, { recursive: true });

console.log(`Built extension into ./${outdir} — load it as an unpacked extension.`);
