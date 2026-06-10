import * as OfficialAi from "@platejs/ai/react";
import { BasicBlocksPlugin, BasicMarksPlugin } from "@platejs/basic-nodes/react";
import * as OfficialBasicStyles from "@platejs/basic-styles/react";
import * as OfficialComment from "@platejs/comment/react";
import * as OfficialEmoji from "@platejs/emoji/react";
import * as OfficialIndent from "@platejs/indent/react";
import * as OfficialLink from "@platejs/link/react";
import * as OfficialList from "@platejs/list/react";
import * as OfficialMedia from "@platejs/media/react";
import * as OfficialTable from "@platejs/table/react";
import { ParagraphPlugin } from "platejs/react";

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getOfficialPlugin = (pluginModule: unknown, names: readonly string[]): unknown | null => {
  if (!isRecord(pluginModule)) return null;

  for (const name of names) {
    const plugin = pluginModule[name];
    if (plugin) return plugin;
  }

  return null;
};

const getOfficialPlugins = (pluginModule: unknown, names: readonly string[]): unknown[] => names.map((name) => getOfficialPlugin(pluginModule, [name])).filter(Boolean);

const getPlatePluginKey = (plugin: unknown, fallback: string): string => isRecord(plugin) && typeof plugin.key === "string" ? plugin.key : fallback;

const OFFICIAL_AI_PLUGIN = getOfficialPlugin(OfficialAi, ["AIPlugin"]);
const OFFICIAL_ALIGN_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["AlignPlugin", "TextAlignPlugin"]);
const OFFICIAL_FONT_BACKGROUND_COLOR_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["FontBackgroundColorPlugin", "BackgroundColorPlugin"]);
const OFFICIAL_FONT_COLOR_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["FontColorPlugin", "ColorPlugin"]);
const OFFICIAL_FONT_SIZE_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["FontSizePlugin"]);
const OFFICIAL_HIGHLIGHT_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["HighlightPlugin"]);
const OFFICIAL_LINE_HEIGHT_PLUGIN = getOfficialPlugin(OfficialBasicStyles, ["LineHeightPlugin"]);
const OFFICIAL_COMMENT_PLUGIN = getOfficialPlugin(OfficialComment, ["CommentPlugin"]);
const OFFICIAL_EMOJI_PLUGIN = getOfficialPlugin(OfficialEmoji, ["EmojiPlugin"]);
const OFFICIAL_INDENT_PLUGIN = getOfficialPlugin(OfficialIndent, ["IndentPlugin"]);
const OFFICIAL_LINK_PLUGIN = getOfficialPlugin(OfficialLink, ["LinkPlugin"]);
const OFFICIAL_BULLETED_LIST_PLUGIN = getOfficialPlugin(OfficialList, ["BulletedListPlugin"]);
const OFFICIAL_NUMBERED_LIST_PLUGIN = getOfficialPlugin(OfficialList, ["NumberedListPlugin"]);
const OFFICIAL_LIST_ITEM_PLUGIN = getOfficialPlugin(OfficialList, ["ListItemPlugin"]);
const OFFICIAL_TODO_LIST_PLUGIN = getOfficialPlugin(OfficialList, ["TodoListPlugin", "TaskListPlugin"]);
const OFFICIAL_IMAGE_PLUGIN = getOfficialPlugin(OfficialMedia, ["ImagePlugin"]);
const OFFICIAL_VIDEO_PLUGIN = getOfficialPlugin(OfficialMedia, ["VideoPlugin"]);
const OFFICIAL_AUDIO_PLUGIN = getOfficialPlugin(OfficialMedia, ["AudioPlugin"]);
const OFFICIAL_FILE_PLUGIN = getOfficialPlugin(OfficialMedia, ["FilePlugin", "MediaFilePlugin"]);
const OFFICIAL_TABLE_PLUGIN = getOfficialPlugin(OfficialTable, ["TablePlugin"]);
const OFFICIAL_TABLE_ROW_PLUGIN = getOfficialPlugin(OfficialTable, ["TableRowPlugin"]);
const OFFICIAL_TABLE_CELL_PLUGIN = getOfficialPlugin(OfficialTable, ["TableCellPlugin"]);
const OFFICIAL_TABLE_HEADER_CELL_PLUGIN = getOfficialPlugin(OfficialTable, ["TableCellHeaderPlugin", "TableHeaderCellPlugin"]);

export const PLATE_BACKGROUND_COLOR_MARK = getPlatePluginKey(OFFICIAL_FONT_BACKGROUND_COLOR_PLUGIN, "backgroundColor");
export const PLATE_COLOR_MARK = getPlatePluginKey(OFFICIAL_FONT_COLOR_PLUGIN, "color");
export const PLATE_FONT_SIZE_MARK = getPlatePluginKey(OFFICIAL_FONT_SIZE_PLUGIN, "fontSize");
export const PLATE_COMMENT_MARK = getPlatePluginKey(OFFICIAL_COMMENT_PLUGIN, "comment");
export const PLATE_LINK_TYPE = getPlatePluginKey(OFFICIAL_LINK_PLUGIN, "a");
export const PLATE_BULLETED_LIST_TYPE = getPlatePluginKey(OFFICIAL_BULLETED_LIST_PLUGIN, "ul");
export const PLATE_NUMBERED_LIST_TYPE = getPlatePluginKey(OFFICIAL_NUMBERED_LIST_PLUGIN, "ol");
export const PLATE_LIST_ITEM_TYPE = getPlatePluginKey(OFFICIAL_LIST_ITEM_PLUGIN, "li");
export const PLATE_TODO_TYPE = getPlatePluginKey(OFFICIAL_TODO_LIST_PLUGIN, "todo");
export const PLATE_IMAGE_TYPE = getPlatePluginKey(OFFICIAL_IMAGE_PLUGIN, "img");
export const PLATE_VIDEO_TYPE = getPlatePluginKey(OFFICIAL_VIDEO_PLUGIN, "video");
export const PLATE_AUDIO_TYPE = getPlatePluginKey(OFFICIAL_AUDIO_PLUGIN, "audio");
export const PLATE_FILE_TYPE = getPlatePluginKey(OFFICIAL_FILE_PLUGIN, "file");
export const PLATE_TABLE_TYPE = getPlatePluginKey(OFFICIAL_TABLE_PLUGIN, "table");
export const PLATE_TABLE_ROW_TYPE = getPlatePluginKey(OFFICIAL_TABLE_ROW_PLUGIN, "tr");
export const PLATE_TABLE_CELL_TYPE = getPlatePluginKey(OFFICIAL_TABLE_CELL_PLUGIN, "td");
export const PLATE_TABLE_HEADER_CELL_TYPE = getPlatePluginKey(OFFICIAL_TABLE_HEADER_CELL_PLUGIN, "th");
export const NOTE_PLATE_PLUGINS = [ParagraphPlugin, BasicBlocksPlugin, BasicMarksPlugin, OFFICIAL_AI_PLUGIN, OFFICIAL_ALIGN_PLUGIN, OFFICIAL_FONT_BACKGROUND_COLOR_PLUGIN, OFFICIAL_FONT_COLOR_PLUGIN, OFFICIAL_FONT_SIZE_PLUGIN, OFFICIAL_HIGHLIGHT_PLUGIN, OFFICIAL_LINE_HEIGHT_PLUGIN, OFFICIAL_COMMENT_PLUGIN, OFFICIAL_EMOJI_PLUGIN, OFFICIAL_INDENT_PLUGIN, OFFICIAL_LINK_PLUGIN, ...getOfficialPlugins(OfficialList, ["ListPlugin", "BulletedListPlugin", "NumberedListPlugin", "ListItemPlugin", "TodoListPlugin", "TaskListPlugin"]), ...getOfficialPlugins(OfficialMedia, ["ImagePlugin", "VideoPlugin", "AudioPlugin", "FilePlugin", "MediaFilePlugin", "PlaceholderPlugin"]), ...getOfficialPlugins(OfficialTable, ["TablePlugin", "TableRowPlugin", "TableCellPlugin", "TableCellHeaderPlugin", "TableHeaderCellPlugin"])].filter(Boolean);
