/**
 * Smoke-checks the published output. Runs as part of `pnpm build`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const distDir = resolve("dist");
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const entry = join(distDir, "index.js");
assert(existsSync(entry), "dist/index.js is missing");
assert(existsSync(join(distDir, "index.css")), "dist/index.css is missing");
assert(existsSync(join(distDir, "index.d.ts")), "dist/index.d.ts is missing");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(distDir);
const jsFiles = files.filter((file) => file.endsWith(".js"));
const dtsFiles = files.filter((file) => file.endsWith(".d.ts"));

for (const file of jsFiles) {
  const code = readFileSync(file, "utf8");
  assert(
    code.startsWith('"use client";'),
    `${file} does not start with the "use client" directive`,
  );
  assert(
    !code.includes("data-styled"),
    `${file} bundles styled-components; it must stay external`,
  );
  assert(
    !/GlobalWorkerOptions\s*=\s*\{/.test(code),
    `${file} bundles pdfjs-dist; it must stay external`,
  );
}

const totalJsBytes = jsFiles.reduce(
  (sum, file) => sum + statSync(file).size,
  0,
);
assert(
  totalJsBytes < 200_000,
  `dist JavaScript is ${totalJsBytes} bytes; expected < 200 kB (are dependencies bundled?)`,
);

for (const file of dtsFiles) {
  const code = readFileSync(file, "utf8");
  const bad = [...code.matchAll(/["'](\.\.?(?:\/[^"']*)?)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => !specifier.endsWith(".js"));
  assert(
    bad.length === 0,
    `${file} has extensionless relative imports: ${bad.join(", ")}`,
  );
}

try {
  const mod = await import(pathToFileURL(entry).href);
  assert(
    typeof mod.default === "function",
    "default export is not a component",
  );
  assert(
    Array.isArray(mod.DocViewerRenderers),
    "DocViewerRenderers export missing",
  );
} catch (error) {
  // TODO(phase 4): promote to a failure once styled-components (whose Node
  // CJS build breaks default-import interop) is removed.
  console.warn(
    `warning: importing dist/index.js in Node failed: ${error.message}`,
  );
}

if (failures.length) {
  console.error(`dist verification failed:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log(
  `dist verified (${jsFiles.length} JS files, ${Math.round(totalJsBytes / 1024)} kB JS, ${dtsFiles.length} d.ts files)`,
);
