import { useEffect, useMemo, useState } from "react";
import { MobilePdfPages } from "./MobilePdfPages";
import { PdfPane } from "./PdfPane";
import { createPdfDocumentDataSource, createPdfDocumentUrlSource } from "./pdfDocumentSource";
import { resolvePdfDocumentSourceUrl } from "./resolvePdfDocumentSourceUrl";
import { useAuthSession } from "@/contexts/AuthContext";
import { getDocumentBlob } from "@/services/documentFileStore";
import