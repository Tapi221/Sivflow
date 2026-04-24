import { useAuthSession } from "@/contexts/AuthContext";
import {
  createDefaultEditorBlockSettings,
  parseEditorBlockSettings,
} from "@/lib/editorBlockSettings";
import { getLocalDb } from "@/services/localDB";
import type { UserSettings } from "@/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo } from "react";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

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
  markdownTabSize: 2,
  editorBlockSettings: createDefaultEditorBlockSettings(),
};

const buildBootSettingsSnapshot = (): Partial<UserSettings> => ({
  ...DEFAULT_SETTINGS,
  editorBlockSettings: createDefaultEditorBlockSettings(),
});

const removeLegacySettingsFields = (
  input: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!input) return {};

  const {
    displayName: _displayName,
    profileImage: _profileImage,
    folderSidebarDisplayMode: _folderSidebarDisplayMode,
    ...rest
  } = input;

  return rest;
};

const normalizeStoredSettingsRecord = (
  input: Record<string, unknown> | undefined,
  bootSettings: Partial<UserSettings>,
): Partial<UserSettings> => {
  const merged = {
    ...bootSettings,
    ...removeLegacySettingsFields(input),
  };

  const editorBlockSettings = parseEditorBlockSettings(
    Array.isArray(merged["editorBlockSettings"])
      ? (merged["editorBlockSettings"] as unknown[])
      : undefined,
  );

  return {
    ...merged,
    editorBlockSettings,
  };
};

const toComparableRecordJson = (input: Record<string, unknown>): string => {
  const { updatedAt: _updatedAt, ...rest } = input;
  return JSON.stringify(rest);
};

const areSettingsRecordsEquivalent = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) => {
  return toComparableRecordJson(left) === toComparableRecordJson(right);
};

export const useUserSettings = () => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const bootSettings = useMemo(() => buildBootSettingsSnapshot(), []);

  const settings = useLiveQuery(
    async () => {
      if (!currentUserId) return bootSettings;

      const db = await getLocalDb(currentUserId);
      const userSettings = await db.userSettings.get(currentUserId);

      return normalizeStoredSettingsRecord(toRecord(userSettings), bootSettings);
    },
    [bootSettings, currentUserId],
    bootSettings,
  );

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const normalizeStoredSettings = async () => {
      const db = await getLocalDb(currentUserId);
      const current = await db.userSettings.get(currentUserId);

      if (cancelled || !current) return;

      const currentRecord = toRecord(current) ?? {};
      const currentWithoutLegacy = removeLegacySettingsFields(currentRecord);
      const normalizedSettings = normalizeStoredSettingsRecord(
        currentRecord,
        bootSettings,
      );

      const nextRecord = {
        ...currentWithoutLegacy,
        ...normalizedSettings,
        userId: currentUserId,
        id: currentUserId,
      };

      if (areSettingsRecordsEquivalent(currentWithoutLegacy, nextRecord)) {
        return;
      }

      await db.userSettings.put({
        ...nextRecord,
        updatedAt: new Date(),
      } as UserSettings);
    };

    void normalizeStoredSettings();

    return () => {
      cancelled = true;
    };
  }, [bootSettings, currentUserId]);

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (!currentUserId) return;

      const db = await getLocalDb(currentUserId);
      const current = await db.userSettings.get(currentUserId);
      const currentWithoutLegacy = removeLegacySettingsFields(
        toRecord(current),
      );

      const normalizedSettings: Partial<UserSettings> = {
        ...newSettings,
        ...(Object.prototype.hasOwnProperty.call(
          newSettings,
          "editorBlockSettings",
        )
          ? {
              editorBlockSettings: parseEditorBlockSettings(
                Array.isArray(newSettings.editorBlockSettings)
                  ? newSettings.editorBlockSettings
                  : undefined,
              ),
            }
          : {}),
      };

      const nextRecord = {
        ...currentWithoutLegacy,
        ...normalizedSettings,
        userId: currentUserId,
        id: currentUserId,
      };

      if (areSettingsRecordsEquivalent(currentWithoutLegacy, nextRecord)) {
        return;
      }

      await db.userSettings.put({
        ...nextRecord,
        updatedAt: new Date(),
      } as UserSettings);
    },
    [currentUserId],
  );

  return {
    settings,
    updateSettings,
  };
};
