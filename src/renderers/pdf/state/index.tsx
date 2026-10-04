import {
  createContext,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  useMemo,
  useReducer,
} from "react";
import type { IMainState } from "../../../store/mainStateReducer";
import type { PDFActions } from "./actions";
import { type IPDFState, initialPDFState, reducer } from "./reducer";

const PDFContext = createContext<{
  state: IPDFState;
  dispatch: Dispatch<PDFActions>;
}>({ state: initialPDFState, dispatch: () => null });

const PDFProvider: FC<PropsWithChildren<{ mainState: IMainState }>> = ({
  children,
  mainState,
}) => {
  const [pdfState, dispatch] = useReducer(reducer, {
    ...initialPDFState,
    defaultZoomLevel:
      mainState.config?.pdfZoom?.defaultZoom ??
      initialPDFState.defaultZoomLevel,
    zoomLevel:
      mainState.config?.pdfZoom?.defaultZoom ?? initialPDFState.zoomLevel,
    zoomJump: mainState.config?.pdfZoom?.zoomJump ?? initialPDFState.zoomJump,
    paginated: mainState.config?.pdfVerticalScrollByDefault
      ? false
      : initialPDFState.paginated,
  });

  // The viewer state is passed through at render time, so the PDF subtree
  // never sees a stale copy of it.
  const value = useMemo(
    () => ({ state: { ...pdfState, mainState }, dispatch }),
    [pdfState, mainState],
  );

  return <PDFContext.Provider value={value}>{children}</PDFContext.Provider>;
};

export { PDFContext, PDFProvider };
