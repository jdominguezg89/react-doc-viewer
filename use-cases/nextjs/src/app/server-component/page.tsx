// A Server Component: no "use client" here. The package declares its own
// client boundary, so DocViewer can be rendered directly. Only serialisable
// props can be passed from the server (no callbacks); see ../Workspace.tsx
// for the client-component variant with onError / onDocumentLoad.
import DocViewer from "@jdominguezg89/react-doc-viewer";
import { viewerTheme } from "../viewerTheme";

const documents = [
  { uri: "/lorem-ipsum.pdf", fileName: "lorem-ipsum.pdf" },
  { uri: "/logo.png", fileName: "logo.png" },
];

export default function ServerComponentPage() {
  return (
    <main className="article">
      <div className="article__intro">
        <h2>Rendered from a Server Component</h2>
        <p>
          This page has no <code>&quot;use client&quot;</code> directive. The
          viewer frame is rendered on the server, the documents load in the
          browser, and the PDF engine is fetched only when a PDF is opened.
        </p>
      </div>
      <div className="sheet">
        <DocViewer documents={documents} theme={viewerTheme} />
      </div>
    </main>
  );
}
