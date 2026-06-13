"use client";

import { createPlatePlugin } from "platejs/react";
import type { TComment } from "@/chip/ui/comment";
import { BlockDiscussion } from "@/chip/ui/plate/block-discussion";

type TDiscussion = {
  id: string;
  comments: TComment[];
  createdAt: Date;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
};
type TDiscussionUser = {
  id: string;
  avatarUrl: string;
  name: string;
  hue?: number;
};

const BLOCK_SUGGESTION_SELECTOR = '[data-block-suggestion="true"]';
const discussionsData: TDiscussion[] = [
  {
    id: "discussion1",
    comments: [
      {
        id: "comment1",
        contentRich: [
          {
            children: [
              {
                text: "Comments are a great way to provide feedback and discuss changes.",
              },
            ],
            type: "p",
          },
        ],
        createdAt: new Date(Date.now() - 600_000),
        discussionId: "discussion1",
        isEdited: false,
        userId: "charlie",
      },
      {
        id: "comment2",
        contentRich: [
          {
            children: [
              {
                text: "Agreed! The link to the docs makes it easy to learn more.",
              },
            ],
            type: "p",
          },
        ],
        createdAt: new Date(Date.now() - 500_000),
        discussionId: "discussion1",
        isEdited: false,
        userId: "bob",
      },
    ],
    createdAt: new Date(),
    documentContent: "comments",
    isResolved: false,
    userId: "charlie",
  },
  {
    id: "discussion2",
    comments: [
      {
        id: "comment1",
        contentRich: [
          {
            children: [
              {
                text: "Nice demonstration of overlapping annotations with both comments and suggestions!",
              },
            ],
            type: "p",
          },
        ],
        createdAt: new Date(Date.now() - 300_000),
        discussionId: "discussion2",
        isEdited: false,
        userId: "bob",
      },
      {
        id: "comment2",
        contentRich: [
          {
            children: [
              {
                text: "This helps users understand how powerful the editor can be.",
              },
            ],
            type: "p",
          },
        ],
        createdAt: new Date(Date.now() - 200_000),
        discussionId: "discussion2",
        isEdited: false,
        userId: "charlie",
      },
    ],
    createdAt: new Date(),
    documentContent: "overlapping",
    isResolved: false,
    userId: "bob",
  },
];
const usersData: Record<string, TDiscussionUser> = {
  alice: {
    id: "alice",
    avatarUrl: "https://api.dicebear.com/9.x/glass/svg?seed=alice6",
    name: "Alice",
  },
  bob: {
    id: "bob",
    avatarUrl: "https://api.dicebear.com/9.x/glass/svg?seed=bob4",
    name: "Bob",
  },
  charlie: {
    id: "charlie",
    avatarUrl: "https://api.dicebear.com/9.x/glass/svg?seed=charlie2",
    name: "Charlie",
  },
};
const discussionPlugin = createPlatePlugin({
  key: "discussion",
  options: {
    currentUserId: "alice",
    discussions: discussionsData,
    users: usersData,
  },
})
  .configure({
    render: { aboveNodes: BlockDiscussion },
  })
  .extendSelectors(({ getOption }) => ({
    currentUser: () => getOption("users")[getOption("currentUserId")],
    user: (id: string) => getOption("users")[id],
  }));
const DiscussionKit = [discussionPlugin];

const getTargetElement = (target: EventTarget | null) => {
  if (target instanceof HTMLElement) return target;
  if (target instanceof Node) return target.parentElement;

  return null;
};
const getDiscussionClickTarget = ({
  selector,
  target,
}: {
  selector: string;
  target: EventTarget | null;
}) => {
  const element = getTargetElement(target);

  if (!element) return null;

  return element.closest(selector) as HTMLElement | null;
};
const getDiscussionBlockClickTarget = ({
  selector = BLOCK_SUGGESTION_SELECTOR,
  target,
}: {
  selector?: string;
  target: EventTarget | null;
}) =>
  getDiscussionClickTarget({
    selector,
    target,
  });

export { DiscussionKit, discussionPlugin, getDiscussionBlockClickTarget, getDiscussionClickTarget };
export type { TDiscussion };
