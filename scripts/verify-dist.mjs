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
    !code.includes("styled-components"),
    `${file} references styled-components; styling is plain CSS now`,
  );
  assert(
    !/GlobalWorkerOptions\s*=\s*\{/.test(code),
    `${file} bundles pdfjs-dist; it must stay external`,
  );
}

const allJs = jsFiles.map((file) => readFileSync(file, "utf8")).join("\n");
assert(
  allJs.includes(
    'new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)',
  ),
  "the pdf.js worker URL literal is missing from dist (the consumer bundler could not resolve the worker)",
);
assert(
  !allJs.includes("data:application/javascript") &&
    !allJs.includes("data:text/javascript"),
  "a worker was inlined as a data: URL",
);

// react-pdf pins an exact pdfjs-dist version; ours must match it.
const ourPdfjs = JSON.parse(readFileSync("package.json", "utf8")).dependencies[
  "pdfjs-dist"
];
const reactPdfPdfjs = JSON.parse(
  readFileSync("node_modules/react-pdf/package.json", "utf8"),
).dependencies["pdfjs-dist"];
assert(
  ourPdfjs === reactPdfPdfjs,
  `pdfjs-dist ${ourPdfjs} in package.json does not match react-pdf's pin ${reactPdfPdfjs}`,
);

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
  const isComponent =
    typeof mod.default === "function" ||
    (typeof mod.default === "object" &&
      mod.default !== null &&
      "$$typeof" in mod.default);
  assert(isComponent, "default export is not a React component");
  assert(
    Array.isArray(mod.DocViewerRenderers),
    "DocViewerRenderers export missing",
  );
} catch (error) {
  failures.push(`importing dist/index.js in Node failed: ${error.message}`);
}

if (failures.length) {
  console.error(`dist verification failed:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log(
  `dist verified (${jsFiles.length} JS files, ${Math.round(totalJsBytes / 1024)} kB JS, ${dtsFiles.length} d.ts files)`,
);
