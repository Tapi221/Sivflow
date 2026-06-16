"use client";

import { FootnoteDefinitionPlugin, FootnoteInputPlugin, FootnoteReferencePlugin } from "@platejs/footnote/react";

import { FootnoteDefinitionElement, FootnoteInputElement, FootnoteReferenceElement } from "@web-renderer/chip/ui/plate/footnote-node";



const FootnoteKit = [
  FootnoteInputPlugin.withComponent(FootnoteInputElement),
  FootnoteReferencePlugin.withComponent(FootnoteReferenceElement),
  FootnoteDefinitionPlugin.withComponent(FootnoteDefinitionElement),
];



export { FootnoteKit };
