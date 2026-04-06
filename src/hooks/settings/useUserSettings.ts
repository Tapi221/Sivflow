import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { UserSettings } from "@/types";
import { sanitizeProfileImage } from "@/utils/profileImageSanitizer";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef } from "react";

export const DEFAULT_SETTINGS: Partial<UserSettings> = {
  displayName: "UserName",
  profileImage: null,
  language: "ja",
  weekStartDay: "monday",
  notificationsEnabled: false,
  soundEnabled: true,

  showReviewHard: true,
  showReviewEasy: true,
  autoCarryOver: true,
  delayBonusEnabled: false,
  reviewStartNextDay: true,
  defaultPreviewEnabled: false,
  autoDraftEnabled: true,
  autoSaveEnabled: true,
  cardEditorHeightPx: null,
  questionDisplayMode: "tap_to_reveal" as const,
  folderSidebarDisplayMode: "auto" as const,
  markdownTabSize: 2,
  editorBlockSettings: [
    {
      id: "text",
      type: "text",
      label: "テキスト",
      isVisible: true,
      orderIndex: 0,
    },
    {
      id: "question",
      type: "question",
      label: "疑問",
      isVisible: true,
      orderIndex: 1,
    },
    {
      id: "code",
      type: "code",
      label: "コード",
      isVisible: true,
      orderIndex: 2,
    },
    {
      id: "image",
      type: "image",
      label: "画像",
      isVisible: true,
      orderIndex: 3,
    },
    {
      id: "math",
      type: "math",
      label: "数式",
      isVisible: true,
      orderIndex: 4,
    },
    {
      id: "markdown",
      type: "markdown",
      label: "Markdown",
      isVisible: true,
      orderIndex: 5,
    },
  ],
};

export const useUserSettings = () => {
  const { currentUser } = useAuthSession();
  const repairedBlobRef = useRef(false);

  useEffect(() => {
    repairedBlobRef.current = false;
  }, [currentUser?.uid]);

  const settings = useLiveQuery(
    async () => {
      if (!currentUser) return DEFAULT_SETTINGS;
      const db = await getLocalDb(currentUser.uid);
      const userSettings =
        (await db.userSettings.get(currentUser.uid)) ||
        (await db.userSettings.where("userId").equals(currentUser.uid).first());

      const merged = { ...DEFAULT_SETTINGS, ...(userSettings || {}) };
      const sanitizedProfile = sanitizeProfileImage(merged.profileImage);

      return {
        ...merged,
        profileImage: sanitizedProfile.profileImage,
      };
    },
    [currentUser],
    DEFAULT_SETTINGS,
  );

  useEffect(() => {
    if (!currentUser || !settings) return;
    if (repairedBlobRef.current) return;
    const sanitizedProfile = sanitizeProfileImage(settings.profileImage);
    if (!sanitizedProfile.wasBlobRemoteUrl) return;

    repairedBlobRef.current = true;
    if (import.meta.env.DEV) {
      console.warn(
        "[Settings] blob remoteUrl detected during hydrate; repairing profileImage",
      );
    }

    if (typeof window === "undefined") return;
    const timerId = window.setTimeout(async () => {
      const db = await getLocalDb(currentUser.uid);
      const current =
        (await db.userSettings.get(currentUser.uid)) ||
        (await db.userSettings.where("userId").equals(currentUser.uid).first());

      const currentSanitized = sanitizeProfileImage(current?.profileImage);
      if (!currentSanitized.wasBlobRemoteUrl) return;

      await db.userSettings.put({
        ...current,
        userId: currentUser.uid,
        id: currentUser.uid,
        updatedAt: new Date(),
        profileImage: currentSanitized.profileImage,
      });

      if (import.meta.env.DEV) {
        const repaired = await db.userSettings.get(currentUser.uid);
        console.log(
          "[Settings][RepairCheck] profileImage after repair:",
          repaired?.profileImage ?? null,
        );
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [currentUser, settings]);

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (!currentUser) return;

      const db = await getLocalDb(currentUser.uid);
      const current =
        (await db.userSettings.get(currentUser.uid)) ||
        (await db.userSettings.where("userId").equals(currentUser.uid).first());

      const hasProfileImageUpdate = Object.prototype.hasOwnProperty.call(
        newSettings,
        "profileImage",
      );

      let sanitizedProfile = current?.profileImage ?? null;

      if (hasProfileImageUpdate) {
        const profileSanitizeResult = sanitizeProfileImage(
          newSettings.profileImage,
        );
        sanitizedProfile = profileSanitizeResult.profileImage;

        if (import.meta.env.DEV && profileSanitizeResult.wasBlobRemoteUrl) {
          console.warn(
            "[Settings] blocked blob remoteUrl on save; forcing profileImage.remoteUrl=null",
          );
        }
      }

      const updated = {
        ...current,
        ...newSettings,
        profileImage: sanitizedProfile,
        userId: currentUser.uid,
        updatedAt: new Date(),
        id: currentUser.uid,
      };

      if (JSON.stringify(current) === JSON.stringify(updated)) return;

      await db.userSettings.put(updated as UserSettings);
    },
    [currentUser],
  );

  return {
    settings,
    updateSettings,
  };
};
