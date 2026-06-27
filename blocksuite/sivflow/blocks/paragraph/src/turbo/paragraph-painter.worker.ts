import type {
  BlockLayout,
  BlockLayoutPainter,
  TextRect,
  WorkerToHostMessage,
} from '@blocksuite/affine-gfx-turbo-renderer';
import {
  BlockLayoutPainterExtension,
  getBaseline,
} from '@blocksuite/affine-gfx-turbo-renderer/painter';

interface SentenceLayout {
  text: string;
  rects: TextRect[];
  fontSize: number;
}

export interface ParagraphLayout extends BlockLayout {
  type: 'affine:paragraph';
  sentences: SentenceLayout[];
}

const debugSentenceBorder = false;

function isParagraphLayout(layout: BlockLayout): layout is ParagraphLayout {
  return layout.type === 'affine:paragraph';
}

class ParagraphLayoutPainter implements BlockLayoutPainter {
  private static readonly supportFontFace =
    typeof FontFace !== 'undefined' &&
    typeof self !== 'undefined' &&
    'fonts' in self;

  static readonly font = ParagraphLayoutPainter.supportFontFace
    ? new FontFace(
        'Inter',
        `url(https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ8UA3.woff2)`
      )
    : null;

  static fontLoaded = !ParagraphLayoutPainter.supportFontFace;

  static {
    if (ParagraphLayoutPainter.supportFontFace && ParagraphLayoutPainter.font) {
      self.fonts.add(ParagraphLayoutPainter.font);

      ParagraphLayoutPainter.font
        .load()
        .then(() => {
          ParagraphLayoutPainter.fontLoaded = true;
        })
        .catch(error => {
          console.error('Failed to load Inter font:', error);
        });
    }
  }

  paint(
    ctx: OffscreenCanvasRenderingContext2D,
    layout: BlockLayout,
    layoutBaseX: number,
    layoutBaseY: number
  ): void {
    if (!ParagraphLayoutPainter.fontLoaded) {
      const message: WorkerToHostMessage = {
        type: 'paintError',
        error: 'Font not loaded',
        blockType: 'affine:paragraph',
      };
      self.postMessage(message);
      return;
    }

    if (!isParagraphLayout(layout)) {
      console.warn(
        'Expected paragraph layout but received different format:',
        layout
      );
      return;
    }

    ctx.save();
    ctx.translate(layoutBaseX, layoutBaseY);

    ctx.font = `${layout.sentences[0]?.fontSize ?? 16}px Inter`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'black';

    if (debugSentenceBorder) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
    }

    layout.sentences.forEach(sentence => {
      const baseline = getBaseline(sentence.fontSize);
      sentence.rects.forEach(rect => {
        if (debugSentenceBorder) {
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
        ctx.fillText(sentence.text, rect.x, rect.y + baseline);
      });
    });

    ctx.restore();
  }
}

BlockLayoutPainterExtension(ParagraphLayoutPainter);
