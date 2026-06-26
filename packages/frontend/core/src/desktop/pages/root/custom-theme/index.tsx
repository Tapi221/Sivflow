import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { ThemeEditorService } from '@affine/core/modules/theme-editor';
import { appSettingAtom, useLiveData, useServices } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

let _provided = false;

const DEFAULT_ACCENT = '#1e96eb';
const DEFAULT_SECOND_ACCENT = '#e0f2fe';
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = HEX_COLOR_RE.test(hex)
    ? hex.slice(1)
    : DEFAULT_ACCENT.slice(1);
  const value = Number.parseInt(normalized, 16);

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyAccentColorVariables = (
  accentColorSetting: string,
  secondAccentColorSetting: string
) => {
  const accentColor = accentColorSetting || DEFAULT_ACCENT;
  const secondAccentColor = secondAccentColorSetting || DEFAULT_SECOND_ACCENT;

  document.documentElement.style.setProperty(
    '--sivflow-accent-color',
    accentColor,
    'important'
  );
  document.documentElement.style.setProperty(
    '--sivflow-second-accent-color',
    secondAccentColor,
    'important'
  );
  document.documentElement.style.setProperty(
    '--sivflow-accent-color-04',
    hexToRgba(accentColor, 0.04),
    'important'
  );
  document.documentElement.style.setProperty(
    '--sivflow-accent-color-30',
    hexToRgba(accentColor, 0.3),
    'important'
  );
  document.documentElement.style.setProperty(
    '--affine-secondary-color',
    secondAccentColor,
    'important'
  );
};

export const CustomThemeModifier = () => {
  const { themeEditorService, featureFlagService, editorSettingService } =
    useServices({
      ThemeEditorService,
      FeatureFlagService,
      EditorSettingService,
    });
  const enableThemeEditor = useLiveData(
    featureFlagService.flags.enable_theme_editor.$
  );
  const settings = useLiveData(editorSettingService.editorSetting.settings$);
  const appSettings = useAtomValue(appSettingAtom);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!enableThemeEditor) return;
    if (_provided) return;

    _provided = true;

    const sub = themeEditorService.customTheme$.subscribe(themeObj => {
      if (!themeObj) return;

      const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
      const valueMap = themeObj[mode];

      // remove previous style
      // TOOD(@CatsJuice): find better way to remove previous style
      document.documentElement.style.cssText = '';
      // recover color scheme set by next-themes
      document.documentElement.style.colorScheme = mode;

      Object.entries(valueMap).forEach(([key, value]) => {
        value && document.documentElement.style.setProperty(key, value);
      });

      applyAccentColorVariables(
        appSettings.accentColor,
        appSettings.secondAccentColor
      );
    });

    return () => {
      _provided = false;
      sub.unsubscribe();
    };
  }, [
    resolvedTheme,
    enableThemeEditor,
    themeEditorService,
    appSettings.accentColor,
    appSettings.secondAccentColor,
  ]);

  // Apply font size CSS variable when settings change
  useEffect(() => {
    if (settings.fontSize) {
      document.documentElement.style.setProperty(
        '--affine-font-base',
        `${settings.fontSize}px`
      );
    }
  }, [settings.fontSize]);

  // Apply accent color CSS variables when settings change
  useEffect(() => {
    applyAccentColorVariables(
      appSettings.accentColor,
      appSettings.secondAccentColor
    );
  }, [appSettings.accentColor, appSettings.secondAccentColor]);

  return null;
};
