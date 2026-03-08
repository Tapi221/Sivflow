export type IntegrityIssueSeverity = "info" | "warning" | "error";

export type IntegrityIssueCode =
  | "DELETED_FLAG_MISMATCH"
  | "TIMESTAMP_TYPE_MIXED"
  | "MISSING_FOLDER"
  | "BLOCK_ORDER_INDEX_MISSING"
  | "TEXT_BLOCK_MISMATCH"
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_FOLDER_REF"
  | "SYSTEM_CHECK_FAILED";

export interface IntegrityIssue {
  code: IntegrityIssueCode;
  entityType: "card" | "folder" | "system";
  entityId: string;
  severity: IntegrityIssueSeverity;
  fixed: boolean;
  details: Record<string, unknown>;
}

export interface IntegrityReport {
  checkedAt: string;
  totalCards: number;
  totalFolders: number;
  issues: IntegrityIssue[];
  isHealthy: boolean;
}

export interface IntegrityRepairResult {
  folders: number;
  cards: number;
  canonicalId: string | null;
  issues: IntegrityIssue[];
}




