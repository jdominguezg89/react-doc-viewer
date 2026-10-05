/**
 * Pins `pdfjs-dist` to the exact version the installed `react-pdf` depends
 * on. Run after upgrading react-pdf: `pnpm sync:pdfjs && pnpm install`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const wanted = JSON.parse(
  readFileSync("node_modules/react-pdf/package.json", "utf8"),
).dependencies["pdfjs-dist"];

if (pkg.dependencies["pdfjs-dist"] === wanted) {
  console.log(`pdfjs-dist already matches react-pdf (${wanted}).`);
} else {
  console.log(`pdfjs-dist ${pkg.dependencies["pdfjs-dist"]} -> ${wanted}`);
  pkg.dependencies["pdfjs-dist"] = wanted;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("Run `pnpm install` to update the lockfile.");
}
