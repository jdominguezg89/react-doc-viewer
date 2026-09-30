import type { DocRenderer } from "../..";
import ImageProxyRenderer from "../image";

const PNGRenderer: DocRenderer = (props) => (
  <ImageProxyRenderer {...props} className="rdv-image-renderer--checkerboard" />
);

PNGRenderer.fileTypes = ["png", "image/png"];
PNGRenderer.weight = 0;

export default PNGRenderer;
