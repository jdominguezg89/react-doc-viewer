# Next.js App Router example

Consumes the library as a workspace dependency (`workspace:*`), i.e. the
built `dist/` output, exactly like a published install.

```bash
pnpm install          # at the repository root
pnpm build            # builds the library into dist/
pnpm --filter react-doc-viewer-nextjs-example dev
```

`src/app/page.tsx` is a Server Component that renders `DocViewer` directly;
`src/app/ClientViewer.tsx` shows the controlled mode with callbacks from a
client component. No `next.config` changes are required for the PDF worker.
