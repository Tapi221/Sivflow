import React from "react";



type CardOverlayTopRightProps = Readonly<{ children?: React.ReactNode;
}>;



const CardOverlayTopRight = ({ children }: CardOverlayTopRightProps) => {
  if (!children) return null;

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-30">
      <div
        className="pointer-events-auto flex max-w-full flex-col items-end gap-2"
        data-card-no-flip="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};



export { CardOverlayTopRight };


export type { CardOverlayTopRightProps };
