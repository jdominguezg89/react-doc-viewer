import type { DocRenderer } from "../../models";
import { cx } from "../../utils/cx";
import { getFileName } from "../../utils/getFileName";

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
          alt={getFileName(currentDocument, false)}
        />
      )}
    </div>
  );
};

export default ImageProxyRenderer;

ImageProxyRenderer.fileTypes = [];
ImageProxyRenderer.weight = 0;
