import type { DocRenderer } from "../..";

const MSDocRenderer: DocRenderer = ({ mainState: { currentDocument } }) => {
  if (!currentDocument) return null;

  return (
    <div id="msdoc-renderer" className="rdv-msdoc-renderer">
      <iframe
        id="msdoc-iframe"
        className="rdv-msdoc-renderer__frame"
        title="msdoc-iframe"
        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
          currentDocument.uri,
        )}`}
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
    "application/octet-stream",
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
