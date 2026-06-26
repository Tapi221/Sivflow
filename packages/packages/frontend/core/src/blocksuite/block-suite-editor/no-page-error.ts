import type { Store } from '@blocksuite/affine/store';
import type { Doc as YDoc, Map as YMap } from 'yjs';

/**
 * TODO(@eyhn): 将来的に想定外状態用のエラーをまとめて定義する。
 */
export class NoPageRootError extends Error {
  constructor(public page: Store) {
    super('Page root not found when render editor!');

    // sentry がより多くの情報を収集できるようにログを出力する
    const hasExpectSpace = Array.from(
      page.rootDoc.getMap<YDoc>('spaces').values()
    ).some(doc => page.spaceDoc.guid === doc.guid);
    const blocks = page.spaceDoc.getMap('blocks') as YMap<YMap<any>>;
    const havePageBlock = Array.from(blocks.values()).some(
      block => block.get('sys:flavour') === 'affine:page'
    );
    console.info(
      'NoPageRootError current data: %s',
      JSON.stringify({
        expectPageId: page.id,
        expectGuid: page.spaceDoc.guid,
        hasExpectSpace,
        blockSize: blocks.size,
        havePageBlock,
      })
    );
  }
}
