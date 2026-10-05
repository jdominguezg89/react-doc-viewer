import papaparse from "papaparse";
import { useEffect, useState } from "react";
import type { DocRenderer } from "../..";
import { textFileLoader } from "../../utils/fileLoaders";

const CSVRenderer: DocRenderer = ({
  mainState: { currentDocument, config },
}) => {
  const [rows, setRows] = useState<string[][]>([]);

  useEffect(() => {
    if (currentDocument?.fileData) {
      const parseResult = papaparse.parse<string[]>(
        currentDocument.fileData as string,
        {
          delimiter: config?.csvDelimiter ?? ",",
          skipEmptyLines: true,
        },
      );

      // Show whatever parsed; papaparse reports recoverable issues as errors.
      setRows(parseResult.data ?? []);
    }
  }, [currentDocument, config?.csvDelimiter]);

  if (!rows.length) {
    return null;
  }

  return (
    <div className="rdv-csv-renderer">
      <table className="rdv-csv-renderer__table">
        <thead>
          <tr>
            {rows[0].map((column, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: columns have no identity beyond their position
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their position
            <tr key={rowIndex}>
              {row.map((column, columnIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells have no identity beyond their position
                <td key={columnIndex}>{column}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CSVRenderer;

CSVRenderer.fileTypes = ["csv", "text/csv"];
CSVRenderer.weight = 0;
CSVRenderer.fileLoader = textFileLoader;
