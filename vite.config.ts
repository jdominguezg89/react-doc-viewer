import dsv from "@rollup/plugin-dsv";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [dsv(), nodePolyfills()],
  build: {
    lib: {
      entry: "./src/index.tsx",
      formats: ["es", "cjs"],
    },
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
