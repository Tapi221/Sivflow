"use client";

import { TocPlugin } from "@platejs/toc/react";
import { TocElement } from "@/chip/ui/node/toc-node";

const TocKit = [
  TocPlugin.configure({
    options: {
      // isScroll: true,
      topOffset: 80,
    },
  }).withComponent(TocElement),
];

export { TocKit };
