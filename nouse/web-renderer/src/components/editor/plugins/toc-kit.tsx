"use client";

import { TocPlugin } from "@platejs/toc/react";

import { TocElement } from "@web-renderer/chip/ui/plate/toc-node";



const TocKit = [
  TocPlugin.configure({
    options: {
      topOffset: 80,
    },
  }).withComponent(TocElement),
];



export { TocKit };
