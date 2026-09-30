import type { DocRenderer } from "../..";
import { cx } from "../../utils/cx";

const ImageProxyRenderer: DocRenderer = ({
  mainState: { currentDocument },
  children,
  className,
}) => {
  if (!currentDocument) return null;

  return (
    <div id="image-renderer" className={cx("rdv-image-renderer", className)}>
      {children || (
        <img
          id="image-img"
          className="rdv-image-renderer__img"
          src={currentDocument.fileData as string}
          alt={currentDocument.fileName || ""}
        />
      )}
    </div>
  );
};

export default ImageProxyRenderer;

ImageProxyRenderer.fileTypes = [];
ImageProxyRenderer.weight = 0;
