import { PaginationInput } from '../../base/graphql/pagination';
import type { MentionInput, PaginatedNotificationObjectType, } from '../../core/notification/types';
import type { TestingApp } from './testing-app';

export const listNotifications = async (app: TestingApp, pagination: PaginationInput): Promise<PaginatedNotificationObjectType> => { const res = await app.gql( ` query listNotifications($pagination: PaginationInput!) { currentUser { notifications(pagination: $pagination) { totalCount edges { cursor node { id type level read createdAt updatedAt body } } pageInfo { startCursor endCursor hasNextPage hasPreviousPage } } } } `, { pagination } );
  return res.currentUser.notifications;
};

export const mentionUser = async (app: TestingApp, input: MentionInput): Promise<string> => { const res = await app.gql( ` mutation mentionUser($input: MentionInput!) { mentionUser(input: $input) } `, { input } );
  return res.mentionUser;
};

export const readNotification = async (app: TestingApp, id: string): Promise<boolean> => { const res = await app.gql( ` mutation readNotification($id: String!) { readNotification(id: $id) } `, { id } );
  return res.readNotification;
};
