"use client";

import DocViewer, { type IDocument } from "@cyntler/react-doc-viewer";
import { useState } from "react";

const documents: IDocument[] = [{ uri: "/sample.png" }, { uri: "/sample.pdf" }];

export function ClientViewer() {
  const [active, setActive] = useState(documents[0]);
  const [error, setError] = useState<string>();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <p style={{ margin: "4px 8px" }}>
        Client component with callbacks. Active: <code>{active.uri}</code>
        {error ? ` — error: ${error}` : ""}
      </p>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DocViewer
          documents={documents}
          activeDocument={active}
          onDocumentChange={setActive}
          onError={(err) => setError(err.message)}
          theme={{ primary: "#1f2937", textPrimary: "#f9fafb" }}
          config={{ pdf: { externalLinkTarget: "_blank" } }}
        />
      </div>
    </div>
  );
}
