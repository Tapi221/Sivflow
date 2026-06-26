import { Button, Input, Menu, toast } from '@affine/component';
import { getDescendantTagIds, TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TagMeta } from '../types';
import * as styles from './create-tag.css';

const TagIcon = ({ color, large }: { color: string; large?: boolean }) => (
  <div
    className={clsx(styles.tagColorIcon, {
      ['large']: large,
    })}
    style={{ backgroundColor: color }}
  />
);

export const CreateOrEditTag = ({
  open,
  onOpenChange,
  tagMeta,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagMeta?: TagMeta;
}) => {
  const tagService = useService(TagService);
  const tagList = tagService.tagList;
  const tagOptions = useLiveData(tagList.tagMetas$);
  const tag = useLiveData(tagList.tagByTagId$(tagMeta?.id));
  const t = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const [tagName, setTagName] = useState(tagMeta?.name || '');
  const handleChangeName = useCallback((value: string) => {
    setTagName(value);
  }, []);

  const [tagIcon, setTagIcon] = useState(
    tagMeta?.color || tagService.randomTagColor()
  );
  const [parentId, setParentId] = useState(tagMeta?.parentId);

  const handleChangeIcon = useCallback((value: string) => {
    setTagIcon(value);
  }, []);

  const tags = useMemo(() => {
    return tagService.tagColors.map(([name, color]) => {
      return {
        name: name,
        color: color,
        onClick: () => {
          handleChangeIcon(color);
          setMenuOpen(false);
        },
      };
    });
  }, [handleChangeIcon, tagService.tagColors]);

  const items = useMemo(() => {
    const tagItems = tags.map(item => {
      return (
        <div
          key={item.color}
          onClick={item.onClick}
          className={clsx(styles.tagItem, {
            ['active']: item.color === tagIcon,
          })}
        >
          <TagIcon color={item.color} large={true} />
        </div>
      );
    });
    return <div className={styles.tagItemsWrapper}>{tagItems}</div>;
  }, [tagIcon, tags]);

  const parentOptions = useMemo(() => {
    const excludedIds = new Set(
      tagMeta
        ? [tagMeta.id, ...getDescendantTagIds(tagOptions, tagMeta.id)]
        : []
    );
    return tagOptions.filter(tag => !excludedIds.has(tag.id));
  }, [tagMeta, tagOptions]);

  const onClose = useCallback(() => {
    if (!tagMeta) {
      handleChangeIcon(tagService.randomTagColor());
      setTagName('');
      setParentId(undefined);
    }
    onOpenChange(false);
  }, [handleChangeIcon, onOpenChange, tagMeta, tagService]);

  const onConfirm = useCallback(() => {
    if (!tagName?.trim()) return;
    if (
      tagOptions.some(
        tag => tag.name === tagName.trim() && tag.id !== tagMeta?.id
      )
    ) {
      return toast(t['com.affine.tags.create-tag.toast.exist']());
    }
    if (!tagMeta) {
      tagList.createTag(tagName.trim(), tagIcon, parentId);
      toast(t['com.affine.tags.create-tag.toast.success']());
      onClose();
      return;
    }
    tag?.rename(tagName.trim());
    tag?.changeColor(tagIcon);
    tag?.moveToParent(parentId);

    toast(t['com.affine.tags.edit-tag.toast.success']());
    onClose();
    return;
  }, [
    onClose,
    parentId,
    t,
    tag,
    tagIcon,
    tagMeta,
    tagName,
    tagOptions,
    tagList,
  ]);

  const handlePropagation = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    if (!open) return;
    if (menuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange, menuOpen, onClose]);

  useEffect(() => {
    setTagName(tagMeta?.name || '');
    setTagIcon(tagMeta?.color || tagService.randomTagColor());
    setParentId(tagMeta?.parentId);
  }, [tagMeta?.color, tagMeta?.name, tagMeta?.parentId, tagService]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.createTagWrapper}
      data-show={open}
      data-testid="edit-tag-modal"
      onClick={handlePropagation}
    >
      <Menu
        rootOptions={{
          open: menuOpen,
          onOpenChange: setMenuOpen,
        }}
        items={items}
      >
        <Button className={styles.menuBtn}>
          <TagIcon color={tagIcon} />
        </Button>
      </Menu>

      <Input
        placeholder={t['com.affine.tags.create-tag.placeholder']()}
        inputStyle={{ fontSize: 'var(--affine-font-xs)' }}
        onEnter={onConfirm}
        value={tagName}
        onChange={handleChangeName}
        autoFocus
        data-testid="edit-tag-input"
      />
      <select
        className={styles.parentSelect}
        value={parentId ?? ''}
        onChange={event => setParentId(event.target.value || undefined)}
        data-testid="edit-tag-parent-select"
      >
        <option value="">{t['com.affine.tags.create-tag.no-parent']()}</option>
        {parentOptions.map(tag => (
          <option key={tag.id} value={tag.id}>
            {tag.name || t['Untitled']()}
          </option>
        ))}
      </select>
      <Button className={styles.cancelBtn} onClick={onClose}>
        {t['Cancel']()}
      </Button>
      <Button
        variant="primary"
        onClick={onConfirm}
        disabled={!tagName}
        data-testid="save-tag"
      >
        {tagMeta ? t['Save']() : t['Create']()}
      </Button>
    </div>
  );
};
