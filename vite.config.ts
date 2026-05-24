import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
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
