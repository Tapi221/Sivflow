import type {
  UpdateUserSettingsInput,
  UserSettingsType,
} from '../../core/user/types';
import type { TestingApp } from './testing-app';

export const getUserSettings = async (app: TestingApp): Promise<UserSettingsType> => {
  const res = await app.gql(
    `
    query settings {
      currentUser {
        settings {
          receiveInvitationEmail
          receiveMentionEmail
          receiveCommentEmail
        }
      }
    }
    `
  );
  return res.currentUser.settings;
};

export const updateUserSettings = async (app: TestingApp, input: UpdateUserSettingsInput): Promise<boolean> => {
  const res = await app.gql(
    `
    mutation updateUserSettings($input: UpdateUserSettingsInput!) {
      updateSettings(input: $input)
    }
    `,
    { input }
  );
  return res.updateSettings;
};
