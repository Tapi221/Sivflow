import { CategoryDivider } from '@affine/core/modules/app-sidebar/views';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  useCallback,
} from 'react';

import { content, header, root } from './collapsible-section.css';

interface CollapsibleSectionProps extends PropsWithChildren {
  path: string[];
  title: string;
  actions?: ReactNode;

  className?: string;
  testId?: string;

  headerRef?: RefObject<HTMLDivElement>;
  headerTestId?: string;
  headerClassName?: string;

  contentClassName?: string;
  contentStyle?: CSSProperties;
  collapsible?: boolean;
}

export const CollapsibleSection = ({
  path,
  title,
  actions,
  children,

  className,
  testId,

  headerRef,
  headerTestId,
  headerClassName,

  contentClassName,
  contentStyle,
  collapsible = true,
}: CollapsibleSectionProps) => {
  const navigationPanelService = useService(NavigationPanelService);

  const collapsedFromService = useLiveData(navigationPanelService.collapsed$(path));
  const collapsed = collapsible ? collapsedFromService : false;

  const setCollapsed = useCallback(
    (v: boolean) => {
      if (collapsible) {
        navigationPanelService.setCollapsed(path, v);
      }
    },
    [navigationPanelService, path, collapsible]
  );

  return (
    <Collapsible.Root
      data-collapsed={collapsed}
      className={clsx(root, className)}
      open={!collapsed}
      data-testid={testId}
    >
      <CategoryDivider
        data-testid={headerTestId}
        label={title}
        setCollapsed={collapsible ? setCollapsed : undefined}
        collapsed={collapsible ? collapsed : undefined}
        ref={headerRef}
        className={clsx(header, headerClassName)}
      >
        {actions}
      </CategoryDivider>
      <Collapsible.Content
        data-testid="collapsible-section-content"
        className={clsx(content, contentClassName)}
        style={contentStyle}
      >
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
