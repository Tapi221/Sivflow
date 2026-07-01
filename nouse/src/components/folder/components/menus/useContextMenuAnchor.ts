import { useCallback, useState } from "react";



/**
 * コンテキストメニュー（右クリック）の表示位置を管理するフック
 */
const useContextMenuAnchor = () => {
  const [anchorPoint, setAnchorPoint] = useState<{ x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setAnchorPoint({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const resetAnchor = useCallback(() => {
    setAnchorPoint(null);
  }, []);

  return {
    anchorPoint,
    handleContextMenu,
    resetAnchor,
  };
};



export { useContextMenuAnchor };
