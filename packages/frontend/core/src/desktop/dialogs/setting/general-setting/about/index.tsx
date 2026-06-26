import { Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useAppUpdater } from '@affine/core/components/hooks/use-app-updater';
import { UrlService } from '@affine/core/modules/url';
import { appIconMap, appNames } from '@affine/core/utils/channel';
import { useI18n } from '@affine/i18n';
import { ArrowRightSmallIcon, OpenInNewIcon } from '@blocksuite/icons/rc';
import { useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import { useAppSettingHelper } from '../../../../../components/hooks/affine/use-app-setting-helper';
import { relatedLinks } from './config';
import * as styles from './style.css';
import { UpdateCheckSection } from './update-check-section';

export const AboutAffine = () => {
  const t = useI18n();
  const { appSettings, updateSettings } = useAppSettingHelper();
  const { toggleAutoCheck, toggleAutoDownload } = useAppUpdater();
  const channel = BUILD_CONFIG.appBuildType;
  const appIcon = appIconMap[channel];
  const appName = appNames[channel];
  const { urlService } = useServices({
    UrlService,
  });

  const onSwitchAutoCheck = useCallback(
    (checked: boolean) => {
      toggleAutoCheck(checked);
      updateSettings('autoCheckUpdate', checked);
    },
    [toggleAutoCheck, updateSettings]
  );

  const onSwitchAutoDownload = useCallback(
    (checked: boolean) => {
      toggleAutoDownload(checked);
      updateSettings('autoDownloadUpdate', checked);
    },
    [toggleAutoDownload, updateSettings]
  );

  const onSwitchTelemetry = useCallback(
    (checked: boolean) => {
      updateSettings('enableTelemetry', checked);
    },
    [updateSettings]
  );

  const onSwitchDisplayAIToolbarButton = useCallback(
    (checked: boolean) => {
      updateSettings('displayAIToolbarButton', checked);
    },
    [updateSettings]
  );

  const onSwitchDisplayTemplateToolbarButton = useCallback(
    (checked: boolean) => {
      updateSettings('displayTemplateToolbarButton', checked);
    },
    [updateSettings]
  );

  return (
    <>
      <SettingHeader
        title={t['com.affine.aboutSivflow.title']()}
        subtitle={t['com.affine.aboutSivflow.subtitle']()}
        data-testid="about-title"
      />
      <SettingWrapper title={t['com.affine.aboutSivflow.version.title']()}>
        <SettingRow
          name={appName}
          desc={BUILD_CONFIG.appVersion}
          className={styles.appImageRow}
        >
          <img src={appIcon} alt={appName} width={56} height={56} />
        </SettingRow>
        <SettingRow
          name={t['com.affine.aboutSivflow.version.editor.title']()}
          desc={BUILD_CONFIG.editorVersion}
        />
        {BUILD_CONFIG.isElectron ? (
          <>
            <UpdateCheckSection />
            <SettingRow
              name={t['com.affine.aboutSivflow.autoCheckUpdate.title']()}
              desc={t['com.affine.aboutSivflow.autoCheckUpdate.description']()}
            >
              <Switch
                checked={appSettings.autoCheckUpdate}
                onChange={onSwitchAutoCheck}
              />
            </SettingRow>
            <SettingRow
              name={t['com.affine.aboutSivflow.autoDownloadUpdate.title']()}
              desc={t[
                'com.affine.aboutSivflow.autoDownloadUpdate.description'
              ]()}
            >
              <Switch
                checked={appSettings.autoDownloadUpdate}
                onChange={onSwitchAutoDownload}
              />
            </SettingRow>
            <SettingRow
              name={t['com.affine.aboutSivflow.changelog.title']()}
              desc={t['com.affine.aboutSivflow.changelog.description']()}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                urlService.openPopupWindow(BUILD_CONFIG.changelogUrl);
              }}
            >
              <ArrowRightSmallIcon />
            </SettingRow>
          </>
        ) : null}
        <SettingRow
          name={t['com.affine.telemetry.enable']()}
          desc={t['com.affine.telemetry.enable.desc']()}
        >
          <Switch
            checked={appSettings.enableTelemetry !== false}
            onChange={onSwitchTelemetry}
          />
        </SettingRow>
        <SettingRow
          name={t['com.affine.aboutSivflow.displayAIToolbarButton.title']()}
          desc={t['com.affine.aboutSivflow.displayAIToolbarButton.description']()}
        >
          <Switch
            checked={appSettings.displayAIToolbarButton !== false}
            onChange={onSwitchDisplayAIToolbarButton}
          />
        </SettingRow>
        <SettingRow
          name={t['com.affine.aboutSivflow.displayTemplateToolbarButton.title']()}
          desc={t['com.affine.aboutSivflow.displayTemplateToolbarButton.description']()}
        >
          <Switch
            checked={appSettings.displayTemplateToolbarButton !== false}
            onChange={onSwitchDisplayTemplateToolbarButton}
          />
        </SettingRow>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutSivflow.contact.title']()}>
        <a
          className={styles.link}
          rel="noreferrer"
          href="https://affine.pro"
          target="_blank"
        >
          {t['com.affine.aboutSivflow.contact.website']()}
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href="https://affine.pro/redirect/discord"
          target="_blank"
        >
          {t['com.affine.aboutSivflow.contact.community']()}
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href="https://affine.pro/blog?tag=Release+Note"
          target="_blank"
        >
          {t['com.affine.app-sidebar.learn-more']()}
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutSivflow.community.title']()}>
        <div className={styles.communityWrapper}>
          {relatedLinks.map(({ icon, title, link }) => {
            return (
              <div
                className={styles.communityItem}
                onClick={() => {
                  urlService.openPopupWindow(link);
                }}
                key={title}
              >
                {icon}
                <p>{title}</p>
              </div>
            );
          })}
        </div>
      </SettingWrapper>
      <SettingWrapper title={t['com.affine.aboutSivflow.legal.title']()}>
        <a
          className={styles.link}
          rel="noreferrer"
          href="https://affine.pro/privacy"
          target="_blank"
        >
          {t['com.affine.aboutSivflow.legal.privacy']()}
          <OpenInNewIcon className="icon" />
        </a>
        <a
          className={styles.link}
          rel="noreferrer"
          href="https://affine.pro/terms"
          target="_blank"
        >
          {t['com.affine.aboutSivflow.legal.tos']()}
          <OpenInNewIcon className="icon" />
        </a>
      </SettingWrapper>
    </>
  );
};
