# Next.js App Router example

A small App Router project that consumes the library as a workspace
dependency (`workspace:*`), i.e. the built `dist/` output, exactly like an
install from npm.

```bash
pnpm install                 # at the repository root
pnpm example:nextjs:build    # builds the library, then this app
pnpm --filter react-doc-viewer-nextjs-example start
```

- `/` — a client component (`src/app/Workspace.tsx`): controlled
  `activeDocument`, `onDocumentLoad` / `onError` callbacks, a themed viewer and
  a file that does not exist to show the error state.
- `/server-component` — `DocViewer` rendered directly from a Server Component.

There is no `next.config` file: the PDF worker needs no configuration.
