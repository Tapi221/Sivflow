"use client";

import { BasicBlocksKit } from "@web-renderer/components/editor/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@web-renderer/components/editor/plugins/basic-marks-kit";

const BasicNodesKit = [...BasicBlocksKit, ...BasicMarksKit];

export { BasicNodesKit };
