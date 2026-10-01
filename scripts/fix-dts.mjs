/**
 * Post-processes the declaration files emitted by `tsc`:
 *  - adds explicit `.js` extensions to relative imports so the types resolve
 *    under `moduleResolution: node16 | nodenext` (the package is ESM);
 *  - strips side-effect CSS imports, which have no meaning in .d.ts files.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
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

const cssStylesDts = join(distDir, "cssStyles.d.ts");
if (existsSync(cssStylesDts)) rmSync(cssStylesDts);

for (const file of walk(distDir)) {
  const source = readFileSync(file, "utf8");
  const output = source
    .split("\n")
    .filter((line) => !/^\s*import\s+["'][^"']+\.css["'];?\s*$/.test(line))
    .filter((line) => !/^\s*import\s+["']\.\/cssStyles["'];?\s*$/.test(line))
    .join("\n")
    // Only module specifiers: `from "./x"`, `import("./x")`, `import "./x"`.
    .replace(
      /(from\s+|import\s*\(\s*|^\s*import\s+)(["'])(\.\.?(?:\/[^"']*)?)\2/gm,
      (_match, lead, quote, specifier) =>
        `${lead}${quote}${resolveSpecifier(file, specifier)}${quote}`,
    );
  if (output !== source) writeFileSync(file, output);
}

// TypeScript 6+ checks side-effect imports; give the stylesheet a declaration
// so `import "<package>/dist/index.css"` type-checks without ambient modules.
writeFileSync(join(distDir, "index.css.d.ts"), "export {};\n");
