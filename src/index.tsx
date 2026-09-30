"use client";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import DocViewer from "./DocViewer";

export default DocViewer;
export { type AvailableLanguages, supportedLanguages } from "./i18n";
export * from "./models";
export * from "./renderers";
export { DocViewerRenderers } from "./renderers";
export * from "./utils/fileLoaders";
