import path from "path";
import * as esbuild from "esbuild";
import ts from "typescript";
import { defineConfig, Plugin } from "vite";

const VOD_API_VERSION = "12";

function vodApiVersionHtmlPlugin(): Plugin {
  return {
    name: "vod-api-version-html",
    transformIndexHtml(html) {
      return html.replace(/__VOD_API_VERSION__/g, VOD_API_VERSION);
    },
  };
}

// NOTE: DO NOT remove or switch to native <script type="module">. Samsung Tizen 4.0
// (Chromium 56) rejects modern module scripts/crossorigin attributes and requires a classic deferred IIFE.
function tizenClassicBundlePlugin(): Plugin {
  return {
    name: "tizen-classic-bundle",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(
          /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/g,
          '<script defer src="$1"></script>'
        )
        .replace(
          /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)">/g,
          '<link rel="stylesheet" href="$1">'
        );
    },
  };
}

// Downlevel the bundled IIFE to pure ES5 so Tizen 3.0 (Chromium 47) parses without ES2015 syntax errors.
const ES5_TOP_SHIM =
  'try{if(typeof Object.getOwnPropertyDescriptors!=="function"){Object.getOwnPropertyDescriptors=function(o){if(o==null)throw new TypeError("Cannot convert undefined or null to object");var t=Object(o),r={},k=Object.getOwnPropertyNames(t);if(typeof Object.getOwnPropertySymbols==="function")k=k.concat(Object.getOwnPropertySymbols(t));for(var i=0;i<k.length;i++){var p=k[i],d=Object.getOwnPropertyDescriptor(t,p);if(d!==void 0)r[p]=d}return r}}}catch(e){};';

function tizenEs5DownlevelPlugin(): Plugin {
  return {
    name: "tizen-es5-downlevel",
    apply: "build",
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith(".js")) return null;
      const transpiled = ts.transpileModule(code, {
        compilerOptions: {
          target: ts.ScriptTarget.ES5,
          module: ts.ModuleKind.None,
          allowJs: true,
          downlevelIteration: true,
          removeComments: true,
        },
      });
      const minified = esbuild.transformSync(ES5_TOP_SHIM + transpiled.outputText, {
        minify: true,
        target: "es5",
      });
      return { code: minified.code, map: null };
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      __VOD_API_VERSION__: JSON.stringify(VOD_API_VERSION),
    },
    plugins: [vodApiVersionHtmlPlugin(), tizenEs5DownlevelPlugin(), tizenClassicBundlePlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      // NOTE: Samsung Tizen 4.0 / Chromium 56 requires es2015/chrome56 IIFE output (no dynamic ES chunks).
      target: ["chrome56", "es2015"],
      cssTarget: "chrome56",
      modulePreload: false,
      rollupOptions: {
        output: {
          format: "iife" as const,
          inlineDynamicImports: true,
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
