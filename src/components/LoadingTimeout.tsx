import {
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { DocViewerContext } from "../store/DocViewerProvider";

export const LoadingTimeout: FC<PropsWithChildren> = ({ children }) => {
  const { state } = useContext(DocViewerContext);
  const timeout = state.config?.loadingRenderer?.showLoadingTimeout;
  const [shouldLoadingRender, setShouldLoadingRender] = useState(
    timeout === false,
  );

  useEffect(() => {
    if (timeout === false) return;
    const handle = setTimeout(
      () => setShouldLoadingRender(true),
      typeof timeout === "number" ? timeout : 500,
    );
    return () => clearTimeout(handle);
  }, [timeout]);

  if (!shouldLoadingRender) {
    return null;
  }

  return <>{children}</>;
};
