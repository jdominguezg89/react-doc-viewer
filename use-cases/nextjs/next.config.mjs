/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing special is needed: the pdf.js worker is resolved by the bundler
  // through `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`.
};

export default nextConfig;
