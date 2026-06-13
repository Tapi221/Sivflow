"use client";

import type { EmptyText, KEYS, PlainText, TBasicMarks, TCaptionProps, TComboboxInputElement, TCommentText, TElement, TFontMarks, TImageElement, TLineHeightProps, TLinkElement, TListProps, TMediaEmbedElement, TMentionElement, TResizableProps, TTableElement, TText, TTextAlignProps } from "platejs";

interface MyBlockElement extends TElement, TListProps {
  id?: string;
}

interface MyCodeLineElement extends TElement {
  children: PlainText[];
  type: typeof KEYS.codeLine;
}

interface MyCodeBlockElement extends MyBlockElement {
  children: MyCodeLineElement[];
  type: typeof KEYS.codeBlock;
}

interface MyHrElement extends MyBlockElement {
  children: [EmptyText];
  type: typeof KEYS.hr;
}

interface MyImageElement extends MyBlockElement, TCaptionProps, TImageElement, TResizableProps {
  children: [EmptyText];
  type: typeof KEYS.img;
}

interface MyMediaEmbedElement extends MyBlockElement, TCaptionProps, TMediaEmbedElement, TResizableProps {
  children: [EmptyText];
  type: typeof KEYS.mediaEmbed;
}

interface MyMentionElement extends TMentionElement {
  children: [EmptyText];
  type: typeof KEYS.mention;
}

interface MyMentionInputElement extends TComboboxInputElement {
  children: [PlainText];
  type: typeof KEYS.mentionInput;
}

interface RichText extends TBasicMarks, TCommentText, TFontMarks, TText {
  kbd?: boolean;
}

interface MyLinkElement extends TLinkElement {
  children: RichText[];
  type: typeof KEYS.link;
}

interface MyTextBlockElement extends TElement, TLineHeightProps, TTextAlignProps {
  children: (| MyLinkElement | MyMentionElement | MyMentionInputElement | RichText)[];
}

interface MyBlockquoteElement extends MyTextBlockElement {
  type: typeof KEYS.blockquote;
}

interface MyH1Element extends MyTextBlockElement {
  type: typeof KEYS.h1;
}

interface MyH2Element extends MyTextBlockElement {
  type: typeof KEYS.h2;
}

/** Block props */
interface MyH3Element extends MyTextBlockElement {
  type: typeof KEYS.h3;
}

interface MyH4Element extends MyTextBlockElement {
  type: typeof KEYS.h4;
}

interface MyH5Element extends MyTextBlockElement {
  type: typeof KEYS.h5;
}

interface MyH6Element extends MyTextBlockElement {
  type: typeof KEYS.h6;
}

interface MyParagraphElement extends MyTextBlockElement {
  type: typeof KEYS.p;
}

type MyNestableBlock = MyParagraphElement;

interface MyTableCellElement extends TElement {
  children: MyNestableBlock[];
  type: typeof KEYS.td;
}

interface MyTableRowElement extends TElement {
  children: MyTableCellElement[];
  type: typeof KEYS.tr;
}

interface MyTableElement extends MyBlockElement, TTableElement {
  children: MyTableRowElement[];
  type: typeof KEYS.table;
}

interface MyToggleElement extends MyTextBlockElement {
  type: typeof KEYS.toggle;
}

type MyValue = (| MyBlockquoteElement | MyCodeBlockElement | MyH1Element | MyH2Element | MyH3Element | MyH4Element | MyH5Element | MyH6Element | MyHrElement | MyImageElement | MyMediaEmbedElement | MyParagraphElement | MyTableElement | MyToggleElement)[];

export type { MyBlockElement, MyTextBlockElement, MyBlockquoteElement, MyCodeBlockElement, MyCodeLineElement, MyH1Element, MyH2Element, MyH3Element, MyH4Element, MyH5Element, MyH6Element, MyHrElement, MyImageElement, MyLinkElement, MyMediaEmbedElement, MyMentionElement, MyMentionInputElement, MyNestableBlock, MyParagraphElement, MyTableCellElement, MyTableElement, MyTableRowElement, MyToggleElement, RichText, MyValue };
