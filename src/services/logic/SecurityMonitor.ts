import { firestoreDb, requireFirestoreDb } from "@platform/firebase/client";
import type { DocumentData, FirestoreError, QueryDocumentSnapshot, QuerySnapshot, Unsubscribe } from "firebase/firestore";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import type { SecurityState as SyncSecurityState } from "@/services/interfaces/ISyncService";
import { getSecurityEventCatalogEntry } from "./securityEventCatalog";
import type { SecurityEventType, SecurityLog, SecurityMetadata } from "@/types/domain/telemetry";



interface SecurityAlert {
  id: string;
  type: string;
  createdAt: number;
  [key: string]: unknown;
}
/**
 * セキュリティ状態の定義
 */
interface SecurityState {
  isLocked: boolean;
  requires2FA: boolean;
  alerts: SecurityAlert[];
}



/**
 * SecurityMonitor: セキュリティログ送信とサーバー状態監視を行うクラス
 */
class SecurityMonitor {
  private userId: string;
  private deviceId: string;
  private internalState: SecurityState = {
    isLocked: false,
    requires2FA: false,
    alerts: [],
  };

  private unsubscribeMetadata: Unsubscribe | null = null;
  private unsubscribeNotifications: Unsubscribe | null = null;

  constructor(userId: string, deviceId: string) {
    this.userId = userId;
    this.deviceId = deviceId;
  }

  /**
   * セキュリティイベントを記録する
   */
  async logEvent(
    type: SecurityEventType,
    metadata: SecurityMetadata = {},
  ): Promise<void> {
    await this.sendSecurityLog(type, metadata);
  }

  subscribe(callback: (state: SyncSecurityState) => void): () => void {
    this.startMonitoring((state) => {
      callback(state);
    });

    return () => {
      this.stopMonitoring();
    };
  }

  /**
   * Firestoreへセキュリティログを送信
   */
  private async sendSecurityLog(
    type: SecurityEventType,
    metadata: SecurityMetadata,
  ): Promise<void> {
    const db = firestoreDb;
    try {
      if (!db) {
        console.warn(
          "[Security] firestoreDb is undefined. Skipping security log.",
        );
        return;
      }
      const catalogEntry = getSecurityEventCatalogEntry(type);

      const logData: Omit<SecurityLog, "logId"> = {
        userId: this.userId,
        deviceId: this.deviceId,
        eventType: type,
        severity: catalogEntry.severity,
        source: "client",
        isUserVisible: catalogEntry.isUserVisible,
        description: catalogEntry.description,
        metadata,
        occurredAt: serverTimestamp(),
      };

      await addDoc(
        collection(db, `users/${this.userId}/securityLogs`),
        logData,
      );
    } catch (error) {
      console.error("[Security] Failed to send log:", error);
    }
  }

  /**
   * リアルタイム監視を開始する
   * - ユーザーメタデータ (ロック状態, 2FA)
   * - セキュリティ通知
   */
  startMonitoring(onStateChange: (state: SecurityState) => void): void {
    const db = firestoreDb;
    if (!db) {
      console.warn(
        "[Security] firestoreDb is undefined. Cannot start monitoring.",
      );
      return;
    }

    this.stopMonitoring();

    this.unsubscribeMetadata = onSnapshot(
      doc(db, `users/${this.userId}`),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data() as {
          isAccountLocked?: boolean;
          requires2FA?: boolean;
        };

        this.internalState.isLocked = data.isAccountLocked === true;
        this.internalState.requires2FA = data.requires2FA === true;

        onStateChange({ ...this.internalState });
      },
      (error: FirestoreError) => {
        console.error("[Security] Metadata monitoring failed:", error);
      },
    );

    const notificationQuery = query(
      collection(db, `users/${this.userId}/notifications`),
      where("type", "==", "SECURITY_ALERT"),
      where("read", "==", false),
    );

    this.unsubscribeNotifications = onSnapshot(
      notificationQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        this.internalState.alerts = snapshot.docs.map(
          (docSnap: QueryDocumentSnapshot<DocumentData>): SecurityAlert => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              type: typeof data.type === "string" ? data.type : "SECURITY_ALERT",
              createdAt:
                typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            };
          },
        );

        onStateChange({ ...this.internalState });
      },
      (error: FirestoreError) => {
        if (error.code !== "permission-denied") {
          console.warn(
            "[Security] Notification monitoring failed (non-permission error):",
            error,
          );
        }
      },
    );
  }

  /**
   * 通知を既読にする
   */
  async dismissAlert(alertId: string): Promise<void> {
    try {
      const db = requireFirestoreDb();
      const alertRef = doc(db, `users/${this.userId}/notifications`, alertId);

      await updateDoc(alertRef, { read: true });
    } catch (error) {
      console.error("[Security] Failed to dismiss alert:", error);
    }
  }

  /**
   * 監視を停止する
   */
  stopMonitoring(): void {
    if (this.unsubscribeMetadata) {
      this.unsubscribeMetadata();
      this.unsubscribeMetadata = null;
    }

    if (this.unsubscribeNotifications) {
      this.unsubscribeNotifications();
      this.unsubscribeNotifications = null;
    }
  }
}



export { SecurityMonitor };


export type { SecurityState };
