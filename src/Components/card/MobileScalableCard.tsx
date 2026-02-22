import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * モバイル縮小表示ラッパー
 * 
 * 紙型カード（固定幅480px）をモバイル画面でも横スクロールなしで表示するため、
 * 画面幅に応じてカード全体を縮小する。
 * 
 * @param cardDesignWidth - カードの設計幅（px）。デフォルト480px
 * @param safePadding - 左右の安全マージン（合計px）。デフォルト24px
 * @param enableEditMode - 編集モードを有効化するか（将来の拡張用）
 */

interface MobileScalableCardProps {
  children: React.ReactNode;
  cardDesignWidth?: number;
  safePadding?: number;
  enableEditMode?: boolean;
  className?: string;
}

export function MobileScalableCard({
  children,
  cardDesignWidth = 480,
  safePadding = 24,
  enableEditMode = false,
  className
}: MobileScalableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);

  // スケール計算と適用
  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return;

      const host = containerRef.current;
      const parentWidth =
        host?.parentElement?.getBoundingClientRect?.().width
        ?? host?.getBoundingClientRect?.().width
        ?? window.innerWidth;
      const availableWidth = Math.max(0, parentWidth - safePadding);
      
      // カードが画面幅を超える場合のみ縮小
      const calculatedScale = Math.min(1, availableWidth / cardDesignWidth);
      
      setScale(calculatedScale);
    };

    // 初回実行
    updateScale();

    // リサイズ監視
    window.addEventListener('resize', updateScale);
    
    // モダンブラウザ向けのResizeObserver（より正確なタイミングで検知）
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(document.body);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [cardDesignWidth, safePadding]);

  // 編集モード制御（将来の拡張用）
  useEffect(() => {
    if (!enableEditMode) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsEditMode(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // 少し遅延させて、次のフォーカスがない場合のみ解除
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
            setIsEditMode(false);
          }
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [enableEditMode]);

  // 編集モード時のESCキーで終了
  useEffect(() => {
    if (!isEditMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditMode(false);
        // フォーカスを外す
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditMode]);

  return (
    <>
      {/* 編集モード時の背景オーバーレイ */}
      {isEditMode && enableEditMode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setIsEditMode(false)}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* カードコンテナ */}
      <div
        ref={containerRef}
        className={cn(
          "w-full mx-auto transition-transform duration-300 ease-out",
          isEditMode && enableEditMode && "fixed inset-0 z-50 flex items-center justify-center p-4",
          className
        )}
        style={{
          transform: isEditMode && enableEditMode ? 'scale(1)' : `scale(${scale})`,
          transformOrigin: 'top center',
          // 縮小時の高さ調整（縮小した分だけ占有高さを減らす）
          ...(scale < 1 && !isEditMode ? {
            marginBottom: `calc((1 - ${scale}) * -100%)`
          } : {})
        }}
      >
        {children}
      </div>
    </>
  );
}
