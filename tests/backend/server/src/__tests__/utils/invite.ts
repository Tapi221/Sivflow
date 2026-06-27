import type { InvitationType } from '../../core/workspaces';
import type { TestingApp } from './testing-app';

export const inviteUser = async (app: TestingApp, workspaceId: string, email: string): Promise<string> => { const res = await app.gql(` mutation { inviteMembers(workspaceId: "${workspaceId}", emails: ["${email}"]) { inviteId } } `);

  return res.inviteMembers[0].inviteId;
};

export const inviteUsers = async (app: TestingApp, workspaceId: string, emails: string[]): Promise<Array<{ email: string; inviteId?: string }>> => {
  const res = await app.gql(
    `
    mutation inviteMembers($workspaceId: String!, $emails: [String!]!) {
      inviteMembers(
        workspaceId: $workspaceId
        emails: $emails
      ) {
        email
        inviteId
      }
    }
    `,
    { workspaceId, emails }
  );

  return res.inviteMembers;
};

export const getInviteLink = async (app: TestingApp, workspaceId: string): Promise<{ link: string; expireTime: string }> => {
  const res = await app.gql(`
    query {
      workspace(id: "${workspaceId}") {
        inviteLink {
          link
          expireTime
        }
      }
    }
  `);

  return res.workspace.inviteLink;
};

export const createInviteLink = async (app: TestingApp, workspaceId: string, expireTime: 'OneDay' | 'ThreeDays' | 'OneWeek' | 'OneMonth'): Promise<{ link: string; expireTime: string }> => {
  const res = await app.gql(`
    mutation {
      createInviteLink(workspaceId: "${workspaceId}", expireTime: ${expireTime}) {
        link
        expireTime
      }
    }
  `);

  return res.createInviteLink;
};

export const revokeInviteLink = async (app: TestingApp, workspaceId: string): Promise<boolean> => { const res = await app.gql(` mutation { revokeInviteLink(workspaceId: "${workspaceId}") } `);

  return res.revokeInviteLink;
};

export const acceptInviteById = async (app: TestingApp, workspaceId: string, inviteId: string, sendAcceptMail = false): Promise<boolean> => { const res = await app.gql(` mutation { acceptInviteById(workspaceId: "${workspaceId}", inviteId: "${inviteId}", sendAcceptMail: ${sendAcceptMail}) } `);

  return res.acceptInviteById;
};

export const approveMember = async (app: TestingApp, workspaceId: string, userId: string): Promise<string> => { const res = await app.gql(` mutation { approveMember(workspaceId: "${workspaceId}", userId: "${userId}") } `);

  return res.approveMember;
};

export const leaveWorkspace = async (app: TestingApp, workspaceId: string, sendLeaveMail = false): Promise<boolean> => { const res = await app.gql(` mutation { leaveWorkspace(workspaceId: "${workspaceId}", sendLeaveMail: ${sendLeaveMail}) } `);

  return res.leaveWorkspace;
};

export const revokeUser = async (app: TestingApp, workspaceId: string, userId: string): Promise<boolean> => { const res = await app.gql(` mutation { revokeMember(workspaceId: "${workspaceId}", userId: "${userId}") } `);

  return res.revokeMember;
};

export const getInviteInfo = async (app: TestingApp, inviteId: string): Promise<InvitationType> => { const res = await app.gql(` query { getInviteInfo(inviteId: "${inviteId}") { workspace { id name avatar } user { id name avatarUrl } status } } `);

  return res.getInviteInfo;
};
