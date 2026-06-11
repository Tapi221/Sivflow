import { BlockquoteRules, BoldRules, CodeRules, HeadingRules, HighlightRules, HorizontalRuleRules, ItalicRules, MarkComboRules, StrikethroughRules, UnderlineRules } from "@platejs/basic-nodes";
import { BlockquotePlugin, BoldPlugin, CodePlugin, H1Plugin, H2Plugin, H3Plugin, H4Plugin, H5Plugin, H6Plugin, HighlightPlugin, HorizontalRulePlugin, ItalicPlugin, StrikethroughPlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { CaptionPlugin } from "@platejs/caption/react";
import { IndentPlugin } from "@platejs/indent/react";
import { LinkRules } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { BulletedListRules, OrderedListRules, TaskListRules } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { MarkdownPlugin, remarkMdx, remarkMention } from "@platejs/markdown";
import { AudioPlugin, FilePlugin, ImagePlugin, MediaEmbedPlugin, PlaceholderPlugin, VideoPlugin } from "@platejs/media/react";
import { TableCellHeaderPlugin, TableCellPlugin, TablePlugin, TableRowPlugin } from "@platejs/table/react";
import { KEYS } from "platejs";
import { ParagraphPlugin } from "platejs/react";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const AI_COMMAND_PLATE_PLUGINS = [
  ParagraphPlugin,
  H1Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H2Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H3Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H4Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H5Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H6Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  BlockquotePlugin.configure({ inputRules: [BlockquoteRules.markdown()] }),
  HorizontalRulePlugin.configure({ inputRules: [HorizontalRuleRules.markdown({ variant: "-" }), HorizontalRuleRules.markdown({ variant: "_" })] }),
  BoldPlugin.configure({ inputRules: [BoldRules.markdown({ variant: "*" }), BoldRules.markdown({ variant: "_" }), MarkComboRules.markdown({ variant: "boldItalic" }), MarkComboRules.markdown({ variant: "boldUnderline" }), MarkComboRules.markdown({ variant: "boldItalicUnderline" }), MarkComboRules.markdown({ variant: "italicUnderline" })] }),
  ItalicPlugin.configure({ inputRules: [ItalicRules.markdown({ variant: "*" }), ItalicRules.markdown({ variant: "_" })] }),
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }),
  CodePlugin.configure({ inputRules: [CodeRules.markdown()] }),
  StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()] }),
  HighlightPlugin.configure({ inputRules: [HighlightRules.markdown({ variant: "==" }), HighlightRules.markdown({ variant: "≡" })] }),
  IndentPlugin.configure({ inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.img] }, options: { offset: 24 } }),
  ListPlugin.configure({ inputRules: [BulletedListRules.markdown({ variant: "-" }), BulletedListRules.markdown({ variant: "*" }), OrderedListRules.markdown({ variant: "." }), OrderedListRules.markdown({ variant: ")" }), TaskListRules.markdown({ checked: false }), TaskListRules.markdown({ checked: true })] }),
  LinkPlugin.configure({ inputRules: [LinkRules.markdown(), LinkRules.autolink({ variant: "paste" }), LinkRules.autolink({ variant: "space" }), LinkRules.autolink({ variant: "break" })] }),
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
  ImagePlugin.configure({ options: { disableUploadInsert: true } }),
  MediaEmbedPlugin,
  VideoPlugin,
  AudioPlugin,
  FilePlugin,
  PlaceholderPlugin.configure({ options: { disableEmptyPlaceholder: true } }),
  CaptionPlugin.configure({ options: { query: { allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed] } } }),
  MarkdownPlugin.configure({ options: { plainMarks: [KEYS.suggestion, KEYS.comment], remarkPlugins: [remarkMath, remarkGfm, remarkEmoji as never, remarkMdx, remarkMention] } }),
];

export { AI_COMMAND_PLATE_PLUGINS };
