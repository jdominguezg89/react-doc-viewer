# Migrating from `@cyntler/react-doc-viewer` 1.x

Version 2 is a modernisation release. Most 1.x code keeps working unchanged; the breaking changes are about the environment (React 19, ESM) and safer defaults.

## Checklist

0. **New package name.** The maintained fork is published as `@jdominguezg89/react-doc-viewer`:

   ```bash
   pnpm remove @cyntler/react-doc-viewer
   pnpm add @jdominguezg89/react-doc-viewer
   ```

   Then replace `@cyntler/react-doc-viewer` with `@jdominguezg89/react-doc-viewer` in your imports, including the stylesheet import. Nothing else about the import paths changed.

1. **React 19.** Upgrade `react` and `react-dom` to 19 (required by react-pdf 11).
2. **ESM only.** There is no CommonJS build anymore. Bundlers and Node 22+ handle ESM natively. Jest users need ESM support (or switch to Vitest).
3. **Node 22.12+** for server-side rendering (pdf.js requirement).
4. **Remove PDF overrides.** Delete any `overrides` / `resolutions` for `react-pdf` or `pdfjs-dist` from your `package.json`. The package now pins the exact `pdfjs-dist` version react-pdf expects and loads the worker from `node_modules`, not from unpkg.
5. **Keep the stylesheet import** (`@jdominguezg89/react-doc-viewer/dist/index.css`); the path inside the package is unchanged.
6. Run your type checker: a few types were tightened (see below).

## What changed

### PDF worker

| 1.x                                                                 | 2.x                                                                                            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Worker fetched from `https://unpkg.com/pdfjs-dist@<version>/…` at import time | Worker resolved from the `pdfjs-dist` package by your bundler, lazily, when a PDF is shown |
| Not configurable                                                    | `configurePdfWorker(src)` globally or `config.pdf.workerSrc` per instance                      |
| Version mismatches between the bundled pdf.js and the CDN worker    | `pdfjs-dist` pinned to react-pdf's exact version; the build fails if they diverge              |

If your CSP blocked unpkg you needed workarounds before; now nothing leaves your origin unless you configure it.

### Styling

styled-components was removed. Styling is plain CSS with custom properties:

- The `theme` prop works exactly as before (it now writes `--rdv-*` variables on the root element).
- Element ids (`#react-doc-viewer`, `#header-bar`, `#pdf-controls`, …) are unchanged, so CSS overrides keep working.
- `styled(DocViewer)` still works because `className` is applied to the root.
- Hashed `sc-*` class names are gone. If you targeted them, switch to the ids or the new `rdv-*` classes.
- `IStyledProps` is still exported but deprecated and unused.

### Behaviour changes

- **HTML documents** are rendered in a fully sandboxed iframe (`sandbox=""`) using `srcdoc`. Scripts no longer run and the document no longer shares your origin. Restore the old behaviour with `config={{ html: { sandbox: "allow-same-origin" } }}` if you trust the content.
- **`application/octet-stream`** responses are no longer sent to the Office viewer. The file extension in the URL now decides the renderer for opaque content types, which is what you want for `.docx` on S3; other binary files fall through to "no renderer".
- **Errors are surfaced.** A failed fetch (network error or non-2xx status) shows an error message (`config.errorRenderer` to customise) and calls `onError`. In 1.x the spinner stayed forever.
- **Inline `documents` arrays** no longer reset the viewer on every parent render; the array contents are compared instead of the reference.
- **Zoom** is clamped to 0.25 – 5.
- **`onDocumentChange`** is called from the navigation controls and the ref API (not from inside the reducer), so it fires exactly once per navigation, also under StrictMode.
- Props such as `requestHeaders`, `language`, `pluginRenderers` and callbacks now update after mount.

### Types

- `DocViewerProps` is exported.
- `DocViewerRenderers` is typed as `DocRenderer[]` (was `any[]` in the published types).
- `fileLoaderComplete` accepts anything with a `result` property (`{ result }`), a `FileReader` still works.
- `IPdfZoomConfig.defaultZoom` / `zoomJump` are optional.
- `IConfig` gained `pdf`, `html`, `msdoc`, `fetch` and `errorRenderer`; `IMainState` gained `documentError`, `requestInit`, `onError`, `onDocumentLoad`.
- Declaration files resolve under `moduleResolution: node16 | nodenext | bundler`.

### New props and options

- `onError(error, document)`, `onDocumentLoad(document)`, `requestInit`.
- `config.pdf.{ workerSrc, documentOptions, externalLinkTarget, onLoadError }`.
- `config.html.sandbox`, `config.msdoc.{ enabled, viewerUrl }`, `config.fetch.sendRequestHeadersTo`.
- `configurePdfWorker()`, `getDefaultPdfWorkerSource()`.

### Removed

- CommonJS build (`dist/react-doc-viewer.cjs`).
- React 17/18 support.
- The `core-js` `Promise.withResolvers` polyfill (Node 22+ and evergreen browsers have it).
- `dist/pdf.worker.mjs` (the unreferenced 2 MB copy of the worker).
