import {
  DropIndicator,
  IconButton,
  Menu,
  Tooltip,
  useDraggable,
  useDropTarget,
} from '@affine/component';
import type { DocCustomPropertyInfo } from '@affine/core/modules/db';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { WorkspacePropertyService } from '@affine/core/modules/workspace-property';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { useI18n } from '@affine/i18n';
import { MoreHorizontalIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { type HTMLProps, useCallback, useState, useEffect } from 'react';

import { useGuard } from '../../guard';
import {
  isSupportedWorkspacePropertyType,
  WorkspacePropertyTypes,
} from '../../workspace-property-types';
import { WorkspacePropertyIcon } from '../icons/workspace-property-icon';
import { EditWorkspacePropertyMenuItems } from '../menu/edit-doc-property';
import * as styles from './styles.css';

const PropertyItem = ({
  propertyInfo,
  defaultOpenEditMenu,
  onPropertyInfoChange,
}: {
  propertyInfo: DocCustomPropertyInfo;
  defaultOpenEditMenu?: boolean;
  onPropertyInfoChange?: (
    field: keyof DocCustomPropertyInfo,
    value: string
  ) => void;
}) => {
  const t = useI18n();
  const workspaceService = useService(WorkspaceService);
  const workspacePropertyService = useService(WorkspacePropertyService);
  const [moreMenuOpen, setMoreMenuOpen] = useState(defaultOpenEditMenu);
  const canEditPropertyInfo = useGuard('Workspace_Properties_Update');

  const typeInfo = isSupportedWorkspacePropertyType(propertyInfo.type)
    ? WorkspacePropertyTypes[propertyInfo.type]
    : undefined;

  const handleClick = useCallback(() => {
    setMoreMenuOpen(true);
  }, []);

  const { dragRef } = useDraggable<AffineDNDData>(
    () => ({
      canDrag: canEditPropertyInfo,
      data: {
        entity: {
          type: 'custom-property',
          id: propertyInfo.id,
        },
        from: {
          at: 'doc-property:manager',
          workspaceId: workspaceService.workspace.id,
        },
      },
    }),
    [propertyInfo, workspaceService, canEditPropertyInfo]
  );

  const { dropTargetRef, closestEdge } = useDropTarget<AffineDNDData>(
    () => ({
      canDrop(data) {
        return (
          !!canEditPropertyInfo &&
          data.source.data.entity?.type === 'custom-property' &&
          data.source.data.from?.at === 'doc-property:manager' &&
          data.source.data.from?.workspaceId ===
            workspaceService.workspace.id &&
          data.source.data.entity.id !== propertyInfo.id
        );
      },
      closestEdge: {
        allowedEdges: ['top', 'bottom'],
      },
      isSticky: true,
      onDrop(data) {
        if (data.source.data.entity?.type !== 'custom-property') {
          return;
        }
        const propertyId = data.source.data.entity.id;
        const edge = data.closestEdge;
        if (edge !== 'bottom' && edge !== 'top') {
          return;
        }
        workspacePropertyService.updatePropertyInfo(propertyId, {
          index: workspacePropertyService.indexAt(
            edge === 'bottom' ? 'after' : 'before',
            propertyInfo.id
          ),
        });
      },
    }),
    [
      workspacePropertyService,
      propertyInfo,
      workspaceService,
      canEditPropertyInfo,
    ]
  );

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditPropertyInfo) return;
    const current = propertyInfo.show || 'always-show';
    let next: 'always-show' | 'hide-when-empty' | 'always-hide';
    if (current === 'always-show') next = 'hide-when-empty';
    else if (current === 'hide-when-empty') next = 'always-hide';
    else next = 'always-show';
    
    workspacePropertyService.updatePropertyInfo(propertyInfo.id, {
      show: next,
    });
    onPropertyInfoChange?.('show', next);
  }, [propertyInfo, canEditPropertyInfo, workspacePropertyService, onPropertyInfoChange]);

  const propertyName = propertyInfo.name || (typeInfo?.name ? t.t(typeInfo.name) : t['unnamed']());
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(propertyName);

  // Update local state when propertyInfo changes if not editing
  useEffect(() => {
    if (!isEditingName) {
      setName(propertyName);
    }
  }, [propertyName, isEditingName]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleNameBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsEditingName(false);
      workspacePropertyService.updatePropertyInfo(propertyInfo.id, {
        name: e.target.value,
      });
      onPropertyInfoChange?.('name', e.target.value);
    },
    [workspacePropertyService, propertyInfo.id, onPropertyInfoChange]
  );

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.currentTarget.blur();
      }
    },
    []
  );

  const startEditingName = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEditPropertyInfo && typeInfo?.renameable !== false) {
      setIsEditingName(true);
    } else {
      handleClick();
    }
  }, [canEditPropertyInfo, typeInfo, handleClick]);

  return (
    <Tooltip
      content={t.t(typeInfo?.description || propertyInfo.type)}
      side="left"
    >
      <div
        className={styles.itemContainer}
        ref={elem => {
          dropTargetRef.current = elem;
          dragRef.current = elem;
        }}
        onClick={handleClick}
        data-testid="doc-property-manager-item"
      >
        <WorkspacePropertyIcon
          className={styles.itemIcon}
          propertyInfo={propertyInfo}
        />
        {isEditingName ? (
          <input
            className={styles.itemName}
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              fontFamily: 'inherit',
              width: '100%',
            }}
          />
        ) : (
          <span 
            className={styles.itemName} 
            onClick={startEditingName}
            style={{ cursor: canEditPropertyInfo && typeInfo?.renameable !== false ? 'text' : 'pointer' }}
          >
            {propertyName}
          </span>
        )}
        <span 
          className={styles.itemVisibility} 
          onClick={handleToggleVisibility}
          style={{ cursor: 'pointer', padding: '0 4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--affine-hover-color)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {propertyInfo.show === 'hide-when-empty'
            ? t['com.affine.page-properties.property.hide-when-empty']()
            : propertyInfo.show === 'always-hide'
              ? t['com.affine.page-properties.property.always-hide']()
              : t['com.affine.page-properties.property.always-show']()}
        </span>
        <Menu
          rootOptions={{
            open: moreMenuOpen,
            onOpenChange: setMoreMenuOpen,
            modal: true,
          }}
          items={
            <EditWorkspacePropertyMenuItems
              propertyId={propertyInfo.id}
              onPropertyInfoChange={onPropertyInfoChange}
              readonly={!canEditPropertyInfo}
            />
          }
        >
          <IconButton size={20} className={styles.itemMoreContainer} iconClassName={styles.itemMore}>
            <MoreHorizontalIcon />
          </IconButton>
        </Menu>
        <DropIndicator edge={closestEdge} noTerminal />
      </div>
    </Tooltip>
  );
};

export const WorkspacePropertyManager = ({
  className,
  defaultOpenEditMenuPropertyId,
  onPropertyInfoChange,
  ...props
}: HTMLProps<HTMLDivElement> & {
  defaultOpenEditMenuPropertyId?: string;
  onPropertyInfoChange?: (
    property: DocCustomPropertyInfo,
    field: keyof DocCustomPropertyInfo,
    value: string
  ) => void;
}) => {
  const workspacePropertyService = useService(WorkspacePropertyService);

  const properties = useLiveData(workspacePropertyService.sortedProperties$);

  return (
    <div className={clsx(styles.container, className)} {...props}>
      {properties
        .filter(
          propertyInfo =>
            !WorkspacePropertyTypes[propertyInfo.type]?.hidden
        )
        .map(propertyInfo => (
        <PropertyItem
          propertyInfo={propertyInfo}
          defaultOpenEditMenu={
            defaultOpenEditMenuPropertyId === propertyInfo.id
          }
          key={propertyInfo.id}
          onPropertyInfoChange={(...args) =>
            onPropertyInfoChange?.(propertyInfo, ...args)
          }
        />
      ))}
    </div>
  );
};
