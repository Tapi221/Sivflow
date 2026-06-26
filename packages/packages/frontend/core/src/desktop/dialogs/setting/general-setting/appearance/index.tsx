import type { RadioItem } from '@affine/component';
import { Button, IconButton, Input, RadioGroup, Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { LanguageMenu } from '@affine/core/components/affine/language-menu';
import { TraySettingService } from '@affine/core/modules/editor-setting/services/tray-settings';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useI18n } from '@affine/i18n';
import { ResetIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppSettingHelper } from '../../../../../components/hooks/affine/use-app-setting-helper';
import { OpenInAppLinksMenu } from './links';
import { settingWrapper } from './style.css';
import { ThemeEditorSetting } from './theme-editor-setting';

export const getThemeOptions = (t: ReturnType<typeof useI18n>) =>
  [
    {
      value: 'system',
      label: t['com.affine.themeSettings.system'](),
      testId: 'system-theme-trigger',
    },
    {
      value: 'light',
      label: t['com.affine.themeSettings.light'](),
      testId: 'light-theme-trigger',
    },
    {
      value: 'dark',
      label: t['com.affine.themeSettings.dark'](),
      testId: 'dark-theme-trigger',
    },
  ] satisfies RadioItem[];

const DEFAULT_ACCENT = '#1e96eb';

/** "#rrggbb" かどうかを確認する */
const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

const AccentColorSetting = () => {
  const { appSettings, updateSettings } = useAppSettingHelper();
  const t = useI18n();

  const currentColor = appSettings.accentColor || DEFAULT_ACCENT;

  // テキスト入力欄の表示用ローカルステート（# なしで管理）
  const [inputValue, setInputValue] = useState(currentColor.replace(/^#/, ''));

  // 外から accentColor が変わったら同期
  useEffect(() => {
    setInputValue((appSettings.accentColor || DEFAULT_ACCENT).replace(/^#/, ''));
  }, [appSettings.accentColor]);

  const handleColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    updateSettings('accentColor', v);
    setInputValue(v.replace(/^#/, ''));
  };

  const handleTextChange = (v: string) => {
    // '#' で始まる場合は取り除く
    const stripped = v.startsWith('#') ? v.slice(1) : v;
    setInputValue(stripped);
    const normalized = `#${stripped}`;
    if (isValidHex(normalized)) {
      updateSettings('accentColor', normalized);
    }
  };

  const handleTextBlur = () => {
    const normalized = `#${inputValue}`;
    if (isValidHex(normalized)) {
      updateSettings('accentColor', normalized);
    } else {
      // 無効な値ならリセット
      setInputValue((appSettings.accentColor || DEFAULT_ACCENT).replace(/^#/, ''));
    }
  };

  const handleReset = () => {
    updateSettings('accentColor', '');
    setInputValue(DEFAULT_ACCENT.replace(/^#/, ''));
  };

  const isCustom = !!appSettings.accentColor && appSettings.accentColor.toLowerCase() !== DEFAULT_ACCENT.toLowerCase();

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Hexコード入力フィールド */}
      <Input
        value={inputValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur as any}
        placeholder="1e96eb"
        style={{ width: '130px', gap: '4px', paddingLeft: '8px' }}
        inputStyle={{ fontFamily: 'monospace', fontSize: '13px', paddingLeft: '2px' }}
        preFix={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* カラースウォッチ（クリックでカラーピッカーを開く） */}
            <label
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'block',
                position: 'relative',
                flexShrink: 0,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                marginLeft: '4px',
              }}
              title="クリックしてカラーピッカーを開く"
            >
              <input
                type="color"
                value={currentColor}
                onChange={handleColorPicker}
                style={{
                  opacity: 0,
                  width: '200%',
                  height: '200%',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: currentColor,
                  pointerEvents: 'none',
                }}
              />
            </label>
            <span style={{
              color: 'var(--affine-text-secondary-color)',
              fontSize: '14px',
              userSelect: 'none',
              marginLeft: '8px',
            }}>
              #
            </span>
          </div>
        }
      />

      {/* リセットボタン（カスタム色が設定されているときのみ） */}
      {isCustom && (
        <IconButton 
          onClick={handleReset} 
          tooltip={t['com.affine.appearanceSettings.customize-theme.reset']()}
          style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ResetIcon width={18} height={18} />
        </IconButton>
      )}
    </div>
  );
};

const DEFAULT_SECOND_ACCENT = '#e0f2fe';

const SecondAccentColorSetting = () => {
  const { appSettings, updateSettings } = useAppSettingHelper();
  const t = useI18n();

  const currentColor = appSettings.secondAccentColor || DEFAULT_SECOND_ACCENT;

  const [inputValue, setInputValue] = useState(currentColor.replace(/^#/, ''));

  useEffect(() => {
    setInputValue((appSettings.secondAccentColor || DEFAULT_SECOND_ACCENT).replace(/^#/, ''));
  }, [appSettings.secondAccentColor]);

  const handleColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    updateSettings('secondAccentColor', v);
    setInputValue(v.replace(/^#/, ''));
  };

  const handleTextChange = (v: string) => {
    const stripped = v.startsWith('#') ? v.slice(1) : v;
    setInputValue(stripped);
    const normalized = `#${stripped}`;
    if (isValidHex(normalized)) {
      updateSettings('secondAccentColor', normalized);
    }
  };

  const handleTextBlur = () => {
    const normalized = `#${inputValue}`;
    if (isValidHex(normalized)) {
      updateSettings('secondAccentColor', normalized);
    } else {
      setInputValue((appSettings.secondAccentColor || DEFAULT_SECOND_ACCENT).replace(/^#/, ''));
    }
  };

  const handleReset = () => {
    updateSettings('secondAccentColor', '');
    setInputValue(DEFAULT_SECOND_ACCENT.replace(/^#/, ''));
  };

  const isCustom = !!appSettings.secondAccentColor && appSettings.secondAccentColor.toLowerCase() !== DEFAULT_SECOND_ACCENT.toLowerCase();

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Input
        value={inputValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur as any}
        placeholder="e0f2fe"
        style={{ width: '130px', gap: '4px', paddingLeft: '8px' }}
        inputStyle={{ fontFamily: 'monospace', fontSize: '13px', paddingLeft: '2px' }}
        preFix={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'block',
                position: 'relative',
                flexShrink: 0,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                marginLeft: '4px',
              }}
              title="クリックしてカラーピッカーを開く"
            >
              <input
                type="color"
                value={currentColor}
                onChange={handleColorPicker}
                style={{
                  opacity: 0,
                  width: '200%',
                  height: '200%',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                }}
              />
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: currentColor,
                  pointerEvents: 'none',
                }}
              />
            </label>
            <span style={{
              color: 'var(--affine-text-secondary-color)',
              fontSize: '14px',
              userSelect: 'none',
              marginLeft: '8px',
            }}>
              #
            </span>
          </div>
        }
      />

      {isCustom && (
        <IconButton 
          onClick={handleReset} 
          tooltip={t['com.affine.appearanceSettings.customize-theme.reset']()}
          style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ResetIcon width={18} height={18} />
        </IconButton>
      )}
    </div>
  );
};


export const ThemeSettings = () => {
  const t = useI18n();
  const { setTheme, theme } = useTheme();

  const radioItems = useMemo<RadioItem[]>(() => getThemeOptions(t), [t]);

  return (
    <RadioGroup
      items={radioItems}
      value={theme}
      width={250}
      className={settingWrapper}
      onChange={useCallback(
        (value: string) => {
          setTheme(value);
        },
        [setTheme]
      )}
    />
  );
};

const MenubarSetting = () => {
  const t = useI18n();
  const traySettingService = useService(TraySettingService);
  const traySetting = useLiveData(traySettingService.settings$);

  return (
    <>
      <SettingWrapper
        id="menubar"
        title={t['com.affine.appearanceSettings.menubar.title']()}
      >
        <SettingRow
          name={t['com.affine.appearanceSettings.menubar.toggle']()}
          desc={t['com.affine.appearanceSettings.menubar.description']()}
        >
          <Switch
            checked={traySetting.enabled}
            onChange={checked => traySettingService.setEnabled(checked)}
          />
        </SettingRow>
      </SettingWrapper>
      {traySetting.enabled && !environment.isMacOs ? (
        <SettingWrapper
          id="windowBehavior"
          title={t[
            'com.affine.appearanceSettings.menubar.windowBehavior.title'
          ]()}
        >
          <SettingRow
            name={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.openOnLeftClick.toggle'
            ]()}
            desc={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.openOnLeftClick.description'
            ]()}
          >
            <Switch
              checked={traySetting.openOnLeftClick}
              onChange={checked =>
                traySettingService.setOpenOnLeftClick(checked)
              }
            />
          </SettingRow>
          <SettingRow
            name={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.minimizeToTray.toggle'
            ]()}
            desc={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.minimizeToTray.description'
            ]()}
          >
            <Switch
              checked={traySetting.minimizeToTray}
              onChange={checked =>
                traySettingService.setMinimizeToTray(checked)
              }
            />
          </SettingRow>
          <SettingRow
            name={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.closeToTray.toggle'
            ]()}
            desc={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.closeToTray.description'
            ]()}
          >
            <Switch
              checked={traySetting.closeToTray}
              onChange={checked => traySettingService.setCloseToTray(checked)}
            />
          </SettingRow>
          <SettingRow
            name={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.startMinimized.toggle'
            ]()}
            desc={t[
              'com.affine.appearanceSettings.menubar.windowBehavior.startMinimized.description'
            ]()}
          >
            <Switch
              checked={traySetting.startMinimized}
              onChange={checked =>
                traySettingService.setStartMinimized(checked)
              }
            />
          </SettingRow>
        </SettingWrapper>
      ) : null}
    </>
  );
};

export const AppearanceSettings = () => {
  const t = useI18n();

  const featureFlagService = useService(FeatureFlagService);
  const enableThemeEditor = useLiveData(
    featureFlagService.flags.enable_theme_editor.$
  );
  const { appSettings, updateSettings } = useAppSettingHelper();

  return (
    <>
      <SettingHeader
        title={t['com.affine.appearanceSettings.title']()}
        subtitle={t['com.affine.appearanceSettings.subtitle']()}
      />

      <SettingWrapper title={t['com.affine.appearanceSettings.theme.title']()}>
        <SettingRow
          name={t['com.affine.appearanceSettings.color.title']()}
          desc={t['com.affine.appearanceSettings.color.description']()}
        >
          <ThemeSettings />
        </SettingRow>
        <SettingRow
          name={t['com.affine.appearanceSettings.accentColor.title']()}
          desc={t['com.affine.appearanceSettings.accentColor.description']()}
        >
          <AccentColorSetting />
        </SettingRow>
        <SettingRow
          name={t['com.affine.appearanceSettings.secondAccentColor.title']()}
          desc={t['com.affine.appearanceSettings.secondAccentColor.description']()}
        >
          <SecondAccentColorSetting />
        </SettingRow>
        <SettingRow
          name={t['com.affine.appearanceSettings.language.title']()}
          desc={t['com.affine.appearanceSettings.language.description']()}
        >
          <div className={settingWrapper}>
            <LanguageMenu />
          </div>
        </SettingRow>
        {BUILD_CONFIG.isElectron ? (
          <SettingRow
            name={t['com.affine.appearanceSettings.clientBorder.title']()}
            desc={t['com.affine.appearanceSettings.clientBorder.description']()}
            data-testid="client-border-style-trigger"
          >
            <Switch
              checked={appSettings.clientBorder}
              onChange={checked => updateSettings('clientBorder', checked)}
            />
          </SettingRow>
        ) : null}
        {enableThemeEditor ? <ThemeEditorSetting /> : null}
      </SettingWrapper>

      <SettingWrapper title={t['com.affine.appearanceSettings.images.title']()}>
        <SettingRow
          name={t['com.affine.appearanceSettings.images.antialiasing.title']()}
          desc={t[
            'com.affine.appearanceSettings.images.antialiasing.description'
          ]()}
          data-testid="image-antialiasing-trigger"
        >
          <Switch
            checked={!appSettings.disableImageAntialiasing}
            onChange={checked =>
              updateSettings('disableImageAntialiasing', !checked)
            }
          />
        </SettingRow>
      </SettingWrapper>

      {BUILD_CONFIG.isWeb && !environment.isMobile ? (
        <SettingWrapper title={t['com.affine.setting.appearance.links']()}>
          <SettingRow
            name={t['com.affine.setting.appearance.open-in-app']()}
            desc={t['com.affine.setting.appearance.open-in-app.hint']()}
            data-testid="open-in-app-links-trigger"
          >
            <OpenInAppLinksMenu />
          </SettingRow>
        </SettingWrapper>
      ) : null}

      <SettingWrapper
        title={t['com.affine.appearanceSettings.sidebar.title']()}
      >
        {BUILD_CONFIG.isElectron ? (
          <SettingRow
            name={t['com.affine.appearanceSettings.noisyBackground.title']()}
            desc={t[
              'com.affine.appearanceSettings.noisyBackground.description'
            ]()}
          >
            <Switch
              checked={appSettings.enableNoisyBackground}
              onChange={checked =>
                updateSettings('enableNoisyBackground', checked)
              }
            />
          </SettingRow>
        ) : null}
        {BUILD_CONFIG.isElectron && environment.isMacOs && (
          <SettingRow
            name={t['com.affine.appearanceSettings.translucentUI.title']()}
            desc={t[
              'com.affine.appearanceSettings.translucentUI.description'
            ]()}
          >
            <Switch
              checked={appSettings.enableBlurBackground}
              onChange={checked =>
                updateSettings('enableBlurBackground', checked)
              }
            />
          </SettingRow>
        )}
        <SettingRow
          name={t[
            'com.affine.appearanceSettings.showLinkedDocInSidebar.title'
          ]()}
          desc={t[
            'com.affine.appearanceSettings.showLinkedDocInSidebar.description'
          ]()}
        >
          <Switch
            checked={!!appSettings.showLinkedDocInSidebar}
            onChange={checked =>
              updateSettings('showLinkedDocInSidebar', checked)
            }
          />
        </SettingRow>
      </SettingWrapper>


      {BUILD_CONFIG.isElectron ? <MenubarSetting /> : null}
    </>
  );
};
