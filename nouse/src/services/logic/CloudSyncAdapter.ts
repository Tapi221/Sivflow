import { requireFirestoreDb } from "@platform/firebase/client";
import { collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore";
import { pullCloudSyncDiff, pullCloudSyncFull, pushCloudSyncBatch } from "@/infrastructure/sync/cloudSyncFirestoreAdapter";
import type { CloudDeviceStatus, ICloudSyncAdapter, SyncChange } from "@/services/interfaces/ISyncService";



const getDeviceMetadataPath = (userId: string, deviceId: string) => {
  return `sync_metadata/${userId}/devices/${deviceId}`;
};
const getDevicesMetadataPath = (userId: string) => {
  return `sync_metadata/${userId}/devices`;
};
class CloudSyncAdapter implements ICloudSyncAdapter {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  pullDiff = async (
    since: number,
  ): Promise<{ changes: SyncChange[]; serverTime: number; }> =>
    pullCloudSyncDiff(this.userId, since);

  pushBatch = async (
    changes: SyncChange[],
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: unknown; }> =>
    pushCloudSyncBatch(this.userId, changes);

  pullFull = async (entityIds: string[]): Promise<SyncChange[]> =>
    pullCloudSyncFull(this.userId, entityIds);

  getDeviceStatus = async (deviceId: string): Promise<CloudDeviceStatus> => {
    const db = requireFirestoreDb();
    const deviceRef = doc(db, getDeviceMetadataPath(this.userId, deviceId));
    const snapshot = await getDoc(deviceRef);

    if (!snapshot.exists()) return "unknown";

    const data = snapshot.data();
    return data.status === "revoked" ? "revoked" : "active";
  };

  revokeDevice = async (deviceId: string): Promise<void> => {
    const db = requireFirestoreDb();
    const deviceRef = doc(db, getDeviceMetadataPath(this.userId, deviceId));

    await updateDoc(deviceRef, {
      status: "revoked",
      revokedAt: Timestamp.now(),
      isActive: false,
    });
  };

  updateDeviceName = async (deviceId: string, newName: string): Promise<void> => {
    const db = requireFirestoreDb();
    const deviceRef = doc(db, getDeviceMetadataPath(this.userId, deviceId));

    await updateDoc(deviceRef, {
      deviceName: newName,
      lastSeen: Timestamp.now(),
    });
  };

  cleanupInactiveDevices = async (): Promise<number> => {
    const db = requireFirestoreDb();
    const devicesRef = collection(db, getDevicesMetadataPath(this.userId));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const inactiveDevicesQuery = query(
      devicesRef,
      where("lastSeen", "<", Timestamp.fromDate(cutoff)),
      where("isActive", "==", false),
    );
    const snapshot = await getDocs(inactiveDevicesQuery);
    const deletePromises = snapshot.docs.map((deviceDoc) => deleteDoc(deviceDoc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  };
}



export { CloudSyncAdapter };
