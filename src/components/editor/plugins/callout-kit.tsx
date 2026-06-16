"use client";

import { CalloutPlugin } from "@platejs/callout/react";
import { CalloutElement } from "@web-renderer/chip/ui/plate/callout-node";

const CalloutKit = [CalloutPlugin.withComponent(CalloutElement)];

export { CalloutKit };
