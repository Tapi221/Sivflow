import type {
  GfxCommonBlockProps,
  GfxElementGeometry,
} from '@blocksuite/std/gfx';
import { GfxCompatible } from '@blocksuite/std/gfx';
import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
} from '@blocksuite/store';

import type { BlockMeta, EmbedCardStyle } from '../../utils/index.js';
import { AttachmentBlockTransformer } from './attachment-transformer.js';

/**
 * 添付ファイルのアップロード中は、`sourceId` は `undefined` になります。
 * アップロード状況は `isAttachmentLoading` 関数で確認できます。
 *
 * blob のアップロードが完了していない間、他の共同編集者には
 * エラー状態の添付ファイルブロックとして表示されます。
 * 将来的には awareness システムを通じてアップロード状態を同期することで、
 * この問題を解決できます。
 *
 * 添付ファイルのアップロードが完了すると、`sourceId` には blob の ID が入ります。
 *
 * `sourceId` が存在せず、かつ `isAttachmentLoading` 関数が `false` を返す場合、
 * 添付ファイルのアップロードに失敗したことを意味します。
 */

/**
 * @deprecated
 */
type BackwardCompatibleUndefined = undefined;

export const AttachmentBlockStyles = [
  'cubeThick',
  'horizontalThin',
  'pdf',
  'citation',
] as const satisfies EmbedCardStyle[];

export type AttachmentBlockProps = {
  name: string;
  size: number;
  /**
   * MIME タイプ
   */
  type: string;
  caption?: string;
  // `loadingKey` は添付ファイルが読み込み中かどうかを示すために使われていましたが、
  // 現在は使われていません。破壊的変更を避けるために残されています。
  // `loadingKey` と `sourceId` は同時に存在してはいけません。
  // loadingKey?: string | null;
  sourceId?: string;
  /**
   * 添付ファイルを埋め込みビューとして表示するかどうか。
   */
  embed: boolean | BackwardCompatibleUndefined;

  style?: (typeof AttachmentBlockStyles)[number];

  footnoteIdentifier: string | null;

  comments?: Record<string, boolean>;
} & Omit<GfxCommonBlockProps, 'scale'> &
  BlockMeta;

export const defaultAttachmentProps: AttachmentBlockProps = {
  name: '',
  size: 0,
  type: 'application/octet-stream',
  sourceId: undefined,
  caption: undefined,
  embed: false,
  style: AttachmentBlockStyles[1],
  index: 'a0',
  xywh: '[0,0,0,0]',
  lockedBySelf: false,
  rotate: 0,
  'meta:createdAt': undefined,
  'meta:updatedAt': undefined,
  'meta:createdBy': undefined,
  'meta:updatedBy': undefined,
  footnoteIdentifier: null,
  comments: undefined,
};

export const AttachmentBlockSchema = defineBlockSchema({
  flavour: 'affine:attachment',
  props: (): AttachmentBlockProps => defaultAttachmentProps,
  metadata: {
    version: 1,
    role: 'content',
    parent: [
      'affine:note',
      'affine:surface',
      'affine:edgeless-text',
      'affine:paragraph',
      'affine:list',
    ],
    children: ['@attachment-viewer'],
  },
  transformer: transformerConfigs =>
    new AttachmentBlockTransformer(transformerConfigs),
  toModel: () => new AttachmentBlockModel(),
});

export const AttachmentBlockSchemaExtension = BlockSchemaExtension(
  AttachmentBlockSchema
);

export class AttachmentBlockModel
  extends GfxCompatible<AttachmentBlockProps>(BlockModel)
  implements GfxElementGeometry {}
