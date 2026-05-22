import { defineConfig } from "vite"; import { resolve } from "path";
export default defineConfig({ build:{ outDir:"dist", emptyOutDir:true, rollupOptions:{ input:{ newtab: resolve(__dirname,"newtab.html") }, output:{ entryFileNames:"[name].js" } } } });
