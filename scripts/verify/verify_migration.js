/**
 * 検証用スクリプト: LocalDB Migration Verification
 * ブラウザのDevToolsコンソールに貼り付けて実行するか、browser_subagent経由で実行します。
 */

(async () => {
    const log = (msg, type = 'info') => console[type](`%c[Verification] ${msg}`, type === 'error' ? 'color: red; font-weight: bold;' : type === 'warn' ? 'color: orange;' : 'color: cyan;');

    // Helper: Find correct DB
    const findDB = async () => {
        if (window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            // userIdが含まれているDB、またはanonymousを探す
            return dbs.find(d => d.name && d.name.startsWith('FlashcardMasterDB_'));
        }
        return { name: 'FlashcardMasterDB_anonymous' }; // Fallback
    };

    // Helper: Open DB
    const openDB = async (dbName) => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    };

    // Helper: Count Store
    const getCount = (db, storeName) => new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        } catch (e) {
            reject(e);
        }
    });

    // 1. Setup Data for Migration Test
    window.setupMigrationTest = () => {
        log('Setting up LocalStorage data for Migration Test...');
        const queue = [
            { 
                id: crypto.randomUUID(), 
                clientSeq: 99990, 
                operation: 'createCard', 
                data: { title: 'MigrationVerify_1', question: 'Q1', answer: 'A1' }, 
                createdAt: Date.now(), 
                status: 'pending',
                retryCount: 0 
            },
            { 
                id: crypto.randomUUID(), 
                clientSeq: 99991, 
                operation: 'updateCard', 
                data: { id: 'some-id', title: 'MigrationVerify_2' }, 
                createdAt: Date.now(), 
                status: 'pending', 
                retryCount: 0 
            }
        ];
        
        // migrationKey (hash) を持たない古い形式のデータをエミュレート
        localStorage.setItem('_operation_queue', JSON.stringify(queue));
        localStorage.setItem('_client_seq', '99991');
        
        log(`Data Set: 2 items in queue, seq 99991.`);
        log('PLEASE RELOAD THE PAGE NOW to trigger migration.', 'warn');
    };

    // 2. Check Results
    window.checkMigrationResult = async () => {
        log('Checking Migration Results...');
        let passed = true;

        // Check 1: LocalStorage should be cleared
        const lsQueue = localStorage.getItem('_operation_queue');
        if (lsQueue === null) {
            log('PASS: LocalStorage "_operation_queue" is cleared.');
        } else {
            log('FAIL: LocalStorage "_operation_queue" still exists!', 'error');
            passed = false;
        }

        // Check 2: IndexedDB should have items
        try {
            const dbInfo = await findDB();
            if (!dbInfo) {
                log('FAIL: Could not find FlashcardMasterDB.', 'error');
                return;
            }
            log(`Opening DB: ${dbInfo.name}`);
            const db = await openDB(dbInfo.name);
            
            // Check syncQueue
            const queueCount = await getCount(db, 'syncQueue');
            if (queueCount >= 2) {
                 log(`PASS: syncQueue has ${queueCount} items (Expected >= 2).`);
            } else {
                 log(`FAIL: syncQueue has ${queueCount} items (Expected >= 2).`, 'error');
                 passed = false;
            }

            // Check syncMetadata for clientSeq
            // syncMetadata is simple key-value store where key is userId
            // Need to read all or know userId
            const tx = db.transaction('syncMetadata', 'readonly');
            const store = tx.objectStore('syncMetadata');
            const getAllReq = store.getAll();
            
            await new Promise(resolve => {
                getAllReq.onsuccess = () => {
                    const metas = getAllReq.result;
                    const migratedMeta = metas.find(m => m.clientSeq >= 99991);
                    if (migratedMeta) {
                         log(`PASS: Found metadata with clientSeq >= 99991 (Current: ${migratedMeta.clientSeq}).`);
                    } else {
                        log(`FAIL: No metadata found with expected clientSeq (>= 99991).`, 'error');
                        console.table(metas);
                        passed = false;
                    }
                    resolve();
                };
            });
            
            db.close();

        } catch (e) {
            log(`FAIL: DB Error: ${e.message}`, 'error');
            passed = false;
        }

        if (passed) {
            log('All Migration Checks PASSED!', 'warn');
        } else {
            log('Some checks FAILED.', 'error');
        }
    };
    
    // 3. Test Sync Isolation (Optional)
    // Requires access to SyncService class which is not exposed globally.
    // This part assumes we can reach SyncService instance or class somehow, or we skip it for manual check.
    
    log('Verification Script Ready.');
    log('1. window.setupMigrationTest()');
    log('2. (Reload Page)');
    log('3. window.checkMigrationResult()');

})();
