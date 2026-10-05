import type { DocRenderer } from "../..";
import ImageProxyRenderer from "../image";

const GIFRenderer: DocRenderer = (props) => <ImageProxyRenderer {...props} />;

GIFRenderer.fileTypes = ["gif", "image/gif"];
GIFRenderer.weight = 0;

export default GIFRenderer;
