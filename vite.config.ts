import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const requiredExtensionAssets = [
  "manifest.json",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

function verifyExtensionAssets(): Plugin {
  let outDir = "";

  return {
    name: "verify-extension-assets",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const missingAssets = requiredExtensionAssets.filter(
        (asset) => !existsSync(resolve(outDir, asset)),
      );

      if (missingAssets.length > 0) {
        throw new Error(
          `Missing Chrome extension assets in dist: ${missingAssets.join(", ")}`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [verifyExtensionAssets()],
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, "newtab.html"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
