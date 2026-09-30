// This is a Server Component. The package declares its own client boundary,
// so DocViewer can be used here directly. Callbacks (onError, ...) must be
// passed from a client component instead; see ./ClientViewer.tsx.
import DocViewer from "@cyntler/react-doc-viewer";
import { ClientViewer } from "./ClientViewer";

const documents = [{ uri: "/sample.pdf" }, { uri: "/sample.png" }];

export default function Home() {
  return (
    <main style={{ display: "grid", gridTemplateRows: "1fr 1fr", height: "100vh" }}>
      <section style={{ minHeight: 0 }}>
        <DocViewer documents={documents} />
      </section>
      <section style={{ minHeight: 0 }}>
        <ClientViewer />
      </section>
    </main>
  );
}
