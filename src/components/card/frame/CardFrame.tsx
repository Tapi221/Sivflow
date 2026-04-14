import React from "react";
import { cn } from "@/lib/utils";
import { ScaleToFitFrame } from "@/components/card/frame/ScaleToFitFrame";
import { CardShell } from "@/components/card/frame/CardShell";
import { CardSurface } from "@/components/card/frame/CardSurface";
import type { CssVars } from "@/types/style";
import {
  CARD_BASE_WIDTH,
  CARD_DISPLAY_SCALE,
  CARD_RULED_OFFSET_BOTTOM_PX,
  CARD_ROW_PX,
  CARD_RULED_OFFSET_TOP_PX,
} from "@/components/card/common/constants";

// CardShell の props 型をそのまま流用するための別名
type CardShellProps = React.ComponentProps<typeof CardShell>;

/**
 * CardFrame:
 * - 「カードの外枠 + スケール調整 + 罫線背景 + overlay」をまとめた共通フレーム
 * - 編集/閲覧/学習など、どこでも同じカード見た目にしたい時の“正”になるコンポーネント
 */
export interface CardFrameProps
  // CardShell の props を基本的に引き継ぐが、
  // children は CardFrame 側で明示管理し、
  // className は CardFrame が標準スタイルを持つので上書き合成のため別定義、
  // ref は forwardRef で受けるので除外する
  extends Omit<CardShellProps, "children" | "className" | "ref"> {
  /** カード内部に表示する内容 */
  children: React.ReactNode;

  /** “設計上のカード基準幅(px)”。ScaleToFitFrame の基準にも使う */
  baseWidth?: number;

  /** 画面端からの余白など、スケール計算に使う padding(px) */
  contentPaddingPx?: number;

  /** 基準幅より大きく拡大して表示してよいか */
  allowUpscale?: boolean;

  /** 拡大時の最大スケール */
  maxScale?: number;

  /** 追加のスケール倍率 */
  scaleMultiplier?: number;

  /** 親から与える固定スケール。指定時は自動計算より優先 */
  fixedScale?: number;

  /** ScaleToFitFrame の拡大縮小を無効化する */
  disableScale?: boolean;

  /** カード本体を親幅いっぱいに広げる */
  stretchWidth?: boolean;

  /** CardShell に渡す追加クラス（標準クラスに合成される） */
  className?: string;

  /** 罫線（ノートっぽい線）を使うか */
  ruled?: boolean;

  /** 罫線の行間(px)。CARD_ROW_PX と揃えると「文字行」と一致する */
  ruledRowPx?: number;

  /** 罫線の開始Yオフセット(px)。上部 padding と揃えてズレを防ぐ */
  ruledOffsetPx?: number;

  /** 罫線の不透明度（薄さ調整） */
  ruledOpacity?: number;
  /** カード下端から最後の罫線までのオフセット(px) */
  ruledBottomOffsetPx?: number;
  /** 罫線の位相オフセット(px)。未指定時は 0。 */
  ruledPhasePx?: number;

  /** カード表面に重ねる overlay（例: インク層、選択ハイライト、UIレイヤなど） */
  overlay?: React.ReactNode;

  /** カード本体の直上に密着表示する付属UI（例: ブロック追加ツールバー） */
  topAttachment?: React.ReactNode;
}

/**
 * forwardRef:
 * - 親が CardShell の DOM を掴めるようにする（計測、スクロール制御、focus、DND等で必要になりがち）
 */
export const CardFrame = React.forwardRef<HTMLDivElement, CardFrameProps>(
  (
    {
      children,

      // カードの“基準幅”。ここを変えるとスケールやレイアウト基準が変わる
      baseWidth = CARD_BASE_WIDTH,

      // 画面側の余白。小さいと画面端ギリギリまでカードが来て事故りやすい
      contentPaddingPx = 12,
      allowUpscale = true,
      maxScale = 1.6,
      scaleMultiplier = CARD_DISPLAY_SCALE,
      fixedScale,
      disableScale = false,
      stretchWidth = false,

      // 追加のクラス（標準の見た目に合成）
      className,

      // 罫線背景の設定（紙っぽいカード前提）
      ruled = true,
      ruledRowPx = CARD_ROW_PX,
      ruledOffsetPx = CARD_RULED_OFFSET_TOP_PX,
      ruledBottomOffsetPx = CARD_RULED_OFFSET_BOTTOM_PX,
      ruledPhasePx = 0,
      ruledOpacity = 1,

      // 表面に重ねるUIレイヤ（例: インク、選択状態、ガイド）
      overlay,
      topAttachment,

      // CardShell に渡す style（外から上書きできる）
      style,

      // CardShell に渡すそれ以外の props（onClick 等）
      ...shellProps
    },
    ref,
  ) => {
    return (
      /**
       * ScaleToFitFrame:
       * - 画面サイズに合わせて「カード全体」を縮小/拡大して収めるラッパー
       * - baseWidth を基準にスケール計算する
       * - contentPaddingPx は「カード周囲の安全余白」としてスケール計算に使う
       */
      <ScaleToFitFrame
        baseWidth={baseWidth}
        contentPaddingPx={contentPaddingPx}
        allowUpscale={allowUpscale}
        maxScale={maxScale}
        scaleMultiplier={scaleMultiplier}
        fixedScale={fixedScale}
        disableScale={disableScale}
      >
        {/* スケール後のカードを中央寄せしたいので mx-auto ラッパー */}
        <div
          className={cn("mx-auto", stretchWidth && "min-w-0")}
          style={{
            width: stretchWidth ? "100%" : `${Math.max(1, baseWidth)}px`,
            maxWidth: stretchWidth ? "100%" : undefined,
            minWidth: stretchWidth ? 0 : undefined,
          }}
        >
          {topAttachment ? (
            <div className="w-full overflow-visible">{topAttachment}</div>
          ) : null}
          {/**
           * CardShell:
           * - カード外枠（角丸/影/背景/ボーダーなど）を担う“器”
           * - ここが「カードの物理感」を作る中核
           */}
          {(() => {
            const shellStyle: CssVars = {
              ...(style as React.CSSProperties | undefined),
              ...(stretchWidth
                ? {
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                  }
                : {}),
              "--card-base-width": `${Math.max(1, baseWidth)}px`,
            };

            return (
              <CardShell
                ref={ref}
                className={cn(
                  // 標準スタイル: 中央寄せ、ボーダー無し、角丸をデバイス幅で変える
                  "mx-auto border-none rounded-[24px] md:rounded-[28px]",
                  stretchWidth && "min-w-0 max-w-full",
                  className,
                )}
                style={shellStyle}
                {...shellProps}
              >
                {/**
                 * CardSurface:
                 * - カードの“紙面”部分（罫線背景、内側padding、overlayレイヤなど）を担当
                 * - CardShell が「外側」なら CardSurface は「中身の紙」
                 */}
                <CardSurface
                  ruled={ruled}
                  ruledRowPx={ruledRowPx}
                  ruledOffsetPx={ruledOffsetPx}
                  ruledBottomOffsetPx={ruledBottomOffsetPx}
                  ruledPhasePx={ruledPhasePx}
                  ruledOpacity={ruledOpacity}
                  overlay={overlay}
                >
                  {/* 実際のカード内容（ブロック群、テキスト、メディアなど） */}
                  {children}
                </CardSurface>
              </CardShell>
            );
          })()}
        </div>
      </ScaleToFitFrame>
    );
  },
);

CardFrame.displayName = "CardFrame";
