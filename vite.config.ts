import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import { defineConfig } from 'vite';

const COLOR_FALLBACKS: Record<string, string> = {
  '--color-red-200': '#fecaca',
  '--color-red-300': '#fca5a5',
  '--color-red-400': '#f87171',
  '--color-red-500': '#ef4444',
  '--color-amber-300': '#fcd34d',
  '--color-amber-400': '#fbbf24',
  '--color-emerald-400': '#34d399',
  '--color-gray-400': '#9ca3af',
  '--color-gray-500': '#6b7280',
  '--color-neutral-400': '#a3a3a3',
  '--color-neutral-600': '#525252',
  '--color-neutral-900': '#171717',
};

function unwrapLayers(css: string): string {
  // Remove empty layer declarations like "@layer components;"
  let result = css.replace(/@layer\s+components\s*;/g, '');

  let i = 0;
  while (true) {
    const layerMatch = result.slice(i).match(/@layer\s+[^{]+{/);
    if (!layerMatch || layerMatch.index === undefined) break;

    const startIdx = i + layerMatch.index;
    const openBraceIdx = startIdx + layerMatch[0].length - 1;

    let depth = 1;
    let endIdx = openBraceIdx + 1;
    while (endIdx < result.length && depth > 0) {
      if (result[endIdx] === '{') depth++;
      else if (result[endIdx] === '}') depth--;
      endIdx++;
    }

    if (depth === 0) {
      const innerContent = result.slice(openBraceIdx + 1, endIdx - 1);
      result = result.slice(0, startIdx) + innerContent + result.slice(endIdx);
      i = startIdx;
    } else {
      break;
    }
  }

  return result;
}

function smartTvCssCompat() {
  return {
    name: 'smart-tv-css-compat',
    enforce: 'post' as const,
    generateBundle(_options: any, bundle: any) {
      for (const fileName in bundle) {
        const file = bundle[fileName];
        if (
          file.type === 'asset' &&
          fileName.endsWith('.css') &&
          typeof file.source === 'string'
        ) {
          let css = unwrapLayers(file.source);
          for (const [varName, hex] of Object.entries(COLOR_FALLBACKS)) {
            css = css.replace(
              new RegExp(`(${varName}:)(oklch\\([^)]+\\))`, 'g'),
              `$1${hex};$1$2`
            );
          }
          file.source = css;
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      legacy({
        targets: [
          'chrome >= 60',
          'safari >= 11',
          'ios >= 11',
          'edge >= 79',
          'not dead',
        ],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      }),
      smartTvCssCompat(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
