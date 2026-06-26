import {
  Divider,
  Menu,
  MenuItem,
  type MenuProps,
  RowInput,
  Scrollable,
} from '@affine/component';
import {
  buildTagTree,
  filterTagTree,
  flattenTagTree,
  type Tag,
  TagService,
} from '@affine/core/modules/tag';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { ArrowDownSmallIcon, DoneIcon, SearchIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  forwardRef,
  type HTMLProps,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as styles from './list-header.css';

export const TagListHeader = ({ tag }: { tag: Tag }) => {
  const t = useI18n();
  return (
    <header className={styles.header}>
      <div className={styles.breadcrumb}>
        <div className={styles.breadcrumbItem}>
          <WorkbenchLink to="/tag" className={styles.breadcrumbLink}>
            {t['Tags']()}
          </WorkbenchLink>
        </div>
        <div className={styles.breadcrumbSeparator}>/</div>
        <div className={styles.breadcrumbItem} data-active={true}>
          <TagSelector currentTag={tag} />
        </div>
      </div>

      <div className={styles.headerActions}></div>
    </header>
  );
};

const contentMenuOptions: MenuProps['contentOptions'] = {
  align: 'start',
  side: 'bottom',
  sideOffset: 4,
  className: styles.tagSelectorMenuRoot,
};
const TagSelector = ({ currentTag }: { currentTag: Tag }) => {
  const [isOpen, setIsOpen] = useState(false);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Menu
      rootOptions={{
        open: isOpen,
        onOpenChange: setIsOpen,
      }}
      contentOptions={contentMenuOptions}
      items={<TagSelectorMenu currentTagId={currentTag.id} onClose={onClose} />}
    >
      <TagSelectorTrigger currentTag={currentTag} />
    </Menu>
  );
};

const TagSelectorTrigger = forwardRef<
  HTMLDivElement,
  HTMLProps<HTMLDivElement> & { currentTag: Tag }
>(function TagSelectorTrigger({ currentTag, className, ...props }, ref) {
  const tagColor = useLiveData(currentTag.color$);
  const tagName = useLiveData(currentTag.value$);

  return (
    <div
      className={clsx(styles.tagSelectorTrigger, className)}
      ref={ref}
      {...props}
    >
      <div
        className={styles.tagSelectorTriggerIcon}
        style={{ color: tagColor }}
      />
      <div className={styles.tagSelectorTriggerName}>{tagName}</div>
      <div className={styles.tagSelectorTriggerDropdown}>
        <ArrowDownSmallIcon />
      </div>
    </div>
  );
});

const TagSelectorMenu = ({
  currentTagId,
  onClose,
}: {
  currentTagId: string;
  onClose: () => void;
}) => {
  const t = useI18n();
  const [inputValue, setInputValue] = useState('');
  const tagList = useService(TagService).tagList;
  const tagMetas = useLiveData(tagList.tagMetas$);
  const filteredTags = useMemo(() => {
    const tree = buildTagTree(tagMetas);
    const normalized = inputValue.trim().toLowerCase();
    if (!normalized) {
      return flattenTagTree(tree);
    }
    return flattenTagTree(
      filterTagTree(tree, tag => tag.name.toLowerCase().includes(normalized))
    );
  }, [inputValue, tagMetas]);
  return (
    <>
      <header className={styles.tagSelectorMenuHeader}>
        <SearchIcon className={styles.tagSelectorMenuSearchIcon} />
        <RowInput
          value={inputValue}
          onChange={setInputValue}
          placeholder={t['Search tags']()}
        />
      </header>
      <Divider size="thinner" />
      <Scrollable.Root className={styles.tagSelectorMenuScrollArea}>
        <Scrollable.Viewport className={styles.tagSelectorMenuViewport}>
          {filteredTags.map(tag => {
            return (
              <TagLink
                key={tag.id}
                tag={tag}
                checked={tag.id === currentTagId}
                onClick={onClose}
              />
            );
          })}
          {filteredTags.length === 0 ? (
            <div className={styles.tagSelectorMenuEmpty}>
              {t['Find 0 result']()}
            </div>
          ) : null}
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>
    </>
  );
};

const TagLink = ({
  tag,
  checked,
  onClick,
}: {
  tag: { id: string; name: string; color: string; depth?: number };
  checked: boolean;
  onClick: () => void;
}) => {
  const aRef = useRef<HTMLAnchorElement>(null);

  const onSelect = useCallback(() => {
    aRef.current?.click();
  }, []);

  return (
    <MenuItem onSelect={onSelect} className={styles.tagSelectorMenuItem}>
      <WorkbenchLink
        ref={aRef}
        key={tag.id}
        className={styles.tagSelectorItem}
        data-tag-id={tag.id}
        data-tag-value={tag.name}
        to={`/tag/${tag.id}`}
        onClick={onClick}
        style={{ paddingLeft: `${12 + (tag.depth ?? 0) * 16}px` }}
      >
        <div
          className={styles.tagSelectorItemIcon}
          style={{ color: tag.color }}
        />
        <div className={styles.tagSelectorItemText}>{tag.name}</div>
        {checked ? (
          <DoneIcon className={styles.tagSelectorItemCheckedIcon} />
        ) : null}
      </WorkbenchLink>
    </MenuItem>
  );
};
