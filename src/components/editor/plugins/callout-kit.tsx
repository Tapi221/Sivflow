"use client";

import { CalloutPlugin } from "@platejs/callout/react";
import { CalloutElement } from "@/chip/ui/node/callout-node";

const CalloutKit = [CalloutPlugin.withComponent(CalloutElement)];

export { CalloutKit };
