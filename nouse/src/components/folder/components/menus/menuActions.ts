import type { ReactNode } from "react";



/**
 * メニューのアクションを定義する型
 */
type MenuAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  separatorBefore?: boolean;
  onSelect?: () => void | Promise<void>;
};

export type { MenuAction };
