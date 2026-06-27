import { useCallback, useEffect, useMemo } from "react";
import type { Locale } from "@shared/i18n/locale.store";
import { useLocaleStore } from "@shared/i18n/locale.store";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { createDefaultEditorBlockSettings, parseEditorBlockSettings } from "@/lib/editorBlockSettings";
import { getLocalDb } from "@/services/localdb";
import type { UserSettings } from "@/types";



const DEFAULT_THEME_ACCENT_COLOR = "#1e96eb";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const LEGACY_SETTING_KEYS = [
  "displayName",
  "profileImage",
  "folder" + "SidebarDisplayMode",
] as const;
const DEFAULT_SETTINGS: Partial<UserSettings> = { language: "ja", weekStartDay: "monday", notificationsEnabled: false, soundEnabled: true, showReviewHard: true, showReviewEasy: true, autoCarryOver: true, delayBonusEnabled: false, reviewStartNextDay: true, defaultPreviewEnabled: false, autoDraftEnabled: true, autoSaveEnabled: true, autoVoiceQuestion: false, autoVoiceAnswer: false, cardEditorHeightPx: null, questionDisplayMode: "tap_to_reveal" as const, markdownTabSize: 2, accentColor: DEFAULT_THEME_ACCENT_COLOR, editorBlockSettings: createDefaultEditorBlockSettings() };



const normalizeThemeAccentColor = (color: string | null | undefined): string => {
  const normalizedColor = color?.trim().toLowerCase();
  return normalizedColor && HEX_COLOR_PATTERN.test(normalizedColor) ? normalizedColor : DEFAULT_THEME_ACCENT_COLOR;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;
const toLocale = (language: UserSettings["language"] | undefined): Locale => {
  if (language === "en") return "en";
  if (language === "zh") return "zh";
  return "ja";
};
const buildBootSettingsSnapshot = (): Partial<UserSettings> => ({
  ...DEFAULT_SETTINGS,
  accentColor: DEFAULT_THEME_ACCENT_COLOR,
  editorBlockSettings: createDefaultEditorBlockSettings(),
});
const removeLegacySettingsFields = (
  input: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!input) return {};

  const next = { ...input };

  LEGACY_SETTING_KEYS.forEach((key) => {
    delete next[key];
  });

  return next;
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
    accentColor: normalizeThemeAccentColor(
      typeof merged["accentColor"] === "string" ? merged["accentColor"] : undefined,
    ),
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
const useUserSettings = () => {
  const { currentUser } = useAuthSession();
  const currentUserId = currentUser?.uid ?? null;
  const bootSettings = useMemo(() => buildBootSettingsSnapshot(), []);
  const setLocale = useLocaleStore((state) => state.setLocale);

  const settings = useLiveQuery(
    async () => {
      if (!currentUserId) return bootSettings;

      const db = await getLocalDb(currentUserId);
      const userSettings = await db.userSettings.get(currentUserId);

      return normalizeStoredSettingsRecord(
        toRecord(userSettings),
        bootSettings,
      );
    },
    [bootSettings, currentUserId],
    bootSettings,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setLocale(toLocale(settings?.language));
    });
  }, [settings?.language, setLocale]);

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
      if (newSettings.language) {
        setLocale(toLocale(newSettings.language));
      }

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
          "accentColor",
        )
          ? {
            accentColor: normalizeThemeAccentColor(newSettings.accentColor),
          }
          : {}),
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
    [currentUserId, setLocale],
  );

  return {
    settings,
    updateSettings,
  };
};



export { DEFAULT_SETTINGS, DEFAULT_THEME_ACCENT_COLOR, normalizeThemeAccentColor, useUserSettings };
