import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const pdfjsDistPath = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdfWorkerPath = path.join(pdfjsDistPath, "build", "pdf.worker.mjs");

fs.copyFileSync(pdfWorkerPath, "./dist/pdf.worker.mjs");
