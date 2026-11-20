import path from "path";
import { defineConfig, Plugin } from "vite";

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

export default defineConfig(() => {
  return {
    plugins: [tizenClassicBundlePlugin()],
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
