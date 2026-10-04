[![npm-version](https://img.shields.io/npm/v/@jdominguezg89/react-doc-viewer.svg)](https://www.npmjs.com/package/@jdominguezg89/react-doc-viewer)
[![CI](https://github.com/jdominguezg89/react-doc-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/jdominguezg89/react-doc-viewer/actions/workflows/ci.yml)

# react-doc-viewer

A file viewer component for **React 19**: PDF, images, CSV, plain text, HTML, video and (through Microsoft's online viewer) Office documents.

This is a maintained fork of [cyntler/react-doc-viewer](https://github.com/cyntler/react-doc-viewer), which is no longer developed. Version 2 modernises the whole stack; see the [migration guide](./MIGRATION.md) and the [changelog](./CHANGELOG.md).

**Highlights**

- PDF rendering with [react-pdf](https://github.com/wojtekmaj/react-pdf) 11 / pdf.js 6. The worker ships from the `pdfjs-dist` npm package: no CDN, no version drift, overridable for CSP or offline setups.
- ESM-only, tree-shakeable, `"use client"` aware. Works in Next.js App Router out of the box.
- Plain CSS with custom properties for theming. No CSS-in-JS runtime, no style registry needed for SSR.
- Error states, `onError` / `onDocumentLoad` callbacks, keyboard-accessible controls with translated labels in 14 languages.
- Hardened defaults: sandboxed HTML preview, configurable request-header policy, opt-out for the Office viewer.

## Table of contents

- [Supported file types](#supported-file-types)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Next.js App Router](#nextjs-app-router)
- [PDF worker and pdf.js options](#pdf-worker-and-pdfjs-options)
- [Props](#props)
- [Config](#config)
- [Documents](#documents)
- [Renderers](#renderers)
- [Theming and styling](#theming-and-styling)
- [Internationalisation](#internationalisation)
- [Security notes](#security-notes)
- [Storybook](#storybook)
- [Contributing](#contributing)
- [License](#license)

## Supported file types

| Extension | MIME type                                                                 | Notes                       |
| --------- | ------------------------------------------------------------------------- | --------------------------- |
| bmp       | image/bmp                                                                 |                             |
| csv       | text/csv                                                                  |                             |
| doc, docx | application/msword, …wordprocessingml.document                            | Office viewer, public URLs  |
| gif       | image/gif                                                                 |                             |
| htm, html | text/htm, text/html                                                       | Sandboxed iframe            |
| jpg, jpeg | image/jpg, image/jpeg                                                     |                             |
| mp4, mov, avi | video/mp4, video/quicktime, video/x-msvideo                           | Streamed by the browser     |
| odt       | application/vnd.oasis.opendocument.text                                   | Office viewer, public URLs  |
| pdf       | application/pdf                                                           |                             |
| png       | image/png                                                                 |                             |
| ppt, pptx | application/vnd.ms-powerpoint, …presentationml.presentation               | Office viewer, public URLs  |
| tif, tiff | image/tif, image/tiff                                                     |                             |
| txt       | text/plain                                                                |                             |
| webp      | image/webp                                                                |                             |
| xls, xlsx | application/vnd.ms-excel, …spreadsheetml.sheet                            | Office viewer, public URLs  |

Matching is case-insensitive and ignores MIME parameters. When a server answers with no content type or `application/octet-stream`, the file extension in the URL decides, provided a renderer handles that extension; otherwise the type is `application/octet-stream`, which a custom renderer can claim.

## Requirements

- React and react-dom **19**.
- ESM-only package. Bundlers (Vite, Next.js, webpack 5, Parcel, Rollup) and Node 22+ handle it natively; there is no CommonJS build.
- TypeScript users: the stylesheet import ships its own declaration, so it type-checks without ambient `*.css` modules.
- Server-side rendering needs **Node 22.13 or newer** (pdf.js requirement).
- Browsers: evergreen. pdf.js 6 supports Chrome 125+ / Safari 18+ and current Firefox.

## Installation

```bash
pnpm add @jdominguezg89/react-doc-viewer
```

```bash
npm install @jdominguezg89/react-doc-viewer
```

`react-pdf` and `pdfjs-dist` are regular dependencies of this package and are always installed in matching versions. You do not need to install or pin them yourself, and any `overrides` / `resolutions` for them from the 1.x days can be removed.

## Quick start

```tsx
import DocViewer from "@jdominguezg89/react-doc-viewer";
import "@jdominguezg89/react-doc-viewer/dist/index.css";

const docs = [
  { uri: "https://example.com/report.pdf" },
  { uri: "https://example.com/photo.png", fileName: "Holiday photo" },
];

export function App() {
  return (
    <div style={{ height: "80vh" }}>
      <DocViewer documents={docs} />
    </div>
  );
}
```

Import the stylesheet once, anywhere in your app. The viewer fills its parent's width and height, so give the parent a height.

All built-in renderers are enabled by default. Pass `pluginRenderers` to use a subset or your own renderers (see [Renderers](#renderers)).

## Next.js App Router

The package declares its own client boundary (`"use client"`), so you can import it from a Server Component page directly:

```tsx
// app/documents/page.tsx
import DocViewer from "@jdominguezg89/react-doc-viewer";
import "@jdominguezg89/react-doc-viewer/dist/index.css";

export default function Page() {
  return (
    <main style={{ height: "100vh" }}>
      <DocViewer documents={[{ uri: "/sample.pdf" }]} />
    </main>
  );
}
```

Notes:

- The pdf.js worker ships inside the package and is referenced with `new URL("./pdf.worker.min.mjs", import.meta.url)`, which both webpack and Turbopack turn into a static asset. No `next.config` changes, no `serverExternalPackages`, no copying of worker files.
- Server rendering produces the viewer chrome and loading state; documents are fetched in the browser. The PDF engine (react-pdf + pdf.js) is loaded lazily on the client, only when a PDF is shown.
- If you pass `onError`, `onDocumentChange` or other callbacks from a Server Component, wrap the viewer in your own client component, since functions cannot cross the server/client boundary.
- The example in [`use-cases/nextjs`](./use-cases/nextjs) is a minimal App Router project that consumes the built package through the pnpm workspace.

## PDF worker and pdf.js options

By default the worker is a copy of the one from the exact `pdfjs-dist` version this package depends on. It ships in the package (`dist/pdf.worker.min.mjs`) and your bundler emits it as a local asset; this works in Vite (dev and build), Next.js, webpack 5 and Parcel without configuration. Two ways to override it:

```ts
// Globally, once, before the first PDF renders (for CSP / offline / CDN setups):
import { configurePdfWorker } from "@jdominguezg89/react-doc-viewer";
configurePdfWorker("/static/pdf.worker.min.mjs");
```

```tsx
// Per instance:
<DocViewer
  documents={docs}
  config={{ pdf: { workerSrc: "https://cdn.example.com/pdf.worker.min.mjs" } }}
/>
```

`getDefaultPdfWorkerSource()` returns the bundled worker URL if you need it (for example to copy it into a CSP allow-list).

Other pdf.js settings live under `config.pdf`:

```tsx
<DocViewer
  documents={docs}
  config={{
    pdf: {
      // Passed to pdf.js getDocument(); keep the object reference stable.
      documentOptions: {
        cMapUrl: "/pdfjs/cmaps/",
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        wasmUrl: "/pdfjs/wasm/",
      },
      externalLinkTarget: "_blank", // default
      onLoadError: (error) => console.error(error),
    },
    pdfZoom: { defaultZoom: 1, zoomJump: 0.1 },
    pdfVerticalScrollByDefault: false,
  }}
/>
```

The cMap, font and wasm directories are in the `pdfjs-dist` package (`cmaps/`, `standard_fonts/`, `wasm/`); copy them to your static assets if your documents need them.

The PDF file itself is downloaded by the viewer, not by pdf.js. Use the `requestInit` prop (for example `requestInit={{ credentials: "include" }}`) and `requestHeaders` for cookies and auth headers; `httpHeaders` and `withCredentials` in `documentOptions` have no effect.

## Props

| Prop                    | Type                                              | Description                                                                                                             |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `documents`             | `IDocument[]`                                     | Required. See [Documents](#documents).                                                                                  |
| `config`                | `IConfig`                                         | See [Config](#config).                                                                                                  |
| `theme`                 | `ITheme`                                          | Colours, mapped to CSS custom properties. See [Theming](#theming-and-styling).                                          |
| `className`, `style`    |                                                   | Applied to the root element.                                                                                            |
| `pluginRenderers`       | `DocRenderer[]`                                   | Renderers to use. Defaults to all built-in renderers.                                                                   |
| `initialActiveDocument` | `IDocument`                                       | Document shown first (uncontrolled).                                                                                    |
| `activeDocument`        | `IDocument`                                       | Currently shown document (controlled). Matched by reference, then by `uri`.                                             |
| `onDocumentChange`      | `(document) => void`                              | Called when the user (or the ref API) navigates.                                                                        |
| `onDocumentLoad`        | `(document) => void`                              | Called when a document's data has been loaded.                                                                          |
| `onError`               | `(error, document?) => void`                      | Called when a document fails to load. The viewer also renders an error state.                                           |
| `prefetchMethod`        | `string`                                          | HTTP method for the content-type probe. Defaults to `HEAD` (`GET` for `blob:` URLs).                                    |
| `requestHeaders`        | `Record<string, string>`                          | Headers for every document request. See `config.fetch.sendRequestHeadersTo`.                                            |
| `requestInit`           | `RequestInit` subset                              | Extra `fetch` options: `credentials`, `mode`, `cache`, `referrerPolicy`, …                                              |
| `language`              | `AvailableLanguages`                              | UI language. See [Internationalisation](#internationalisation).                                                         |
| `ref`                   | `DocViewerRef`                                    | `{ prev(), next() }` for imperative navigation.                                                                         |

```tsx
import DocViewer, { type DocViewerRef } from "@jdominguezg89/react-doc-viewer";

function Viewer() {
  const ref = useRef<DocViewerRef>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.prev()}>Previous</button>
      <button type="button" onClick={() => ref.current?.next()}>Next</button>
      <DocViewer ref={ref} documents={docs} config={{ header: { disableHeader: true } }} />
    </>
  );
}
```

## Config

```tsx
<DocViewer
  documents={docs}
  config={{
    header: {
      disableHeader: false,
      disableFileName: false,
      retainURLParams: false,
      overrideComponent: MyHeader, // (state, previous, next) => ReactElement, see below
    },
    loadingRenderer: {
      overrideComponent: ({ document, fileName }) => <p>Loading {fileName}…</p>,
      showLoadingTimeout: 500, // ms before the loading UI appears; false = immediately
    },
    errorRenderer: {
      overrideComponent: ({ document, fileName, error }) => <p>{error.message}</p>,
    },
    noRenderer: {
      overrideComponent: ({ document, fileName }) => <p>Unsupported: {fileName}</p>,
    },
    csvDelimiter: ",",
    pdfZoom: { defaultZoom: 1, zoomJump: 0.1 },
    pdfVerticalScrollByDefault: false,
    pdf: { /* see above */ },
    html: { sandbox: "" }, // iframe sandbox attribute for HTML documents
    msdoc: { enabled: true, viewerUrl: "https://view.officeapps.live.com/op/embed.aspx" },
    fetch: { sendRequestHeadersTo: "all" }, // "all" | "same-origin" | string[] (origins) | (uri) => boolean
  }}
/>
```

The header override receives the full viewer state plus `previous`/`next` callbacks:

```tsx
import type { IHeaderOverride } from "@jdominguezg89/react-doc-viewer";

const MyHeader: IHeaderOverride = (state, previous, next) => (
  <div>
    <span>{state.currentDocument?.fileName ?? state.currentDocument?.uri}</span>
    <button type="button" onClick={previous} disabled={state.currentFileNo === 0}>Previous</button>
    <button type="button" onClick={next} disabled={state.currentFileNo >= state.documents.length - 1}>Next</button>
  </div>
);
```

## Documents

```ts
interface IDocument {
  uri: string;          // URL, blob: URL or data: URL of the file
  fileType?: string;    // MIME type or extension; skips the content-type probe when set
  fileName?: string;    // Display name (and download name)
  fileData?: string | ArrayBuffer; // Filled by the loader
}
```

**Uploaded files / blobs**

```tsx
const [files, setFiles] = useState<File[]>([]);

<input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
<DocViewer
  documents={files.map((file) => ({ uri: URL.createObjectURL(file), fileName: file.name }))}
/>
```

**Controlled navigation**

```tsx
const [active, setActive] = useState(docs[0]);
<DocViewer documents={docs} activeDocument={active} onDocumentChange={setActive} />
```

Passing a new `documents` array with the same contents does not reset the viewer. When the contents change, the document on screen stays (and is not reloaded) as long as it is still in the list; otherwise the viewer starts again from `initialActiveDocument` or the first entry.

**Pre-signed URLs and HTTP verbs**

Some services (S3, GCS) sign a URL for a single verb. Use `prefetchMethod="GET"` so the content-type probe uses the same verb as the download, or set `fileType` on the document to skip the probe entirely.

## Renderers

`DocViewerRenderers` is the array of all built-in renderers; each is also exported individually (`PDFRenderer`, `PNGRenderer`, `CSVRenderer`, …).

```tsx
import DocViewer, { PDFRenderer, PNGRenderer } from "@jdominguezg89/react-doc-viewer";

<DocViewer documents={docs} pluginRenderers={[PDFRenderer, PNGRenderer]} />;
```

**Custom renderer**

```tsx
import type { DocRenderer } from "@jdominguezg89/react-doc-viewer";
import { textFileLoader } from "@jdominguezg89/react-doc-viewer";

const MarkdownRenderer: DocRenderer = ({ mainState: { currentDocument } }) => {
  if (typeof currentDocument?.fileData !== "string") return null;
  return <pre>{currentDocument.fileData}</pre>;
};

MarkdownRenderer.fileTypes = ["md", "text/markdown"];
MarkdownRenderer.weight = 1;          // higher weight wins when several renderers match
MarkdownRenderer.fileLoader = textFileLoader; // default: dataURLFileLoader

<DocViewer documents={docs} pluginRenderers={[...DocViewerRenderers, MarkdownRenderer]} />;
```

Available loaders: `dataURLFileLoader` (default), `textFileLoader`, `arrayBufferFileLoader`, `binaryStringFileLoader`. A custom loader receives `{ documentURI, signal, headers, requestInit, fileLoaderComplete, onError }`; call `fileLoaderComplete({ result })` when done (or with nothing to skip loading, for example when the renderer streams the file itself) and `onError(error)` on failure.

## Theming and styling

Colours are CSS custom properties on the root element. Set them through the `theme` prop or in your own CSS:

```tsx
<DocViewer
  documents={docs}
  theme={{
    primary: "#5296d8",
    secondary: "#ffffff",
    tertiary: "#5296d899",
    textPrimary: "#ffffff",
    textSecondary: "#5296d8",
    textTertiary: "#00000099",
    disableThemeScrollbar: false,
  }}
/>
```

```css
/* `.rdv.my-viewer` wins over the defaults regardless of stylesheet order. */
.rdv.my-viewer {
  --rdv-primary: #5296d8;
  --rdv-text-primary: #fff;
}
#react-doc-viewer #header-bar {
  background: #faf;
}
```

| Token (`theme` key)                | CSS variable            | Used for                                                        |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------- |
| `primary` / `textPrimary`          | `--rdv-primary` / `--rdv-text-primary`     | Header bar, toolbar buttons and their icons, page counter |
| `secondary` / `textSecondary`      | `--rdv-secondary` / `--rdv-text-secondary` | Previous/next document buttons, focus ring, HTML frame border |
| `tertiary`                         | `--rdv-tertiary`        | PDF toolbar background, scrollbar thumb                         |
| `textTertiary`                     | `--rdv-text-tertiary`   | Page labels in continuous-scroll mode                           |

Pick `textPrimary` so it is readable on both `primary` and `tertiary`: the page counter sits on the toolbar.

- `className` and `style` go to the root element, so `styled(DocViewer)` and CSS modules work. The root sets `display`, `background`, `width` and `height` with a single class; utility frameworks that put their classes in a cascade layer (Tailwind v4) lose to it, so use the `style` prop or size the parent instead.
- The viewer fills a parent with a fixed height and scrolls inside it. Without one it grows with the document; if you then scroll the page and want the PDF toolbar to stick to the page, add `#react-doc-viewer #proxy-renderer { overflow: visible; }`.
- Every part has a stable element id (`#header-bar`, `#pdf-controls`, `#pdf-pagination`, `#image-renderer`, …) and a `rdv-*` class name for targeted overrides.
- The default scrollbar styling can be disabled with `theme.disableThemeScrollbar`.

## Internationalisation

```tsx
<DocViewer documents={docs} language="pl" />
```

Available: `ar`, `de`, `en`, `es`, `fr`, `it`, `ja`, `pl`, `pt`, `ru`, `se`, `sr`, `sr_cyr`, `tr` (see `supportedLanguages`). Arabic switches the viewer to `dir="rtl"`. Missing strings fall back to English. Translations live in `src/locales/*.json`; contributions are welcome.

## Security notes

- **HTML documents** render in an iframe with `sandbox=""` (no scripts, opaque origin). Set `config.html.sandbox` to relax this for trusted content.
- **Office documents** are shown through Microsoft's viewer, which receives the document URL; use `config.msdoc.enabled = false` to show a download link instead, for private or pre-signed URLs.
- **Request headers** are sent to every document URL by default (as in 1.x). Restrict them with `config.fetch.sendRequestHeadersTo` when documents can come from third-party hosts. The policy checks the document URL only: if a URL may redirect to another origin, also pass `requestInit={{ redirect: "error" }}`, since browsers forward custom headers on redirects (only `Authorization` is stripped).
- **PDF links** open in a new tab with `rel="noopener noreferrer"` (`config.pdf.externalLinkTarget`).
- **Content Security Policy**: the bundled worker is a same-origin static asset, so `worker-src 'self'` is enough. If you point `configurePdfWorker()` or `config.pdf.workerSrc` at another origin, pdf.js starts it through a `blob:` wrapper that imports the file: allow `blob:` in `worker-src` and that origin in `script-src`, and make sure the host sends CORS headers.

## Storybook

```bash
pnpm install
pnpm start
```

The stories under `src/DocViewer.stories.tsx` cover the PDF, image, CSV, text and HTML renderers, theming, localisation, error states and the configuration options.

## Contributing

- `pnpm check` — Biome lint + format check (`pnpm check:fix` to apply).
- `pnpm typecheck` — TypeScript.
- `pnpm test` — Vitest.
- `pnpm build` — library build with declaration output and a dist smoke check.

Pull requests should keep `pnpm check`, `pnpm test` and `pnpm build` green; CI runs them on Node 22 and 24.

### Releasing

Releases are automatic. Bump the version in the pull request (`pnpm version patch|minor|major --no-git-tag-version`) and add a CHANGELOG entry. When the pull request is merged into `main`, the `Release` workflow sees a version that is not on npm yet, runs the checks, publishes with npm provenance, creates the `vX.Y.Z` tag and GitHub Release, and deploys Storybook to GitHub Pages. Merges that do not change the version publish nothing.

`pdfjs-dist` must stay on the exact version `react-pdf` depends on. After upgrading `react-pdf`, run `pnpm sync:pdfjs`; the build fails if the two diverge.

## License

Apache-2.0. Originally created by Matthew Mogford and maintained by Damian Cyntler; see [LICENSE](./LICENSE).
