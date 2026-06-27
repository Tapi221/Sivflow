import React from "react";
import { BlockEditor } from "@/components/card/blocks/editor/BlockEditor";
import type { SharedCardContentEditProps } from "./SharedCardContent.types";



const SharedCardEditSceneInner = ({ blocks, onChange, prefix, label, accentColor, duplicateToOpposite, onCrossDuplicate, autoFocus, customPlaceholders, hideToolbar, onDelete, minDeletableIndex, hiddenBlockTypes, toolbarMount, toolbarDesktopLayout, enableBlockSelectionState, settings, displayMode, zoom }: SharedCardContentEditProps) => {
  return (
    <BlockEditor
      blocks={blocks}
      onChange={onChange}
      prefix={prefix}
      label={label}
      accentColor={accentColor}
      duplicateToOpposite={duplicateToOpposite}
      onCrossDuplicate={onCrossDuplicate}
      autoFocus={autoFocus}
      customPlaceholders={customPlaceholders}
      hideToolbar={hideToolbar}
      onDelete={onDelete}
      minDeletableIndex={minDeletableIndex}
      hiddenBlockTypes={hiddenBlockTypes}
      toolbarMount={toolbarMount}
      toolbarDesktopLayout={toolbarDesktopLayout}
      enableBlockSelectionState={enableBlockSelectionState}
      settings={settings}
      displayMode={displayMode}
      zoom={zoom}
    />
  );
};



const SharedCardEditScene = React.memo(SharedCardEditSceneInner);
SharedCardEditScene.displayName = "SharedCardEditScene";

export { SharedCardEditScene };
