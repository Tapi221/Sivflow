import type { GraphQLQuery } from './index';

export const cancelSubscriptionMutation = {
  id: 'cancelSubscriptionMutation' as const,
  op: 'cancelSubscription',
  query: `mutation cancelSubscription($plan: SubscriptionPlan = Pro, $workspaceId: String) {
  cancelSubscription(plan: $plan, workspaceId: $workspaceId) {
    status
    nextBillAt
    canceledAt
  }
}`,
} satisfies GraphQLQuery;

export const getCurrentUserQuery = {
  id: 'getCurrentUserQuery' as const,
  op: 'getCurrentUser',
  query: `query getCurrentUser {
  currentUser {
    id
    name
    email
    emailVerified
    avatarUrl
  }
}`,
} satisfies GraphQLQuery;

export const getWorkspacePageMetaByIdQuery = {
  id: 'getWorkspacePageMetaByIdQuery' as const,
  op: 'getWorkspacePageMetaById',
  query: `query getWorkspacePageMetaById($id: String!, $pageId: String!) {
  workspace(id: $id) {
    doc(docId: $pageId) {
      meta {
        createdAt
        updatedAt
        createdBy {
          name
          avatarUrl
        }
        updatedBy {
          name
          avatarUrl
        }
      }
    }
  }
}`,
} satisfies GraphQLQuery;

export const getWorkspaceSubscriptionQuery = {
  id: 'getWorkspaceSubscriptionQuery' as const,
  op: 'getWorkspaceSubscription',
  query: `query getWorkspaceSubscription($workspaceId: String!) {
  workspace(id: $workspaceId) {
    subscription {
      status
      plan
      recurring
      start
      end
      nextBillAt
      canceledAt
      variant
    }
  }
}`,
} satisfies GraphQLQuery;

export const quotaQuery = {
  id: 'quotaQuery' as const,
  op: 'quota',
  query: `query quota {
  currentUser {
    id
    quota {
      name
      blobLimit
      storageQuota
      usedStorageQuota
      historyPeriod
      memberLimit
      humanReadable {
        name
        blobLimit
        storageQuota
        usedStorageQuota
        historyPeriod
        memberLimit
      }
    }
  }
}`,
} satisfies GraphQLQuery;

export const resumeSubscriptionMutation = {
  id: 'resumeSubscriptionMutation' as const,
  op: 'resumeSubscription',
  query: `mutation resumeSubscription($plan: SubscriptionPlan = Pro, $workspaceId: String) {
  resumeSubscription(plan: $plan, workspaceId: $workspaceId) {
    status
    nextBillAt
    start
    end
  }
}`,
} satisfies GraphQLQuery;

export const refreshSubscriptionMutation = {
  id: 'refreshSubscriptionMutation' as const,
  op: 'refreshSubscription',
  query: `mutation refreshSubscription {
  refreshUserSubscriptions {
    status
    plan
    recurring
    start
    end
    nextBillAt
    canceledAt
    variant
  }
}`,
} satisfies GraphQLQuery;

export const requestApplySubscriptionMutation = {
  id: 'requestApplySubscriptionMutation' as const,
  op: 'requestApplySubscription',
  query: `mutation requestApplySubscription($transactionId: String!) {
  requestApplySubscription(transactionId: $transactionId) {
    status
    plan
    recurring
    start
    end
    nextBillAt
    canceledAt
    variant
  }
}`,
} satisfies GraphQLQuery;

export const subscriptionQuery = {
  id: 'subscriptionQuery' as const,
  op: 'subscription',
  query: `query subscription {
  currentUser {
    id
    subscriptions {
      status
      plan
      recurring
      start
      end
      nextBillAt
      canceledAt
      variant
    }
  }
}`,
} satisfies GraphQLQuery;

export const updateSubscriptionMutation = {
  id: 'updateSubscriptionMutation' as const,
  op: 'updateSubscription',
  query: `mutation updateSubscription($plan: SubscriptionPlan = Pro, $recurring: SubscriptionRecurring!, $workspaceId: String) {
  updateSubscriptionRecurring(
    plan: $plan
    recurring: $recurring
    workspaceId: $workspaceId
  ) {
    plan
    recurring
    nextBillAt
  }
}`,
} satisfies GraphQLQuery;
