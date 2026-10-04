import { type FC, useContext } from "react";
import { PDFContext } from "../../state";
import PDFSinglePage from "./PDFSinglePage";

export const PDFAllPages: FC = () => {
  const {
    state: { numPages },
  } = useContext(PDFContext);

  return (
    <>
      {Array.from({ length: numPages }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: pages are identified by their position
        <PDFSinglePage key={index} pageNum={index + 1} />
      ))}
    </>
  );
};
