import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import {
  readCachedFolderSidebarDisplayMode,
  writeCachedFolderSidebarDisplayMode,
} from "@/services/folderSidebarDisplayModePreference";
import type { UserSettings } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo } from "react";

type LegacyFolderSidebarDisplayMode =
  | UserSettings["folderSidebarDisplayMode"]
  | "auto";

const normalizeFolderSidebarDisplayMode = (
  value: LegacyFolderSidebarDisplayMode | null | undefined,
): NonNullable<UserSettings["folderSidebarDisplayMode"]> => {
  return value === "navigation" ? "navigation" : "tree";
};

export const DEFAULT_SETTINGS: Partial<UserSettings> = {
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
  autoVoiceQuestion: false,
  autoVoiceAnswer: false,
  cardEditorHeightPx: null,
  questionDisplayMode: "tap_to_reveal" as const,
  folderSidebarDisplayMode: "tree" as const,
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

const buildBootSettingsSnapshot = (): Partial<UserSettings> => ({
  ...DEFAULT_SETTINGS,
  folderSidebarDisplayMode: readCachedFolderSidebarDisplayMode(),
});

const removeLegacyProfileFields = (
  input: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!input) return {};

  const {
    displayName: _displayName,
    profileImage: _profileImage,
    ...rest
  } = input;

  return rest;
};

export const useUserSettings = () => {
  const { currentUser } = useAuthSession();

  const bootSettings = useMemo(
    () => buildBootSettingsSnapshot(),
    [currentUser?.uid],
  );

  const settings = useLiveQuery(
    async () => {
      if (!currentUser) return bootSettings;

      const db = await getLocalDb(currentUser.uid);
      const userSettings = await db.userSettings.get(currentUser.uid);
      const merged = {
        ...bootSettings,
        ...removeLegacyProfileFields(
          userSettings as Record<string, unknown> | undefined,
        ),
      };
      const folderSidebarDisplayMode = normalizeFolderSidebarDisplayMode(
        (
          merged as {
            folderSidebarDisplayMode?: LegacyFolderSidebarDisplayMode;
          }
        ).folderSidebarDisplayMode,
      );

      writeCachedFolderSidebarDisplayMode(folderSidebarDisplayMode);

      return {
        ...merged,
        folderSidebarDisplayMode,
      };
    },
    [bootSettings, currentUser?.uid],
    bootSettings,
  );

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const cleanupLegacyProfileFields = async () => {
      const db = await getLocalDb(currentUser.uid);
      const current = await db.userSettings.get(currentUser.uid);

      if (cancelled || !current) return;

      const currentRecord = current as Record<string, unknown>;
      const hasLegacyDisplayName = Object.prototype.hasOwnProperty.call(
        currentRecord,
        "displayName",
      );
      const hasLegacyProfileImage = Object.prototype.hasOwnProperty.call(
        currentRecord,
        "profileImage",
      );

      if (!hasLegacyDisplayName && !hasLegacyProfileImage) return;

      const cleaned = removeLegacyProfileFields(currentRecord);

      await db.userSettings.put({
        ...cleaned,
        userId: currentUser.uid,
        id: currentUser.uid,
        updatedAt: new Date(),
      } as UserSettings);
    };

    void cleanupLegacyProfileFields();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (!currentUser) return;

      const db = await getLocalDb(currentUser.uid);
      const current = await db.userSettings.get(currentUser.uid);
      const currentWithoutLegacy = removeLegacyProfileFields(
        current as Record<string, unknown> | undefined,
      );

      const normalizedSettings: Partial<UserSettings> = {
        ...newSettings,
        ...(Object.prototype.hasOwnProperty.call(
          newSettings,
          "folderSidebarDisplayMode",
        )
          ? {
              folderSidebarDisplayMode: normalizeFolderSidebarDisplayMode(
                newSettings.folderSidebarDisplayMode,
              ),
            }
          : {}),
      };

      if (
        Object.prototype.hasOwnProperty.call(
          normalizedSettings,
          "folderSidebarDisplayMode",
        )
      ) {
        writeCachedFolderSidebarDisplayMode(
          normalizedSettings.folderSidebarDisplayMode,
        );
      }

      const updated = {
        ...currentWithoutLegacy,
        ...normalizedSettings,
        userId: currentUser.uid,
        updatedAt: new Date(),
        id: currentUser.uid,
      };

      if (JSON.stringify(currentWithoutLegacy) === JSON.stringify(updated))
        return;

      await db.userSettings.put(updated as UserSettings);
    },
    [currentUser],
  );

  return {
    settings,
    updateSettings,
  };
};
