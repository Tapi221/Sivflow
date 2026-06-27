import { PublicUserType } from '../../core/user';
import { TestingApp } from './testing-app';

export const currentUser = async (app: TestingApp) => {
  const res = await app.gql(`
      query {
        currentUser {
          id, name, email, emailVerified, avatarUrl, hasPassword,
          token { token }
        }
      }
    `);
  return res.currentUser;
};

export const getPublicUserById = async (app: TestingApp, id: string): Promise<PublicUserType | null> => {
  const res = await app.gql(
    `
    query getPublicUserById($id: String!) {
      publicUserById(id: $id) {
        id
        name
        avatarUrl
      }
    }
    `,
    { id }
  );
  return res.publicUserById;
};

export const sendChangeEmail = async (app: TestingApp, callbackUrl: string): Promise<boolean> => {
  const res = await app.gql(`
    mutation {
      sendChangeEmail(callbackUrl: "${callbackUrl}")
    }
  `);

  return res.sendChangeEmail;
};

export const sendSetPasswordEmail = async (app: TestingApp, email: string, callbackUrl: string): Promise<boolean> => {
  const res = await app.gql(`
    mutation {
      sendSetPasswordEmail(email: "${email}", callbackUrl: "${callbackUrl}")
    }
  `);

  return res.sendSetPasswordEmail;
};

export const changePassword = async (app: TestingApp, userId: string, token: string, password: string): Promise<string> => {
  const res = await app.gql(`
    mutation {
      changePassword(token: "${token}", userId: "${userId}", newPassword: "${password}")
    }
  `);

  return res.changePassword;
};

export const sendVerifyChangeEmail = async (app: TestingApp, token: string, email: string, callbackUrl: string): Promise<boolean> => {
  const res = await app.gql(`
    mutation {
      sendVerifyChangeEmail(token: "${token}", email: "${email}", callbackUrl: "${callbackUrl}")
    }
  `);

  return res.sendVerifyChangeEmail;
};

export const changeEmail = async (app: TestingApp, token: string, email: string) => {
  const res = await app.gql(`
    mutation {
      changeEmail(token: "${token}", email: "${email}") {
        id
        name
        avatarUrl
        email
      }
    }
  `);

  return res.changeEmail;
};

export const deleteAccount = async (app: TestingApp) => {
  const res = await app.gql(`
    mutation {
      deleteAccount {
        success
      }
    }
  `);

  return res.deleteAccount.success;
};

export const updateAvatar = async (app: TestingApp, avatar: Buffer, options: { filename?: string; contentType?: string } = {}) => {
  return app
    .POST('/graphql')
    .field(
      'operations',
      JSON.stringify({
        name: 'uploadAvatar',
        query: `mutation uploadAvatar($avatar: Upload!) {
      uploadAvatar(avatar: $avatar) {
        avatarUrl
      }
    }`,
        variables: { avatar: null },
      })
    )
    .field('map', JSON.stringify({ '0': ['variables.avatar'] }))
    .attach('0', avatar, {
      filename: options.filename || 'test.png',
      contentType: options.contentType || 'image/png',
    });
};
