import type { IDocument } from "../models";

const safeDecode = (value: string): string => {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

export const getFileName = (
  document: IDocument | undefined,
  retainURLParams: boolean,
): string => {
  if (!document) {
    return "";
  }

  if (document.fileName) {
    return document.fileName;
  }

  let fileName = safeDecode(document.uri || "");

  if (!retainURLParams) {
    fileName = fileName.split("?")[0];
  }

  const splitURL = fileName.split("/");
  return splitURL[splitURL.length - 1] ?? "";
};
