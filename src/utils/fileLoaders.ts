export interface FileLoaderFuncProps {
  documentURI: string;
  signal: AbortSignal;
  fileLoaderComplete: FileLoaderComplete;
  /** Called when the document cannot be fetched or read. */
  onError?: (error: Error) => void;
  headers?: Record<string, string>;
  /** Extra `fetch` options (credentials, mode, cache, ...). */
  requestInit?: Omit<RequestInit, "signal" | "headers" | "method" | "body">;
}

export type FileLoaderComplete = (fileReader?: FileReader) => void;
export type FileLoaderFunction = (props: FileLoaderFuncProps) => void;

type ReaderTypeFunction = "dataURL" | "arrayBuffer" | "binaryString" | "text";

interface BaseFileLoaderFuncOptions extends FileLoaderFuncProps {
  readerTypeFunction: ReaderTypeFunction;
}

type BaseFileLoaderFunction = (props: BaseFileLoaderFuncOptions) => void;

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

const _fileLoader: BaseFileLoaderFunction = ({
  documentURI,
  signal,
  fileLoaderComplete,
  onError,
  readerTypeFunction,
  headers,
  requestInit,
}) => {
  fetch(documentURI, { ...requestInit, signal, headers })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(
          `Failed to load document (${res.status} ${res.statusText})`.trim(),
        );
      }
      const blob = await res.blob();
      if (signal.aborted) return;

      const fileReader = new FileReader();
      fileReader.addEventListener("loadend", () => {
        if (signal.aborted) return;
        if (fileReader.error) {
          onError?.(toError(fileReader.error));
          return;
        }
        fileLoaderComplete(fileReader);
      });

      switch (readerTypeFunction) {
        case "arrayBuffer":
          fileReader.readAsArrayBuffer(blob);
          break;
        case "binaryString":
          fileReader.readAsBinaryString(blob);
          break;
        case "dataURL":
          fileReader.readAsDataURL(blob);
          break;
        case "text":
          fileReader.readAsText(blob);
          break;
        default:
          break;
      }
    })
    .catch((reason) => {
      if (signal.aborted) return;
      const error = toError(reason);
      if (error.name === "AbortError") return;
      onError?.(error);
    });
};

export const arrayBufferFileLoader: FileLoaderFunction = (props) => {
  return _fileLoader({ ...props, readerTypeFunction: "arrayBuffer" });
};

export const dataURLFileLoader: FileLoaderFunction = (props) => {
  return _fileLoader({ ...props, readerTypeFunction: "dataURL" });
};

export const textFileLoader: FileLoaderFunction = (props) => {
  return _fileLoader({ ...props, readerTypeFunction: "text" });
};

export const binaryStringFileLoader: FileLoaderFunction = (props) => {
  return _fileLoader({ ...props, readerTypeFunction: "binaryString" });
};

export const defaultFileLoader = dataURLFileLoader;
