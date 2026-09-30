import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import DocViewer, {
  type DocViewerRef,
  DocViewerRenderers,
  type IDocument,
} from ".";

import csvFile from "./exampleFiles/csv-file.csv?url";
import epsFile from "./exampleFiles/eps-file.eps?url";
import gifFile from "./exampleFiles/gif-image.gif?url";
import htmlFile from "./exampleFiles/html-file.html?url";
import pdfFile from "./exampleFiles/pdf-file.pdf?url";
import pdfMultiplePagesFile from "./exampleFiles/pdf-multiple-pages-file.pdf?url";
import pngFile from "./exampleFiles/png-image.png?url";
import txtFile from "./exampleFiles/txt-file.txt?url";
import webpFile from "./exampleFiles/webp-file.webp?url";

const meta = {
  title: "DocViewer",
  component: DocViewer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const allDocs: IDocument[] = [
  { uri: pdfFile },
  { uri: pngFile },
  { uri: csvFile },
  { uri: pdfMultiplePagesFile },
  { uri: webpFile },
  { uri: gifFile },
  { uri: htmlFile },
  { uri: txtFile },
];

export const AllRenderers: Story = {
  args: { documents: allDocs },
};

export const Pdf: Story = {
  args: {
    documents: [{ uri: pdfMultiplePagesFile }],
    config: { pdfZoom: { defaultZoom: 1.1, zoomJump: 0.2 } },
  },
};

export const PdfContinuousScroll: Story = {
  args: {
    documents: [{ uri: pdfMultiplePagesFile }],
    config: { pdfVerticalScrollByDefault: true },
  },
};

export const Image: Story = {
  args: { documents: [{ uri: pngFile }, { uri: webpFile }, { uri: gifFile }] },
};

export const Csv: Story = {
  args: { documents: [{ uri: csvFile }], config: { csvDelimiter: "," } },
};

export const Html: Story = {
  args: { documents: [{ uri: htmlFile }] },
};

export const Txt: Story = {
  args: { documents: [{ uri: txtFile }] },
};

export const Themed: Story = {
  args: {
    documents: allDocs,
    theme: {
      primary: "#5296d8",
      secondary: "#ffffff",
      tertiary: "#5296d899",
      textPrimary: "#ffffff",
      textSecondary: "#5296d8",
      textTertiary: "#00000099",
    },
  },
};

export const Localized: Story = {
  args: { documents: allDocs, language: "pl" },
};

export const RightToLeft: Story = {
  args: { documents: allDocs, language: "ar" },
};

export const InitialActiveDocument: Story = {
  args: { documents: allDocs, initialActiveDocument: allDocs[2] },
};

export const UnsupportedFileType: Story = {
  args: {
    documents: [{ uri: epsFile, fileType: "application/postscript" }],
  },
};

export const LoadError: Story = {
  args: {
    documents: [{ uri: "/this/file/does/not/exist.pdf" }],
    onError: (error) => console.warn("onError", error.message),
  },
};

export const CustomLoadingAndErrorRenderers: Story = {
  args: {
    documents: [{ uri: "/this/file/does/not/exist.png" }, { uri: pngFile }],
    config: {
      loadingRenderer: {
        overrideComponent: ({ fileName }) => <p>Loading {fileName}…</p>,
        showLoadingTimeout: false,
      },
      errorRenderer: {
        overrideComponent: ({ fileName, error }) => (
          <p role="alert">
            Could not load <strong>{fileName}</strong>: {error.message}
          </p>
        ),
      },
      noRenderer: {
        overrideComponent: ({ document }) => (
          <p>No renderer for {document?.fileType}</p>
        ),
      },
    },
  },
};

export const HeaderOverride: Story = {
  args: {
    documents: allDocs,
    config: {
      header: {
        overrideComponent: (state, previous, next) => (
          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            <button
              type="button"
              onClick={previous}
              disabled={state.currentFileNo === 0}
            >
              ←
            </button>
            <strong>
              {state.currentFileNo + 1} / {state.documents.length}
            </strong>
            <button
              type="button"
              onClick={next}
              disabled={state.currentFileNo >= state.documents.length - 1}
            >
              →
            </button>
          </div>
        ),
      },
    },
  },
};

export const SecurityOptions: Story = {
  name: "Security options (sandbox, headers, Office viewer)",
  args: {
    documents: [{ uri: htmlFile }],
    requestHeaders: { Authorization: "Bearer demo" },
    config: {
      html: { sandbox: "" },
      fetch: { sendRequestHeadersTo: "same-origin" },
      msdoc: { enabled: false },
    },
  },
};

export const CustomPdfWorker: Story = {
  name: "PDF worker override (config.pdf.workerSrc)",
  args: {
    documents: [{ uri: pdfFile }],
    config: {
      pdf: {
        workerSrc: new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ),
        externalLinkTarget: "_blank",
      },
    },
  },
};

export const WithFileInput: StoryObj = {
  render: () => {
    const [selectedDocs, setSelectedDocs] = useState<File[]>([]);

    return (
      <>
        <input
          type="file"
          accept=".pdf,image/*,.csv,.txt,.html"
          multiple
          onChange={(event) =>
            event.target.files?.length &&
            setSelectedDocs(Array.from(event.target.files))
          }
        />
        <DocViewer
          documents={selectedDocs.map((file) => ({
            uri: window.URL.createObjectURL(file),
            fileName: file.name,
          }))}
          pluginRenderers={DocViewerRenderers}
        />
      </>
    );
  },
};

export const ControlledActiveDocument: StoryObj = {
  render: () => {
    const [activeDocument, setActiveDocument] = useState(allDocs[0]);

    return (
      <>
        <select
          value={activeDocument.uri}
          onChange={(event) => {
            const next = allDocs.find((doc) => doc.uri === event.target.value);
            if (next) setActiveDocument(next);
          }}
        >
          {allDocs.map((doc) => (
            <option key={doc.uri} value={doc.uri}>
              {doc.uri.split("/").pop()}
            </option>
          ))}
        </select>
        <DocViewer
          documents={allDocs}
          activeDocument={activeDocument}
          onDocumentChange={setActiveDocument}
        />
      </>
    );
  },
};

export const WithRef: StoryObj = {
  render: () => {
    const docViewerRef = useRef<DocViewerRef>(null);

    return (
      <>
        <div>
          <button type="button" onClick={() => docViewerRef.current?.prev()}>
            Prev Document By Ref
          </button>
          <button type="button" onClick={() => docViewerRef.current?.next()}>
            Next Document By Ref
          </button>
        </div>
        <DocViewer
          ref={docViewerRef}
          documents={allDocs}
          config={{ header: { disableHeader: true } }}
        />
      </>
    );
  },
};
