"use client";

import { MentionInputPlugin, MentionPlugin } from "@platejs/mention/react";
import { MentionElement, MentionInputElement } from "@/chip/ui/plate/mention-node";

const MentionKit = [
  MentionPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^$|^[\s"']$/,
    },
  }).withComponent(MentionElement),
  MentionInputPlugin.withComponent(MentionInputElement),
];

export { MentionKit };
