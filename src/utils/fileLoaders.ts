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

/** What a loader hands back: anything with a `result`, e.g. a `FileReader`. */
export type FileLoaderResult = Pick<FileReader, "result">;

export type FileLoaderComplete = (fileReader?: FileLoaderResult) => void;
export type FileLoaderFunction = (props: FileLoaderFuncProps) => void;

type ReaderTypeFunction = "dataURL" | "arrayBuffer" | "binaryString" | "text";

interface BaseFileLoaderFuncOptions extends FileLoaderFuncProps {
  readerTypeFunction: ReaderTypeFunction;
}

type BaseFileLoaderFunction = (props: BaseFileLoaderFuncOptions) => void;

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

const CHUNK = 0x8000;

const bytesToBinaryString = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return binary;
};

/** `data:<mime>[;charset=x];base64,...` from raw bytes and a content type. */
export const bytesToDataUrl = (
  bytes: Uint8Array,
  contentType: string,
): string => {
  const [mime = "application/octet-stream", ...params] = contentType
    .split(";")
    .map((part) => part.trim());
  const charset = params
    .find((param) => param.toLowerCase().startsWith("charset="))
    ?.slice("charset=".length);
  const type = `${mime || "application/octet-stream"}${charset ? `;charset=${charset}` : ""}`;
  return `data:${type};base64,${btoa(bytesToBinaryString(bytes))}`;
};

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
      const contentType = res.headers.get("content-type") ?? "";
      const buffer = await res.arrayBuffer();
      if (signal.aborted) return;

      let result: string | ArrayBuffer;
      switch (readerTypeFunction) {
        case "arrayBuffer":
          result = buffer;
          break;
        case "binaryString":
          result = bytesToBinaryString(new Uint8Array(buffer));
          break;
        case "text":
          result = new TextDecoder().decode(buffer);
          break;
        default:
          result = bytesToDataUrl(new Uint8Array(buffer), contentType);
          break;
      }
      fileLoaderComplete({ result });
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
