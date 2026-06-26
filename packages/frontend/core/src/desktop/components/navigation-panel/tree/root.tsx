import {
  type DropTargetDropEvent,
  type DropTargetOptions,
  useDropTarget,
} from '@affine/component';
import type { AffineDNDData } from '@affine/core/types/dnd';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { NavigationPanelTreeContext } from './context';
import { DropEffect } from './drop-effect';
import type { NavigationPanelTreeNodeDropEffect } from './node';
import * as styles from './root.css';
import type { NodeOperation } from './types';

const EMPTY_OPERATIONS: NodeOperation[] = [];

export const NavigationPanelTreeRoot = ({
  children,
  childrenOperations = EMPTY_OPERATIONS,
  className,
  placeholder,
  rootDropTarget,
}: {
  children?: React.ReactNode;
  childrenOperations?: NodeOperation[];
  className?: string;
  placeholder?: React.ReactNode;
  rootDropTarget?: {
    data: AffineDNDData['dropTarget'];
    onDrop: (data: DropTargetDropEvent<AffineDNDData>) => void;
    canDrop?: DropTargetOptions<AffineDNDData>['canDrop'];
    dropEffect?: NavigationPanelTreeNodeDropEffect;
  };
}) => {
  const [childCount, setChildCount] = useState(0);
  const contextValue = useMemo(() => {
    return {
      operations: childrenOperations,
      level: 0,
      registerChild: () => {
        setChildCount(c => c + 1);
        return () => setChildCount(c => c - 1);
      },
    };
  }, [childrenOperations]);
  const { dropTargetRef, draggedOverDraggable, draggedOverPosition } =
    useDropTarget<AffineDNDData>(
      () => ({
        data: rootDropTarget?.data,
        onDrop: rootDropTarget?.onDrop,
        canDrop: rootDropTarget?.canDrop ?? false,
        allowExternal: true,
      }),
      [rootDropTarget]
    );

  return (
    // <div> is for placeholder:last-child selector
    <div
      ref={dropTargetRef}
      className={clsx(className, rootDropTarget && styles.rootDropTarget)}
    >
      {/* For lastInGroup check, the placeholder must be placed above all children in the dom */}
      <div className={styles.placeholder}>
        {childCount === 0 && placeholder}
      </div>
      <NavigationPanelTreeContext.Provider value={contextValue}>
        {children}
      </NavigationPanelTreeContext.Provider>
      {draggedOverDraggable && (
        <DropEffect
          position={draggedOverPosition}
          dropEffect={rootDropTarget?.dropEffect?.({
            source: draggedOverDraggable,
            treeInstruction: null,
          })}
        />
      )}
    </div>
  );
};
