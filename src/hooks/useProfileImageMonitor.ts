import { useEffect, useRef } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

const CHECK_INTERVAL_MS = 1000 * 60 * 60; // Check once per hour to save bandwidth
const CACHE_KEY = 'profile_image_last_check';

export function useProfileImageMonitor() {
  const { settings, updateSettings } = useUserSettings();
  const { currentUser } = useAuth();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !settings?.profileImage?.remoteUrl || settings.profileImage.status === 'failed') {
      return;
    }

    const checkAndRepair = async () => {
      // Prevent double checks
      if (isCheckingRef.current) return;
      
      // Frequency check (localStorage)
      const lastCheck = localStorage.getItem(CACHE_KEY);
      if (lastCheck && Date.now() - parseInt(lastCheck) < CHECK_INTERVAL_MS) {
        return;
      }

      isCheckingRef.current = true;
      const { remoteUrl, localUrl, storagePath } = settings.profileImage!;

      try {
        console.log('[ImageMonitor] Checking profile image health...');
        const response = await fetch(remoteUrl, { method: 'HEAD' });

        if (response.ok) {
          console.log('[ImageMonitor] Image is healthy.');
          localStorage.setItem(CACHE_KEY, Date.now().toString());
        } else if (response.status === 404 || response.status === 403) {
          console.warn('[ImageMonitor] Image missing (404/403). Attempting repair...');
          
          if (localUrl && storagePath) {
            // Attempt Auto-Repair
            try {
              // Convert Base64/LocalURL to Blob
              const blob = await fetch(localUrl).then(r => r.blob());
              
              const storageRef = ref(storage, storagePath);
              await uploadBytes(storageRef, blob);
              const newUrl = await getDownloadURL(storageRef);
              
              console.log('[ImageMonitor] Repair successful. Updating URL.');
              await updateSettings({
                profileImage: {
                  ...settings.profileImage!,
                  remoteUrl: newUrl,
                  status: 'ready'
                }
              });
              // Update check time so we don't loop
              localStorage.setItem(CACHE_KEY, Date.now().toString());

            } catch (repairError) {
              console.error('[ImageMonitor] Repair failed:', repairError);
              // Mark as failed to stop checking
              await updateSettings({
                profileImage: { ...settings.profileImage!, status: 'failed' }
              });
            }
          } else {
            console.warn('[ImageMonitor] No local backup available. Marking as failed.');
            await updateSettings({
                profileImage: { ...settings.profileImage!, status: 'failed' }
            });
          }
        }
      } catch (error) {
        console.error('[ImageMonitor] Network error during check:', error);
        // Do not mark failed on transient network errors, just skip
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkAndRepair();

  }, [currentUser, settings?.profileImage, updateSettings]);
}
