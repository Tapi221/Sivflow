import { useEffect, useState } from "react";
import { getDocumentBlob } from "@/services/documentFileStore";
import type { DocumentItem, PdfViewerState } from "@/types";
import { createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { PdfPane } from "./PdfPane";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import type { PdfDocumentSource } from "