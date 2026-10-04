# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0]

See [MIGRATION.md](./MIGRATION.md) for upgrade steps.

### Added

- `configurePdfWorker()`, `getDefaultPdfWorkerSource()` and `config.pdf.workerSrc` to control where the pdf.js worker is loaded from.
- `config.pdf.documentOptions` (cMaps, standard fonts, wasm, …), `config.pdf.externalLinkTarget`, `config.pdf.onLoadError`.
- Error state with `config.errorRenderer.overrideComponent`, `onError` and `onDocumentLoad` props.
- `requestInit` prop and `config.fetch.sendRequestHeadersTo` (request-header policy).
- `config.html.sandbox`, `config.msdoc.enabled`, `config.msdoc.viewerUrl`.
- Accessible names for every control in all 14 locales (based on upstream PR #278), toolbar/live-region roles, keyboard-operable zoom controls, RTL layout for Arabic, reduced-motion support.
- Storybook 10 stories for the PDF, image, CSV, text and HTML renderers and every option; a Next.js App Router example that consumes the built package.
- Test suite covering loaders, the loading state machine, renderer selection, PDF controls, i18n, theming, security options and server rendering.

### Changed

- **Breaking:** the package is published as `@jdominguezg89/react-doc-viewer` (maintained fork of `@cyntler/react-doc-viewer`).
- **Breaking:** React 19 is required; the package is ESM-only; SSR needs Node 22.13+.
- **Breaking:** styled-components removed in favour of plain CSS + custom properties. The `theme` prop and element ids are unchanged.
- **Breaking:** HTML documents render in a fully sandboxed iframe via `srcdoc`.
- **Breaking:** `application/octet-stream` is no longer routed to the Office viewer; the URL extension decides.
- react-pdf 9 → 11, pdfjs-dist 4.3 → 6.3 (exact pin, verified against react-pdf at build time). The matching worker ships in the package and is referenced with a relative URL, which also works in Vite's dev server.
- All dependencies are externalised: the entry and its shared chunk are about 50 kB, plus 13 kB for the lazy PDF chunk (was 694 kB with pdf.js and styled-components bundled). The published tarball shrinks from 3.7 MB to about 0.5 MB, most of it the pdf.js worker that the package now actually uses.
- The PDF renderer is loaded lazily, so apps that never show a PDF never download pdf.js.
- The `"use client"` directive is preserved in the build output.
- The renderer area is the scroll container again (`#proxy-renderer` fills the remaining height and scrolls), so the viewer stays inside a fixed-height parent.
- Icons inherit the button text colour (`currentColor`), so custom themes no longer produce black-on-dark icons.
- A missing or opaque content type (`application/octet-stream`) resolves to the URL extension when a renderer handles it; otherwise to `application/octet-stream`, which a custom renderer can claim.
- When the `documents` list changes, the document on screen is kept (and not reloaded) if it is still in the list.
- Text is decoded from the BOM or the declared charset before falling back to UTF-8; video is streamed instead of downloaded.
- Default `textTertiary` is `#00000099` (was `#00000044`, 1.9:1 contrast); themed scrollbar thumb is visible on the default theme.
- Declaration files use explicit `.js` extensions and `DocViewerRenderers` is typed.
- Renderer matching is case-insensitive and ignores MIME parameters.
- Built-in loaders read responses with `arrayBuffer()`/`text()` instead of `FileReader`.
- Tooling: pnpm 12, Biome 2 (replaces ESLint + Prettier), TypeScript 7, Vite 8, Vitest 5, Storybook 10; CI on Node 22 and 24. Releases are published from GitHub Actions with npm provenance when a new version reaches `main`. `pnpm audit` reports zero advisories (was 90).

### Fixed

- Infinite spinner and unhandled rejections on failed fetches; HTTP status is now checked.
- Infinite `HEAD` probe loop when the server sends no `Content-Type`.
- `prefetchMethod` precedence bug (any value forced `GET`).
- Replacing a document at the same index did not reload it.
- Inline `documents` arrays reset the viewer on every parent render.
- `requestHeaders`, `language`, `pluginRenderers`, `prefetchMethod` and callbacks were only read at mount.
- `onDocumentChange` was called inside the reducer (double fire under StrictMode).
- Controlled `activeDocument` changes skipped the loading state and kept stale PDF page state.
- Unbounded PDF zoom (negative scale), float drift on the reset button, negative page width for hidden containers.
- Multiple viewers on one page interfered through global element ids in the HTML/TIFF renderers.
- HTML renderer crashed the tree on non-base64 or unknown-charset data URLs.
- CSV duplicate React keys, trailing empty row, parse errors hiding the table.
- Buttons defaulted to `type="submit"` and submitted enclosing forms.
- `LoadingTimeout` leaked its timer; `getFileName` threw on malformed URIs.
- Published types were unresolvable under `moduleResolution: node16`; `DocViewerRenderers` was `any[]`.
- `prepublish` ran an unpinned `npx doctoc` on every install.

- A document list change, or navigation between entries sharing a URL, could leave a permanent spinner; the previous document's renderer could run for the next document (early `onDocumentLoad`, extra request); `fileType: ""` never loaded.
- `.html` files served as `application/octet-stream` rendered as raw base64; quoted charsets broke HTML decoding.
- `ja`, `sr` and `sr_cyr` messages showed HTML entities; Arabic strings and arrows now follow the right-to-left layout.
- A relative `config.msdoc.viewerUrl` threw during render; the PDF download link used the full URL (with query string) as file name.

### Removed

- CommonJS build, React 17/18 support, `core-js` polyfill, unpkg worker URL, the unreferenced worker copy in the tarball, `ajv` and other unused dependencies.

## 1.17.1 and earlier

See the [upstream releases](https://github.com/cyntler/react-doc-viewer/releases).
