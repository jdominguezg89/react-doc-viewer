import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import type { DocRenderer } from "../../models";
import { arrayBufferFileLoader } from "../../utils/fileLoaders";
import ImageProxyRenderer from "../image";
import { parseTIFF } from "./tiffToCanvas";

const TIFFRenderer: DocRenderer = (props) => {
  const {
    mainState: { currentDocument },
  } = props;
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [corruptedFile, setCorruptedFile] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const data = currentDocument?.fileData;
    if (!canvas || !(data instanceof ArrayBuffer)) return;

    try {
      parseTIFF(data, canvas);
      setCorruptedFile(false);
    } catch {
      setCorruptedFile(true);
    }
  }, [currentDocument]);

  if (corruptedFile) {
    return (
      <ImageProxyRenderer {...props}>
        <div role="alert">{t("brokenFile")}</div>
      </ImageProxyRenderer>
    );
  }

  return (
    <ImageProxyRenderer {...props}>
      <canvas
        ref={canvasRef}
        id="tiff-img"
        className="rdv-image-renderer__canvas"
        aria-label={currentDocument?.fileName || "TIFF image"}
      />
    </ImageProxyRenderer>
  );
};
TIFFRenderer.fileTypes = ["tif", "tiff", "image/tif", "image/tiff"];
TIFFRenderer.weight = 0;
TIFFRenderer.fileLoader = arrayBufferFileLoader;

export default TIFFRenderer;
