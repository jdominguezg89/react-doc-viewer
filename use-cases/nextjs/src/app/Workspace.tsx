"use client";

import DocViewer, { type IDocument } from "@jdominguezg89/react-doc-viewer";
import { useState } from "react";
import { viewerTheme } from "./viewerTheme";

interface TrayFile extends IDocument {
  kind: string;
}

const files: TrayFile[] = [
  { uri: "/multi-page.pdf", fileName: "multi-page.pdf", kind: "PDF, 10 pages" },
  { uri: "/lorem-ipsum.pdf", fileName: "lorem-ipsum.pdf", kind: "PDF, 1 page" },
  { uri: "/logo.png", fileName: "logo.png", kind: "Image" },
  { uri: "/contacts.csv", fileName: "contacts.csv", kind: "Table" },
  { uri: "/notes.txt", fileName: "notes.txt", kind: "Plain text" },
  { uri: "/page.html", fileName: "page.html", kind: "HTML, sandboxed" },
  { uri: "/missing.pdf", fileName: "missing.pdf", kind: "Not on the server" },
];

type Status =
  | { state: "loading"; file: string }
  | { state: "loaded"; file: string; type: string }
  | { state: "error"; file: string; message: string };

export function Workspace() {
  const [active, setActive] = useState<IDocument>(files[0]);
  const [status, setStatus] = useState<Status>({
    state: "loading",
    file: files[0].fileName ?? "",
  });

  const open = (file: IDocument) => {
    setActive(file);
    setStatus({ state: "loading", file: file.fileName ?? file.uri });
  };

  return (
    <main className="workspace">
      <aside className="tray" aria-label="Documents">
        <h2 className="tray__title">Documents</h2>
        <ul className="tray__list">
          {files.map((file) => (
            <li key={file.uri}>
              <button
                type="button"
                className="tray__item"
                aria-current={file.uri === active.uri ? "true" : undefined}
                onClick={() => open(file)}
              >
                <span className="tray__file">{file.fileName}</span>
                <span className="tray__kind">{file.kind}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="tray__status" data-state={status.state} aria-live="polite">
          {status.state === "loading" && <strong>Opening {status.file}</strong>}
          {status.state === "loaded" && (
            <>
              <strong>Showing {status.file}</strong>
              Served as {status.type}
            </>
          )}
          {status.state === "error" && (
            <>
              <strong>Could not open {status.file}</strong>
              {status.message}
            </>
          )}
        </p>
      </aside>

      <section className="desk">
        <div className="sheet">
          <DocViewer
            documents={files}
            activeDocument={active}
            onDocumentChange={open}
            onDocumentLoad={(document) =>
              setStatus({
                state: "loaded",
                file: document.fileName ?? document.uri,
                type: document.fileType ?? "unknown type",
              })
            }
            onError={(error, document) =>
              setStatus({
                state: "error",
                file: document?.fileName ?? document?.uri ?? "the document",
                message: error.message,
              })
            }
            theme={viewerTheme}
          />
        </div>
      </section>
    </main>
  );
}
