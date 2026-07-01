let adminAppPromise = null;
let authModulePromise = null;
let firestoreModulePromise = null;
let storageModulePromise = null;
const ensureFirebaseAdmin = async () => {
    adminAppPromise ??= (async () => {
        const { getApp, initializeApp } = await import("firebase-admin/app");
        try {
            return getApp();
        }
        catch {
            return initializeApp();
        }
    })();
    return await adminAppPromise;
};
const getAuthModule = async () => {
    authModulePromise ??= import("firebase-admin/auth");
    return await authModulePromise;
};
const getFirestoreModule = async () => {
    firestoreModulePromise ??= import("firebase-admin/firestore");
    return await firestoreModulePromise;
};
const getStorageModule = async () => {
    storageModulePromise ??= import("firebase-admin/storage");
    return await storageModulePromise;
};
const getAdminAuth = async () => {
    const app = await ensureFirebaseAdmin();
    const { getAuth } = await getAuthModule();
    return getAuth(app);
};
const getDb = async () => {
    const app = await ensureFirebaseAdmin();
    const { getFirestore } = await getFirestoreModule();
    return getFirestore(app);
};
const getAdminStorage = async () => {
    const app = await ensureFirebaseAdmin();
    const { getStorage } = await getStorageModule();
    return getStorage(app);
};
const serverTimestamp = async () => {
    const { FieldValue } = await getFirestoreModule();
    return FieldValue.serverTimestamp();
};
export { ensureFirebaseAdmin, getAdminAuth, getDb, getAdminStorage, serverTimestamp };
