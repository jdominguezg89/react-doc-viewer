import { NoRendererFallback } from "../../components/NoRendererFallback";
import type { DocRenderer } from "../../models";
import { getFileName } from "../../utils/getFileName";

const DEFAULT_VIEWER_URL = "https://view.officeapps.live.com/op/embed.aspx";

const MSDocRenderer: DocRenderer = ({
  mainState: { currentDocument, config },
}) => {
  if (!currentDocument) return null;

  const fileName = getFileName(
    currentDocument,
    config?.header?.retainURLParams || false,
  );

  if (config?.msdoc?.enabled === false) {
    return (
      <NoRendererFallback document={currentDocument} fileName={fileName} />
    );
  }

  const viewerUrl = new URL(config?.msdoc?.viewerUrl ?? DEFAULT_VIEWER_URL);
  viewerUrl.searchParams.set("src", currentDocument.uri);

  return (
    <div id="msdoc-renderer" className="rdv-msdoc-renderer">
      <iframe
        id="msdoc-iframe"
        className="rdv-msdoc-renderer__frame"
        title={fileName || "msdoc-iframe"}
        src={viewerUrl.toString()}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default MSDocRenderer;

const MSDocFTMaps = {
  odt: ["odt", "application/vnd.oasis.opendocument.text"],
  doc: ["doc", "application/msword"],
  docx: [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["xls", "application/vnd.ms-excel"],
  xlsx: [
    "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ppt: ["ppt", "application/vnd.ms-powerpoint"],
  pptx: [
    "pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

MSDocRenderer.fileTypes = [
  ...MSDocFTMaps.odt,
  ...MSDocFTMaps.doc,
  ...MSDocFTMaps.docx,
  ...MSDocFTMaps.xls,
  ...MSDocFTMaps.xlsx,
  ...MSDocFTMaps.ppt,
  ...MSDocFTMaps.pptx,
];
MSDocRenderer.weight = 0;
MSDocRenderer.fileLoader = ({ fileLoaderComplete }) => fileLoaderComplete();
