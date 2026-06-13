"use client";

import { LinkRules } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { LinkElement } from "@/chip/ui/plate/link-node";
import { LinkFloatingToolbar } from "@/chip/ui/toolbar/link-toolbar";

const LinkKit = [
  LinkPlugin.configure({
    inputRules: [
      LinkRules.markdown(),
      LinkRules.autolink({ variant: "paste" }),
      LinkRules.autolink({ variant: "space" }),
      LinkRules.autolink({ variant: "break" }),
    ],
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];

export { LinkKit };
