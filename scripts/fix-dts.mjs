/**
 * Post-processes the declaration files emitted by `tsc`:
 *  - adds explicit `.js` extensions to relative imports so the types resolve
 *    under `moduleResolution: node16 | nodenext` (the package is ESM);
 *  - strips side-effect CSS imports, which have no meaning in .d.ts files;
 *  - deletes declarations that the entry point never reaches (internal
 *    components and hooks cannot be imported through the `exports` map);
 *  - writes a declaration for the stylesheet.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const distDir = resolve("dist");

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".d.ts") ? [full] : [];
  });

const resolveSpecifier = (file, specifier) => {
  if (/\.(js|mjs|cjs|json|css)$/.test(specifier)) return specifier;
  const abs = resolve(dirname(file), specifier);
  if (existsSync(`${abs}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(abs, "index.d.ts"))) {
    return `${specifier.replace(/\/$/, "")}/index.js`;
  }
  return specifier;
};

// Module specifiers only: `from "./x"`, `import("./x")`, `import "./x"`.
const SPECIFIER =
  /(from\s+|import\s*\(\s*|^\s*import\s+)(["'])(\.\.?(?:\/[^"']*)?)\2/gm;

for (const file of walk(distDir)) {
  const source = readFileSync(file, "utf8");
  const output = source
    .split("\n")
    .filter((line) => !/^\s*import\s+["'][^"']+\.css["'];?\s*$/.test(line))
    .join("\n")
    .replace(
      SPECIFIER,
      (_match, lead, quote, specifier) =>
        `${lead}${quote}${resolveSpecifier(file, specifier)}${quote}`,
    );
  if (output !== source) writeFileSync(file, output);
}

// Keep only what a consumer can reach from the entry declaration.
const reachable = new Set();
const visit = (file) => {
  if (reachable.has(file) || !existsSync(file)) return;
  reachable.add(file);
  for (const match of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
    const specifier = match[3];
    if (specifier.endsWith(".js")) {
      visit(resolve(dirname(file), specifier.replace(/\.js$/, ".d.ts")));
    }
  }
};
visit(join(distDir, "index.d.ts"));
for (const file of walk(distDir)) {
  if (!reachable.has(file)) rmSync(file);
}

const removeEmptyDirs = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) removeEmptyDirs(full);
  }
  if (dir !== distDir && readdirSync(dir).length === 0) rmdirSync(dir);
};
removeEmptyDirs(distDir);

// TypeScript 6+ checks side-effect imports; give the stylesheet a declaration
// so `import "<package>/dist/index.css"` type-checks without ambient modules.
writeFileSync(join(distDir, "index.css.d.ts"), "export {};\n");
