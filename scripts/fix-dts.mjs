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
    .replace(/(["'])(\.\.?(?:\/[^"']*)?)\1/g, (_match, quote, specifier) => {
      return `${quote}${resolveSpecifier(file, specifier)}${quote}`;
    });
  if (output !== source) writeFileSync(file, output);
}
