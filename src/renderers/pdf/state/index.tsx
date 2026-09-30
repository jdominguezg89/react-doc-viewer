import {
  createContext,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  useEffect,
  useReducer,
} from "react";
import type { IMainState } from "../../../store/mainStateReducer";
import { type PDFActions, SET_CURRENT_MAIN_STATE } from "./actions";
import { type IPDFState, initialPDFState, reducer } from "./reducer";

const PDFContext = createContext<{
  state: IPDFState;
  dispatch: Dispatch<PDFActions>;
}>({ state: initialPDFState, dispatch: () => null });

const PDFProvider: FC<PropsWithChildren<{ mainState: IMainState }>> = ({
  children,
  mainState,
}) => {
  const [state, dispatch] = useReducer(reducer, {
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
    mainState,
  });

  useEffect(() => {
    dispatch({
      type: SET_CURRENT_MAIN_STATE,
      value: mainState,
    });
  }, [mainState]);

  return (
    <PDFContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFContext.Provider>
  );
};

export { PDFContext, PDFProvider };
