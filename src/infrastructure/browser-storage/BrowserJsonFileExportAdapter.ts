import type { JsonFileExportPort } from "@/application/ports/JsonFileExportPort";



const exportJson: JsonFileExportPort["exportJson"] = async ({
  filename,
  payload,
}) => {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};



const browserJsonFileExportAdapter: JsonFileExportPort = { exportJson };



export { browserJsonFileExportAdapter };
